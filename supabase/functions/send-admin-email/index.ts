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
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { to, subject, body } = await req.json();

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "subject and body are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve recipients
    let recipients: string[] = [];
    let toTier: string | null = null;

    if (to === "all") {
      // Fetch all user emails
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p: any) => p.user_id);
        // Get emails from auth.users via admin API
        for (const uid of userIds) {
          const { data: u } = await supabase.auth.admin.getUserById(uid);
          if (u?.user?.email) recipients.push(u.user.email);
        }
      }
    } else if (typeof to === "string" && to.startsWith("tier:")) {
      toTier = to.replace("tier:", "");
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("tier", toTier)
        .eq("status", "active");
      if (subs && subs.length > 0) {
        for (const sub of subs) {
          const { data: u } = await supabase.auth.admin.getUserById(sub.user_id);
          if (u?.user?.email) recipients.push(u.user.email);
        }
      }
    } else if (typeof to === "string") {
      recipients = [to];
    } else if (Array.isArray(to)) {
      recipients = to;
    }

    recipients = [...new Set(recipients)].filter(Boolean);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY) {
      // Log email intent without actually sending (dev mode)
      console.log(`[Email would be sent] To: ${recipients.join(", ")} | Subject: ${subject}`);
      await supabase.from("admin_emails").insert({
        to_email: recipients.join(", "),
        to_tier: toTier,
        subject,
        body,
        sent_count: recipients.length,
      });
      return new Response(JSON.stringify({
        success: true,
        note: "RESEND_API_KEY not configured — email logged but not sent",
        recipients: recipients.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send via Resend (batch up to 50 per call)
    const batchSize = 50;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `PaperStudio <noreply@paperstudio.app>`,
          to: batch,
          subject,
          html: body.replace(/\n/g, "<br>"),
          text: body,
        }),
      });

      if (!resendResp.ok) {
        const errText = await resendResp.text();
        console.error("Resend error:", resendResp.status, errText);
      } else {
        sent += batch.length;
      }
    }

    // Log to admin_emails table
    await supabase.from("admin_emails").insert({
      to_email: recipients.join(", "),
      to_tier: toTier,
      subject,
      body,
      sent_count: sent,
    });

    return new Response(JSON.stringify({ success: true, sent, total: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-admin-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
