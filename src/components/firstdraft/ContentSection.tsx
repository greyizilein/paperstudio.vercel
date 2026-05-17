const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

export function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontFamily: FONTS.headline,
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: "1.625rem",
          color: "var(--ma-text)",
          marginBottom: "14px",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: "1rem",
          color: "var(--ma-text-muted)",
          lineHeight: 1.8,
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}
