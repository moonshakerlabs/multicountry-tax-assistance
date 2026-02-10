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

    const { action, token, email, otp } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the share token
    const { data: share, error: shareError } = await adminClient
      .from("document_shares")
      .select("*")
      .eq("token", token)
      .eq("status", "SUCCESS")
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

    // Action: validate - just check the token is valid
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

    // Action: send-otp - send OTP to the recipient email
    if (action === "send-otp") {
      if (!email || email !== share.recipient_email) {
        return new Response(
          JSON.stringify({ error: "Email does not match the share recipient" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use Supabase Auth signInWithOtp
      const { error: otpError } = await adminClient.auth.signInWithOtp({
        email: share.recipient_email,
        options: {
          shouldCreateUser: true,
        },
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

    // Action: verify-otp - verify OTP and grant access
    if (action === "verify-otp") {
      if (!email || !otp) {
        return new Response(
          JSON.stringify({ error: "Email and OTP are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (email !== share.recipient_email) {
        return new Response(
          JSON.stringify({ error: "Email does not match" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP via Supabase Auth
      const { error: verifyError } = await adminClient.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) {
        console.error("OTP verify error:", verifyError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update audit log with OTP verified timestamp
      await adminClient
        .from("share_audit_log")
        .update({ otp_verified_at: new Date().toISOString() })
        .eq("share_id", share.id);

      // Re-verify share_enabled for each document and generate signed URLs
      const { data: docs, error: docsError } = await adminClient
        .from("documents")
        .select("id, file_name, file_path, file_type, main_category, sub_category, share_enabled")
        .in("id", share.document_ids);

      if (docsError) throw docsError;

      const accessibleDocs = (docs || []).filter((d: any) => d.share_enabled);

      const documentsWithUrls = await Promise.all(
        accessibleDocs.map(async (doc: any) => {
          let signedUrl = null;
          if (doc.file_path) {
            const { data } = await adminClient.storage
              .from("user-documents")
              .createSignedUrl(doc.file_path, 600); // 10 min
            signedUrl = data?.signedUrl || null;
          }
          return {
            id: doc.id,
            fileName: doc.file_name,
            fileType: doc.file_type,
            mainCategory: doc.main_category,
            subCategory: doc.sub_category,
            signedUrl,
          };
        })
      );

      return new Response(
        JSON.stringify({
          verified: true,
          allowDownload: share.allow_download,
          documents: documentsWithUrls,
        }),
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
