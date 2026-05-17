import { LayoutDashboard, FolderOpen, Download, User, Settings, CreditCard, HelpCircle, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { usePsTheme } from "@/contexts/PsThemeContext";
import { getPsTheme } from "@/lib/psThemes";
import { NotionSidebar } from "@/components/dashboard/NotionSidebar";
import { PsAvatar } from "@/components/ps/PsAvatar";

const ADMIN_EMAIL = "grey.izilein@gmail.com";

interface DashboardSidebarProps {
  userName: string;
  userInitials: string;
  tier?: string;
  onSignOut: () => void;
  userEmail?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FolderOpen, label: "My Projects", path: "/dashboard?tab=projects" },
  { icon: CzarIcon, label: "CZAR", path: "/czar", badge: "NEW" },
  { icon: Download, label: "Exports", path: "/export" },
  { icon: User, label: "Account", path: "/settings" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Usage & Billing", path: "/settings?tab=billing" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
];

export function DashboardSidebar({ userName, userInitials, tier = "Masters", onSignOut, userEmail }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = userEmail === ADMIN_EMAIL;
  const { themeId } = usePsTheme();
  const sidebarVariant = getPsTheme(themeId).sidebar;

  // Themes opting into the Notion-exact layout render a fully different shell.
  if (sidebarVariant === "notion-exact") {
    return (
      <NotionSidebar
        userName={userName}
        userInitials={userInitials}
        tier={tier}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-[210px] bg-sidebar text-sidebar-foreground flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <button onClick={() => navigate("/")} className="font-heading text-base font-black tracking-tight text-sidebar-foreground hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-0 text-left">
          PAPERSTUDIO
        </button>
      </div>

      {/* User */}
      <div className="px-5 pb-4 flex items-center gap-2.5">
        <PsAvatar initials={userInitials} sizeClass="w-8 h-8 text-[11px]" />

        <div className="min-w-0">
          <div className="text-[12px] font-bold truncate">{userName}</div>
          <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-sidebar-accent text-sidebar-foreground">{tier} tier</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active =
            (item.label === "Dashboard" && location.pathname === "/dashboard" && !location.search) ||
            (item.label === "My Projects" && location.pathname === "/dashboard" && location.search.includes("tab=projects")) ||
            (item.label === "CZAR" && location.pathname === "/czar") ||
            (item.label === "Exports" && location.pathname === "/export") ||
            (item.label === "Account" && location.pathname === "/settings" && !location.search) ||
            (item.label === "Settings" && location.pathname === "/settings" && !location.search) ||
            (item.label === "Usage & Billing" && location.pathname === "/settings" && location.search.includes("tab=billing")) ||
            (item.label === "Help & Support" && location.pathname === "/help");
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer
                ${active ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"} border-none text-left`}
            >
              <item.icon size={15} />
              <span className="flex-1">{item.label}</span>
              {(item as any).badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-black tracking-wider">
                  {(item as any).badge}
                </span>
              )}
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer
              ${location.pathname === "/admin" ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
          >
            <ShieldCheck size={15} />
            Admin
          </button>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
