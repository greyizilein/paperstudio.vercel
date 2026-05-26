import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDocument } from "./builder.ts";
import { StyleProfile } from "../_shared/style-extractor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { content, styleId } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), { status: 400, headers: corsHeaders });
    }

    let profile: StyleProfile = {
      font: "Times New Roman",
      fontSize: 12,
      lineSpacing: 1.5,
      alignment: "justify",
    };

    if (styleId) {
      const { data: styleRow } = await supabase
        .from("doc_styles")
        .select("profile")
        .eq("id", styleId)
        .eq("user_id", user.id)
        .single();
      if (styleRow?.profile) profile = styleRow.profile as StyleProfile;
    }

    const docBuffer = await buildDocument(content, profile);

    return new Response(docBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="czar-document.docx"',
      },
    });
  } catch (err) {
    console.error("export-docx-styled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
