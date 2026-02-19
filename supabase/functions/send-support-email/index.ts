import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// ─── App Configuration ───────────────────────────────────────────────
// Change supportEmail to redirect all support tickets to a different address
const APP_CONFIG = {
  supportEmail: "connect@moonshakerlabs.com",
  appName: "TAXBEBO",
  emailFrom: "TAXBEBO <noreply@taxbebo.com>",
};
// ─────────────────────────────────────────────────────────────────────

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

    const body = await req.json();
    const { ticketNumber, category, subject, content, userId, userEmail, isReply } = body;

    if (!ticketNumber || !subject || !content || !userEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);

    const emailSubject = isReply
      ? `[${APP_CONFIG.appName}] Customer Reply: ${subject} (${ticketNumber})`
      : `[${APP_CONFIG.appName}] New Support Ticket: ${subject} (${ticketNumber})`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">${isReply ? '💬 Customer Reply' : '🎫 New Support Ticket'}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px; color: #666; width: 130px; font-weight: 600;">Ticket Number:</td>
            <td style="padding: 6px; font-family: monospace; font-weight: bold; color: #6366f1;">${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px; color: #666; font-weight: 600;">User ID:</td>
            <td style="padding: 6px;">${userId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px; color: #666; font-weight: 600;">Customer Email:</td>
            <td style="padding: 6px;"><a href="mailto:${userEmail}">${userEmail}</a></td>
          </tr>
          ${category ? `<tr>
            <td style="padding: 6px; color: #666; font-weight: 600;">Category:</td>
            <td style="padding: 6px;">${category}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px; color: #666; font-weight: 600;">Subject:</td>
            <td style="padding: 6px;">${subject}</td>
          </tr>
        </table>
        <div style="background: #f5f5f5; border-left: 4px solid #6366f1; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #333;">${content}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          Reply to this email or respond directly to the customer at <a href="mailto:${userEmail}">${userEmail}</a><br/>
          <em>This email was sent from an unmonitored address. Do not reply to noreply@taxbebo.com — your reply will not be received.</em>
        </p>
      </div>
    `;

    // Send to support email
    const emailResult = await resend.emails.send({
      from: APP_CONFIG.emailFrom,
      to: [APP_CONFIG.supportEmail],
      reply_to: userEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResult?.id) {
      console.log(`Support email sent for ticket ${ticketNumber}, id: ${emailResult.id}`);
    } else {
      console.error(`Support email failed for ${ticketNumber}:`, JSON.stringify(emailResult));
    }

    return new Response(
      JSON.stringify({ success: !!emailResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-support-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
