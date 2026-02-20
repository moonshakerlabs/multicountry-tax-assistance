import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getValidAccessToken,
  removePermission,
} from "../_shared/drive-permissions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { shareId } = await req.json();
    if (!shareId) {
      return new Response(JSON.stringify({ error: "shareId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership and get share details including drive permission IDs
    const { data: share, error: shareError } = await adminClient
      .from("document_shares")
      .select("id, user_id, drive_permission_ids")
      .eq("id", shareId)
      .single();

    if (shareError || !share || share.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Share not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove Google Drive permissions if any
    const drivePermIds = (share.drive_permission_ids as Record<string, string>) || {};
    if (Object.keys(drivePermIds).length > 0) {
      // Get user's Drive tokens
      const { data: tokenRow } = await adminClient
        .from("google_drive_tokens")
        .select("access_token, refresh_token, token_expiry")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenRow) {
        try {
          const accessToken = await getValidAccessToken(tokenRow, user.id);

          // Remove each permission
          for (const [fileId, permId] of Object.entries(drivePermIds)) {
            await removePermission(accessToken, fileId, permId);
          }
          console.log(`Removed ${Object.keys(drivePermIds).length} Drive permissions for share ${shareId}`);
        } catch (err) {
          console.error("Failed to remove Drive permissions (continuing with revoke):", err);
        }
      }
    }

    // Revoke the share
    const { error: updateError } = await adminClient
      .from("document_shares")
      .update({ status: "REVOKED", drive_permission_ids: {} })
      .eq("id", shareId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in revoke-share:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
