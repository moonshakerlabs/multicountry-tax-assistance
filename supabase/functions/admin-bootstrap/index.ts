import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, email, password, role, targetEmail, targetRole } = await req.json();

    // Action: bootstrap - create initial super admin
    if (action === "bootstrap") {
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "email and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);
      
      if (existing) {
        // User exists, just ensure they have super_admin role
        await adminSupabase.from("user_roles").delete().eq("user_id", existing.id);
        await adminSupabase.from("user_roles").insert({ user_id: existing.id, role: "super_admin" });
        await adminSupabase.from("profiles").update({ role: "super_admin" }).eq("id", existing.id);
        
        return new Response(JSON.stringify({ success: true, message: "Existing user promoted to super_admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create new user
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Set super_admin role
      const userId = newUser.user.id;
      await adminSupabase.from("user_roles").delete().eq("user_id", userId);
      await adminSupabase.from("user_roles").insert({ user_id: userId, role: "super_admin" });
      await adminSupabase.from("profiles").update({ 
        role: "super_admin",
        first_name: "Sujatha",
        last_name: "Kannan",
      }).eq("id", userId);

      // Create super pro subscription
      const { data: existingSub } = await adminSupabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingSub) {
        await adminSupabase.from("user_subscriptions").insert({
          user_id: userId,
          subscription_plan: "SUPER_PRO",
          subscription_status: "ACTIVE",
          billing_cycle: "MONTHLY",
        });
      } else {
        await adminSupabase.from("user_subscriptions").update({
          subscription_plan: "SUPER_PRO",
          subscription_status: "ACTIVE",
        }).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true, message: "Super admin created with SUPER_PRO subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
