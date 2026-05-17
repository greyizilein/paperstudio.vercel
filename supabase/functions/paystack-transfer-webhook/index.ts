import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/admin-event-email.ts";

// Paystack transfer webhook — does NOT require JWT (signed by Paystack)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-paystack-signature",
};

async function hmacSha512Hex(key: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const raw = await req.text();
    const sig = req.headers.get("x-paystack-signature");
    if (sig) {
      const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, raw);
      if (sig !== expected) {
        console.warn("Invalid Paystack signature");
        return new Response("invalid signature", { status: 401 });
      }
    }
    const body = JSON.parse(raw);
    const event: string = body.event;
    const data = body.data || {};
    const transferCode = data.transfer_code;

    if (!event?.startsWith("transfer.") || !transferCode) {
      return new Response("ignored", { status: 200, headers: corsHeaders });
    }

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: payout } = await svc.from("referral_payouts")
      .select("*").eq("paystack_transfer_code", transferCode).maybeSingle();
    if (!payout) {
      console.warn("No payout for transfer_code", transferCode);
      return new Response("no payout", { status: 200, headers: corsHeaders });
    }

    if (event === "transfer.success") {
      await svc.from("referral_payouts").update({
        status: "success",
        completed_at: new Date().toISOString(),
      }).eq("id", payout.id);
      await svc.from("notifications").insert({
        user_id: payout.user_id,
        title: "Payout sent",
        message: `Your $${Number(payout.amount_usd).toFixed(2)} payout was sent to your bank account.`,
        type: "success",
      });
      notifyAdmin("payout_success", `Payout success ($${payout.amount_usd})`,
        `Transfer ${transferCode} completed for user ${payout.user_id}.`);
    } else if (event === "transfer.failed" || event === "transfer.reversed") {
      await svc.from("referral_payouts").update({
        status: "failed",
        failure_reason: data.reason || event,
      }).eq("id", payout.id);
      // Refund wallet
      await svc.rpc("refund_wallet_after_failed_payout", { _user_id: payout.user_id, _amount: payout.amount_usd });
      await svc.from("notifications").insert({
        user_id: payout.user_id,
        title: "Payout failed",
        message: `Your $${Number(payout.amount_usd).toFixed(2)} payout could not be completed and was refunded to your wallet. Reason: ${data.reason || event}.`,
        type: "warning",
      });
      notifyAdmin("payout_failed", `Payout failed ($${payout.amount_usd})`,
        `Transfer ${transferCode} failed: ${data.reason || event}. Wallet refunded.`);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("paystack-transfer-webhook error:", err);
    return new Response(err.message, { status: 500, headers: corsHeaders });
  }
});
