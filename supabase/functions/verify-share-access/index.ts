import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { action, token, email, otp, accessToken } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the share token — accepts both PENDING (just created) and SUCCESS (email sent)
    const { data: share, error: shareError } = await adminClient
      .from("document_shares")
      .select("*")
      .eq("token", token)
      .in("status", ["SUCCESS", "PENDING"])
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired share link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This share link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: validate ────────────────────────────────────────────────────
    if (action === "validate") {
      return new Response(
        JSON.stringify({
          valid: true,
          recipientEmail: share.recipient_email,
          documentCount: share.document_ids.length,
          expiresAt: share.expires_at,
          allowDownload: share.allow_download,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: send-otp ────────────────────────────────────────────────────
    if (action === "send-otp") {
      if (!email || email.toLowerCase() !== share.recipient_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Email does not match the share recipient" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: otpError } = await adminClient.auth.signInWithOtp({
        email: share.recipient_email,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        console.error("OTP send error:", otpError);
        return new Response(
          JSON.stringify({ error: "Failed to send verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent to your email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: verify-otp ──────────────────────────────────────────────────
    if (action === "verify-otp") {
      if (!email || !otp) {
        return new Response(
          JSON.stringify({ error: "Email and OTP are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (email.toLowerCase() !== share.recipient_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Email does not match" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP via Supabase Auth
      const { data: sessionData, error: verifyError } = await adminClient.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError || !sessionData?.session) {
        console.error("OTP verify error:", verifyError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update audit log
      await adminClient
        .from("share_audit_log")
        .update({ otp_verified_at: new Date().toISOString() })
        .eq("share_id", share.id);

      // Return doc metadata + access token — NO signed URLs here (they'd expire)
      const { data: docs, error: docsError } = await adminClient
        .from("documents")
        .select("id, file_name, file_type, main_category, sub_category, share_enabled")
        .in("id", share.document_ids);

      if (docsError) throw docsError;

      const accessibleDocs = (docs || [])
        .filter((d: any) => d.share_enabled)
        .map((doc: any) => ({
          id: doc.id,
          fileName: doc.file_name,
          fileType: doc.file_type,
          mainCategory: doc.main_category,
          subCategory: doc.sub_category,
        }));

      return new Response(
        JSON.stringify({
          verified: true,
          allowDownload: share.allow_download,
          accessToken: sessionData.session.access_token,
          documents: accessibleDocs,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: get-url ─────────────────────────────────────────────────────
    // Generate a fresh signed URL for a single document on demand
    if (action === "get-url") {
      const { documentId } = await req.json().catch(() => ({})) as any;

      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Access token required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the access token belongs to the share recipient
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data: { user }, error: userErr } = await anonClient.auth.getUser();
      if (userErr || !user || user.email?.toLowerCase() !== share.recipient_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the requested doc is in the share and has share_enabled
      const docId = documentId;
      if (!docId || !share.document_ids.includes(docId)) {
        return new Response(
          JSON.stringify({ error: "Document not found in share" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: doc } = await adminClient
        .from("documents")
        .select("file_path, share_enabled")
        .eq("id", docId)
        .single();

      if (!doc?.share_enabled || !doc?.file_path) {
        return new Response(
          JSON.stringify({ error: "Document not accessible" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a fresh 1-hour signed URL
      const { data: urlData } = await adminClient.storage
        .from("user-documents")
        .createSignedUrl(doc.file_path, 3600);

      return new Response(
        JSON.stringify({ signedUrl: urlData?.signedUrl || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in verify-share-access:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
