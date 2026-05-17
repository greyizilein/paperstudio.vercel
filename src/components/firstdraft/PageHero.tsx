const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

export function PageHero({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div
      style={{
        background: "var(--ma-surface)",
        borderBottom: "1px solid var(--ma-border)",
        padding: "80px 24px 88px",
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
          transform: "translate(-50%,-50%)",
          width: "700px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(196,56,74,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <h1
        style={{
          fontFamily: FONTS.headline,
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
          color: "var(--ma-text)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: "16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: "1.1rem",
          color: "var(--ma-text-muted)",
          maxWidth: "560px",
          margin: "0 auto",
          lineHeight: 1.65,
          position: "relative",
          zIndex: 1,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
