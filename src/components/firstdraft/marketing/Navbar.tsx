import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Research tools", href: "/research-tools" },
  { label: "Pricing", href: "/pricing" },
];

const QuillIcon = () => (
  <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ color: "#B89A5A" }}>
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

export const MarketingNavbar = () => {
  const { user } = useAuth();
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
        background: scrolled ? "rgba(14,12,8,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(232,223,200,0.07)" : "1px solid transparent",
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
              color: "#E8DFC8",
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
                color: "#8A7A62",
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
              background: #E8DFC8;
              transition: width 0.25s ease;
            }
            .da-nav-link:hover { color: #E8DFC8 !important; }
            .da-nav-link:hover::after { width: 100%; }
          `}</style>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/czar">
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{
                      color: "#8A7A62",
                      border: "1px solid rgba(232,223,200,0.12)",
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
                      background: "#C4384A",
                      color: "#E8DFC8",
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
                      color: "#8A7A62",
                      background: "transparent",
                      fontFamily: '"Geist", system-ui, sans-serif',
                    }}
                    className="hover:text-[#E8DFC8] hover:bg-white/5"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button
                    size="sm"
                    style={{
                      background: "#C4384A",
                      color: "#E8DFC8",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontWeight: 600,
                      border: "none",
                    }}
                    className="active:scale-[0.97] transition-transform"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#A82D3D"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#C4384A"; }}
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "#8A7A62", background: "transparent", border: "none", cursor: "pointer" }}
          className="md:hidden hover:text-[#E8DFC8] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
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
              background: "rgba(14,12,8,0.98)",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid rgba(232,223,200,0.07)",
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
                  color: "#8A7A62",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(232,223,200,0.05)",
                  transition: "color 0.2s",
                }}
                className="hover:text-[#E8DFC8]"
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
                      style={{ color: "#8A7A62", fontFamily: '"Geist", system-ui, sans-serif' }}
                    >
                      <CzarIcon size={16} /> CZAR
                    </Button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button
                      className="w-full"
                      style={{ background: "#C4384A", color: "#E8DFC8", fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600 }}
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
                      style={{ color: "#8A7A62", fontFamily: '"Geist", system-ui, sans-serif' }}
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button
                      className="w-full"
                      style={{ background: "#C4384A", color: "#E8DFC8", fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600 }}
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
