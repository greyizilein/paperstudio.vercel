import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fixed NGN amounts (~₦1500/USD) — matches the USD shown in the UI exactly.
const TIER_NGN: Record<string, number> = {
  plus: 30_000,      // $20
  starter: 75_000,   // $50 (legacy)
  standard: 150_000, // $100 (legacy)
  pro: 180_000,      // $120 (legacy)
};
const TIER_WORDS: Record<string, number> = {
  plus: 50_000,
  starter: 20_000,
  standard: 40_000,
  pro: 80_000,
};
const TIER_USD_DISPLAY: Record<string, number> = {
  plus: 20,
  starter: 50,
  standard: 100,
  pro: 120,
};

// Back-compat aliases for any in-flight checkouts using old keys.
const TIER_ALIASES: Record<string, string> = {
  undergraduate: "starter",
  masters: "standard",
  phd: "pro",
};

const CUSTOM_USD_PER_WORD = 0.009;
const FALLBACK_NGN_RATE = 1500;

async function getUsdToNgnRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("rate api fail");
    const d = await res.json();
    const r = d?.rates?.NGN;
    if (typeof r === "number" && r > 0) return r;
    throw new Error("bad rate");
  } catch {
    return FALLBACK_NGN_RATE;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const rawTier = String(body?.tier || "").toLowerCase();
    const tierKey = TIER_ALIASES[rawTier] || rawTier;
    const callback_url = body?.callback_url || "";

    let amountInKobo: number;
    let words: number;
    let usdDisplay: number;

    if (tierKey === "custom") {
      words = Math.max(2000, Math.min(500_000, Number(body?.custom_words) || 0));
      const ngnRate = await getUsdToNgnRate();
      usdDisplay = Math.max(2, Math.round(words * CUSTOM_USD_PER_WORD * 100) / 100);
      amountInKobo = Math.round(usdDisplay * ngnRate * 100);
    } else if (TIER_NGN[tierKey]) {
      words = TIER_WORDS[tierKey];
      usdDisplay = TIER_USD_DISPLAY[tierKey];
      amountInKobo = TIER_NGN[tierKey] * 100;
    } else {
      return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: corsHeaders });
    }

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: "NGN",
        callback_url,
        metadata: {
          product: "czar",
          user_id: user.id,
          tier: tierKey,
          words,
          original_usd: usdDisplay,
        },
      }),
    });

    const psData = await psRes.json();
    if (!psRes.ok || !psData.status) throw new Error(`Paystack: ${JSON.stringify(psData)}`);

    return new Response(JSON.stringify({
      authorization_url: psData.data.authorization_url,
      reference: psData.data.reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
