import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/admin-event-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_PAYOUT_USD = 5;
const FALLBACK_NGN_RATE = 1600;

async function getNgnRate(): Promise<number> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const d = await r.json();
    const rate = d?.rates?.NGN;
    return typeof rate === "number" && rate > 0 ? rate : FALLBACK_NGN_RATE;
  } catch {
    return FALLBACK_NGN_RATE;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: ue } = await userClient.auth.getUser();
    if (ue || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Profile for bank info
    const { data: profile } = await svc.from("profiles")
      .select("display_name, bank_name, account_number")
      .eq("user_id", user.id).maybeSingle();

    if (!profile?.bank_name || !profile?.account_number) {
      return new Response(JSON.stringify({ error: "missing_bank_details", message: "Add your bank name and account number in Settings before requesting a payout." }), { status: 400, headers: corsHeaders });
    }

    // Wallet
    const { data: wallet } = await svc.from("referral_wallets")
      .select("balance_usd").eq("user_id", user.id).maybeSingle();
    const balance = Number(wallet?.balance_usd ?? 0);
    if (balance < MIN_PAYOUT_USD) {
      return new Response(JSON.stringify({ error: "below_minimum", message: `Minimum payout is $${MIN_PAYOUT_USD}. Current balance: $${balance.toFixed(2)}` }), { status: 400, headers: corsHeaders });
    }

    // Atomic deduct
    const { data: deducted, error: deductErr } = await svc.rpc("deduct_wallet_for_payout", { _user_id: user.id, _amount: balance });
    if (deductErr || !deducted) {
      return new Response(JSON.stringify({ error: "wallet_deduction_failed" }), { status: 400, headers: corsHeaders });
    }

    const rate = await getNgnRate();
    const amountNgn = Math.round(balance * rate);

    // 1. Resolve bank -> get bank_code (Paystack expects code, not name).
    //    The user input may be a name; we attempt to lookup.
    let bankCode: string | null = null;
    try {
      const banksRes = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=200", {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const banksData = await banksRes.json();
      const banks: any[] = banksData?.data || [];
      const target = profile.bank_name!.trim().toLowerCase();
      const match = banks.find((b) => b.name.toLowerCase() === target)
        || banks.find((b) => b.name.toLowerCase().includes(target) || target.includes(b.name.toLowerCase()));
      bankCode = match?.code || null;
    } catch (e) {
      console.warn("bank list fetch failed:", e);
    }
    if (!bankCode) {
      // Refund and abort
      await svc.rpc("refund_wallet_after_failed_payout", { _user_id: user.id, _amount: balance });
      return new Response(JSON.stringify({ error: "bank_not_recognised", message: "We couldn't match your bank to Paystack's list. Please use the official bank name in Settings." }), { status: 400, headers: corsHeaders });
    }

    // 2. Create transfer recipient
    const recipRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "nuban",
        name: profile.display_name || user.email,
        account_number: profile.account_number,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });
    const recipData = await recipRes.json();
    if (!recipRes.ok || !recipData.status) {
      await svc.rpc("refund_wallet_after_failed_payout", { _user_id: user.id, _amount: balance });
      return new Response(JSON.stringify({ error: "recipient_creation_failed", detail: recipData }), { status: 400, headers: corsHeaders });
    }
    const recipientCode = recipData.data.recipient_code;
    const accountName = recipData.data.details?.account_name || null;

    // 3. Initiate transfer
    const reference = `payout_${user.id.slice(0, 8)}_${Date.now()}`;
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "balance",
        amount: amountNgn * 100, // kobo
        recipient: recipientCode,
        reason: `PaperStudio referral payout for ${user.email}`,
        reference,
      }),
    });
    const transferData = await transferRes.json();

    const transferOk = transferRes.ok && transferData.status;
    const transferCode = transferData?.data?.transfer_code || null;
    const transferStatus = transferData?.data?.status || (transferOk ? "processing" : "failed");
    const status = transferOk ? (transferStatus === "success" ? "success" : "processing") : "failed";

    const { data: payoutRow } = await svc.from("referral_payouts").insert({
      user_id: user.id,
      amount_usd: balance,
      amount_ngn: amountNgn,
      exchange_rate: rate,
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      account_name: accountName,
      paystack_recipient_code: recipientCode,
      paystack_transfer_code: transferCode,
      status,
      failure_reason: transferOk ? null : (transferData?.message || "transfer_failed"),
      completed_at: status === "success" ? new Date().toISOString() : null,
    }).select().single();

    if (!transferOk) {
      // Refund wallet
      await svc.rpc("refund_wallet_after_failed_payout", { _user_id: user.id, _amount: balance });
      notifyAdmin("payout_failed", `Payout failed for ${user.email}`,
        `User: ${user.email}\nAmount: $${balance.toFixed(2)} (₦${amountNgn})\nReason: ${transferData?.message || "unknown"}\nDetail: ${JSON.stringify(transferData)}`);
      return new Response(JSON.stringify({ error: "transfer_failed", detail: transferData, payout_id: payoutRow?.id }), { status: 400, headers: corsHeaders });
    }

    await svc.from("notifications").insert({
      user_id: user.id,
      title: "Payout requested",
      message: `Your payout of $${balance.toFixed(2)} (₦${amountNgn.toLocaleString()}) is being processed.`,
      type: "info",
    });

    notifyAdmin("payout_requested", `Payout requested by ${user.email}`,
      `User: ${user.email}\nAmount: $${balance.toFixed(2)} (₦${amountNgn})\nBank: ${profile.bank_name}\nAccount: ${profile.account_number}\nTransfer code: ${transferCode}`);

    return new Response(JSON.stringify({
      success: true,
      payout_id: payoutRow?.id,
      amount_usd: balance,
      amount_ngn: amountNgn,
      status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("request-referral-payout error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
