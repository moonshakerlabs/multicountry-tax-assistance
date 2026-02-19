import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// ─── App Configuration ───────────────────────────────────────────────
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

function getStatusEmailDetails(newStatus: string, ticketNumber: string, subject: string) {
  const statusMap: Record<string, { emoji: string; label: string; color: string; message: string }> = {
    RESOLVED: {
      emoji: "✅",
      label: "Resolved",
      color: "#16a34a",
      message: "Great news! Your support ticket has been marked as resolved. If you feel your issue is still unresolved, please reply to this email or raise a new ticket.",
    },
    ON_HOLD: {
      emoji: "⏸️",
      label: "On Hold",
      color: "#d97706",
      message: "Your support ticket has been placed on hold. Our team is reviewing the issue and will get back to you shortly. We appreciate your patience.",
    },
    CLOSED: {
      emoji: "🔒",
      label: "Closed",
      color: "#6b7280",
      message: "Your support ticket has been closed. If you need further assistance, please raise a new support ticket from your account.",
    },
  };
  return statusMap[newStatus] || null;
}

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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    const resend = new Resend(resendKey);

    const body = await req.json();
    const {
      ticketNumber,
      category,
      subject,
      content,
      userId,
      userEmail,
      isReply,
      // New: email copy to user on ticket creation
      sendUserCopy,
      // New: status change notification
      statusChange,
      newStatus,
    } = body;

    // ── Status change email to user ──────────────────────────────────────
    if (statusChange && newStatus && userEmail && ticketNumber) {
      const statusDetails = getStatusEmailDetails(newStatus, ticketNumber, subject || "");
      if (!statusDetails) {
        return new Response(JSON.stringify({ success: false, error: "Unknown status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="border-bottom: 3px solid ${statusDetails.color}; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #1a1a2e; margin: 0;">${statusDetails.emoji} Ticket ${statusDetails.label}</h2>
          </div>
          <p style="color: #333; font-size: 15px;">Hi ${userId ? `(${userId})` : "there"},</p>
          <p style="color: #333; font-size: 15px;">${statusDetails.message}</p>
          <div style="background: #f9f9f9; border-left: 4px solid ${statusDetails.color}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 8px 4px 0; color: #666; font-weight: 600; width: 120px;">Ticket Number:</td>
                <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #6366f1;">${ticketNumber}</td>
              </tr>
              ${subject ? `<tr>
                <td style="padding: 4px 8px 4px 0; color: #666; font-weight: 600;">Subject:</td>
                <td style="padding: 4px 0; color: #333;">${subject}</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 4px 8px 4px 0; color: #666; font-weight: 600;">Status:</td>
                <td style="padding: 4px 0;"><span style="background: ${statusDetails.color}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${statusDetails.label}</span></td>
              </tr>
            </table>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from ${APP_CONFIG.appName} Support.<br/>
            <em>Do not reply to noreply@taxbebo.com — your reply will not be received. Please log in to your account to continue the conversation.</em>
          </p>
        </div>
      `;

      const emailResult = await resend.emails.send({
        from: APP_CONFIG.emailFrom,
        to: [userEmail],
        subject: `[${APP_CONFIG.appName}] Ticket ${statusDetails.label}: ${subject || ticketNumber} (${ticketNumber})`,
        html: statusHtml,
      });

      console.log(`Status change email sent for ticket ${ticketNumber} → ${newStatus}, id: ${emailResult?.id}`);
      return new Response(
        JSON.stringify({ success: !!emailResult?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Standard validation for ticket / reply emails ─────────────────────
    if (!ticketNumber || !subject || !content || !userEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Send to support team
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

    // ── Optionally send user a copy of their new ticket ───────────────────
    if (sendUserCopy && !isReply && emailResult?.id) {
      const userCopyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #1a1a2e; margin: 0;">🎫 Your Support Ticket has been Submitted</h2>
          </div>
          <p style="color: #333; font-size: 15px;">Hi ${userId ? `(${userId})` : "there"},</p>
          <p style="color: #333; font-size: 15px;">We've received your support request and our team will be in touch soon. Here's a copy of your submission:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px; color: #666; width: 130px; font-weight: 600;">Ticket Number:</td>
              <td style="padding: 6px; font-family: monospace; font-weight: bold; color: #6366f1;">${ticketNumber}</td>
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
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #555; font-size: 13px;">Your Message:</p>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #333;">${content}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is a confirmation copy of your submission. Our team will review and respond shortly.<br/>
            <em>Do not reply to noreply@taxbebo.com — your reply will not be received. Please log in to your account to follow up on this ticket.</em>
          </p>
        </div>
      `;
      await resend.emails.send({
        from: APP_CONFIG.emailFrom,
        to: [userEmail],
        subject: `[${APP_CONFIG.appName}] Ticket Confirmation: ${subject} (${ticketNumber})`,
        html: userCopyHtml,
      });
      console.log(`User copy sent to ${userEmail} for ticket ${ticketNumber}`);
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
