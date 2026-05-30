import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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

  // Reset loading state when user returns to this tab/page (e.g. closed Paystack and came back)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setLoadingTier(null); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setLoadingTier(null); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

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
      // CZAR uses a separate verification path — append product flag to callback
      const callbackBase = `${window.location.origin}/payment/callback`;
      const callbackUrl = tier === "czar" ? `${callbackBase}?product=czar` : callbackBase;
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CZAR AI Assistant — credit-based, separate from per-project tiers */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: "var(--ma-border)" }} />
            <span className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: "var(--ma-text-dim)" }}>
              CZAR AI Writing Assistant
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--ma-border)" }} />
          </div>

          <div
            className="rounded-2xl border-2 overflow-hidden"
            style={{ borderColor: "rgba(74,122,56,0.4)", background: "var(--ma-surface)" }}
          >
            <div className="flex flex-col md:flex-row">
              {/* Left: description */}
              <div className="px-8 py-8 flex-1" style={{ borderRight: "1px solid rgba(74,122,56,0.15)" }}>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-5"
                  style={{ background: "rgba(74,122,56,0.1)", border: "1px solid rgba(74,122,56,0.25)", color: "#4A7A38" }}
                >
                  <svg width="13" height="13" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <path d="M50 6 C 40 10, 32 18, 27 30 C 24 38, 23 46, 24 52 L 28 52 C 30 46, 33 40, 38 34 C 44 26, 49 18, 52 10 C 53 8, 52 6, 50 6 Z" fill="#4A7A38" />
                    <path d="M24 52 L 28 52 L 26 58 Z" fill="#4A7A38" />
                  </svg>
                  Credit-based · No project limits
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--ma-text-muted)", maxWidth: "420px" }}>
                  CZAR is your embedded academic AI. Reads your PDFs, analyses data, writes at command. Works across every project you have — pay once, use everywhere.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Upload briefs, PDFs, datasets — CZAR reads and executes",
                    "Works across all your projects, unlimited conversations",
                    "Full data analysis: stats, charts, Chapter 4 write-up",
                    "All 12 citation styles, Harvard-first",
                    "1,000 words free — no card needed to start",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ma-text-muted)" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
                        <circle cx="8" cy="8" r="7" stroke="rgba(74,122,56,0.4)" strokeWidth="1" fill="none" />
                        <path d="M5 8 L7 10 L11 6" stroke="#4A7A38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: price + CTA */}
              <div className="px-8 py-8 flex flex-col justify-center min-w-[220px]">
                <p className="text-xs font-bold tracking-[0.18em] uppercase mb-3" style={{ color: "#4A7A38", opacity: 0.8 }}>
                  CZAR
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-extrabold tracking-tight tabular-nums" style={{ color: "var(--ma-text)" }}>$50</span>
                </div>
                <p className="text-sm mb-1" style={{ color: "var(--ma-text-muted)" }}>20,000 words</p>
                <p className="text-xs mb-8" style={{ color: "var(--ma-text-dim)" }}>Credits roll over for 30 days</p>

                {(() => {
                  const isLoading = loadingTier === "czar";
                  return (
                    <button
                      onClick={() => startCheckout("czar")}
                      disabled={isLoading}
                      className="w-full font-bold py-2.5 rounded-lg transition-all active:scale-[0.98] mb-2"
                      style={{ background: "#4A7A38", color: "#FFFFFF", border: "none", fontFamily: '"Geist", system-ui, sans-serif', fontSize: "0.9rem" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                    >
                      {isLoading ? <span className="inline-flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Starting…</span> : "Get CZAR →"}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default MarketingPricing;
