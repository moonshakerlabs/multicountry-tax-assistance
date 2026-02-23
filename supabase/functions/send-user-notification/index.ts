import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Email service not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://taxbebo.com";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, userId, email, data } = await req.json();

    // Fetch user profile for name
    let firstName = "";
    let lastName = "";
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      firstName = profile?.first_name || "";
      lastName = profile?.last_name || "";
    }

    const userName = [firstName, lastName].filter(Boolean).join(" ") || "there";
    let subject = "";
    let htmlBody = "";

    const headerHtml = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 40px; height: 40px; border-radius: 8px; background-color: hsl(20, 90%, 48%);"></div>
        <h1 style="font-size: 20px; font-weight: 700; color: #171717; margin-top: 16px;">TAXBEBO</h1>
      </div>
    `;

    const footerHtml = `
      <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
        <p style="font-size: 12px; color: #a3a3a3;">
          © ${new Date().getFullYear()} TAXBEBO. All rights reserved.<br/>
          <a href="${appUrl}/privacy" style="color: #a3a3a3;">Privacy Policy</a> · 
          <a href="${appUrl}/terms" style="color: #a3a3a3;">Terms & Conditions</a>
        </p>
      </div>
    `;

    const wrapEmail = (content: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
        ${headerHtml}
        ${content}
        ${footerHtml}
      </div>
    `;

    switch (type) {
      case "welcome": {
        subject = "Welcome to TAXBEBO! 🎉";
        htmlBody = wrapEmail(`
          <h2 style="font-size: 18px; color: #171717; margin-bottom: 16px;">Hi ${userName},</h2>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Welcome to <strong>TAXBEBO</strong> — your personal cross-border tax document organiser. We're excited to have you on board!
          </p>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Here's what you can do right away:
          </p>
          <ul style="font-size: 14px; color: #525252; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>📂 Upload and organise your tax documents</li>
            <li>🌍 Connect with taxpayers in your community</li>
            <li>🤝 Securely share files with your tax advisor</li>
            <li>🔒 Keep everything private and compliant</li>
          </ul>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/dashboard" style="display: inline-block; padding: 12px 32px; background-color: hsl(20, 90%, 48%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          <p style="font-size: 14px; color: #525252; line-height: 1.7;">
            If you have any questions, don't hesitate to reach out via our <a href="${appUrl}/support" style="color: hsl(20, 90%, 48%);">Support page</a>.
          </p>
        `);
        break;
      }

      case "subscription_change": {
        const { oldPlan, newPlan, changeType } = data || {};
        const isUpgrade = changeType === "UPGRADE";
        subject = isUpgrade
          ? `Your TAXBEBO plan has been upgraded to ${newPlan}! 🎉`
          : `Your TAXBEBO plan has been changed to ${newPlan}`;

        const upgradeContent = `
          <h2 style="font-size: 18px; color: #171717; margin-bottom: 16px;">Hi ${userName},</h2>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Great news! Your membership has been <strong>upgraded</strong> from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.
          </p>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 24px;">
            You now have access to all the enhanced features that come with your new plan. Explore them from your dashboard!
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/pricing" style="display: inline-block; padding: 12px 32px; background-color: hsl(20, 90%, 48%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              View Your Plan
            </a>
          </div>
        `;

        const downgradeContent = `
          <h2 style="font-size: 18px; color: #171717; margin-bottom: 16px;">Hi ${userName},</h2>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Your membership has been <strong>downgraded</strong> from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.
          </p>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Your current plan features will remain active until your billing cycle ends. If you were using the Secure Vault, you have 30 days to download your files.
          </p>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 24px;">
            You can upgrade again anytime from the Pricing page.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/pricing" style="display: inline-block; padding: 12px 32px; background-color: hsl(20, 90%, 48%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              View Plans
            </a>
          </div>
        `;

        htmlBody = wrapEmail(isUpgrade ? upgradeContent : downgradeContent);
        break;
      }

      case "account_deletion": {
        subject = "We're sorry to see you go — TAXBEBO";
        htmlBody = wrapEmail(`
          <h2 style="font-size: 18px; color: #171717; margin-bottom: 16px;">Hi ${userName},</h2>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            We're sorry to see you go. Your account deletion request has been received.
          </p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #92400e; line-height: 1.7; margin: 0;">
              <strong>📋 Here's how your data will be handled:</strong>
            </p>
            <ul style="font-size: 13px; color: #92400e; line-height: 2; padding-left: 20px; margin: 8px 0 0 0;">
              <li>Your account enters a <strong>30-day cooling-off period</strong></li>
              <li>During this time, you can still access and download your documents from the Secure Vault</li>
              <li>After 30 days, all personal data and documents will be permanently deleted</li>
              <li>If you stored files on Google Drive, the integration link will be disconnected but your Google Drive files remain yours</li>
              <li>Only your email address is retained for abuse prevention</li>
            </ul>
          </div>
          <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
            Changed your mind? Simply log back in within 30 days and contact our support team to cancel the deletion.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/support" style="display: inline-block; padding: 12px 32px; background-color: hsl(20, 90%, 48%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Contact Support
            </a>
          </div>
          <p style="font-size: 14px; color: #525252; line-height: 1.7;">
            Thank you for being part of TAXBEBO. We hope to welcome you back someday.
          </p>
        `);
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const targetEmail = email || (userId ? (await supabase.from("profiles").select("email").eq("id", userId).maybeSingle()).data?.email : null);
    if (!targetEmail) throw new Error("No email address found");

    const { error: sendError } = await resend.emails.send({
      from: "TAXBEBO <noreply@taxbebo.com>",
      to: [targetEmail],
      subject,
      html: htmlBody,
    });

    if (sendError) throw sendError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-user-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
