import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DRIVE_ROOT_FOLDER_NAME } from "../_shared/drive-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const { fileId, newCountry, newYear } = await req.json();

    if (!fileId || !newCountry || !newYear) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fileId, newCountry, newYear" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get stored tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_drive_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Refresh token if expired
    let accessToken = tokenRow.access_token;
    const tokenExpiry = new Date(tokenRow.token_expiry);
    if (tokenExpiry <= new Date()) {
      accessToken = await refreshAccessToken(tokenRow.refresh_token, userId);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Ensure root folder exists
    let rootFolderId = tokenRow.root_folder_id;
    if (!rootFolderId) {
      rootFolderId = await findOrCreateFolder(accessToken, DRIVE_ROOT_FOLDER_NAME, "root");
      await adminClient
        .from("google_drive_tokens")
        .update({ root_folder_id: rootFolderId })
        .eq("user_id", userId);
    }

    // Ensure country folder exists under root
    const countryFolderId = await findOrCreateFolder(accessToken, newCountry, rootFolderId);

    // Ensure year folder exists under country
    const yearFolderId = await findOrCreateFolder(accessToken, newYear, countryFolderId);

    // Move the file: remove old parents, add new parent
    // First get current parents
    const fileRes = await fetch(
      `${DRIVE_FILES_URL}/${fileId}?fields=parents`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!fileRes.ok) {
      throw new Error("Failed to get file info from Google Drive");
    }
    const fileData = await fileRes.json();
    const oldParents = (fileData.parents || []).join(",");

    // Move the file
    const moveRes = await fetch(
      `${DRIVE_FILES_URL}/${fileId}?addParents=${yearFolderId}&removeParents=${oldParents}&fields=id,parents`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!moveRes.ok) {
      const errorData = await moveRes.text();
      console.error("Move failed:", errorData);
      throw new Error("Failed to move file on Google Drive");
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_folder_path: `${DRIVE_ROOT_FOLDER_NAME}/${newCountry}/${newYear}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Move error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshAccessToken(refreshToken: string, userId: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const tokenExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await adminClient
    .from("google_drive_tokens")
    .update({ access_token: data.access_token, token_expiry: tokenExpiry })
    .eq("user_id", userId);

  return data.access_token;
}

async function findOrCreateFolder(accessToken: string, name: string, parent: string): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const searchResponse = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

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
