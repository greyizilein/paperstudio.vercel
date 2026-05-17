import { Outlet, Link } from "react-router-dom";
import { MarketingThemeProvider, useMarketingTheme } from "@/contexts/MarketingThemeContext";
import { MarketingNavbar } from "./marketing/Navbar";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

function SiteLayoutInner() {
  const { mode } = useMarketingTheme();
  return (
    <div
      className="paperstudio-marketing min-h-screen"
      data-mode={mode}
      style={{ background: "var(--ma-bg)", color: "var(--ma-text)" }}
    >
      <MarketingNavbar />
      <main style={{ paddingTop: "64px" }}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteLayout() {
  return (
    <MarketingThemeProvider>
      <SiteLayoutInner />
    </MarketingThemeProvider>
  );
}

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--ma-footer-bg)",
        borderTop: "1px solid var(--ma-border)",
        padding: "64px 24px 48px",
      }}
    >
      <style>{`
        .site-footer-grid { display: grid; grid-template-columns: 220px 1fr; gap: 80px; }
        .site-footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        @media (max-width: 768px) {
          .site-footer-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .site-footer-cols { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          className="site-footer-grid"
          style={{ paddingBottom: "48px", borderBottom: "1px solid var(--ma-border)", marginBottom: "32px" }}
        >
          <div>
            <Link
              to="/"
              style={{
                fontFamily: FONTS.headline,
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: "var(--ma-text)",
                textDecoration: "none",
                display: "block",
                marginBottom: "12px",
              }}
            >
              PAPERSTUDIO
            </Link>
            <p style={{ fontSize: "0.85rem", color: "var(--ma-text-dim)", lineHeight: 1.7, marginBottom: "16px" }}>
              Your dissertation, written by you. Powered by PAPERSTUDIO.
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {['Harvard', 'APA 7', 'PICO', 'LaTeX'].map(t => (
                <span
                  key={t}
                  style={{
                    padding: "2px 10px",
                    borderRadius: "4px",
                    background: "rgba(196,56,74,0.12)",
                    border: "1px solid rgba(196,56,74,0.2)",
                    color: "var(--ma-accent)",
                    fontSize: "11px",
                    fontWeight: 700,
                    fontFamily: FONTS.body,
                    letterSpacing: "0.04em",
                  }}
                >{t}</span>
              ))}
            </div>
          </div>
          <div className="site-footer-cols">
            <FooterCol title="Product" links={[
              { label: 'Features', to: '/features' },
              { label: 'Pricing', to: '/pricing' },
              { label: 'How It Works', to: '/how-it-works' },
              { label: 'Changelog', to: '/changelog' },
            ]} />
            <FooterCol title="Research" links={[
              { label: 'Frameworks', to: '/research-tools' },
              { label: 'Analysis', to: '/analysis' },
              { label: 'Citations', to: '/citations' },
              { label: 'Export', to: '/export' },
            ]} />
            <FooterCol title="Support" links={[
              { label: 'Help Centre', to: '/help' },
              { label: 'Student Guide', to: '/student-guide' },
              { label: 'Contact', to: '/contact' },
              { label: 'Universities', to: '/universities' },
            ]} />
            <FooterCol title="Legal" links={[
              { label: 'Privacy', to: '/privacy' },
              { label: 'Terms', to: '/terms' },
              { label: 'Integrity', to: '/integrity' },
              { label: 'Cookies', to: '/cookies' },
            ]} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ fontSize: "13px", color: "var(--ma-text-dim)", fontFamily: FONTS.body }}>
            © 2026 PAPERSTUDIO. All rights reserved.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ma-text-dim)", fontFamily: FONTS.body }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ma-accent)", display: "inline-block" }} />
            Powered by AI
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4
        style={{
          fontFamily: FONTS.body,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ma-text-dim)",
          marginBottom: "14px",
          margin: "0 0 14px",
        }}
      >
        {title}
      </h4>
      {links.map(l => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            display: "block",
            fontSize: "0.875rem",
            color: "var(--ma-text-muted)",
            textDecoration: "none",
            marginBottom: "10px",
            transition: "color 0.2s",
            fontFamily: FONTS.body,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ma-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ma-text-muted)"; }}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
