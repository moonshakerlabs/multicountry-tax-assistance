import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

    // Verify the user
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

    const {
      documentIds,
      recipientEmail,
      recipientType,
      recipientMetadata,
      allowDownload,
      expiresAt,
    } = await req.json();

    if (!documentIds?.length || !recipientEmail || !recipientType || !expiresAt) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify all documents belong to user and have share_enabled = true
    const { data: docs, error: docsError } = await adminClient
      .from("documents")
      .select("id, share_enabled, file_name")
      .eq("user_id", user.id)
      .in("id", documentIds);

    if (docsError) throw docsError;

    const invalidDocs = docs?.filter((d: any) => !d.share_enabled) || [];
    if (invalidDocs.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Some documents do not have sharing enabled",
          invalidDocumentIds: invalidDocs.map((d: any) => d.id),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!docs || docs.length !== documentIds.length) {
      return new Response(
        JSON.stringify({ error: "One or more documents not found or not owned by you" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert share record
    const { data: share, error: shareError } = await adminClient
      .from("document_shares")
      .insert({
        user_id: user.id,
        document_ids: documentIds,
        recipient_email: recipientEmail,
        recipient_type: recipientType,
        recipient_metadata: recipientMetadata || {},
        allow_download: allowDownload || false,
        expires_at: expiresAt,
        token,
        share_type: documentIds.length === 1 ? "single" : "multiple",
        status: "PENDING",
      })
      .select()
      .single();

    if (shareError) throw shareError;

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      // Update status to FAILED
      await adminClient
        .from("document_shares")
        .update({ status: "FAILED" })
        .eq("id", share.id);
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);
    const appUrl = req.headers.get("origin") || "https://multicountry-tax-assistance.lovable.app";
    const shareLink = `${appUrl}/shared/${token}`;

    const emailResult = await resend.emails.send({
      from: "TaxAlign <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Documents shared with you via TaxAlign`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Documents Shared With You</h2>
          <p>Someone has shared <strong>${documentIds.length} document(s)</strong> with you via TaxAlign.</p>
          <p><strong>Access expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>
          <div style="margin: 24px 0;">
            <a href="${shareLink}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Documents
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            🔒 You will need to verify your email with a one-time code before accessing the documents.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    // Update share status
    const newStatus = emailResult?.id ? "SUCCESS" : "FAILED";
    await adminClient
      .from("document_shares")
      .update({ status: newStatus })
      .eq("id", share.id);

    // Create audit log entry
    await adminClient.from("share_audit_log").insert({
      share_id: share.id,
      user_id: user.id,
      recipient_email: recipientEmail,
      recipient_type: recipientType,
      recipient_metadata: recipientMetadata || {},
      share_type: share.share_type,
      email_status: newStatus,
      access_expires_at: expiresAt,
    });

    return new Response(
      JSON.stringify({ success: true, shareId: share.id, status: newStatus, shareLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-share-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
