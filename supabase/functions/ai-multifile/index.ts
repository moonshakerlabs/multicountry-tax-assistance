import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-custom-ai-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan limits
const PLAN_LIMITS: Record<string, { maxFiles: number; maxSizeMB: number }> = {
  FREEMIUM: { maxFiles: 5, maxSizeMB: 25 },
  PRO: { maxFiles: 25, maxSizeMB: 200 },
  SUPER_PRO: { maxFiles: 100, maxSizeMB: 1024 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check if test environment — skip auth and paywall
    const isTestEnv = Deno.env.get("SUPABASE_URL")?.includes("jucqqowgqhxpqplzlyze") ?? false;

    let user: { id: string } | null = null;

    if (!isTestEnv) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    } else {
      user = { id: "test-user" };
    }

    let plan = "SUPER_PRO"; // default for test
    if (!isTestEnv) {
      // Check if user is super_admin — bypass paywall
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await adminSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (roleData) {
        plan = "SUPER_PRO";
      } else {
        const { data: sub } = await adminSupabase
          .from("user_subscriptions")
          .select("subscription_plan, subscription_status")
          .eq("user_id", user.id)
          .maybeSingle();

        plan = sub?.subscription_plan || "FREE";
        if (plan === "FREE" || sub?.subscription_status !== "ACTIVE") {
          return new Response(
            JSON.stringify({ error: "UPGRADE_REQUIRED", message: "This feature requires a paid plan." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREEMIUM;

    // Parse multipart form data
    const formData = await req.formData();
    const instruction = formData.get("instruction") as string;
    if (!instruction) {
      return new Response(JSON.stringify({ error: "Instruction is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect files
    const files: { name: string; type: string; base64: string }[] = [];
    let totalSize = 0;

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        if (files.length >= limits.maxFiles) {
          return new Response(
            JSON.stringify({
              error: `File limit exceeded. Your plan allows ${limits.maxFiles} files per session.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const bytes = await value.arrayBuffer();
        totalSize += bytes.byteLength;

        if (totalSize > limits.maxSizeMB * 1024 * 1024) {
          return new Response(
            JSON.stringify({
              error: `Size limit exceeded. Your plan allows ${limits.maxSizeMB}MB total.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Convert to base64 for multimodal AI
        const uint8 = new Uint8Array(bytes);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        files.push({
          name: value.name,
          type: value.type || "application/octet-stream",
          base64,
        });
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "At least one file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build multimodal message for AI
    const contentParts: any[] = [
      {
        type: "text",
        text: `You are an AI document analyst. The user has uploaded ${files.length} file(s). Process them according to the instruction below. Be thorough, accurate, and well-structured in your response. Use markdown formatting.\n\nUser Instruction: ${instruction}\n\nFile names: ${files.map((f) => f.name).join(", ")}`,
      },
    ];

    // Add files as inline data — images and PDFs go as visual content for OCR/parsing
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (isImage || isPDF) {
        // Gemini natively supports images and PDFs as inline visual data
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${file.type};base64,${file.base64}`,
          },
        });
        contentParts.push({
          type: "text",
          text: `[Above: ${file.name}]`,
        });
      } else {
        // Text-based files: CSV, TXT, JSON, XML etc — decode as text
        try {
          const decoded = new TextDecoder().decode(
            Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))
          );
          contentParts.push({
            type: "text",
            text: `\n--- File: ${file.name} (${file.type}) ---\n${decoded}\n--- End of ${file.name} ---\n`,
          });
        } catch {
          contentParts.push({
            type: "text",
            text: `\n--- File: ${file.name} (binary, could not decode as text) ---\n`,
          });
        }
      }
    }

    // Resolve AI API key & gateway: only use custom values if non-empty and valid
    const customApiKey = Deno.env.get("AI_API_KEY")?.trim();
    const customGatewayUrl = Deno.env.get("AI_GATEWAY_URL")?.trim();
    const isValidCustomGateway = customGatewayUrl && customGatewayUrl.startsWith("http") && customGatewayUrl.includes("/chat/completions");
    const useCustom = !!(customApiKey && customApiKey.length > 0 && isValidCustomGateway);
    const aiApiKey = useCustom ? customApiKey : Deno.env.get("LOVABLE_API_KEY");
    const aiGatewayUrl = useCustom
      ? customGatewayUrl
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    if (!aiApiKey) {
      throw new Error("AI API key not configured. Please contact support.");
    }

    // Stream response from AI
    const aiResponse = await fetch(
      aiGatewayUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(useCustom ? {} : { model: "google/gemini-2.5-pro" }),
          messages: [
            {
              role: "system",
              content:
                "You are a precise document analyst with OCR capabilities. When files contain images, scanned pages, or embedded visuals, use OCR to extract ALL text, numbers, tables, and data from them. Never say you cannot read an image — always attempt to extract data from every visual element. Analyze uploaded files and follow the user's instruction exactly. Format your response in clear markdown with tables where appropriate. Never store, remember, or reference these files after this response. This is a zero-retention processing session.",
            },
            { role: "user", content: contentParts },
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage (no file content, just metadata)
    console.log(
      JSON.stringify({
        event: "multifile_ai",
        userId: user.id,
        plan,
        fileCount: files.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Stream response back — all file data is now garbage collected
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-multifile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
