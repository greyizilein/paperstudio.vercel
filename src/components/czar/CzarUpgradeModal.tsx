import { X, Check } from "lucide-react";
import { CZAR_TIERS, customPriceUsd } from "@/lib/czarTiers";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CzarIcon } from "@/components/icons/CzarIcon";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CzarUpgradeModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [customWords, setCustomWords] = useState(50_000);

  if (!open) return null;

  const checkout = async (tierId: string, words?: number) => {
    setLoading(tierId);
    try {
      const { data, error } = await supabase.functions.invoke("create-czar-checkout", {
        body: {
          tier: tierId,
          custom_words: words,
          callback_url: `${window.location.origin}/payment/callback?product=czar`,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--czar-bg-elev)", border: "1px solid var(--czar-border)", color: "var(--czar-text)" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 hover:opacity-80" style={{ color: "var(--czar-text-dim)" }}>
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2" style={{ color: "var(--czar-text-dim)" }}>
            <CzarIcon size={14} />
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--czar-text-dim)" }}>
              CZAR word packs
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Pick a pack that fits how you work</h2>
          <p className="text-sm mt-1" style={{ color: "var(--czar-text-dim)" }}>
            Word-based pricing shown in USD. Checkout happens automatically in your local payment flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {CZAR_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="relative rounded-xl p-4 flex flex-col"
              style={{
                background: "var(--czar-surface)",
                border: `1px solid ${tier.highlight ? "var(--czar-accent)" : "var(--czar-border)"}`,
              }}
            >
              {tier.highlight && (
                <span
                  className="absolute -top-2 left-4 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
                >
                  POPULAR
                </span>
              )}
              <div className="font-semibold text-base">{tier.label}</div>
              <div className="text-[11px] mb-3 min-h-[28px]" style={{ color: "var(--czar-text-dim)" }}>{tier.blurb}</div>

              {tier.id === "custom" ? (
                <>
                  <div className="text-2xl font-bold mb-1">${customPriceUsd(customWords).toFixed(2)}</div>
                  <div className="text-[11px] mb-2" style={{ color: "var(--czar-text-faint)" }}>
                    {customWords.toLocaleString()} words · $0.009/word
                  </div>
                  <input
                    type="number"
                    min={2000}
                    max={500_000}
                    step={1000}
                    value={customWords}
                    onChange={(e) => setCustomWords(Math.max(2000, Math.min(500_000, Number(e.target.value) || 0)))}
                    className="w-full mb-3 px-2 py-1.5 rounded-md text-[13px] bg-transparent"
                    style={{ border: "1px solid var(--czar-border)", color: "var(--czar-text)" }}
                  />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold mb-1">${tier.priceUsd.toFixed(0)}</div>
                  <div className="text-[11px] mb-3" style={{ color: "var(--czar-text-faint)" }}>
                    {tier.words.toLocaleString()} words
                  </div>
                </>
              )}

              <ul className="space-y-1.5 mb-4 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--czar-text-dim)" }}>
                    <Check size={12} className="mt-0.5 shrink-0" style={{ color: "var(--czar-accent)" }} /> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => checkout(tier.id, tier.id === "custom" ? customWords : undefined)}
                disabled={loading === tier.id}
                className="w-full py-2 rounded-md text-[13px] font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
                style={{
                  background: tier.highlight ? "var(--czar-accent)" : "var(--czar-surface-hover)",
                  color: tier.highlight ? "var(--czar-accent-fg)" : "var(--czar-text)",
                }}
              >
                {loading === tier.id ? "Redirecting…" : `Get ${tier.label}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-center mt-4" style={{ color: "var(--czar-text-faint)" }}>
          Prices are shown only in USD. Every account starts with 1,000 free words.
        </p>
      </div>
    </div>
  );
}
