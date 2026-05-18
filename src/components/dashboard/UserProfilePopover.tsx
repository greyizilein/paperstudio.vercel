import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, CreditCard, ShieldCheck } from "lucide-react";
import { PsAvatar } from "@/components/ps/PsAvatar";

const ADMIN_EMAIL = "grey.izilein@gmail.com";

interface UserProfilePopoverProps {
  userInitials: string;
  userName: string;
  email?: string;
  tier: string;
  wordsUsed: number;
  wordLimit: number;
  onSignOut: () => void;
  size?: "sm" | "md";
  avatarUrl?: string;
}

export function UserProfilePopover({
  userInitials, userName, email, tier, wordsUsed, wordLimit, onSignOut, size = "md", avatarUrl,
}: UserProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pct = wordLimit > 0 ? Math.min(Math.round((wordsUsed / wordLimit) * 100), 100) : 0;
  const remaining = Math.max(wordLimit - wordsUsed, 0);
  const isAdmin = !!email && email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const avatarSize = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-[11px]";

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {isAdmin && (
        <button
          onClick={() => navigate("/admin")}
          title="Admin panel"
          className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-colors"
        >
          <ShieldCheck size={13} strokeWidth={2} />
        </button>
      )}
      <PsAvatar
        initials={userInitials}
        sizeClass={avatarSize}
        onClick={() => setOpen(!open)}
        className="hover:ring-2 hover:ring-primary/30 transition-all"
        avatarUrl={avatarUrl}
      />

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[240px] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <PsAvatar initials={userInitials} sizeClass="w-9 h-9 text-[12px]" avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-foreground truncate">{userName}</div>
                {email && <div className="text-[11px] text-muted-foreground truncate">{email}</div>}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary capitalize">{tier} tier</span>
              <span className="text-[10px] text-muted-foreground">· {wordLimit.toLocaleString()}w</span>
            </div>
          </div>

          {/* Word usage */}
          <div className="px-4 py-2.5 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Word credits</span>
              <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct >= 90 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              <b className="text-foreground">{wordsUsed.toLocaleString()}</b> used · <b className="text-foreground">{remaining.toLocaleString()}</b> remaining
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate("/settings?tab=billing"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <CreditCard size={14} className="text-muted-foreground" /> Usage & Billing
            </button>
            <button
              onClick={() => { setOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Settings size={14} className="text-muted-foreground" /> Settings
            </button>
            {isAdmin && (
              <>
                <div className="h-px bg-border mx-3 my-0.5" />
                <button
                  onClick={() => { setOpen(false); navigate("/admin"); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <ShieldCheck size={14} /> Admin Panel
                </button>
              </>
            )}
            <div className="h-px bg-border mx-3 my-0.5" />
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
