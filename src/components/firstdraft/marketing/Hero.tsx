import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const cyclingWords = ["dissertations", "theses", "capstones", "research papers"];

const QuillDecor = () => (
  <svg
    width="200"
    height="240"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    style={{ color: "rgba(196,56,74,0.18)" }}
  >
    <path
      d="M50 6 C 40 10, 32 18, 27 30 C 24 38, 23 46, 24 52 L 28 52 C 30 46, 33 40, 38 34 C 44 26, 49 18, 52 10 C 53 8, 52 6, 50 6 Z"
      fill="currentColor"
    />
    <path
      d="M48 10 C 40 18, 33 28, 28 44"
      stroke="rgba(196,56,74,0.12)"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M24 52 L 28 52 L 26 58 Z" fill="currentColor" />
    <circle cx="26" cy="58.5" r="1.1" fill="currentColor" />
    {/* Feather barbs */}
    <path d="M46 14 C 38 20, 36 22, 34 26" stroke="rgba(196,56,74,0.1)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    <path d="M44 18 C 37 24, 35 28, 32 32" stroke="rgba(196,56,74,0.08)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    <path d="M42 22 C 36 28, 33 32, 31 36" stroke="rgba(196,56,74,0.07)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    {/* Ink trail */}
    <path
      d="M14 60 C 22 56, 32 62, 44 58 C 50 56, 54 60, 58 58"
      stroke="rgba(196,56,74,0.15)"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const InkDrop1 = () => (
  <svg width="48" height="56" viewBox="0 0 48 56" fill="none" aria-hidden="true">
    <path
      d="M24 4 C24 4, 8 20, 8 34 C8 43.9 15.2 52 24 52 C32.8 52 40 43.9 40 34 C40 20 24 4 24 4Z"
      fill="rgba(196,56,74,0.06)"
    />
    <path
      d="M30 12 C30 12, 36 22, 37 30"
      stroke="rgba(196,56,74,0.08)"
      strokeWidth="1"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx="19" cy="36" rx="3" ry="4" fill="rgba(196,56,74,0.04)" />
  </svg>
);

const InkDrop2 = () => (
  <svg width="28" height="32" viewBox="0 0 28 32" fill="none" aria-hidden="true">
    <path
      d="M14 2 C14 2, 4 12, 4 19 C4 25.6 8.5 30 14 30 C19.5 30 24 25.6 24 19 C24 12 14 2 14 2Z"
      fill="rgba(74,122,56,0.07)"
    />
  </svg>
);

const InkDrop3 = () => (
  <svg width="20" height="6" viewBox="0 0 20 6" fill="none" aria-hidden="true">
    <ellipse cx="10" cy="3" rx="10" ry="3" fill="rgba(184,154,90,0.1)" />
    <ellipse cx="17" cy="4.5" rx="3" ry="1.5" fill="rgba(184,154,90,0.07)" />
  </svg>
);

export const MarketingHero = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % cyclingWords.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      style={{ background: "var(--ma-bg)", minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Animated mesh gradients */}
      <style>{`
        @keyframes da-mesh-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          33% { transform: translate(-30px, 20px) scale(1.08); opacity: 0.22; }
          66% { transform: translate(20px, -15px) scale(0.95); opacity: 0.15; }
        }
        @keyframes da-mesh-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.12; }
          40% { transform: translate(25px, -20px) scale(1.05); opacity: 0.16; }
          80% { transform: translate(-15px, 25px) scale(0.97); opacity: 0.1; }
        }
        @keyframes da-mesh-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.08; }
          50% { transform: translate(10px, 15px) scale(1.1); opacity: 0.12; }
        }
        @keyframes da-quill-float {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }
        @keyframes da-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(8px); opacity: 0.9; }
        }
      `}</style>

      {/* Mesh gradient: crimson top-right */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-8%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,56,74,0.35) 0%, transparent 65%)",
          animation: "da-mesh-1 14s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {/* Mesh gradient: forest green bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(74,122,56,0.28) 0%, transparent 65%)",
          animation: "da-mesh-2 18s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {/* Mesh gradient: gold center */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "45%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,154,90,0.15) 0%, transparent 60%)",
          animation: "da-mesh-3 10s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Decorative quill - right side desktop */}
      <div
        className="hidden lg:block"
        style={{
          position: "absolute",
          right: "6%",
          top: "50%",
          transform: "translateY(-50%)",
          animation: "da-quill-float 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        <QuillDecor />
      </div>

      {/* Ink drops scattered */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          left: "7%",
          animation: "ps-float-gentle 7s ease-in-out infinite",
          pointerEvents: "none",
        }}
        className="hidden md:block animate-float-gentle"
      >
        <InkDrop1 />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          right: "18%",
          animation: "ps-float-slow 9s ease-in-out infinite",
          pointerEvents: "none",
        }}
        className="hidden md:block animate-float-slow"
      >
        <InkDrop2 />
      </div>
      <div
        style={{
          position: "absolute",
          top: "62%",
          left: "22%",
          pointerEvents: "none",
        }}
        className="hidden md:block"
      >
        <InkDrop3 />
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: "900px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(184,154,90,0.3)",
              background: "rgba(184,154,90,0.08)",
              color: "var(--ma-gold)",
              fontSize: "0.72rem",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ma-gold)", display: "inline-block" }} />
            Academic AI Writing Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
            lineHeight: 1.08,
            color: "var(--ma-text)",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          Write your{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -18, filter: "blur(4px)" }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: "inline-block", color: "var(--ma-text)" }}
              >
                {cyclingWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          .{" "}
          <em style={{ color: "var(--ma-accent)", fontStyle: "italic" }}>Finally.</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: "24px",
            fontSize: "clamp(1rem, 2.2vw, 1.2rem)",
            color: "var(--ma-text-muted)",
            maxWidth: "600px",
            margin: "24px auto 0",
            lineHeight: 1.65,
            fontFamily: '"Geist", system-ui, sans-serif',
          }}
        >
          Chapter-by-chapter structure, real citations, narrative flow — then exports a polished .docx your supervisor will respect.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginTop: "40px", display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px" }}
        >
          <Link to="/auth?tab=signup">
            <button
              style={{
                background: "var(--ma-accent)",
                color: "#F5EDD8",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontWeight: 600,
                fontSize: "1rem",
                padding: "14px 32px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.2s, transform 0.15s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              Start writing free
            </button>
          </Link>
          <Link to="/how-it-works">
            <button
              style={{
                background: "transparent",
                color: "var(--ma-text-muted)",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontWeight: 500,
                fontSize: "1rem",
                padding: "14px 28px",
                borderRadius: "8px",
                border: "1px solid var(--ma-border-bright)",
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "var(--ma-text)";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "var(--ma-text-muted)";
              }}
            >
              Watch demo
            </button>
          </Link>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{
            marginTop: "48px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px 32px",
          }}
        >
          {[
            { value: "12,000+", label: "students" },
            { value: "50+", label: "frameworks" },
            { value: "Chapter 1", label: "free always" },
          ].map((stat, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {i > 0 && (
                <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--ma-border-bright)", display: "inline-block", marginRight: "8px" }} />
              )}
              <span
                style={{
                  fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  color: "var(--ma-text)",
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "0.8rem",
                  color: "var(--ma-text-dim)",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        style={{
          position: "absolute",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          animation: "da-bounce 2s ease-in-out infinite",
          color: "var(--ma-text-muted)",
          opacity: 0.4,
        }}
      >
        <ChevronDown size={22} />
      </motion.div>
    </section>
  );
};

export default MarketingHero;
