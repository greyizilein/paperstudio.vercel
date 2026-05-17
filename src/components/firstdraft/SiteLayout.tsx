import { useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const navLinks = [
  { label: 'Features', to: '/features' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Research tools', to: '/research-tools' },
];

export function SiteLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-[200] h-[60px] bg-white/95 backdrop-blur-2xl border-b border-border flex items-center justify-between px-6 md:px-12 transition-shadow">
        <Link to="/" className="z-10"><Logo /></Link>
        <div className="hidden md:flex gap-7">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors tracking-tight">{l.label}</Link>
          ))}
        </div>
        <div className="flex gap-2.5 items-center z-10">
          {user ? (
            <button onClick={signOut} className="hidden sm:inline-flex px-5 py-2 rounded-md text-sm font-bold text-primary border-[1.5px] border-primary hover:bg-primary-light transition-all">Sign out</button>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:inline-flex px-5 py-2 rounded-md text-sm font-bold text-primary border-[1.5px] border-primary hover:bg-primary-light transition-all">Log in</Link>
              <Link to="/auth" className="hidden sm:inline-flex px-5 py-2 rounded-md text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-all items-center gap-1.5">Get started →</Link>
            </>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground cursor-pointer">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] z-[199] bg-white flex flex-col px-6 pt-6 pb-10 gap-2 animate-fade-in">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="text-lg font-bold text-foreground hover:text-primary py-2 border-b border-border transition-colors">
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2.5">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="px-5 py-3 rounded-md text-sm font-bold bg-primary text-white text-center">Dashboard</Link>
                <button onClick={() => { setMobileOpen(false); signOut(); }} className="px-5 py-3 rounded-md text-sm font-bold text-primary border-[1.5px] border-primary">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="px-5 py-3 rounded-md text-sm font-bold bg-primary text-white text-center">Get started →</Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="px-5 py-3 rounded-md text-sm font-bold text-primary border-[1.5px] border-primary text-center">Log in</Link>
              </>
            )}
          </div>
        </div>
      )}

      <main><Outlet /></main>

      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-foreground py-16 px-6 md:px-20 border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-20 pb-12 border-b border-white/[0.07] mb-8">
          <div>
            <Link to="/" className="font-heading text-[22px] font-black text-white block mb-3 tracking-tight">PAPERSTUDIO</Link>
            <p className="text-sm text-white/35 leading-[1.7] mb-4">Your dissertation, written by you. Powered by PAPERSTUDIO.</p>
            <div className="flex gap-1.5 flex-wrap">
              {['Harvard', 'APA 7', 'PICO', 'LaTeX'].map(t => (
                <span key={t} className="px-2.5 py-0.5 rounded-sm bg-primary/30 text-primary-light text-[11px] font-bold font-mono">{t}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[13px] text-white/25">© 2026 PAPERSTUDIO. All rights reserved.</div>
          <div className="text-xs text-white/25 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-mid" />Powered by AI
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-black tracking-[0.12em] uppercase text-white/30 mb-3.5">{title}</h4>
      {links.map(l => (
        <Link key={l.to} to={l.to} className="block text-sm text-white/45 hover:text-white transition-colors mb-2.5">{l.label}</Link>
      ))}
    </div>
  );
}
