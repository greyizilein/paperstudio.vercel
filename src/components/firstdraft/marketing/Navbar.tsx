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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-charcoal-900/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <span className="text-xl font-extrabold tracking-tight text-white">PAPERSTUDIO</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/czar">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5">
                    <CzarIcon size={14} /> CZAR
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" className="bg-terracotta hover:bg-terracotta-600 text-white font-semibold active:scale-[0.97] transition-transform">
                    Open Studio
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button size="sm" className="bg-terracotta hover:bg-terracotta-600 text-white font-semibold active:scale-[0.97] transition-transform">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white/70 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-charcoal-900/98 backdrop-blur-md border-t border-white/5 px-6 pb-6 pt-2 overflow-hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm text-white/50 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-4">
              {user ? (
                <>
                  <Link to="/czar" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/10">
                      <CzarIcon size={16} /> CZAR
                      <span className="ml-auto text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-full bg-terracotta text-white">NEW</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-terracotta hover:bg-terracotta-600 text-white font-semibold">
                      Open Studio
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-terracotta hover:bg-terracotta-600 text-white font-semibold">
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
