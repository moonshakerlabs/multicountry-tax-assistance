import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DRIVE_ROOT_FOLDER_NAME } from "../_shared/drive-constants.ts";

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
    // Get stored tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_drive_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected. Please connect in your profile settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create admin client for DB updates
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Ensure root folder exists (check DB cache first, then Drive)
    let rootFolderId = tokenRow.root_folder_id;
    if (!rootFolderId) {
      console.log(`Root folder missing in DB. Searching/creating "${DRIVE_ROOT_FOLDER_NAME}" on Drive...`);
      rootFolderId = await findOrCreateFolder(accessToken, DRIVE_ROOT_FOLDER_NAME, "root");

      // Cache root folder ID in DB so we don't search again
      await adminClient
        .from("google_drive_tokens")
        .update({ root_folder_id: rootFolderId })
        .eq("user_id", userId);

      console.log("Root folder ID cached:", rootFolderId);
    } else {
      // Verify the cached root folder still exists on Drive (not trashed)
      const exists = await folderExists(accessToken, rootFolderId);
      if (!exists) {
        console.log("Cached root folder no longer exists. Re-creating...");
        rootFolderId = await findOrCreateFolder(accessToken, DRIVE_ROOT_FOLDER_NAME, "root");
        await adminClient
          .from("google_drive_tokens")
          .update({ root_folder_id: rootFolderId })
          .eq("user_id", userId);
      }
    }

    // Step 2: Ensure country folder exists under root
    const countryFolderId = await findOrCreateFolder(accessToken, country, rootFolderId);

    // Step 3: Ensure year folder exists under country
    const yearFolderId = await findOrCreateFolder(accessToken, year, countryFolderId);

    // Step 4: Build filename with category prefix and handle duplicates
    const desiredFilename = `${category}-${originalFilename}`;
    const finalFilename = await getUniqueFilename(accessToken, yearFolderId, desiredFilename);

    // Step 5: Upload file to Google Drive
    const fileBytes = await file.arrayBuffer();
    const metadata = {
      name: finalFilename,
      parents: [yearFolderId],
    };

    const boundary = "boundary_" + Date.now();
    const metadataPart = JSON.stringify(metadata);
    const multipartBody = new Uint8Array(
      await buildMultipartBody(boundary, metadataPart, new Uint8Array(fileBytes), file.type),
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
      return new Response(JSON.stringify({ error: "Failed to upload to Google Drive", details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uploadResult = await uploadResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        file_id: uploadResult.id,
        file_name: uploadResult.name,
        web_view_link: uploadResult.webViewLink,
        drive_folder_path: `${DRIVE_ROOT_FOLDER_NAME}/${country}/${year}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Upload error:", error);
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

/** Check if a folder ID still exists and is not trashed */
async function folderExists(accessToken: string, folderId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}/${folderId}?fields=id,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !data.trashed;
  } catch {
    return false;
  }
}

/** Find an existing folder by name+parent, or create it. Reuses existing folders. */
async function findOrCreateFolder(accessToken: string, name: string, parent: string): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const searchResponse = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    console.log(`Folder "${name}" already exists under parent "${parent}": ${searchData.files[0].id}`);
    return searchData.files[0].id;
  }

  console.log(`Creating folder "${name}" under parent "${parent}"...`);
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

/** Check for existing files with the same name and return a unique name with _1, _2, etc. */
async function getUniqueFilename(accessToken: string, folderId: string, desiredName: string): Promise<string> {
  // Split into name and extension
  const lastDot = desiredName.lastIndexOf(".");
  const baseName = lastDot > 0 ? desiredName.substring(0, lastDot) : desiredName;
  const extension = lastDot > 0 ? desiredName.substring(lastDot) : "";

  // Check if exact name exists
  const escapedName = desiredName.replace(/'/g, "\\'");
  const query = `name='${escapedName}' and '${folderId}' in parents and trashed=false`;
  const res = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();

  if (!data.files || data.files.length === 0) {
    return desiredName; // No conflict
  }

  // Find the next available suffix
  let suffix = 1;
  while (true) {
    const candidateName = `${baseName}_${suffix}${extension}`;
    const escapedCandidate = candidateName.replace(/'/g, "\\'");
    const q = `name='${escapedCandidate}' and '${folderId}' in parents and trashed=false`;
    const r = await fetch(
      `${DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const d = await r.json();

    if (!d.files || d.files.length === 0) {
      console.log(`Duplicate detected. Using filename: ${candidateName}`);
      return candidateName;
    }
    suffix++;
    if (suffix > 100) {
      // Safety limit
      return `${baseName}_${Date.now()}${extension}`;
    }
  }
}

async function buildMultipartBody(
  boundary: string,
  metadata: string,
  fileBytes: Uint8Array,
  mimeType: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  parts.push(encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`));
  parts.push(encoder.encode(metadata));
  parts.push(encoder.encode(`\r\n`));

  parts.push(encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`));
  parts.push(fileBytes);
  parts.push(encoder.encode(`\r\n--${boundary}--`));

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
