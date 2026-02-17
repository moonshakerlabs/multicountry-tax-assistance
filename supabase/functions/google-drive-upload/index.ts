import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    // Get stored tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_drive_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected. Please connect in your profile settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh token if expired
    let accessToken = tokenRow.access_token;
    const tokenExpiry = new Date(tokenRow.token_expiry);
    if (tokenExpiry <= new Date()) {
      accessToken = await refreshAccessToken(tokenRow.refresh_token, userId);
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const country = formData.get("country") as string;
    const year = formData.get("year") as string;
    const category = formData.get("category") as string;
    const originalFilename = formData.get("original_filename") as string;

    if (!file || !country || !year || !category || !originalFilename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, country, year, category, original_filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rootFolderId = tokenRow.root_folder_id;

    // Create or find folder structure: WordTaxFiling/{Country}/{Year}
    const countryFolderId = await findOrCreateFolder(accessToken, country, rootFolderId);
    const yearFolderId = await findOrCreateFolder(accessToken, year, countryFolderId);

    // Rename file: {Country}-{Category}-{Year}-{OriginalFilename}
    const renamedFilename = `${country}-${category}-${year}-${originalFilename}`;

    // Upload file to Google Drive
    const fileBytes = await file.arrayBuffer();
    const metadata = {
      name: renamedFilename,
      parents: [yearFolderId],
    };

    // Use multipart upload
    const boundary = "boundary_" + Date.now();
    const metadataPart = JSON.stringify(metadata);
    const multipartBody = new Uint8Array(
      await buildMultipartBody(boundary, metadataPart, new Uint8Array(fileBytes), file.type)
    );

    const uploadResponse = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error("Upload failed:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to upload to Google Drive", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadResult = await uploadResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        file_id: uploadResult.id,
        file_name: uploadResult.name,
        web_view_link: uploadResult.webViewLink,
        drive_folder_path: `WordTaxFiling/${country}/${year}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

  // Update stored token
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

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parent: string
): Promise<string> {
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const searchResponse = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
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

async function buildMultipartBody(
  boundary: string,
  metadata: string,
  fileBytes: Uint8Array,
  mimeType: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  // Metadata part
  parts.push(encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`));
  parts.push(encoder.encode(metadata));
  parts.push(encoder.encode(`\r\n`));

  // File part
  parts.push(encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`));
  parts.push(fileBytes);
  parts.push(encoder.encode(`\r\n--${boundary}--`));

  // Combine all parts
  let totalLength = 0;
  for (const part of parts) totalLength += part.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result.buffer;
}
