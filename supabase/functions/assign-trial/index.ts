import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, email } = await req.json();
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "userId and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is a returning user (deleted account)
    const { data: archivedUser } = await adminSupabase
      .from("archived_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const isReturningUser = !!archivedUser;

    // Check if subscription already exists
    const { data: existingSub } = await adminSupabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSub) {
      return new Response(JSON.stringify({ message: "Subscription already exists", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscription config
    const { data: configRows } = await adminSupabase
      .from("subscription_config")
      .select("config_key, config_value");

    const config: Record<string, string> = {};
    configRows?.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    const defaultTrialDays = parseInt(config["default_trial_days"] || "30");
    const defaultTrialPlan = config["default_trial_plan"] || "PRO";
    const earlyAccessEnabled = config["early_access_enabled"] === "true";
    const earlyAccessDeadline = config["early_access_deadline"] || "";
    const earlyAccessFreemiumDays = parseInt(config["early_access_freemium_days"] || "180");
    const earlyAccessProDays = parseInt(config["early_access_pro_days"] || "90");

    const now = new Date();

    // Determine if early access applies
    const isWithinEarlyAccess =
      earlyAccessEnabled &&
      earlyAccessDeadline &&
      now < new Date(earlyAccessDeadline + "T23:59:59Z");

    let subscriptionPlan: string;
    let trialEndDate: Date;
    let trialPlan: string;
    let isEarlyAccessUser = false;
    let earlyAccessFreemiumEnd: string | null = null;
    let earlyAccessProEnd: string | null = null;

    if (isReturningUser) {
      // Returning users get FREE plan, no trial
      subscriptionPlan = "FREE";
      trialEndDate = now;
      trialPlan = "FREE";
    } else if (isWithinEarlyAccess) {
      // Early access: start with Pro trial for earlyAccessProDays,
      // then Freemium until earlyAccessFreemiumDays
      isEarlyAccessUser = true;
      subscriptionPlan = "PRO"; // Start at highest tier
      trialPlan = "PRO";
      trialEndDate = new Date(now.getTime() + earlyAccessProDays * 24 * 60 * 60 * 1000);
      earlyAccessProEnd = trialEndDate.toISOString();
      earlyAccessFreemiumEnd = new Date(now.getTime() + earlyAccessFreemiumDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Default trial
      subscriptionPlan = defaultTrialPlan;
      trialPlan = defaultTrialPlan;
      trialEndDate = new Date(now.getTime() + defaultTrialDays * 24 * 60 * 60 * 1000);
    }

    // Create subscription
    const { error: subError } = await adminSupabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        subscription_plan: subscriptionPlan,
        subscription_status: "ACTIVE",
        billing_cycle: "MONTHLY",
        subscription_start_date: now.toISOString(),
        is_trial: !isReturningUser,
        trial_start_date: isReturningUser ? null : now.toISOString(),
        trial_end_date: isReturningUser ? null : trialEndDate.toISOString(),
        trial_plan: isReturningUser ? null : trialPlan,
        early_access_user: isEarlyAccessUser,
        early_access_freemium_end: earlyAccessFreemiumEnd,
        early_access_pro_end: earlyAccessProEnd,
      });

    if (subError) {
      console.error("Subscription insert error:", subError);
      throw new Error("Failed to create subscription");
    }

    // Log in subscription history
    await adminSupabase.from("subscription_history").insert({
      user_id: userId,
      plan: subscriptionPlan,
      billing_cycle: "MONTHLY",
      change_type: isReturningUser ? "RETURNING_USER" : "NEW_SIGNUP",
      price_at_purchase: 0,
      is_legacy_applied: false,
    });

    return new Response(
      JSON.stringify({
        message: "Subscription created",
        plan: subscriptionPlan,
        is_trial: !isReturningUser,
        trial_end_date: isReturningUser ? null : trialEndDate.toISOString(),
        early_access: isEarlyAccessUser,
        returning_user: isReturningUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("assign-trial error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
