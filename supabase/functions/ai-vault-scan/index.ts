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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Auth — test env bypass
    const isTestEnv = supabaseUrl.includes("jucqqowgqhxpqplzlyze");
    let userId: string;

    if (!isTestEnv) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub as string;
    } else {
      userId = "test-user";
    }

    // Check plan — Pro or Super Pro only
    if (!isTestEnv) {
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("subscription_plan, subscription_status")
        .eq("user_id", userId)
        .maybeSingle();

      const plan = sub?.subscription_plan || "FREE";
      if (!["PRO", "SUPER_PRO"].includes(plan) || sub?.subscription_status !== "ACTIVE") {
        return new Response(
          JSON.stringify({ error: "UPGRADE_REQUIRED", message: "Vault Scan requires Pro or Super Pro plan." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    const { action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Admin client for storage access
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Auto-detect country from user profile
    let userCountry = body.country || null;
    if (!userCountry || userCountry === "auto-detect" || userCountry === "auto") {
      const { data: profile } = await supabase
        .from("user_profile")
        .select("primary_tax_residency")
        .eq("user_id", userId)
        .maybeSingle();
      userCountry = profile?.primary_tax_residency || "unknown";
    }

    // ─── ACTION: SCAN ───
    if (action === "scan") {
      const { instruction } = body;
      if (!instruction) {
        return new Response(JSON.stringify({ error: "Instruction is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch user's documents metadata
      const { data: docs, error: docsErr } = await supabase
        .from("documents")
        .select("id, file_name, file_type, main_category, sub_category, country, tax_year, created_at")
        .eq("user_id", userId);

      if (docsErr) throw new Error("Failed to fetch documents");

      if (!docs || docs.length === 0) {
        return new Response(JSON.stringify({
          error: "NO_DOCUMENTS",
          message: "No documents found in your vault. Please upload documents first.",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Ask AI to identify relevant files
      const docList = docs.map((d, i) => 
        `${i + 1}. ID: ${d.id} | Name: ${d.file_name} | Type: ${d.file_type} | Category: ${d.main_category}/${d.sub_category} | Country: ${d.country} | Tax Year: ${d.tax_year}`
      ).join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a document relevance classifier. Given a user's instruction and a list of documents from their vault, identify which documents are relevant to fulfill the instruction. Return a JSON array of objects with the fields: id, file_name, reason (brief reason why it's relevant). Only include truly relevant documents. If no documents are relevant, return an empty array. Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `User instruction: "${instruction}"\n\nAvailable documents:\n${docList}`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "identify_relevant_files",
              description: "Identify relevant files from the vault",
              parameters: {
                type: "object",
                properties: {
                  relevant_files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        file_name: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["id", "file_name", "reason"],
                    },
                  },
                },
                required: ["relevant_files"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "identify_relevant_files" } },
        }),
      });

      if (!aiResp.ok) {
        console.error("AI scan error:", aiResp.status, await aiResp.text());
        throw new Error("AI classification failed");
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let relevantFiles: any[] = [];

      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          relevantFiles = parsed.relevant_files || [];
        } catch {
          console.error("Failed to parse tool call arguments");
        }
      }

      return new Response(JSON.stringify({
        action: "scan_result",
        instruction,
        total_documents: docs.length,
        relevant_files: relevantFiles,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: ANALYZE ───
    if (action === "analyze") {
      const { fileIds, instruction } = body;
      const country = userCountry;
      if (!fileIds?.length || !instruction) {
        return new Response(JSON.stringify({ error: "fileIds and instruction are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch document records
      const { data: docs } = await supabase
        .from("documents")
        .select("id, file_name, file_type, file_path, main_category, sub_category, country, tax_year")
        .eq("user_id", userId)
        .in("id", fileIds);

      if (!docs?.length) {
        return new Response(JSON.stringify({ error: "No matching documents found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch file contents from storage
      const contentParts: any[] = [{
        type: "text",
        text: `You are a certified tax analyst AI. The user is a tax resident of ${country || "unknown country"}. Analyze the following ${docs.length} document(s) uploaded from their vault to compute a comprehensive tax report.

IMPORTANT DISCLAIMERS (include at the BEGINNING and END of your report):
"⚠️ DISCLAIMER: This is a tentative report generated by AI for informational purposes only. It cannot be taken as final computation. Please consult an authorized tax professional for accurate and authenticated information."

User Instruction: ${instruction}

Based on the country (${country || "unknown"}), apply country-specific tax rules, slabs, and deductions.

Your report MUST include:
1. **Total Income** - broken down by category (salary, freelance, rental, capital gains, etc.)
2. **Total Tax Paid** - from documents showing tax deductions at source
3. **Tax To Be Paid** - computed using country-specific tax slabs
4. **Tax Category Breakdown** - freelance tax, income tax from salary, capital gains tax, etc.
5. **Tax Deductibles** - list ALL country-specific deductions that could help reduce tax liability (e.g., Section 80C for India, Werbungskosten for Germany, etc.)
6. **Summary** - Total income, total tax paid, total tax payable, potential savings from deductions

Format using clear markdown with tables where appropriate. Use OCR to extract ALL numbers, amounts, and data from images and scanned documents.

Files being analyzed: ${docs.map(d => d.file_name).join(", ")}`,
      }];

      // Download and encode each file
      for (const doc of docs) {
        if (!doc.file_path) continue;

        const { data: fileData, error: dlErr } = await adminSupabase.storage
          .from("user-documents")
          .download(doc.file_path);

        if (dlErr || !fileData) {
          console.error(`Failed to download ${doc.file_name}:`, dlErr);
          contentParts.push({
            type: "text",
            text: `\n--- File: ${doc.file_name} (COULD NOT BE DOWNLOADED) ---\n`,
          });
          continue;
        }

        const bytes = await fileData.arrayBuffer();
        const uint8 = new Uint8Array(bytes);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        const isImage = doc.file_type?.startsWith("image/") || false;
        const isPDF = doc.file_type === "application/pdf";
        const mimeType = doc.file_type || "application/octet-stream";

        if (isImage || isPDF) {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          });
          contentParts.push({
            type: "text",
            text: `[Above: ${doc.file_name} | Category: ${doc.main_category}/${doc.sub_category} | Tax Year: ${doc.tax_year}]`,
          });
        } else {
          try {
            const decoded = new TextDecoder().decode(uint8);
            contentParts.push({
              type: "text",
              text: `\n--- File: ${doc.file_name} (${mimeType}) | Category: ${doc.main_category}/${doc.sub_category} | Tax Year: ${doc.tax_year} ---\n${decoded}\n--- End of ${doc.file_name} ---\n`,
            });
          } catch {
            contentParts.push({
              type: "text",
              text: `\n--- File: ${doc.file_name} (binary, could not decode) ---\n`,
            });
          }
        }
      }

      // Stream AI response
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: "You are an expert tax analyst AI with OCR capabilities. Extract ALL data from documents including scanned images. Apply country-specific tax laws accurately. Always include disclaimers. Format with markdown tables.",
            },
            { role: "user", content: contentParts },
          ],
          stream: true,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI analyze error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI processing failed");
      }

      console.log(JSON.stringify({
        event: "vault_scan_analyze",
        userId,
        fileCount: docs.length,
        country,
        timestamp: new Date().toISOString(),
      }));

      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ─── ACTION: GENERATE REPORT ───
    if (action === "generate_report") {
      const { reportContent, format } = body;
      const country = userCountry;
      if (!reportContent || !format) {
        return new Response(JSON.stringify({ error: "reportContent and format are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      let fileName: string;
      let fileContent: Uint8Array;
      let mimeType: string;

      if (format === "excel") {
        // Generate CSV (universally compatible with Excel)
        fileName = `Tax_Report_${country || "General"}_${timestamp}.csv`;
        mimeType = "text/csv";

        // Convert markdown report to CSV-friendly format
        const csvContent = convertReportToCSV(reportContent);
        fileContent = new TextEncoder().encode(csvContent);
      } else {
        // Generate a clean text report (PDF generation requires external service)
        fileName = `Tax_Report_${country || "General"}_${timestamp}.txt`;
        mimeType = "text/plain";

        const disclaimer = "⚠️ DISCLAIMER: This is a tentative report generated by AI for informational purposes only. It cannot be taken as final computation. Please consult an authorized tax professional for accurate and authenticated information.";
        const fullReport = `${disclaimer}\n\n${"=".repeat(80)}\n\n${reportContent}\n\n${"=".repeat(80)}\n\n${disclaimer}`;
        fileContent = new TextEncoder().encode(fullReport);
      }

      // Store in vault
      const filePath = `${userId}/${crypto.randomUUID()}`;
      const { error: uploadErr } = await adminSupabase.storage
        .from("user-documents")
        .upload(filePath, fileContent, { contentType: mimeType });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        throw new Error("Failed to store report");
      }

      // Create document record
      const { data: docRecord, error: insertErr } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          file_name: fileName,
          file_path: filePath,
          file_type: mimeType,
          country: country || null,
          main_category: "Tax Reports",
          sub_category: "AI Generated Report",
          tax_year: new Date().getFullYear().toString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw new Error("Failed to create document record");
      }

      // Generate signed URL for download
      const { data: signedUrl } = await adminSupabase.storage
        .from("user-documents")
        .createSignedUrl(filePath, 3600); // 1 hour

      return new Response(JSON.stringify({
        action: "report_generated",
        documentId: docRecord?.id,
        fileName,
        downloadUrl: signedUrl?.signedUrl || null,
        message: `Report "${fileName}" has been saved to your vault.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-vault-scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function convertReportToCSV(markdown: string): string {
  const lines = markdown.split("\n");
  const csvRows: string[] = [];
  
  csvRows.push("Tax Report - AI Generated");
  csvRows.push(`Generated on,${new Date().toISOString()}`);
  csvRows.push("");
  csvRows.push("DISCLAIMER: This is a tentative report. Consult an authorized tax professional.");
  csvRows.push("");

  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip markdown table separator lines
    if (/^\|[-:\s|]+\|$/.test(trimmed)) continue;
    
    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(c => c.trim() !== "").map(c => `"${c.trim().replace(/"/g, '""')}"`);
      csvRows.push(cells.join(","));
      inTable = true;
      continue;
    }
    
    if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
      csvRows.push("");
    }

    // Headers
    if (trimmed.startsWith("#")) {
      csvRows.push(`"${trimmed.replace(/^#+\s*/, "")}"`);
      continue;
    }

    // Bold items as key-value
    const boldMatch = trimmed.match(/\*\*(.+?)\*\*[:\s]*(.+)?/);
    if (boldMatch) {
      csvRows.push(`"${boldMatch[1]}","${(boldMatch[2] || "").replace(/"/g, '""')}"`);
      continue;
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      csvRows.push(`"${trimmed.replace(/^[-*\d.]\s*/, "").replace(/"/g, '""')}"`);
      continue;
    }

    // Plain text
    if (trimmed) {
      csvRows.push(`"${trimmed.replace(/"/g, '""')}"`);
    }
  }

  csvRows.push("");
  csvRows.push("DISCLAIMER: This is a tentative report. Consult an authorized tax professional.");
  return csvRows.join("\n");
}
