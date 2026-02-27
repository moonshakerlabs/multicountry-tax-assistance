import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    // Find users who signed up exactly 7 days ago (within a 1-day window)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfDay = new Date(sevenDaysAgo);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sevenDaysAgo);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, first_name")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there are active feedback questions
    const { data: questions } = await supabase
      .from("feedback_questions")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ message: "No active feedback questions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://multicountry-tax-assistance.lovable.app";
    let sent = 0;

    for (const user of users) {
      // Check if user already submitted feedback
      const { data: existing } = await supabase
        .from("feedback_responses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const name = user.first_name || "there";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TAXBEBO <noreply@taxbebo.com>",
          to: [user.email],
          subject: "We'd love your feedback! 🌟",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1a1a1a;">Hi ${name},</h2>
              <p style="color: #555; line-height: 1.6;">
                You've been using TAXBEBO for a week now, and we'd love to hear your thoughts!
                Your feedback helps us build a better platform for everyone.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/feedback" 
                   style="display: inline-block; padding: 14px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Share Your Feedback
                </a>
              </div>
              <p style="color: #999; font-size: 12px;">
                This is an automated message from TAXBEBO. Please do not reply to this email.
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) sent++;
    }

    return new Response(JSON.stringify({ message: `Sent feedback emails to ${sent} users` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
