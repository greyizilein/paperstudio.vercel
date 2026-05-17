import { Link } from "react-router-dom";

const DA_FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const QuillIcon = () => (
  <svg width="14" height="14" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ color: "#B89A5A" }}>
    <path
      d="M50 6 C 40 10, 32 18, 27 30 C 24 38, 23 46, 24 52 L 28 52 C 30 46, 33 40, 38 34 C 44 26, 49 18, 52 10 C 53 8, 52 6, 50 6 Z"
      fill="currentColor"
    />
    <path
      d="M48 10 C 40 18, 33 28, 28 44"
      stroke="rgba(10,8,4,0.5)"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M24 52 L 28 52 L 26 58 Z" fill="currentColor" />
    <circle cx="26" cy="58.5" r="1.1" fill="currentColor" />
  </svg>
);

type FooterLinkCol = {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
};

const linkColumns: FooterLinkCol[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Research Tools", href: "/research-tools" },
      { label: "CZAR Assistant", href: "/czar" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Student Guide", href: "/student-guide" },
      { label: "Academic Integrity", href: "/integrity" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
  {
    heading: "Social",
    links: [
      { label: "Twitter / X", href: "https://twitter.com/paperstudio_io", external: true },
      { label: "Instagram", href: "https://instagram.com/paperstudio", external: true },
      { label: "LinkedIn", href: "https://linkedin.com/company/paperstudio", external: true },
    ],
  },
];

const FooterLink = ({ href, label, external }: { href: string; label: string; external?: boolean }) => {
  const style: React.CSSProperties = {
    fontFamily: DA_FONTS.body,
    fontSize: "0.85rem",
    color: "#6B6050",
    textDecoration: "none",
    transition: "color 0.2s",
    display: "block",
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        className="footer-da-link"
      >
        {label}
      </a>
    );
  }
  return (
    <Link to={href} style={style} className="footer-da-link">
      {label}
    </Link>
  );
};

export const MarketingFooter = () => (
  <footer
    style={{
      background: "#0A0804",
      borderTop: "1px solid rgba(232,223,200,0.06)",
    }}
  >
    <style>{`
      .footer-da-link:hover { color: #A8967A !important; }
    `}</style>

    <div
      style={{
        maxWidth: "1152px",
        margin: "0 auto",
        padding: "72px 24px 0",
      }}
    >
      {/* Top: logo + columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr repeat(4, 1fr)",
          gap: "48px",
          paddingBottom: "64px",
        }}
        className="footer-da-grid"
      >
        <style>{`
          @media (max-width: 768px) {
            .footer-da-grid {
              grid-template-columns: 1fr 1fr !important;
              gap: 40px 32px !important;
            }
            .footer-da-brand { grid-column: 1 / -1 !important; }
          }
          @media (max-width: 480px) {
            .footer-da-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Brand */}
        <div className="footer-da-brand" style={{ gridColumn: "1" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <QuillIcon />
            <span
              style={{
                fontFamily: DA_FONTS.headline,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: "#E8DFC8",
                letterSpacing: "0.05em",
              }}
            >
              PAPERSTUDIO
            </span>
          </Link>
          <p
            style={{
              fontFamily: DA_FONTS.body,
              fontSize: "0.82rem",
              color: "#6B6050",
              lineHeight: 1.65,
              marginTop: "14px",
              maxWidth: "240px",
            }}
          >
            The academic AI writing engine for students who take their work seriously.
          </p>
          {/* Mini stats */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "24px",
            }}
          >
            {[
              { val: "12k+", label: "Students" },
              { val: "50+", label: "Frameworks" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: DA_FONTS.headline,
                    fontStyle: "italic",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: "#A8967A",
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontFamily: DA_FONTS.body,
                    fontSize: "0.7rem",
                    color: "#6B6050",
                    marginTop: "2px",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {linkColumns.map((col) => (
          <div key={col.heading}>
            <p
              style={{
                fontFamily: DA_FONTS.body,
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#4A4035",
                marginBottom: "16px",
              }}
            >
              {col.heading}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid rgba(232,223,200,0.05)",
          padding: "22px 0 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontFamily: DA_FONTS.body,
            fontSize: "0.75rem",
            color: "#4A4035",
          }}
        >
          © {new Date().getFullYear()} PAPERSTUDIO. All rights reserved.
        </span>
        <span
          style={{
            fontFamily: DA_FONTS.headline,
            fontStyle: "italic",
            fontSize: "0.8rem",
            color: "#4A4035",
          }}
        >
          Made for students who can't afford a writer.
        </span>
      </div>
    </div>
  </footer>
);

export default MarketingFooter;
