import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_ABOUT_URL = "https://www.googleapis.com/drive/v3/about";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;
  const userEmail = user.email || "";

  const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "exchange") {
        // Exchange authorization code for tokens
        const { code, redirect_uri } = body;
        if (!code || !redirect_uri) {
          return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri,
            grant_type: "authorization_code",
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
          return new Response(
            JSON.stringify({ error: "OAuth failed", details: tokenData.error_description || tokenData.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { access_token, refresh_token, expires_in } = tokenData;

        // Validate Google email matches user email
        const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        if (userInfo.email?.toLowerCase() !== userEmail?.toLowerCase()) {
          // Revoke the token since email doesn't match
          await fetch(`${GOOGLE_REVOKE_URL}?token=${access_token}`, { method: "POST" });
          return new Response(
            JSON.stringify({
              error: "email_mismatch",
              message: `Google account email (${userInfo.email}) does not match your signup email (${userEmail}). Please use the same Google account.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check storage quota
        const aboutResponse = await fetch(`${DRIVE_ABOUT_URL}?fields=storageQuota`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const aboutData = await aboutResponse.json();
        const storageQuota = aboutData.storageQuota;
        const limit = parseInt(storageQuota?.limit) || Number.MAX_SAFE_INTEGER;
        const usage = parseInt(storageQuota?.usage) || 0;
        const available = limit - usage;
        const MIN_STORAGE = 500 * 1024 * 1024; // 500 MB

        if (available < MIN_STORAGE) {
          await fetch(`${GOOGLE_REVOKE_URL}?token=${access_token}`, { method: "POST" });
          return new Response(
            JSON.stringify({
              error: "insufficient_storage",
              message: `Insufficient Google Drive storage. Available: ${Math.round(available / 1024 / 1024)} MB. Minimum required: 500 MB.`,
              available_mb: Math.round(available / 1024 / 1024),
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create or find WordTaxFiling folder
        const rootFolderId = await findOrCreateFolder(access_token, "WordTaxFiling", "root");

        // Calculate token expiry
        const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

        // Store tokens in database using service role for upsert
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        const { error: upsertError } = await adminClient
          .from("google_drive_tokens")
          .upsert({
            user_id: userId,
            access_token,
            refresh_token,
            token_expiry: tokenExpiry,
            google_email: userInfo.email,
            root_folder_id: rootFolderId,
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Error storing tokens:", upsertError);
          return new Response(JSON.stringify({ error: "Failed to store connection" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update user_profile
        await adminClient
          .from("user_profile")
          .upsert({
            user_id: userId,
            google_drive_connected: true,
            google_drive_folder_id: rootFolderId,
            storage_preference: "google_drive",
          }, { onConflict: "user_id" });

        return new Response(
          JSON.stringify({
            success: true,
            google_email: userInfo.email,
            root_folder_id: rootFolderId,
            available_storage_mb: Math.round(available / 1024 / 1024),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "disconnect") {
        // Get stored tokens
        const { data: tokenRow } = await supabase
          .from("google_drive_tokens")
          .select("access_token, refresh_token")
          .eq("user_id", userId)
          .maybeSingle();

        if (tokenRow) {
          // Revoke access
          if (tokenRow.access_token) {
            await fetch(`${GOOGLE_REVOKE_URL}?token=${tokenRow.access_token}`, { method: "POST" }).catch(() => {});
          }
          if (tokenRow.refresh_token) {
            await fetch(`${GOOGLE_REVOKE_URL}?token=${tokenRow.refresh_token}`, { method: "POST" }).catch(() => {});
          }

          // Delete tokens
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
          await adminClient.from("google_drive_tokens").delete().eq("user_id", userId);

          // Update user_profile
          await adminClient
            .from("user_profile")
            .update({
              google_drive_connected: false,
              google_drive_folder_id: null,
            })
            .eq("user_id", userId);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Google Drive disconnected. Existing files are preserved." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "status") {
        const { data: tokenRow } = await supabase
          .from("google_drive_tokens")
          .select("google_email, root_folder_id, token_expiry")
          .eq("user_id", userId)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            connected: !!tokenRow,
            google_email: tokenRow?.google_email || null,
            root_folder_id: tokenRow?.root_folder_id || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parent: string
): Promise<string> {
  // Search for existing folder
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const searchResponse = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createResponse = await fetch(DRIVE_FILES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent],
    }),
  });
  const createData = await createResponse.json();
  return createData.id;
}
