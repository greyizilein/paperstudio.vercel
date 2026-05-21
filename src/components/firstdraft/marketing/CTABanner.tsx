import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

const DA_FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const BookmarkDecor = () => (
  <svg width="48" height="64" viewBox="0 0 48 64" fill="none" aria-hidden="true" style={{ opacity: 0.18 }}>
    <path
      d="M8 4 L40 4 L40 60 L24 48 L8 60 Z"
      stroke="#E8DFC8"
      strokeWidth="1.5"
      fill="rgba(232,223,200,0.06)"
      strokeLinejoin="round"
    />
    <line x1="16" y1="18" x2="32" y2="18" stroke="#E8DFC8" strokeWidth="1" strokeLinecap="round" />
    <line x1="16" y1="24" x2="28" y2="24" stroke="#E8DFC8" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
  </svg>
);

const QuillDecorSmall = () => (
  <svg width="36" height="42" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ opacity: 0.15, color: "#E8DFC8" }}>
    <path
      d="M50 6 C 40 10, 32 18, 27 30 C 24 38, 23 46, 24 52 L 28 52 C 30 46, 33 40, 38 34 C 44 26, 49 18, 52 10 C 53 8, 52 6, 50 6 Z"
      fill="currentColor"
    />
    <path d="M24 52 L 28 52 L 26 58 Z" fill="currentColor" />
    <circle cx="26" cy="58.5" r="1.1" fill="currentColor" />
  </svg>
);

export const CTABanner = () => {
  const ctaHeadline = useSiteContent<{ text: string }>("landing", "cta_headline", { text: "Your thesis is waiting." });
  const ctaSubtext = useSiteContent<{ text: string }>("landing", "cta_subtext", { text: "Write Chapter 1 today — for free. No subscription, no card required. Just your idea and a deadline you can finally meet." });
  const ctaButton = useSiteContent<{ text: string }>("landing", "cta_button", { text: "Start Chapter 1 — free" });
  return (
  <section
    style={{
      position: "relative",
      overflow: "hidden",
      padding: "100px 0 112px",
      background: "linear-gradient(135deg, #C4384A 0%, #8B2030 50%, #6E1825 100%)",
    }}
  >
    {/* Subtle noise/grain overlay */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        pointerEvents: "none",
        opacity: 0.35,
      }}
    />

    {/* Radial highlight center */}
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "900px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }}
    />

    {/* Decorative elements */}
    <div style={{ position: "absolute", top: "20px", right: "80px", opacity: 1 }}>
      <BookmarkDecor />
    </div>
    <div style={{ position: "absolute", bottom: "24px", left: "64px", opacity: 1, transform: "rotate(-15deg)" }}>
      <QuillDecorSmall />
    </div>
    <div style={{ position: "absolute", top: "32px", left: "120px", opacity: 1, transform: "rotate(20deg)" }}>
      <QuillDecorSmall />
    </div>

    {/* Content */}
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "0 24px",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Small label */}
        <span
          style={{
            display: "inline-block",
            fontFamily: DA_FONTS.body,
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(232,223,200,0.55)",
            marginBottom: "20px",
          }}
        >
          No word limit on ambition
        </span>

        {/* Headline */}
        <h2
          style={{
            fontFamily: DA_FONTS.headline,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
            color: "#FFFFFF",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "0 0 20px",
          }}
        >
          {ctaHeadline.text}
        </h2>

        {/* Sub */}
        <p
          style={{
            fontFamily: DA_FONTS.body,
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.65)",
            maxWidth: "480px",
            margin: "0 auto 44px",
            lineHeight: 1.65,
          }}
        >
          {ctaSubtext.text}
        </p>

        {/* CTA */}
        <Link to="/auth?tab=signup">
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#FFFFFF",
              color: "#8B2030",
              fontFamily: DA_FONTS.body,
              fontWeight: 700,
              fontSize: "1.05rem",
              padding: "16px 40px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
              letterSpacing: "0.01em",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#F0F0F0";
              btn.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#FFFFFF";
              btn.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {ctaButton.text}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Link>

        {/* Reassurance line */}
        <p
          style={{
            fontFamily: DA_FONTS.body,
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.4)",
            marginTop: "18px",
          }}
        >
          Free forever · No card needed · Chapter 1 always included
        </p>
      </motion.div>
    </div>
  </section>
  );
};

export default CTABanner;
