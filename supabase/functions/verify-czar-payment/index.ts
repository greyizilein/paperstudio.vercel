import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { notifyAdmin } from "../_shared/admin-event-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uerr } = await supabaseUser.auth.getUser();
    if (uerr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { reference } = await req.json();
    if (!reference) return new Response(JSON.stringify({ error: "reference required" }), { status: 400, headers: corsHeaders });

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "verification_failed", detail: verifyData }), { status: 400, headers: corsHeaders });
    }

    const meta = verifyData.data.metadata || {};
    if (meta.product !== "czar" || meta.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "metadata_mismatch" }), { status: 400, headers: corsHeaders });
    }

    const tier = String(meta.tier || "custom");
    const words = Number(meta.words) || 0;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await adminClient
      .from("czar_subscriptions")
      .select("word_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    const newLimit = (existing?.word_limit ?? 0) + words;

    await adminClient
      .from("czar_subscriptions")
      .update({
        tier,
        word_limit: newLimit,
        status: "active",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("user_id", user.id);

    // Referral commission
    const usdAmount = Number(meta.original_usd) || (verifyData.data?.amount ? Number(verifyData.data.amount) / 100 / 1500 : 0);
    let commissionInfo: any = null;
    try {
      const { data: rpcRes, error: rpcErr } = await adminClient.rpc("credit_referral_commission", {
        _referee_id: user.id,
        _amount_usd: usdAmount,
        _payment_ref: reference,
      });
      if (rpcErr) console.error("credit_referral_commission error:", rpcErr);
      else commissionInfo = rpcRes;
    } catch (e) {
      console.error("CZAR referral RPC failed:", e);
    }

    notifyAdmin(
      "subscription",
      `New CZAR ${tier} pack`,
      `User: ${user.email}\nTier: ${tier}\nWords: ${words}\nReference: ${reference}\nAmount: $${usdAmount.toFixed(2)} USD`,
    );
    if (commissionInfo?.credited) {
      notifyAdmin(
        "commission_credited",
        `CZAR referral commission: $${commissionInfo.commission_usd}`,
        `Referrer: ${commissionInfo.referrer_email}\nReferee: ${commissionInfo.referee_email}\nCommission: $${commissionInfo.commission_usd}`,
      );
    }

    return new Response(JSON.stringify({ success: true, ok: true, tier, words_added: words, new_limit: newLimit, commission: commissionInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
