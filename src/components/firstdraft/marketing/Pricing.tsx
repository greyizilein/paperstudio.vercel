import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pricing aligned with settings page: Free $0 / Undergrad $30 / Masters $150 / PhD $280.
// Aubergine primary, "Most popular" amber chip on Masters tier.
// Aubergine primary, "Most popular" amber chip on Masters tier.
type Feature = { label: string; included: boolean };

const tiers: Array<{
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  cta: string;
  highlighted: boolean;
  variant: "light" | "primary" | "dark";
}> = [
  {
    name: "Free",
    price: "$0",
    period: "Forever",
    description: "Chapter 1 for every project.",
    features: [
      { label: "Chapter 1 only (3,000 words)", included: true },
      { label: "Harvard & APA only", included: true },
      { label: "Plain text export", included: true },
      { label: "Claude Sonnet 4.6", included: false },
      { label: "Word / PDF export", included: false },
      { label: "Data analysis", included: false },
      { label: "Grammar pipeline", included: false },
    ],
    cta: "Start free",
    highlighted: false,
    variant: "light",
  },
  {
    name: "Undergraduate",
    price: "$30",
    period: "Per project",
    description: "Claude Sonnet 4.6 writing a first-class undergraduate dissertation.",
    features: [
      { label: "All chapters, 50,000 words", included: true },
      { label: "Claude Sonnet 4.6 writer", included: true },
      { label: "8 analysis methods", included: true },
      { label: "All 12 citation styles", included: true },
      { label: "Word + PDF export", included: true },
      { label: "3 revision rounds", included: true },
      { label: "Extended thinking mode", included: false },
    ],
    cta: "Get started",
    highlighted: false,
    variant: "light",
  },
  {
    name: "Masters",
    price: "$150",
    period: "Per project",
    description: "Claude Sonnet 4.6 with extended thinking. Full-depth MSc / MA / MBA.",
    features: [
      { label: "All chapters, 80,000 words", included: true },
      { label: "Claude Sonnet 4.6 + extended thinking", included: true },
      { label: "All 20+ analysis methods", included: true },
      { label: "All 5 export formats", included: true },
      { label: "8 revisions + version history", included: true },
      { label: "Full grammar pipeline", included: true },
    ],
    cta: "Most popular",
    highlighted: true,
    variant: "primary",
  },
  {
    name: "PhD",
    price: "$280",
    period: "Per project",
    description: "Claude Opus 4 + Opus 3 + Sonnet. Up to 100,000 words.",
    features: [
      { label: "100,000 words, unlimited revisions", included: true },
      { label: "Claude Opus 4 (maximum reasoning)", included: true },
      { label: "Claude Opus 3 + Sonnet 4.6", included: true },
      { label: "SEM, meta-analysis, survival analysis", included: true },
      { label: "LaTeX + PDF/A + SVG 300 DPI", included: true },
      { label: "Priority 4hr support", included: true },
    ],
    cta: "Get PhD tier",
    highlighted: false,
    variant: "dark",
  },
];

export const MarketingPricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Direct-to-Paystack from the homepage. If the user isn't signed in,
  // we route through /auth with a redirect that lands back on Settings → billing
  // and auto-fires the same checkout (handled below).
  const startCheckout = async (tierName: string) => {
    const tier = tierName.toLowerCase();
    if (tier === "free") { navigate("/auth?tab=signup"); return; }

    if (!user) {
      navigate(`/auth?tab=signup&redirect=/settings?tab=billing&tier=${tier}`);
      return;
    }

    setLoadingTier(tier);
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const res = await supabase.functions.invoke("create-paystack-checkout", {
        body: { tier, callback_url: callbackUrl },
      });
      if (res.error) {
        // supabase-js wraps all non-2xx responses with a generic message;
        // the actual server error is in error.context which is the raw Response.
        let serverMsg = "";
        try {
          const body = await (res.error as any).context?.json?.();
          serverMsg = body?.error ?? "";
        } catch { /* body not JSON */ }
        throw new Error(serverMsg || "Checkout failed. Please try again.");
      }
      const url = (res.data as any)?.authorization_url;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Could not start checkout. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout failed. Please try again.");
      setLoadingTier(null);
    }
  };

  return (
    <section
      id="pricing"
      className="py-24 md:py-32"
      style={{ background: "var(--ma-bg)", color: "var(--ma-text)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Per-project pricing</h2>
          <p className="mt-4 max-w-lg mx-auto" style={{ color: "var(--ma-text-muted)" }}>
            Pay once per dissertation. References don't count toward word limits. Redrafts are free up to your tier's limit.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier, i) => {
            const isPrimary = tier.variant === "primary";
            const isDark = tier.variant === "dark";
            const isLoading = loadingTier === tier.name.toLowerCase();

            const headerStyle: React.CSSProperties = isPrimary
              ? { background: "var(--ma-accent)", color: "#FFFFFF" }
              : isDark
              ? { background: "var(--ma-surface2)", color: "var(--ma-text)" }
              : { background: "var(--ma-surface2)", color: "var(--ma-text)" };

            const cardBorderStyle: React.CSSProperties = isPrimary
              ? { borderColor: "var(--ma-accent)" }
              : isDark
              ? { borderColor: "var(--ma-border-bright)" }
              : { borderColor: "var(--ma-border)" };

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl flex flex-col border-2 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 relative"
                style={{ background: "var(--ma-surface)", ...cardBorderStyle }}
              >
                {tier.highlighted && (
                  <span className="absolute top-4 right-4 z-10 bg-amber-400 text-black text-[11px] font-bold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}

                <div className="px-6 pt-6 pb-6" style={headerStyle}>
                  <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ opacity: 0.65 }}>
                    {tier.name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight tabular-nums">{tier.price}</span>
                  </div>
                  <p className="mt-1 text-sm" style={{ opacity: 0.65 }}>
                    {tier.period}
                  </p>
                  <p className="mt-4 text-sm font-semibold leading-snug">
                    {tier.description}
                  </p>
                </div>

                <div className="px-6 py-6 flex-1 flex flex-col" style={{ background: "var(--ma-surface)" }}>
                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li
                        key={f.label}
                        className="flex items-start gap-2.5 text-sm"
                        style={{ color: f.included ? "var(--ma-text-muted)" : "var(--ma-text-dim)" }}
                      >
                        {f.included ? (
                          <Check size={16} className="shrink-0 mt-0.5 text-emerald-500" strokeWidth={3} />
                        ) : (
                          <Minus size={16} className="shrink-0 mt-0.5" style={{ color: "var(--ma-text-dim)" }} />
                        )}
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  {(() => {
                    const buttonContent = isLoading ? (
                      <span className="inline-flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Starting checkout…</span>
                    ) : <>{tier.cta} →</>;

                    if (isPrimary) {
                      return (
                        <button
                          onClick={() => startCheckout(tier.name)}
                          disabled={isLoading}
                          className="w-full font-bold py-2 rounded-lg transition-opacity active:scale-[0.98]"
                          style={{ color: "var(--ma-accent)", background: "transparent", border: "2px solid var(--ma-accent)", fontFamily: '"Geist", system-ui, sans-serif', fontSize: "0.9rem" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ma-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "#FFF"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ma-accent)"; }}
                        >
                          {buttonContent}
                        </button>
                      );
                    }
                    if (isDark) {
                      return (
                        <button
                          onClick={() => startCheckout(tier.name)}
                          disabled={isLoading}
                          className="w-full font-bold py-2 rounded-lg transition-all active:scale-[0.98]"
                          style={{ color: "var(--ma-text)", background: "transparent", border: "2px solid var(--ma-border-bright)", fontFamily: '"Geist", system-ui, sans-serif', fontSize: "0.9rem" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ma-text)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ma-bg)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ma-text)"; }}
                        >
                          {buttonContent}
                        </button>
                      );
                    }
                    if (tier.name === "Free") {
                      return (
                        <button
                          onClick={() => navigate("/auth?tab=signup")}
                          className="w-full font-bold py-2 rounded-lg transition-all active:scale-[0.98]"
                          style={{ color: "var(--ma-accent)", background: "transparent", border: "2px solid var(--ma-accent)", fontFamily: '"Geist", system-ui, sans-serif', fontSize: "0.9rem" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ma-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "#FFF"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ma-accent)"; }}
                        >
                          {tier.cta} →
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => startCheckout(tier.name)}
                        disabled={isLoading}
                        className="w-full font-bold py-2 rounded-lg transition-opacity active:scale-[0.98]"
                        style={{ background: "var(--ma-accent)", color: "#FFFFFF", border: "none", fontFamily: '"Geist", system-ui, sans-serif', fontSize: "0.9rem" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                      >
                        {buttonContent}
                      </button>
                    );
                  })()}
                  {tier.name !== "Free" && (
                    <p className="text-[10px] text-center mt-2" style={{ color: "var(--ma-text-dim)" }}>Charged in NGN at checkout</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MarketingPricing;
