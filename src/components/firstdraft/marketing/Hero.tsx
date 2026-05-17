import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const cyclingWords = ["dissertation", "thesis", "capstone", "research paper"];

export const MarketingHero = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % cyclingWords.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      style={{
        background: "var(--ma-bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes hero-line {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* Subtle crimson glow — top left */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "560px",
          height: "560px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,56,74,0.12) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "120px 48px 80px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}
        className="hero-grid"
      >
        <style>{`
          @media (max-width: 860px) {
            .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; padding: 100px 24px 64px !important; }
            .hero-video-wrap { order: -1; height: 280px !important; }
          }
        `}</style>

        {/* LEFT: Copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Headline */}
          <h1
            style={{
              fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "clamp(3rem, 6.5vw, 5.8rem)",
              lineHeight: 1.04,
              color: "var(--ma-text)",
              letterSpacing: "-0.03em",
              margin: "0 0 12px",
            }}
          >
            Write your{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: "inline-block", color: "var(--ma-accent)" }}
                >
                  {cyclingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            .{" "}
            <em style={{ color: "var(--ma-text)", opacity: 0.5, fontStyle: "italic" }}>
              Finally.
            </em>
          </h1>

          {/* Divider line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "1px",
              width: "64px",
              background: "var(--ma-accent)",
              transformOrigin: "left",
              margin: "28px 0",
            }}
          />

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              color: "var(--ma-text-muted)",
              maxWidth: "480px",
              lineHeight: 1.7,
              fontFamily: '"Geist", system-ui, sans-serif',
              margin: "0 0 40px",
            }}
          >
            Chapter-by-chapter structure, real citations, narrative flow — exports a submission-ready .docx your supervisor will respect.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}
          >
            <Link to="/auth?tab=signup">
              <button
                style={{
                  background: "var(--ma-accent)",
                  color: "#F5EDD8",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: "1rem",
                  padding: "15px 34px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  transition: "opacity 0.2s, transform 0.15s",
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
                  padding: "15px 28px",
                  borderRadius: "6px",
                  border: "1px solid var(--ma-border-bright)",
                  cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "var(--ma-text)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "var(--ma-text-muted)";
                }}
              >
                Watch demo →
              </button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            style={{
              marginTop: "48px",
              display: "flex",
              gap: "40px",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "12,000+", label: "students" },
              { value: "50+", label: "frameworks" },
              { value: "Free", label: "Chapter 1 always" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: "1.4rem",
                    color: "var(--ma-text)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "0.75rem",
                    color: "var(--ma-text-dim)",
                    marginTop: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* RIGHT: Video */}
        <motion.div
          className="hero-video-wrap"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "relative",
            height: "520px",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid var(--ma-border)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          >
            <source src="/videos/student-loop.mp4" type="video/mp4" />
          </video>
          {/* Subtle gradient overlay bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40%",
              background: "linear-gradient(to top, var(--ma-bg) 0%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            style={{
              position: "absolute",
              bottom: "28px",
              left: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(5,5,5,0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(240,234,216,0.1)",
              borderRadius: "10px",
              padding: "10px 16px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#4A7A38",
                boxShadow: "0 0 8px rgba(74,122,56,0.8)",
              }}
            />
            <span
              style={{
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "0.8rem",
                color: "rgba(240,234,216,0.8)",
                fontWeight: 500,
              }}
            >
              AI writing now
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketingHero;
