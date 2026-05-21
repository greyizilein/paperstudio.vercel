import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHero } from "@/components/firstdraft/PageHero";
import { useSiteContent } from "@/hooks/useSiteContent";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const introContent = useSiteContent<{ text: string }>(
    "pricing", "intro_text",
    { text: "No subscriptions. One project per payment. Revisions based per project tier." }
  );
  const faqContent = useSiteContent<{ items: { q: string; a: string }[] }>(
    "pricing", "faq_items",
    { items: [
      { q: "What counts as a word?", a: "Every word CZAR generates counts toward your monthly limit. Your own edits do not count." },
      { q: "Can I upgrade or downgrade?", a: "Yes — changes take effect immediately and your remaining balance is prorated." },
      { q: "Is my data private?", a: "Yes. Your documents and conversations are never used to train AI models." },
      { q: "What citation styles are supported?", a: "Harvard, APA 7th, Chicago Author-Date, Vancouver, and IEEE — with more coming soon." },
    ]}
  );

  const handleUpgrade = (tierKey: string) => {
    if (!user) { navigate(`/auth?redirect=/settings?tab=billing`); return; }
    navigate(`/settings?tab=billing&tier=${tierKey}`);
  };

  const plans = [
    {
      tier: 'Free', amt: '$0', per: 'Forever',
      desc: 'Try before you pay. Chapter 1 for every project, always free.',
      features: ['Chapter 1 only (3,000 words)', 'Gemini 2.5 Flash only', 'Harvard & APA 7 only', 'Plain text export'],
      off: ['Claude Sonnet 4.6', 'Word / PDF export', 'Data analysis & charts', 'Full grammar pipeline'],
      hot: false, dark: false,
    },
    {
      tier: 'Undergraduate', amt: '$35', per: 'Per project',
      desc: 'Gemini 2.5 + Gemini 3 + GPT-5.2, with Claude Sonnet 4.6 unlocked at Chapter 4.',
      features: ['All chapters, up to 15,000 words', 'Gemini 2.5 + Gemini 3 + GPT-5.2', 'Claude Sonnet 4.6 (Chapter 4 only)', '8 quantitative analysis methods', 'All 12 citation styles', 'Word (.docx) + PDF export', '3 revision rounds per chapter'],
      off: ['Gemini 3 Pro', 'GPT-5 Flagship', 'Claude Opus', 'LaTeX export'],
      hot: false, dark: false,
    },
    {
      tier: 'Masters', amt: '$150', per: 'Per project',
      desc: 'Gemini 3 Pro, GPT-5.2 + GPT-5 Flagship, Claude Sonnet 4.6 (adaptive) + Opus 4 at Chapter 4.',
      features: ['All chapters, up to 30,000 words', 'Gemini 3 Pro + GPT-5.2 + GPT-5 Flagship', 'Claude Sonnet 4.6 with adaptive thinking', 'Claude Opus 4 (Chapter 4 only)', 'All 20+ quantitative + 9 qualitative', 'All 5 export formats', '8 revisions + version history', 'Full 7-stage grammar pipeline'],
      off: ['Claude Opus 4.6'],
      hot: true, dark: false,
    },
    {
      tier: 'PhD', amt: '$280', per: 'Per project',
      desc: 'All Masters models + Claude Opus 4.6 with adaptive thinking at Chapter 4. Publication grade.',
      features: ['100,000 words, unlimited revisions', 'All Masters models included', 'Claude Opus 4.6 with adaptive thinking (Chapter 4)', 'Gemini 3 Pro + GPT-5 Flagship', 'SEM, meta-analysis, survival analysis', 'LaTeX + PDF/A + SVG 300 DPI', 'Priority 4hr support'],
      off: [],
      hot: false, dark: true,
    },
    {
      tier: 'Enterprise', amt: 'Contact us', per: 'Custom pricing',
      desc: 'For institutions, research labs, and high-volume teams with unique needs.',
      features: ['Everything in PhD', '200,000+ words', 'Dedicated account support', 'Custom onboarding & setup'],
      off: [],
      hot: false, dark: false,
    },
  ];

  return (
    <div>
      <PageHero
        title={<>Pay once.<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>Yours forever.</em></>}
        subtitle={introContent.text}
      />
      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <style>{`
          .pricing-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
          @media (max-width: 1100px) { .pricing-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 760px) { .pricing-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 480px) { .pricing-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div className="pricing-grid">
          {plans.map(p => {
            const headerBg = p.hot ? "var(--ma-accent)" : "var(--ma-surface2)";
            const headerTextPrimary = p.hot ? "#FFFFFF" : "var(--ma-text)";
            const headerTextMuted = p.hot ? "rgba(255,255,255,0.55)" : "var(--ma-text-dim)";
            const cardBorder = p.hot ? "var(--ma-accent)" : p.dark ? "var(--ma-border-bright)" : "var(--ma-border)";

            return (
              <div
                key={p.tier}
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `2px solid ${cardBorder}`,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--ma-surface)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  boxShadow: p.hot ? "0 8px 32px rgba(196,56,74,0.2)" : "none",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = p.hot ? "0 16px 48px rgba(196,56,74,0.3)" : "0 16px 44px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = p.hot ? "0 8px 32px rgba(196,56,74,0.2)" : "none";
                }}
              >
                {p.hot && (
                  <span
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      background: "#F5A623",
                      color: "#000000",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontFamily: FONTS.body,
                      zIndex: 1,
                    }}
                  >
                    Most popular
                  </span>
                )}

                {/* Header */}
                <div style={{ padding: "24px", background: headerBg }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: headerTextMuted, marginBottom: "8px" }}>
                    {p.tier}
                  </div>
                  <div style={{ fontFamily: p.tier === 'Enterprise' ? FONTS.body : FONTS.headline, fontStyle: p.tier === 'Enterprise' ? "normal" : "italic", fontSize: p.tier === 'Enterprise' ? "24px" : "42px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: headerTextPrimary }}>
                    {p.amt}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: "13px", marginTop: "4px", color: headerTextMuted }}>
                    {p.per}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: "14px", marginTop: "12px", fontWeight: 600, lineHeight: 1.5, color: p.hot ? "rgba(255,255,255,0.9)" : "var(--ma-text-muted)" }}>
                    {p.desc}
                  </div>
                </div>

                {/* Features */}
                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <ul style={{ flex: 1, listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", fontFamily: FONTS.body, color: "var(--ma-text-muted)", lineHeight: 1.4 }}>
                        <span style={{ color: "#4A7A38", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>✓</span>
                        {f}
                      </li>
                    ))}
                    {p.off.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", fontFamily: FONTS.body, color: "var(--ma-text-dim)", lineHeight: 1.4 }}>
                        <span style={{ color: "var(--ma-text-dim)", flexShrink: 0 }}>—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (p.tier === 'Free') { navigate('/auth?tab=signup'); return; }
                      if (p.tier === 'Enterprise') { navigate('/contact'); return; }
                      handleUpgrade(p.tier.toLowerCase());
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 700,
                      fontFamily: FONTS.body,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: p.hot ? "2px solid var(--ma-accent)" : p.dark ? "2px solid var(--ma-border-bright)" : "2px solid var(--ma-accent)",
                      background: p.tier === 'Undergraduate' ? "var(--ma-accent)" : "transparent",
                      color: p.tier === 'Undergraduate' ? "#FFFFFF" : p.hot ? "var(--ma-accent)" : p.dark ? "var(--ma-text)" : "var(--ma-accent)",
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      if (p.tier === 'Undergraduate') { btn.style.opacity = "0.88"; return; }
                      btn.style.background = p.hot ? "var(--ma-accent)" : p.dark ? "var(--ma-text)" : "var(--ma-accent)";
                      btn.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      if (p.tier === 'Undergraduate') { btn.style.opacity = "1"; return; }
                      btn.style.background = "transparent";
                      btn.style.color = p.hot ? "var(--ma-accent)" : p.dark ? "var(--ma-text)" : "var(--ma-accent)";
                    }}
                  >
                    {p.tier === 'Free' ? 'Start free →' : p.tier === 'Enterprise' ? 'Get in touch →' : p.tier === 'Masters' ? 'Get Masters →' : p.tier === 'PhD' ? 'Get PhD tier →' : 'Get started →'}
                  </button>
                  {p.tier !== 'Free' && p.tier !== 'Enterprise' && (
                    <p style={{ fontSize: "10px", textAlign: "center", marginTop: "6px", color: "var(--ma-text-dim)", fontFamily: FONTS.body }}>
                      Charged in NGN at checkout
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        {faqContent.items.length > 0 && (
          <div style={{ marginTop: "64px" }}>
            <h3 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "1.5rem", color: "var(--ma-text)", marginBottom: "24px", textAlign: "center" }}>
              Frequently asked questions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px", margin: "0 auto" }}>
              {faqContent.items.map((item, i) => (
                <div key={i} style={{ padding: "20px 24px", borderRadius: "12px", background: "rgba(196,56,74,0.04)", border: "1px solid rgba(196,56,74,0.12)" }}>
                  <p style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: "0.95rem", color: "var(--ma-text)", marginBottom: "8px" }}>{item.q}</p>
                  <p style={{ fontFamily: FONTS.body, fontSize: "0.9rem", color: "var(--ma-text-muted)", lineHeight: 1.65 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* University box */}
        <div
          style={{
            marginTop: "64px",
            padding: "40px",
            background: "rgba(196,56,74,0.06)",
            borderRadius: "16px",
            border: "1px solid rgba(196,56,74,0.2)",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "1.375rem", color: "var(--ma-accent)", marginBottom: "8px" }}>
            For universities
          </h3>
          <p style={{ fontFamily: FONTS.body, fontSize: "1rem", color: "var(--ma-text-muted)", marginBottom: "20px", maxWidth: "480px", margin: "0 auto 20px", lineHeight: 1.65 }}>
            Flat-rate institutional licensing for all enrolled students. Custom pricing and white-labelling available.
          </p>
          <button
            onClick={() => navigate('/universities')}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "var(--ma-accent)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: FONTS.body,
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            Contact us about institutional licensing →
          </button>
        </div>
      </section>
    </div>
  );
}
