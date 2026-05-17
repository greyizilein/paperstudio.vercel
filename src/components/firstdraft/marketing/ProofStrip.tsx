/* University logo strip — grayscale SVG wordmarks + shield marks */

const OxfordLogo = () => (
  <svg height="28" viewBox="0 0 230 48" fill="none" aria-label="University of Oxford" style={{ flexShrink: 0 }}>
    <path d="M12 4 L28 4 L28 30 L20 38 L12 30 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
    <path d="M15 18 L20 16 L25 18 M15 22 L20 20 L25 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <text x="36" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="currentColor" letterSpacing="1">OXFORD</text>
  </svg>
);

const CambridgeLogo = () => (
  <svg height="28" viewBox="0 0 250 48" fill="none" aria-label="University of Cambridge" style={{ flexShrink: 0 }}>
    <path d="M14 4 L26 4 L26 28 L20 36 L14 28 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
    <path d="M17 14 C17 11 23 11 23 14 C23 17 17 17 17 14 Z" stroke="currentColor" strokeWidth="1" fill="none"/>
    <path d="M17 22 L23 22 M17 26 L22 26" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <text x="34" y="31" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontWeight="400" fontStyle="italic" fill="currentColor" letterSpacing="0.5">Cambridge</text>
  </svg>
);

const HarvardLogo = () => (
  <svg height="28" viewBox="0 0 210 48" fill="none" aria-label="Harvard University" style={{ flexShrink: 0 }}>
    <path d="M14 4 L26 4 L26 30 L20 38 L14 30 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
    <text x="15.5" y="17" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="700" fill="currentColor" letterSpacing="0.5">VE</text>
    <text x="15" y="24" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="700" fill="currentColor" letterSpacing="0.5">RI</text>
    <text x="15" y="31" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="700" fill="currentColor" letterSpacing="0.5">TAS</text>
    <text x="34" y="31" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="currentColor" letterSpacing="1.5">HARVARD</text>
  </svg>
);

const MITLogo = () => (
  <svg height="28" viewBox="0 0 80 48" fill="none" aria-label="MIT" style={{ flexShrink: 0 }}>
    <text x="4" y="34" fontFamily="'Arial Black', 'Helvetica Neue', sans-serif" fontSize="28" fontWeight="900" fill="currentColor" letterSpacing="-1">MIT</text>
  </svg>
);

const UCLLogo = () => (
  <svg height="28" viewBox="0 0 200 48" fill="none" aria-label="UCL" style={{ flexShrink: 0 }}>
    <text x="4" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontWeight="700" fill="currentColor" letterSpacing="2">UCL</text>
    <line x1="4" y1="38" x2="62" y2="38" stroke="currentColor" strokeWidth="1.2"/>
    <text x="4" y="47" fontFamily="Georgia, serif" fontSize="8" fontWeight="400" fill="currentColor" letterSpacing="0.5">London's Global University</text>
  </svg>
);

const LSELogo = () => (
  <svg height="28" viewBox="0 0 200 48" fill="none" aria-label="LSE" style={{ flexShrink: 0 }}>
    <text x="4" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="currentColor" letterSpacing="2">LSE</text>
    <line x1="4" y1="37" x2="52" y2="37" stroke="currentColor" strokeWidth="1"/>
    <text x="4" y="46" fontFamily="Georgia, serif" fontSize="7.5" fontWeight="400" fill="currentColor" letterSpacing="0.3">London School of Economics</text>
  </svg>
);

const WitsLogo = () => (
  <svg height="28" viewBox="0 0 130 48" fill="none" aria-label="University of the Witwatersrand" style={{ flexShrink: 0 }}>
    <path d="M8 8 L20 8 L20 36 L14 42 L8 36 Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    <text x="12.5" y="22" fontFamily="Georgia, serif" fontSize="7" fontWeight="700" fill="currentColor">W</text>
    <text x="28" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="currentColor" letterSpacing="1">WITS</text>
  </svg>
);

const EdinburghLogo = () => (
  <svg height="28" viewBox="0 0 240 48" fill="none" aria-label="University of Edinburgh" style={{ flexShrink: 0 }}>
    <path d="M8 6 L22 6 L22 32 L15 40 L8 32 Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    <path d="M11 16 L19 16 M11 22 L19 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <text x="30" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontWeight="700" fill="currentColor" letterSpacing="0.5">EDINBURGH</text>
  </svg>
);

const StanfordLogo = () => (
  <svg height="28" viewBox="0 0 180 48" fill="none" aria-label="Stanford University" style={{ flexShrink: 0 }}>
    <text x="4" y="32" fontFamily="Georgia, 'Times New Roman', serif" fontSize="19" fontWeight="400" fontStyle="italic" fill="currentColor" letterSpacing="0.3">Stanford</text>
  </svg>
);

const TorontoLogo = () => (
  <svg height="28" viewBox="0 0 170 48" fill="none" aria-label="University of Toronto" style={{ flexShrink: 0 }}>
    <text x="4" y="20" fontFamily="Georgia, serif" fontSize="10" fontWeight="700" fill="currentColor" letterSpacing="0.5">UNIVERSITY OF</text>
    <text x="4" y="36" fontFamily="Georgia, serif" fontSize="14" fontWeight="700" fill="currentColor" letterSpacing="0.5">TORONTO</text>
  </svg>
);

const logos = [
  OxfordLogo, CambridgeLogo, HarvardLogo, MITLogo,
  UCLLogo, LSELogo, WitsLogo, EdinburghLogo, StanfordLogo, TorontoLogo,
];

export const ProofStrip = () => (
  <div
    style={{
      background: "var(--ma-surface)",
      borderTop: "1px solid var(--ma-border)",
      borderBottom: "1px solid var(--ma-border)",
      padding: "32px 0",
      overflow: "hidden",
    }}
  >
    <p
      style={{
        textAlign: "center",
        fontSize: "0.65rem",
        color: "var(--ma-text-dim)",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        fontFamily: '"Geist", system-ui, sans-serif',
        fontWeight: 600,
        marginBottom: "24px",
      }}
    >
      Trusted by students at
    </p>

    <div style={{ position: "relative" }}>
      {/* Fade edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "100px", zIndex: 2,
        background: "linear-gradient(to right, var(--ma-surface), transparent)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "100px", zIndex: 2,
        background: "linear-gradient(to left, var(--ma-surface), transparent)",
        pointerEvents: "none",
      }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          animation: "ps-slide-left 36s linear infinite",
        }}
      >
        {[...logos, ...logos].map((Logo, i) => (
          <div
            key={i}
            style={{
              padding: "0 52px",
              color: "var(--ma-text-muted)",
              opacity: 0.45,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.45"; }}
          >
            <Logo />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ProofStrip;
