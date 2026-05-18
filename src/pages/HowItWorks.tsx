import { Link } from "react-router-dom";
import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
};

export default function HowItWorks() {
  return (
    <div>
      <PageHero
        title={<>From blank page to<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>submitted dissertation.</em></>}
        subtitle="Three steps, one platform. Here's exactly how PAPERSTUDIO works."
      />
      {/* Interactive demo player */}
      <section style={{ padding: "60px 24px 0", maxWidth: "960px", margin: "0 auto" }}>
        <InteractiveDemo />
      </section>

      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <style>{`
          .hiw-step-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 64px; align-items: start; margin-bottom: 80px; }
          .hiw-step-grid-rev { display: grid; grid-template-columns: 2fr 1fr; gap: 64px; align-items: start; margin-bottom: 80px; }
          @media (max-width: 768px) {
            .hiw-step-grid, .hiw-step-grid-rev { grid-template-columns: 1fr; gap: 32px; }
          }
          .hiw-action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          @media (max-width: 480px) { .hiw-action-grid { grid-template-columns: 1fr; } }
        `}</style>

        {/* Step 1 */}
        <div className="hiw-step-grid">
          <div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--ma-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.headline,
                fontStyle: "italic",
                fontSize: "26px",
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: "20px",
              }}
            >
              1
            </div>
            <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "2rem", color: "var(--ma-text)", marginBottom: "14px", letterSpacing: "-0.01em" }}>
              Set up your project
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: "1rem", color: "var(--ma-text-muted)", lineHeight: 1.75 }}>
              A three-step wizard collects everything PAPERSTUDIO needs to write your dissertation accurately.
            </p>
          </div>
          <div
            style={{
              background: "var(--ma-surface)",
              borderRadius: "16px",
              padding: "32px",
              border: "1px solid var(--ma-border)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: "12px", fontWeight: 700, color: "var(--ma-text-dim)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Dissertation Title</label>
                <div style={{ background: "var(--ma-bg)", border: "1.5px solid var(--ma-accent)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--ma-text)", fontFamily: FONTS.body }}>
                  The impact of socioeconomic factors on vaccine hesitancy in sub-Saharan Africa
                </div>
              </div>
              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: "12px", fontWeight: 700, color: "var(--ma-text-dim)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Degree Level</label>
                <div style={{ background: "var(--ma-bg)", border: "1.5px solid var(--ma-border)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--ma-text)", fontFamily: FONTS.body }}>MSc Public Health ▾</div>
              </div>
              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: "12px", fontWeight: 700, color: "var(--ma-text-dim)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Research Framework</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(196,56,74,0.12)", border: "1.5px solid rgba(196,56,74,0.3)", color: "var(--ma-accent)", fontSize: "12px", fontWeight: 700, fontFamily: FONTS.body }}>PICO ✓</span>
                  <span style={{ padding: "4px 12px", borderRadius: "999px", border: "1.5px solid var(--ma-border)", color: "var(--ma-text-muted)", fontSize: "12px", fontWeight: 700, fontFamily: FONTS.body }}>PEO</span>
                  <span style={{ padding: "4px 12px", borderRadius: "999px", border: "1.5px solid var(--ma-border)", color: "var(--ma-text-muted)", fontSize: "12px", fontWeight: 700, fontFamily: FONTS.body }}>SPIDER</span>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: FONTS.body, fontSize: "12px", fontWeight: 700, color: "var(--ma-text-dim)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Word Count Target</label>
                <div style={{ background: "var(--ma-bg)", border: "1.5px solid var(--ma-border)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--ma-text)", fontFamily: FONTS.body }}>12,000 words</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="hiw-step-grid-rev">
          <div style={{ background: "var(--ma-surface2)", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--ma-border)" }}>
            <div style={{ background: "#0d1117", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#FF5F57", display: "block" }} />
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#FFBD2E", display: "block" }} />
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#28CA41", display: "block" }} />
              </div>
              <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "center" }}>
                Chapter 2: Literature Review — WRITING
              </span>
              <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, fontFamily: FONTS.mono, background: "rgba(74,122,56,0.2)", color: "#4A7A38" }}>
                3,247 / 3,800w
              </span>
            </div>
            <div style={{ padding: "24px", fontSize: "13px", lineHeight: 1.9, color: "rgba(255,255,255,0.7)" }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700, display: "block", marginBottom: "8px" }}>2.1 Theoretical Framework</span>
              The relationship between vaccination hesitancy and socioeconomic determinants has been extensively documented.{" "}
              <span style={{ color: "var(--ma-gold)" }}>Smith and Johnson (2021)</span> argue that structural barriers function as primary mediators of vaccine uptake behaviour. This position is corroborated by findings from a multi-country longitudinal study conducted by the WHO{" "}
              <span style={{ color: "var(--ma-gold)" }}>(WHO, 2022)</span>.
            </div>
          </div>
          <div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--ma-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.headline,
                fontStyle: "italic",
                fontSize: "26px",
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: "20px",
              }}
            >
              2
            </div>
            <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "2rem", color: "var(--ma-text)", marginBottom: "14px", letterSpacing: "-0.01em" }}>
              Generate each chapter
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: "1rem", color: "var(--ma-text-muted)", lineHeight: 1.75 }}>
              Click generate on any chapter. PAPERSTUDIO writes to your exact word count with proper section headings, in-text citations, and consistent academic voice.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="hiw-step-grid">
          <div>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "var(--ma-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.headline,
                fontStyle: "italic",
                fontSize: "26px",
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: "20px",
              }}
            >
              3
            </div>
            <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "2rem", color: "var(--ma-text)", marginBottom: "14px", letterSpacing: "-0.01em" }}>
              Review, revise and export
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: "1rem", color: "var(--ma-text-muted)", lineHeight: 1.75 }}>
              Accept chapters or request revisions with specific feedback. When all chapters are accepted, export your full dissertation in any format.
            </p>
          </div>
          <div className="hiw-action-grid">
            {[
              { ico: '✓', title: 'Accept chapter', desc: 'Mark complete and move to next chapter', highlight: false },
              { ico: '✎', title: 'Request revision', desc: 'Give specific feedback — full rewrite', highlight: false },
              { ico: '📄', title: 'Export any format', desc: 'Word, PDF, LaTeX, Markdown, .txt', highlight: false },
              { ico: '🎓', title: 'Submission ready', desc: 'Title page, ToC, references included', highlight: true },
            ].map(item => (
              <div
                key={item.title}
                style={{
                  borderRadius: "12px",
                  padding: "20px",
                  border: item.highlight ? "1.5px solid rgba(196,56,74,0.35)" : "1px solid var(--ma-border)",
                  background: item.highlight ? "rgba(196,56,74,0.08)" : "var(--ma-surface)",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{item.ico}</div>
                <div style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 600, fontSize: "1rem", marginBottom: "4px", color: item.highlight ? "var(--ma-accent)" : "var(--ma-text)" }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: "12px", color: "var(--ma-text-muted)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "0 24px 48px" }}>
        <Link
          to="/how-to-use"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            borderRadius: "12px",
            background: "var(--ma-accent)",
            color: "#FFFFFF",
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.88"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
        >
          📖 Read the full "How to Use" guide →
        </Link>
      </div>

      <CTABand title="Ready to start writing?" />
    </div>
  );
}
