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
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    // Support multiple recipients: recipients[] array OR single recipientEmail (backwards compat)
    const { documentIds, allowDownload, expiresAt } = body;

    // Normalise recipients into an array
    let recipients: Array<{ email: string; type: string; metadata?: Record<string, string> }> = [];
    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      recipients = body.recipients;
    } else if (body.recipientEmail) {
      // Backwards compatibility
      recipients = [{
        email: body.recipientEmail,
        type: String(body.recipientType || "other").toLowerCase(),
        metadata: body.recipientMetadata || {},
      }];
    }

    if (!documentIds?.length || recipients.length === 0 || !expiresAt) {
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!docs || docs.length !== documentIds.length) {
      return new Response(JSON.stringify({ error: "One or more documents not found or not owned by you" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── App Configuration ────────────────────────────────────────────────
    // Once taxbebo.com domain is verified in Resend, change emailFrom to:
    // "TAXBEBO <noreply@taxbebo.com>"
    const EMAIL_FROM = "TAXBEBO <onboarding@resend.dev>";
    // ─────────────────────────────────────────────────────────────────────

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);
    const appUrl = req.headers.get("origin") || "https://multicountry-tax-assistance.lovable.app";

    // Process each recipient independently
    const results: Array<{ email: string; shareId: string; shareLink: string; status: string }> = [];

    for (const recipient of recipients) {
      const recipientEmail = recipient.email;
      const recipientType = String(recipient.type || "other").toLowerCase();
      const recipientMetadata = recipient.metadata || {};

      // Generate a unique secure token per recipient
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
          recipient_metadata: recipientMetadata,
          allow_download: allowDownload || false,
          expires_at: expiresAt,
          token,
          share_type: documentIds.length === 1 ? "single" : "multiple",
          status: "PENDING",
        })
        .select()
        .single();

      if (shareError) {
        console.error(`Error creating share for ${recipientEmail}:`, shareError);
        results.push({ email: recipientEmail, shareId: "", shareLink: "", status: "FAILED" });
        continue;
      }

      const shareLink = `${appUrl}/shared/${token}`;

      // Send email via Resend
      let emailStatus = "FAILED";
      try {
        const emailResult = await resend.emails.send({
          from: EMAIL_FROM,
          to: [recipientEmail],
          subject: `Documents shared with you via TAXBEBO`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a2e;">Documents Shared With You</h2>
              <p>Someone has shared <strong>${documentIds.length} document(s)</strong> with you via TAXBEBO.</p>
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
        if (emailResult?.id) {
          emailStatus = "SUCCESS";
          console.log(`Email sent successfully to ${recipientEmail}, id: ${emailResult.id}`);
        } else {
          console.error(`Email send failed for ${recipientEmail} - no ID in response:`, JSON.stringify(emailResult));
          emailStatus = "FAILED";
        }
      } catch (emailErr: any) {
        console.error(`Email send error for ${recipientEmail}:`, emailErr?.message || emailErr, JSON.stringify(emailErr));
        emailStatus = "FAILED";
      }

      // Update share status
      await adminClient.from("document_shares").update({ status: emailStatus }).eq("id", share.id);

      // Create audit log entry
      await adminClient.from("share_audit_log").insert({
        share_id: share.id,
        user_id: user.id,
        recipient_email: recipientEmail,
        recipient_type: recipientType,
        recipient_metadata: recipientMetadata,
        share_type: share.share_type,
        email_status: emailStatus,
        access_expires_at: expiresAt,
      });

      results.push({ email: recipientEmail, shareId: share.id, shareLink, status: emailStatus });
    }

    const allFailed = results.every(r => r.status === "FAILED");
    const anySuccess = results.some(r => r.status === "SUCCESS");

    return new Response(
      JSON.stringify({
        success: anySuccess,
        results,
        // For backwards compatibility return single-recipient fields if only one recipient
        shareId: results[0]?.shareId,
        status: results[0]?.status,
        shareLink: results[0]?.shareLink,
      }),
      {
        status: allFailed ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-share-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
