import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Search, Inbox, Plus, FileText, Settings, HelpCircle, LogOut,
  ChevronRight, ShieldCheck, Download,
} from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { PsAvatar } from "@/components/ps/PsAvatar";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "grey.izilein@gmail.com";

interface Props {
  userName: string;
  userInitials: string;
  tier?: string;
  userEmail?: string;
  onSignOut: () => void;
  onNewProject?: () => void;
  avatarUrl?: string;
}

interface RecentProject { id: string; title: string }

/**
 * Notion-faithful sidebar:
 *   ┌─────────────────────────────┐
 *   │ [Avatar]  Name        ›     │  ← workspace header
 *   ├─────────────────────────────┤
 *   │ ⌂ Home                       │
 *   │ ⌕ Search                     │
 *   │ ✎ CZAR                       │  ← AI lives where Notion's chat is
 *   │ 📥 Inbox                     │
 *   ├─────────────────────────────┤
 *   │ RECENTS                      │  ← uppercase tracked group label
 *   │   📄 Project A               │
 *   │   📄 Project B               │
 *   │   …                          │
 *   ├─────────────────────────────┤
 *   │ ⚙ Settings  ?Help            │
 *   │ ＋ New project              │  ← pinned bottom CTA
 *   └─────────────────────────────┘
 */
export function NotionSidebar({
  userName, userInitials, tier = "Free", userEmail, onSignOut, onNewProject, avatarUrl,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = userEmail === ADMIN_EMAIL;
  const [recents, setRecents] = useState<RecentProject[]>([]);
  const [unreadInbox, setUnreadInbox] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const [{ data: projs }, { data: notifs }] = await Promise.all([
        supabase.from("projects").select("id,title").eq("user_id", uid).order("updated_at", { ascending: false }).limit(8),
        supabase.from("notifications").select("id").eq("user_id", uid).eq("read", false).limit(99),
      ]);
      if (cancelled) return;
      if (projs) setRecents(projs as RecentProject[]);
      setUnreadInbox(notifs?.length ?? 0);
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  const isActive = (test: () => boolean) => test();

  const top = [
    { icon: Home,    label: "Home",    onClick: () => navigate("/dashboard"),
      active: isActive(() => location.pathname === "/dashboard" && !location.search) },
    { icon: Search,  label: "Search",  onClick: () => {
        // Focus the topbar search if present, otherwise nav to projects view.
        const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null;
        if (el) { el.focus(); } else { navigate("/dashboard?tab=projects"); }
      }, active: false },
    { icon: CzarIcon, label: "CZAR",   onClick: () => navigate("/czar"), badge: "AI",
      active: isActive(() => location.pathname.startsWith("/czar")) },
    { icon: Inbox,    label: "Inbox",  onClick: () => navigate("/dashboard"),
      active: false, count: unreadInbox },
  ];

  const bottom = [
    { icon: Download,    label: "Exports",  onClick: () => navigate("/export"),
      active: location.pathname === "/export" },
    { icon: Settings,    label: "Settings", onClick: () => navigate("/settings"),
      active: location.pathname === "/settings" },
    { icon: HelpCircle,  label: "Help",     onClick: () => navigate("/help"),
      active: location.pathname === "/help" },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-[230px] bg-sidebar text-sidebar-foreground flex-shrink-0 h-screen sticky top-0 border-r"
      style={{ borderColor: "hsl(var(--sidebar-border))" }}
    >
      {/* Workspace header */}
      <div className="px-2.5 pt-2.5 pb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] hover:bg-sidebar-accent/60 transition-colors cursor-pointer text-left"
        >
          <div className="relative flex-shrink-0">
            <PsAvatar initials={userInitials} sizeClass="w-[18px] h-[18px] text-[9px]" avatarUrl={avatarUrl} />
            {isAdmin && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 flex items-center justify-center pointer-events-none">
                <ShieldCheck size={6} strokeWidth={3} className="text-white" />
              </span>
            )}
          </div>
          <span className="flex-1 text-[13px] font-semibold truncate">{userName}</span>
          {isAdmin && (
            <span
              onClick={(e) => { e.stopPropagation(); navigate("/admin"); }}
              className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Admin panel"
            >
              ADMIN
            </span>
          )}
          <ChevronRight size={12} className="opacity-40" />
        </button>
      </div>

      {/* Top utility nav */}
      <nav className="px-2 pb-2 space-y-px">
        {top.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] text-[13px] transition-colors cursor-pointer
              ${item.active ? "bg-sidebar-accent font-semibold" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
          >
            <item.icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {(item as any).badge && (
              <span className="px-1 py-0.5 rounded-sm bg-accent text-accent-foreground text-[8px] font-bold tracking-wider">
                {(item as any).badge}
              </span>
            )}
            {(item as any).count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground text-[9px] font-semibold">
                {(item as any).count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />

      {/* Recents group */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-3">
        <div className="px-1.5 pb-1 text-[10.5px] font-semibold text-sidebar-foreground/55 uppercase tracking-wider">
          Recents
        </div>
        {recents.length === 0 ? (
          <div className="px-1.5 py-2 text-[11.5px] text-sidebar-foreground/45 italic">
            No recent projects
          </div>
        ) : (
          <div className="space-y-px">
            {recents.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/writer/${p.id}`)}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] text-[12.5px] text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
              >
                <FileText size={13} strokeWidth={1.75} className="flex-shrink-0 opacity-70" />
                <span className="flex-1 text-left truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom utility */}
      <div className="px-2 pt-2 pb-1.5 space-y-px border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        {bottom.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] text-[12.5px] transition-colors cursor-pointer
              ${item.active ? "bg-sidebar-accent font-semibold" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
          >
            <item.icon size={14} strokeWidth={1.75} />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] text-[12.5px] transition-colors cursor-pointer
              ${location.pathname === "/admin" ? "bg-sidebar-accent font-semibold" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
          >
            <ShieldCheck size={14} strokeWidth={1.75} />
            <span className="flex-1 text-left">Admin</span>
          </button>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-[4px] text-[12.5px] text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <LogOut size={14} strokeWidth={1.75} />
          <span className="flex-1 text-left">Log out</span>
        </button>
      </div>

      {/* Pinned bottom CTA — Notion-style "+ New" */}
      <div className="px-2 pb-2.5 pt-1">
        <button
          onClick={onNewProject ?? (() => navigate("/new-project"))}
          className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-[4px] text-[12.5px] font-semibold text-sidebar-foreground/85 hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <span className="w-[18px] h-[18px] rounded-[3px] bg-sidebar-accent flex items-center justify-center">
            <Plus size={12} strokeWidth={2.25} />
          </span>
          New project
        </button>
      </div>
    </aside>
  );
}
