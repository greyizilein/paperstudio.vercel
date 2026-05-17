import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "grey.izilein@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { title, message, type = "info", target = "all" } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title and message are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve target user IDs
    let userIds: string[] = [];

    if (target === "all") {
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      if (profiles) userIds = profiles.map((p: any) => p.user_id);
    } else if (typeof target === "string" && target.startsWith("tier:")) {
      const tier = target.replace("tier:", "");
      const { data: subs } = await supabase.from("subscriptions").select("user_id").eq("tier", tier).eq("status", "active");
      if (subs) userIds = subs.map((s: any) => s.user_id);
    }

    userIds = [...new Set(userIds)].filter(Boolean);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No users matched target" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bulk insert notifications
    const notifications = userIds.map((uid) => ({
      user_id: uid,
      title,
      message,
      type,
      read: false,
    }));

    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const { error } = await supabase.from("notifications").insert(notifications.slice(i, i + batchSize));
      if (error) console.error("Batch insert error:", error);
      else inserted += Math.min(batchSize, notifications.length - i);
    }

    return new Response(JSON.stringify({ success: true, notified: inserted, total: userIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("broadcast-notification error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
