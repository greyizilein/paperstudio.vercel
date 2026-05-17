import { Link } from "react-router-dom";

export const MarketingFooter = () => (
  <footer className="border-t py-12" style={{ background: "#1a1714", borderColor: "hsl(24, 14%, 14%)" }}>
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <Link to="/" className="flex items-center">
            <span className="text-xl font-extrabold text-white tracking-tight">PAPERSTUDIO</span>
          </Link>
          <p className="mt-3 text-xs text-white/25 max-w-xs">
            Built by writers, for students who can't afford one.
          </p>
        </div>
        <div className="flex gap-12">
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link to="/features" className="text-sm text-white/25 hover:text-white/50 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-sm text-white/25 hover:text-white/50 transition-colors">Pricing</Link></li>
              <li><Link to="/how-it-works" className="text-sm text-white/25 hover:text-white/50 transition-colors">How It Works</Link></li>
              <li><Link to="/research-tools" className="text-sm text-white/25 hover:text-white/50 transition-colors">Research tools</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Resources</p>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-sm text-white/25 hover:text-white/50 transition-colors">Help</Link></li>
              <li><Link to="/student-guide" className="text-sm text-white/25 hover:text-white/50 transition-colors">Student guide</Link></li>
              <li><Link to="/integrity" className="text-sm text-white/25 hover:text-white/50 transition-colors">Integrity</Link></li>
              <li><Link to="/contact" className="text-sm text-white/25 hover:text-white/50 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-sm text-white/25 hover:text-white/50 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-white/25 hover:text-white/50 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="text-sm text-white/25 hover:text-white/50 transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t text-xs text-white/15 text-center" style={{ borderColor: "hsl(24, 14%, 14%)" }}>
        © {new Date().getFullYear()} PAPERSTUDIO. All rights reserved.
      </div>
    </div>
  </footer>
);

export default MarketingFooter;
