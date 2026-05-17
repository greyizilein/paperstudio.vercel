import { motion } from "framer-motion";

const DA_FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
};

const steps = [
  {
    number: "01",
    title: "Set up your project",
    description:
      "Enter your topic, degree level, word count, citation style, and any supervisor notes. PAPERSTUDIO builds your full canonical chapter outline in seconds.",
    detail: "Takes under 3 minutes",
  },
  {
    number: "02",
    title: "Generate chapter by chapter",
    description:
      "Each chapter streams with live word counts, real citations, and narrative continuity with prior chapters. Accept, revise, or humanise any paragraph inline.",
    detail: "Real-time, chapter by chapter",
  },
  {
    number: "03",
    title: "Export your dissertation",
    description:
      "Download a submission-ready .docx with title page, table of contents, body, figures, and hanging-indent reference list — formatted to your university's standard.",
    detail: "One-click .docx / PDF export",
  },
];

export const HowItWorksSection = () => (
  <section
    id="how-it-works-section"
    style={{ background: "var(--ma-surface)", padding: "96px 0 112px", position: "relative", overflow: "hidden" }}
  >
    {/* Subtle background tint */}
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "800px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(196,56,74,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />

    <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", marginBottom: "80px" }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: DA_FONTS.body,
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ma-gold)",
            marginBottom: "16px",
          }}
        >
          The process
        </span>
        <h2
          style={{
            fontFamily: DA_FONTS.headline,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
            color: "var(--ma-text)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          From blank page to finished chapter
        </h2>
      </motion.div>

      {/* Steps row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0",
          position: "relative",
        }}
      >
        {/* Dashed connector lines (desktop, shown via CSS) */}
        <style>{`
          @media (min-width: 900px) {
            .hiw-connector {
              display: block !important;
            }
          }
        `}</style>

        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{
              padding: "0 32px 0 0",
              position: "relative",
            }}
          >
            {/* Step number — large, crimson, ghost */}
            <div
              style={{
                fontFamily: DA_FONTS.headline,
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: "clamp(5rem, 10vw, 7.5rem)",
                lineHeight: 1,
                color: "rgba(196,56,74,0.12)",
                marginBottom: "-24px",
                userSelect: "none",
                letterSpacing: "-0.03em",
              }}
            >
              {step.number}
            </div>

            {/* Step number badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(196,56,74,0.1)",
                  border: "1px solid rgba(196,56,74,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: DA_FONTS.mono,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--ma-accent)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {step.number}
                </span>
              </div>

              {/* Connector dashes to next step (desktop only) */}
              {i < steps.length - 1 && (
                <div
                  className="hiw-connector"
                  style={{
                    display: "none",
                    flex: 1,
                    height: "1px",
                    background:
                      "repeating-linear-gradient(90deg, rgba(196,56,74,0.2) 0px, rgba(196,56,74,0.2) 6px, transparent 6px, transparent 12px)",
                  }}
                />
              )}
            </div>

            {/* Step content */}
            <h3
              style={{
                fontFamily: DA_FONTS.headline,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "1.35rem",
                color: "var(--ma-text)",
                margin: "0 0 12px",
                lineHeight: 1.25,
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontFamily: DA_FONTS.body,
                fontSize: "0.9rem",
                color: "var(--ma-text-muted)",
                lineHeight: 1.7,
                margin: "0 0 16px",
                maxWidth: "320px",
              }}
            >
              {step.description}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: DA_FONTS.body,
                fontSize: "0.72rem",
                fontWeight: 500,
                color: "var(--ma-gold)",
                letterSpacing: "0.04em",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M6 3 L6 6 L8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {step.detail}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
