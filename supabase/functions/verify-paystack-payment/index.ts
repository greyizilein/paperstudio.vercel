import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/admin-event-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_LIMITS: Record<string, number> = {
  undergraduate: 50000,
  masters: 80000,
  phd: 120000,
  enterprise: 200000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const { reference } = await req.json();
    if (!reference) return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: corsHeaders });

    // Verify transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.status) {
      throw new Error(`Paystack verification failed: ${JSON.stringify(verifyData)}`);
    }

    const txn = verifyData.data;
    if (txn.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment not successful", status: txn.status }), { status: 400, headers: corsHeaders });
    }

    const metadata = txn.metadata || {};
    const userId = metadata.user_id;
    const tier = metadata.tier;
    const wordLimit = TIER_LIMITS[tier] || metadata.word_limit || 3000;

    if (!userId || !tier) {
      return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400, headers: corsHeaders });
    }

    // Update subscription using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        tier,
        word_limit: wordLimit,
        words_used: 0,
        status: "active",
      })
      .eq("user_id", userId);

    if (updateErr) throw updateErr;

    // Compute USD value of this payment
    const usdAmount = Number(metadata.original_usd) || (txn.amount ? Number(txn.amount) / 100 / 1500 : 0);

    // Get auth user for emails
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email || "(unknown)";
    const userName = authUser?.user?.user_metadata?.full_name || userEmail;

    // Credit referral commission via RPC
    let commissionInfo: any = null;
    try {
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("credit_referral_commission", {
        _referee_id: userId,
        _amount_usd: usdAmount,
        _payment_ref: reference,
      });
      if (rpcErr) console.error("credit_referral_commission error:", rpcErr);
      else commissionInfo = rpcRes;
    } catch (e) {
      console.error("Referral commission RPC failed (non-fatal):", e);
    }

    // Admin notifications (fire-and-forget)
    notifyAdmin(
      "subscription",
      `New ${tier} subscription`,
      `User: ${userName} (${userEmail})\nTier: ${tier}\nReference: ${reference}\nAmount: $${usdAmount.toFixed(2)} USD`,
    );
    if (commissionInfo?.credited) {
      notifyAdmin(
        "commission_credited",
        `Referral commission credited: $${commissionInfo.commission_usd}`,
        `Referrer: ${commissionInfo.referrer_email}\nReferee: ${commissionInfo.referee_email}\nCommission: $${commissionInfo.commission_usd}\nPayment: ${reference}`,
      );
    }

    return new Response(JSON.stringify({
      success: true,
      tier,
      word_limit: wordLimit,
      commission: commissionInfo,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("verify-paystack-payment error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
