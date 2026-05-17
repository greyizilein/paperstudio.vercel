import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketingTheme } from "@/contexts/MarketingThemeContext";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Research tools", href: "/research-tools" },
  { label: "Pricing", href: "/pricing" },
];

const QuillIcon = () => (
  <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ color: "var(--ma-gold)" }}>
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

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const MarketingNavbar = () => {
  const { user } = useAuth();
  const { mode, toggleMode } = useMarketingTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
        background: scrolled ? "var(--ma-nav-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid var(--ma-border)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <QuillIcon />
          <span
            style={{
              fontFamily: '"Fraunces", "Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "1.2rem",
              color: "var(--ma-text)",
              letterSpacing: "0.05em",
            }}
          >
            PAPERSTUDIO
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              style={{
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "0.875rem",
                color: "var(--ma-text-muted)",
                textDecoration: "none",
                position: "relative",
                paddingBottom: "2px",
                transition: "color 0.2s",
              }}
              className="da-nav-link"
            >
              {link.label}
            </Link>
          ))}
          <style>{`
            .da-nav-link::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: 0;
              width: 0;
              height: 1px;
              background: var(--ma-text);
              transition: width 0.25s ease;
            }
            .da-nav-link:hover { color: var(--ma-text) !important; }
            .da-nav-link:hover::after { width: 100%; }
          `}</style>

          <div className="flex items-center gap-3">
            {/* Day / Night toggle */}
            <button
              onClick={toggleMode}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border: "1px solid var(--ma-border)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ma-text-muted)",
                transition: "color 0.2s, border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "var(--ma-text)";
                btn.style.borderColor = "var(--ma-border-bright)";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.color = "var(--ma-text-muted)";
                btn.style.borderColor = "var(--ma-border)";
              }}
            >
              {mode === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            {user ? (
              <>
                <Link to="/czar">
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{
                      color: "var(--ma-text-muted)",
                      border: "1px solid var(--ma-border)",
                      background: "transparent",
                      fontFamily: '"Geist", system-ui, sans-serif',
                    }}
                    className="hover:bg-white/5 gap-1.5"
                  >
                    <CzarIcon size={14} /> CZAR
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    size="sm"
                    style={{
                      background: "var(--ma-accent)",
                      color: "#FFFFFF",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontWeight: 600,
                      border: "none",
                    }}
                    className="hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    Open Studio
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{
                      color: "var(--ma-text-muted)",
                      background: "transparent",
                      fontFamily: '"Geist", system-ui, sans-serif',
                    }}
                    className="hover:bg-black/5"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button
                    size="sm"
                    style={{
                      background: "var(--ma-accent)",
                      color: "#FFFFFF",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontWeight: 600,
                      border: "none",
                    }}
                    className="active:scale-[0.97] transition-transform hover:opacity-90"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleMode}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              border: "1px solid var(--ma-border)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ma-text-muted)",
            }}
          >
            {mode === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "var(--ma-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: "var(--ma-bg)",
              borderTop: "1px solid var(--ma-border)",
            }}
            className="md:hidden overflow-hidden px-6 pb-6 pt-2"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 0",
                  fontSize: "0.875rem",
                  color: "var(--ma-text)",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  textDecoration: "none",
                  borderBottom: "1px solid var(--ma-border)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ma-accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ma-text)"; }}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-4">
              {user ? (
                <>
                  <Link to="/czar" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      style={{ color: "var(--ma-text-muted)", fontFamily: '"Geist", system-ui, sans-serif' }}
                    >
                      <CzarIcon size={16} /> CZAR
                    </Button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button
                      className="w-full"
                      style={{ background: "var(--ma-accent)", color: "#FFFFFF", fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600 }}
                    >
                      Open Studio
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full"
                      style={{ color: "var(--ma-text-muted)", fontFamily: '"Geist", system-ui, sans-serif' }}
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button
                      className="w-full"
                      style={{ background: "var(--ma-accent)", color: "#FFFFFF", fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600 }}
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default MarketingNavbar;
