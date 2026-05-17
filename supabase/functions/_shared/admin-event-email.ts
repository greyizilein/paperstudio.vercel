// Shared helper that sends an event email to the admin address.
// Uses Resend if RESEND_API_KEY is configured, otherwise logs to admin_emails table.

const ADMIN_EMAIL = "grey.izilein@gmail.com";

export type AdminEventKind =
  | "signup"
  | "subscription"
  | "commission_credited"
  | "payout_requested"
  | "payout_success"
  | "payout_failed";

export async function notifyAdmin(
  kind: AdminEventKind,
  subject: string,
  body: string,
): Promise<void> {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PaperStudio <noreply@paperstudio.app>",
          to: [ADMIN_EMAIL],
          subject: `[${kind}] ${subject}`,
          html: body.replace(/\n/g, "<br>"),
          text: body,
        }),
      }).catch((e) => console.warn("Resend admin notify failed:", e));
    }

    // Also log into admin_emails for the dashboard (best-effort)
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await svc.from("admin_emails").insert({
      to_email: ADMIN_EMAIL,
      subject: `[${kind}] ${subject}`,
      body,
      sent_count: RESEND_API_KEY ? 1 : 0,
    }).then(() => {}, (e: any) => console.warn("admin_emails log failed:", e?.message));
  } catch (e) {
    console.warn("notifyAdmin error:", e);
  }
}
