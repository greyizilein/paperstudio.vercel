import { notifyAdmin, sendEmail } from "../_shared/admin-event-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, name, referralCode } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: corsHeaders });

    const firstName = name ? name.split(" ")[0] : null;

    // Notify admin
    await notifyAdmin(
      "signup",
      `New signup: ${email}`,
      `Email: ${email}\nName: ${name || "(none)"}\nReferral: ${referralCode || "(none)"}\nWhen: ${new Date().toISOString()}`,
    );

    // Welcome email to the new user
    await sendEmail({
      to: email,
      subject: "Welcome to PaperStudio",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700">
            ${firstName ? `Welcome, ${firstName}` : "Welcome to PaperStudio"} 👋
          </h2>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#444">
            Your account is ready. PaperStudio is your AI-powered writing workspace — generate chapters,
            apply corrections, and polish academic work from one place.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">
            Head to <a href="https://paperstudio.vercel.app" style="color:#6366f1;text-decoration:none">paperstudio.vercel.app</a>
            to get started.
          </p>
          <p style="margin:0;font-size:13px;color:#999">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
