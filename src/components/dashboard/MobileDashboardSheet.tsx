import { useNavigate, useLocation } from "react-router-dom";
import { X, PenLine, Settings, CreditCard, LogOut, ShieldCheck } from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { PsAvatar } from "@/components/ps/PsAvatar";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "grey.izilein@gmail.com";

interface MobileDashboardSheetProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userInitials: string;
  tier?: string;
  userEmail?: string;
  avatarUrl?: string;
  onSignOut: () => void;
}

export function MobileDashboardSheet({
  open, onClose,
  userName, userInitials, tier = "Free", userEmail, avatarUrl,
  onSignOut,
}: MobileDashboardSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = userEmail === ADMIN_EMAIL;

  if (!open) return null;

  const go = (path: string) => { navigate(path); onClose(); };

  const isOnWriter = location.pathname.startsWith("/writer") || location.pathname === "/new-project";
  const isOnCzar   = location.pathname === "/czar";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[201] bg-background border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 pb-safe">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <div className="relative flex-shrink-0">
            <PsAvatar initials={userInitials} sizeClass="w-10 h-10 text-[13px]" avatarUrl={avatarUrl} />
            {isAdmin && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                <ShieldCheck size={9} strokeWidth={2.5} className="text-white" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold truncate text-foreground">{userName}</div>
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-secondary text-muted-foreground capitalize">
              {tier} tier
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* App navigation */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 pb-1.5">Open</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => go("/dashboard")}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left",
                isOnWriter
                  ? "bg-primary/8 border-primary/20 text-foreground"
                  : "bg-secondary/40 border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <PenLine size={18} className={isOnWriter ? "text-primary" : ""} />
              <div>
                <div className="text-[13px] font-bold leading-tight">Writer</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">My projects</div>
              </div>
            </button>

            <button
              onClick={() => go("/czar")}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left",
                isOnCzar
                  ? "bg-primary/8 border-primary/20 text-foreground"
                  : "bg-secondary/40 border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <CzarIcon size={18} className={isOnCzar ? "text-primary" : ""} />
              <div>
                <div className="text-[13px] font-bold leading-tight">CZAR</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">AI assistant</div>
              </div>
            </button>
          </div>
        </div>

        {/* Account actions */}
        <div className="px-4 pt-3 pb-4 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 pb-1">Account</p>

          <button
            onClick={() => go("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
          >
            <Settings size={16} />
            Settings
          </button>

          <button
            onClick={() => go("/settings?tab=billing")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
          >
            <CreditCard size={16} />
            Usage &amp; Billing
          </button>

          <button
            onClick={() => { onSignOut(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
