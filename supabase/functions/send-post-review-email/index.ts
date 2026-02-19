import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_CONFIG = {
  appName: "TAXBEBO",
  emailFrom: "TAXBEBO <noreply@taxbebo.com>",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorEmail, postTitle, reason } = await req.json();

    if (!authorEmail || !postTitle || !reason) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendKey);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Your TaxOverFlow post needs revision</h2>
        <p style="color: #444;">Hello,</p>
        <p style="color: #444;">
          Your post titled <strong>"${postTitle}"</strong> on <strong>TaxOverFlow</strong> has been returned for review 
          by our moderation team. Please revise it based on the reason below before it can be published.
        </p>
        <div style="background: #fff8f0; border-left: 4px solid #f97316; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <strong style="color: #c2410c;">Reason for Review:</strong>
          <p style="margin: 8px 0 0; color: #333; white-space: pre-wrap;">${reason}</p>
        </div>
        <p style="color: #444;">
          Please review our <strong>Community Guidelines</strong> and submit a new post that adheres to them.
          If you believe this was an error, please contact our support team.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message from the ${APP_CONFIG.appName} moderation team.<br/>
          <em>Do not reply to this email — replies to noreply@taxbebo.com will not be received.</em>
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: APP_CONFIG.emailFrom,
      to: [authorEmail],
      subject: `[${APP_CONFIG.appName}] Your post requires revision`,
      html,
    });

    console.log(`Review email sent to ${authorEmail}:`, JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-post-review-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
