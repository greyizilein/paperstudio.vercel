import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Undergraduate: fixed ₦45,000 NGN (displayed as $30 USD on the site).
// We never convert this — the price the user clicks IS the price they pay in NGN.
const UNDERGRADUATE_NGN = 45_000;
// Masters and PhD: fixed NGN amounts (displayed as $150 / $280 USD on the site).
// Locked here so the Paystack total always matches the site price exactly,
// regardless of daily exchange-rate movement.
const TIER_NGN: Record<string, number> = {
  masters: 225_000,  // $150 @ ~₦1500
  phd:     420_000,  // $280 @ ~₦1500
};
const TIER_USD_DISPLAY: Record<string, number> = {
  undergraduate: 30,
  masters: 150,
  phd: 280,
};

const PAPERSTUDIO_CUSTOM_USD_PER_WORD = 0.027;
const FALLBACK_NGN_RATE = 1600;

async function getUsdToNgnRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Exchange API error");
    const data = await res.json();
    const rate = data?.rates?.NGN;
    if (typeof rate === "number" && rate > 0) return rate;
    throw new Error("Invalid rate");
  } catch (err) {
    console.warn("Failed to fetch live rate, using fallback:", err);
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userId = user.id;
    const email = user.email!;

    const { tier, custom_words, callback_url } = await req.json();
    const tierKey = (tier || "").toLowerCase();

    let amountInKobo: number;
    let wordLimit: number;
    let originalUsd: number | null = null;
    let ngnRate: number | null = null;

    if (tierKey === "undergraduate") {
      // Fixed NGN amount — no conversion needed. Site shows $30, user pays ₦45,000.
      amountInKobo = UNDERGRADUATE_NGN * 100; // NGN → kobo
      wordLimit = 50_000;
      originalUsd = TIER_USD_DISPLAY.undergraduate;
      console.log(`Checkout: tier=undergraduate, NGN=₦${UNDERGRADUATE_NGN}, kobo=${amountInKobo}`);

    } else if (TIER_NGN[tierKey]) {
      // Fixed NGN amount — no conversion. Site shows USD, user pays the locked NGN.
      amountInKobo = TIER_NGN[tierKey] * 100;
      wordLimit = tierKey === "masters" ? 80_000 : 100_000;
      originalUsd = TIER_USD_DISPLAY[tierKey];
      console.log(`Checkout: tier=${tierKey}, NGN=₦${TIER_NGN[tierKey]}, USD=$${originalUsd}, kobo=${amountInKobo}`);

    } else if (tierKey === "custom") {
      // Custom: $0.027/word, convert at live rate, unlocks PhD-level features
      const words = Math.max(1000, Math.min(500_000, Number(custom_words) || 10_000));
      ngnRate = await getUsdToNgnRate();
      originalUsd = Math.max(5, Math.round(words * PAPERSTUDIO_CUSTOM_USD_PER_WORD * 100) / 100);
      amountInKobo = Math.round(originalUsd * ngnRate * 100);
      wordLimit = words;
      console.log(`Checkout: tier=custom, words=${words}, USD=$${originalUsd}, rate=${ngnRate}, kobo=${amountInKobo}`);

    } else {
      return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: corsHeaders });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: "NGN",
        callback_url: callback_url || "",
        metadata: {
          product: "paperstudio",
          user_id: userId,
          tier: tierKey,
          word_limit: wordLimit,
          original_usd: originalUsd,
          exchange_rate: ngnRate,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      throw new Error(`Paystack error: ${JSON.stringify(paystackData)}`);
    }

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("create-paystack-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
