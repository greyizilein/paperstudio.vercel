import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const DA_FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
};

const chatMessages = [
  {
    role: "user" as const,
    text: "What's the main gap in the literature on microfinance access in sub-Saharan Africa?",
  },
  {
    role: "czar" as const,
    text: "Most studies focus on credit availability but overlook the demand-side barriers — borrowers' risk perception, collateral constraints, and informal network dependency (Ayyagari et al., 2021). Your gap is the intersection of fintech adoption and traditional gatekeeping structures at the SME level. Want me to draft the gap statement for Chapter 1?",
  },
  {
    role: "user" as const,
    text: "Yes — in academic tone, around 120 words.",
  },
];

const QuillSmall = () => (
  <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ color: "#4A7A38" }}>
    <path
      d="M50 6 C 40 10, 32 18, 27 30 C 24 38, 23 46, 24 52 L 28 52 C 30 46, 33 40, 38 34 C 44 26, 49 18, 52 10 C 53 8, 52 6, 50 6 Z"
      fill="currentColor"
    />
    <path
      d="M48 10 C 40 18, 33 28, 28 44"
      stroke="rgba(14,12,8,0.4)"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M24 52 L 28 52 L 26 58 Z" fill="currentColor" />
    <circle cx="26" cy="58.5" r="1.1" fill="currentColor" />
  </svg>
);

export const CzarSection = () => (
  <section
    style={{
      background: "var(--ma-bg)",
      padding: "96px 0 112px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Forest green radial glow */}
    <div
      style={{
        position: "absolute",
        top: "50%",
        right: "-5%",
        transform: "translateY(-50%)",
        width: "700px",
        height: "700px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(74,122,56,0.12) 0%, transparent 60%)",
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: "-10%",
        left: "-5%",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(74,122,56,0.07) 0%, transparent 60%)",
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        maxWidth: "1152px",
        margin: "0 auto",
        padding: "0 24px",
        position: "relative",
        zIndex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "80px",
        alignItems: "center",
      }}
      className="czar-grid"
    >
      <style>{`
        @media (max-width: 840px) {
          .czar-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .czar-mock { order: -1; }
        }
      `}</style>

      {/* Left: text */}
      <motion.div
        initial={{ opacity: 0, x: -32, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(74,122,56,0.3)",
            background: "rgba(74,122,56,0.08)",
            marginBottom: "28px",
          }}
        >
          <QuillSmall />
          <span
            style={{
              fontFamily: DA_FONTS.body,
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#4A7A38",
            }}
          >
            AI Research Assistant
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontFamily: DA_FONTS.headline,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "clamp(2.4rem, 5vw, 3.75rem)",
            color: "var(--ma-text)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "0 0 20px",
          }}
        >
          Meet <span style={{ color: "#4A7A38" }}>CZAR.</span>
        </h2>

        <p
          style={{
            fontFamily: DA_FONTS.body,
            fontSize: "1.05rem",
            color: "var(--ma-text-muted)",
            lineHeight: 1.7,
            margin: "0 0 16px",
            maxWidth: "460px",
          }}
        >
          CZAR is your embedded academic AI — research gaps, literature synthesis, argument testing, citation sourcing, inline rewriting.
        </p>
        <p
          style={{
            fontFamily: DA_FONTS.body,
            fontSize: "1.05rem",
            color: "var(--ma-text-muted)",
            lineHeight: 1.7,
            margin: "0 0 36px",
            maxWidth: "460px",
          }}
        >
          Not a generic chatbot. CZAR knows your project, your chapters, and your argument — and responds like a co-author who has read everything.
        </p>

        {/* Feature list */}
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            "Gap analysis and literature synthesis",
            "Source and citation recommendations",
            "Inline sentence rewrites on demand",
            "Argument testing against your framework",
          ].map((item) => (
            <li
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: DA_FONTS.body,
                fontSize: "0.9rem",
                color: "var(--ma-text-muted)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="rgba(74,122,56,0.4)" strokeWidth="1" fill="none" />
                <path d="M5 8 L7 10 L11 6" stroke="#4A7A38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link to="/czar">
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "var(--ma-accent2)",
                color: "#FFFFFF",
                fontFamily: DA_FONTS.body,
                fontWeight: 600,
                fontSize: "1rem",
                padding: "14px 30px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.15s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              <QuillSmall />
              Try CZAR free
            </button>
          </Link>
          <p style={{ fontFamily: DA_FONTS.body, fontSize: "0.8rem", color: "var(--ma-text-dim)", margin: 0 }}>
            <span style={{ color: "#4A7A38", fontWeight: 600 }}>1,000 words free</span>
            {" · "}
            <Link to="/settings?tab=billing" style={{ color: "var(--ma-text-muted)", textDecoration: "underline", textDecorationStyle: "dotted" }}>
              $20 for 50,000 words
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Right: mock chat interface */}
      <motion.div
        className="czar-mock"
        initial={{ opacity: 0, x: 32, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "var(--ma-surface)",
          border: "1px solid rgba(74,122,56,0.15)",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(232,223,200,0.04)",
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(232,223,200,0.06)",
            background: "var(--ma-surface2)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(74,122,56,0.15)",
              border: "1px solid rgba(74,122,56,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QuillSmall />
          </div>
          <div>
            <div
              style={{
                fontFamily: DA_FONTS.headline,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "var(--ma-text)",
                lineHeight: 1,
              }}
            >
              CZAR
            </div>
            <div
              style={{
                fontFamily: DA_FONTS.body,
                fontSize: "0.7rem",
                color: "#4A7A38",
                marginTop: "2px",
              }}
            >
              ● Online — knows your project
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: msg.role === "czar" ? "rgba(74,122,56,0.15)" : "rgba(196,56,74,0.1)",
                  border: `1px solid ${msg.role === "czar" ? "rgba(74,122,56,0.25)" : "rgba(196,56,74,0.2)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {msg.role === "czar" ? (
                  <QuillSmall />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="4" r="2.5" fill="#C4384A" fillOpacity="0.7" />
                    <path d="M1 11 C1 8.5 3 7 6 7 C9 7 11 8.5 11 11" stroke="#C4384A" strokeWidth="1.2" strokeLinecap="round" fill="none" strokeOpacity="0.7" />
                  </svg>
                )}
              </div>

              {/* Bubble */}
              <div
                style={{
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "czar" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                  background: msg.role === "czar" ? "rgba(74,122,56,0.08)" : "rgba(196,56,74,0.08)",
                  border: `1px solid ${msg.role === "czar" ? "rgba(74,122,56,0.14)" : "rgba(196,56,74,0.14)"}`,
                  fontFamily: DA_FONTS.body,
                  fontSize: "0.82rem",
                  color: "var(--ma-text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.9 }}
            style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "rgba(74,122,56,0.15)",
                border: "1px solid rgba(74,122,56,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <QuillSmall />
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "4px 14px 14px 14px",
                background: "rgba(74,122,56,0.08)",
                border: "1px solid rgba(74,122,56,0.14)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <style>{`
                @keyframes czar-dot {
                  0%, 80%, 100% { transform: scaleY(0.4); opacity: 0.3; }
                  40% { transform: scaleY(1); opacity: 0.9; }
                }
              `}</style>
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  style={{
                    display: "inline-block",
                    width: "5px",
                    height: "14px",
                    borderRadius: "3px",
                    background: "#4A7A38",
                    animation: `czar-dot 1.2s ease-in-out ${d * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Input mockup */}
        <div
          style={{
            margin: "12px 16px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--ma-bg)",
            borderRadius: "10px",
            border: "1px solid rgba(232,223,200,0.08)",
            padding: "10px 14px",
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: DA_FONTS.body,
              fontSize: "0.8rem",
              color: "var(--ma-text-dim)",
              fontStyle: "italic",
            }}
          >
            Ask CZAR anything about your dissertation…
          </span>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "rgba(74,122,56,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M2 6.5 L11 6.5 M7.5 3 L11 6.5 L7.5 10" stroke="#4A7A38" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CzarSection;
