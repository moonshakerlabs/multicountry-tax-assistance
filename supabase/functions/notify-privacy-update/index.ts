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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://taxbebo.com";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("is_any_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Only admins can trigger privacy policy notifications");

    // Fetch all user emails
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email");
    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emails = profiles.map((p: any) => p.email).filter(Boolean);
    const privacyUrl = `${appUrl}/privacy`;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Send in batches of 49 (1 dummy to + 49 bcc to protect recipient privacy)
      const batchSize = 49;
      let sent = 0;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        await resend.emails.send({
          from: "TAXBEBO <noreply@taxbebo.com>",
          to: "noreply@taxbebo.com",
          bcc: batch,
          subject: "Privacy Policy Updated - TAXBEBO",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 40px; height: 40px; border-radius: 8px; background-color: hsl(20, 90%, 48%);"></div>
                <h1 style="font-size: 20px; font-weight: 700; color: #171717; margin-top: 16px;">Privacy Policy Update</h1>
              </div>
              <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 16px;">
                We have updated our Privacy Policy. We encourage you to review the changes to understand how we handle your data.
              </p>
              <p style="font-size: 14px; color: #525252; line-height: 1.7; margin-bottom: 24px;">
                Your privacy remains our top priority. If you have any questions, please reach out to our support team.
              </p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${privacyUrl}" style="display: inline-block; padding: 12px 32px; background-color: hsl(20, 90%, 48%); color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  View Privacy Policy
                </a>
              </div>
              <p style="font-size: 12px; color: #a3a3a3; text-align: center;">
                © ${new Date().getFullYear()} TAXBEBO. All rights reserved.
              </p>
            </div>
          `,
        });
        sent += batch.length;
      }

      return new Response(JSON.stringify({ message: `Notified ${sent} users` }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in notify-privacy-update:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
