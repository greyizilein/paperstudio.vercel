import { useNavigate } from "react-router-dom";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

export function CTABand({
  title = "Ready to start?",
  subtitle = "Chapter 1 is free. No card required.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #C4384A 0%, #8B2030 60%, #6E1825 100%)",
        padding: "96px 24px 112px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "700px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: FONTS.headline,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "clamp(2.4rem, 5vw, 4rem)",
            color: "#FFFFFF",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: "20px",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.65)",
            maxWidth: "440px",
            margin: "0 auto 40px",
            lineHeight: 1.65,
          }}
        >
          {subtitle}
        </p>
        <button
          onClick={() => navigate('/auth?tab=signup')}
          style={{
            background: "#FFFFFF",
            color: "#8B2030",
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: "1.05rem",
            padding: "16px 40px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F0F0F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF"; }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          Start writing free →
        </button>
        <p style={{ fontFamily: FONTS.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: "18px" }}>
          Free forever · No card needed · Chapter 1 always included
        </p>
      </div>
    </section>
  );
}
