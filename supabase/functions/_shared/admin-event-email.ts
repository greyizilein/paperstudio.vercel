// Shared helper that sends an event email to the admin address.
// Uses Resend if RESEND_API_KEY is configured, otherwise logs to admin_emails table.

const ADMIN_EMAIL = "grey.izilein@gmail.com";

function fromAddress(): string {
  return Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
}

export type AdminEventKind =
  | "signup"
  | "subscription"
  | "commission_credited"
  | "payout_requested"
  | "payout_success"
  | "payout_failed"
  | "complaint";

/** Send a transactional email to any recipient. */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[Email skipped — no RESEND_API_KEY] To: ${opts.to} | ${opts.subject}`);
    return;
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    console.warn(`Resend error ${resp.status}:`, err);
  }
}

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
          from: fromAddress(),
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
