/**
 * Google Drive permission helpers for sharing.
 * Used by send-share-email, verify-share-access, and revoke-share.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

/** Refresh an expired Google access token */
export async function refreshAccessToken(
  refreshToken: string,
  userId: string
): Promise<string> {
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
    console.error("Token refresh error details:", JSON.stringify(data));
    throw new Error(`Token refresh failed: ${data.error_description || data.error}. Please reconnect Google Drive from your profile.`);
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

/** Get a valid access token for a user (refreshing if needed) */
export async function getValidAccessToken(
  tokenRow: { access_token: string; refresh_token: string; token_expiry: string },
  userId: string
): Promise<string> {
  const tokenExpiry = new Date(tokenRow.token_expiry);
  if (tokenExpiry <= new Date()) {
    return await refreshAccessToken(tokenRow.refresh_token, userId);
  }
  return tokenRow.access_token;
}

/** Extract Google Drive file ID from a gdrive:// path */
export function extractDriveFileId(filePath: string): string | null {
  if (!filePath?.startsWith("gdrive://")) return null;
  return filePath.replace("gdrive://", "");
}

/** Check if a file is a Google Drive file */
export function isDriveFile(filePath: string | null): boolean {
  return !!filePath?.startsWith("gdrive://");
}

/**
 * Get current permissions on a Google Drive file.
 * Returns the list of permissions.
 */
export async function getFilePermissions(
  accessToken: string,
  fileId: string
): Promise<Array<{ id: string; type: string; role: string; emailAddress?: string }>> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}/${fileId}/permissions?fields=permissions(id,type,role,emailAddress)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      console.error("Failed to get permissions:", await res.text());
      return [];
    }
    const data = await res.json();
    return data.permissions || [];
  } catch (err) {
    console.error("Error getting permissions:", err);
    return [];
  }
}

/**
 * Add a "reader" permission for anyone with the link.
 * Returns the permission ID for later revocation.
 */
export async function addAnyoneReaderPermission(
  accessToken: string,
  fileId: string
): Promise<string | null> {
  try {
    // First check if "anyone" permission already exists
    const permissions = await getFilePermissions(accessToken, fileId);
    const existing = permissions.find(
      (p) => p.type === "anyone" && (p.role === "reader" || p.role === "writer")
    );
    if (existing) {
      console.log(`File ${fileId} already has anyone permission: ${existing.id}`);
      return existing.id;
    }

    // Create new "anyone with link" reader permission
    const res = await fetch(
      `${DRIVE_FILES_URL}/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "anyone",
          role: "reader",
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Failed to add permission for file ${fileId}:`, errText);
      return null;
    }

    const permData = await res.json();
    console.log(`Added reader permission ${permData.id} to file ${fileId}`);
    return permData.id;
  } catch (err) {
    console.error("Error adding permission:", err);
    return null;
  }
}

/**
 * Remove a permission from a Google Drive file.
 */
export async function removePermission(
  accessToken: string,
  fileId: string,
  permissionId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}/${fileId}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok || res.status === 204) {
      console.log(`Removed permission ${permissionId} from file ${fileId}`);
      return true;
    }
    // 404 means already removed
    if (res.status === 404) {
      console.log(`Permission ${permissionId} already removed from file ${fileId}`);
      return true;
    }
    console.error("Failed to remove permission:", await res.text());
    return false;
  } catch (err) {
    console.error("Error removing permission:", err);
    return false;
  }
}

/**
 * Get the webViewLink for a Google Drive file.
 */
export async function getFileWebViewLink(
  accessToken: string,
  fileId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}/${fileId}?fields=webViewLink,webContentLink,name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      console.error("Failed to get file info:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.webViewLink || data.webContentLink || null;
  } catch (err) {
    console.error("Error getting file info:", err);
    return null;
  }
}

/**
 * Check if a specific "anyone" permission is still active on a file.
 * Returns the current permission status.
 */
export async function checkPermissionStatus(
  accessToken: string,
  fileId: string,
  permissionId: string
): Promise<{ exists: boolean; role?: string }> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}/${fileId}/permissions/${permissionId}?fields=id,role,type`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.status === 404) {
      return { exists: false };
    }
    if (!res.ok) {
      return { exists: false };
    }
    const data = await res.json();
    return { exists: true, role: data.role };
  } catch {
    return { exists: false };
  }
}
