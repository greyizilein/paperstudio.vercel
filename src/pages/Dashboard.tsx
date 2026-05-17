import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Bell, ChevronRight, Menu, X, LogOut, LayoutDashboard, FolderOpen, Download as DownloadIcon, User, Settings, CreditCard, HelpCircle, Trash2, Copy, Share2, ShieldCheck, Loader2, PenLine, MessageCircle, SpellCheck, Activity } from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { BookLoader } from "@/components/ui/BookLoader";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, getUserSubscription, deleteProject, type Subscription } from "@/lib/projectService";
import { supabase } from "@/integrations/supabase/client";
import { type Project } from "@/types/project";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AnimatedRing } from "@/components/dashboard/AnimatedRing";
import { UserProfilePopover } from "@/components/dashboard/UserProfilePopover";
import { PsThemeToggle } from "@/components/ps/PsThemeToggle";
import { FileText, BookOpen, Type } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReferralPanel } from "@/components/dashboard/ReferralPanel";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscription, setSubscription] = useState<Subscription>({ tier: "free", word_limit: 3000, words_used: 0, status: "active" });
  const [referralCode, setReferralCode] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showOAuthReferralPrompt, setShowOAuthReferralPrompt] = useState(false);
  const [oauthReferralInput, setOAuthReferralInput] = useState("");
  const [viewportH, setViewportH] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 900);

  // Track viewport height — when below 600px, collapse chart to sparkline
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 250);
    idle(() => {
      loadReferralCode();
      loadNotifications();
      checkOAuthReferralPrompt();
      loadCompletedCount();
    });
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, sub] = await Promise.all([
        fetchProjects(user.id),
        getUserSubscription(user.id),
      ]);
      setProjects(data);
      // Admin gets unlimited everything everywhere — no DB row needed.
      if (user.email === "grey.izilein@gmail.com") {
        setSubscription({ tier: "phd", word_limit: 999999, words_used: 0, status: "active" });
      } else {
        setSubscription(sub);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadCompletedCount = async () => {
    if (!user) return;
    const { data: countData } = await supabase.rpc("count_completed_projects", { _user_id: user.id });
    setCompletedCount(countData || 0);
  };

  const loadReferralCode = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle();
    if (data?.referral_code) setReferralCode(data.referral_code);
  };

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const checkOAuthReferralPrompt = async () => {
    if (!user) return;
    const isGoogleUser = user.app_metadata?.provider === "google";
    if (!isGoogleUser) return;
    const { data: prof } = await supabase.from("profiles").select("settings_json").eq("user_id", user.id).maybeSingle();
    const settings = (prof?.settings_json as Record<string, string>) || {};
    if (settings.referral_prompted === "true") return;
    const { data: referralUse } = await supabase.from("referral_uses").select("id").eq("referred_user_id", user.id).maybeSingle();
    if (referralUse) return;

    // Auto-apply a referral code stashed in localStorage from /ref/:code or the auth page
    const stashed = (localStorage.getItem("ps_referral_code") || "").trim().toUpperCase();
    if (stashed) {
      const { data: refCode } = await supabase.from("referral_codes").select("id").eq("code", stashed).eq("active", true).maybeSingle();
      if (refCode) {
        await supabase.from("referral_uses").insert({ referral_code_id: refCode.id, referred_user_id: user.id, referred_email: user.email, status: "pending" } as any);
        const { data: codeRow } = await supabase.from("referral_codes").select("uses_count").eq("id", refCode.id).maybeSingle();
        await supabase.from("referral_codes").update({ uses_count: (codeRow?.uses_count ?? 0) + 1 } as any).eq("id", refCode.id);
        await supabase.from("profiles").update({ settings_json: { ...settings, referral_prompted: "true" } } as any).eq("user_id", user.id);
        localStorage.removeItem("ps_referral_code");
        toast.success("Referral code applied!");
        return;
      }
    }

    setOAuthReferralInput(stashed);
    setShowOAuthReferralPrompt(true);
  };

  const submitOAuthReferral = async () => {
    if (!user || !oauthReferralInput.trim()) {
      const { data: prof } = await supabase.from("profiles").select("settings_json").eq("user_id", user!.id).maybeSingle();
      const settings = (prof?.settings_json as Record<string, string>) || {};
      await supabase.from("profiles").update({ settings_json: { ...settings, referral_prompted: "true" } } as any).eq("user_id", user!.id);
      setShowOAuthReferralPrompt(false);
      return;
    }
    const code = oauthReferralInput.trim().toUpperCase();
    const { data: refCode } = await supabase.from("referral_codes").select("id").eq("code", code).eq("active", true).maybeSingle();
    if (!refCode) { toast.error("Invalid referral code"); return; }
    await supabase.from("referral_uses").insert({ referral_code_id: refCode.id, referred_user_id: user.id, referred_email: user.email, status: "pending" } as any);
    const { data: codeRow } = await supabase.from("referral_codes").select("uses_count").eq("id", refCode.id).maybeSingle();
    await supabase.from("referral_codes").update({ uses_count: (codeRow?.uses_count ?? 0) + 1 } as any).eq("id", refCode.id);
    const { data: prof } = await supabase.from("profiles").select("settings_json").eq("user_id", user.id).maybeSingle();
    const settings = (prof?.settings_json as Record<string, string>) || {};
    await supabase.from("profiles").update({ settings_json: { ...settings, referral_prompted: "true" } } as any).eq("user_id", user.id);
    toast.success("Referral code applied!");
    setShowOAuthReferralPrompt(false);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/ref/${referralCode}`);
    toast.success("Referral link copied!");
  };

  const userInitials = (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const isTestUser = user?.email === "grey.izilein@gmail.com";

  const handleNewProject = () => {
    const maxProjects = subscription.tier === "free" ? 1 : subscription.tier === "undergraduate" ? 3 : subscription.tier === "masters" ? 5 : 999;
    if (!isTestUser && projects.length >= maxProjects) {
      toast.error(`You've reached the ${subscription.tier} tier limit of ${maxProjects} project${maxProjects > 1 ? "s" : ""}. Upgrade to create more.`);
      return;
    }
    navigate("/new-project");
  };

  const allChapters = projects.flatMap((p) => p.chapters);
  const chapsDrafted = allChapters.filter((c) => c.status === "completed").length;
  const totalWords = subscription.words_used;
  const wordLimit = subscription.word_limit;
  const wordPct = wordLimit > 0 ? Math.round((totalWords / wordLimit) * 100) : 0;

  const activeProject = projects[0];
  const activeChapter = activeProject?.chapters.find((c) => c.status === "pending" && (c.word_count_actual || 0) > 0) || activeProject?.chapters.find((c) => c.status === "pending");

  const activities = allChapters
    .filter((c) => c.word_count_actual && c.word_count_actual > 0)
    .slice(0, 6)
    .map((c) => ({
      text: `${c.status === "completed" ? "Completed" : "Drafted"} ${c.title} — ${(c.word_count_actual || 0).toLocaleString()} words`,
      time: "Recently",
      color: c.status === "completed" ? "hsl(var(--green))" : "hsl(var(--aqua))",
    }));

  const barData = projects.slice(0, 6).map((p) => ({
    name: p.title.slice(0, 14) + (p.title.length > 14 ? "…" : ""),
    words: p.chapters.reduce((s, c) => s + (c.word_count_actual || 0), 0),
    target: p.word_count,
  }));

  const [searchParams] = useSearchParams();

  // Sidebar deep-links: ?tab=billing → /settings, ?tab=projects → expanded list overlay
  const [showProjectsOverlay, setShowProjectsOverlay] = useState(false);
  const [showReferralOverlay, setShowReferralOverlay] = useState(false);
  const overlayClosedAtRef = useRef<number>(0);
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;
    if (tabParam === "billing") { navigate("/settings?tab=billing", { replace: true }); return; }
    if (tabParam === "projects") setShowProjectsOverlay(true);
  }, [searchParams, navigate]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const projectsMaxLabel = isTestUser ? "∞"
    : subscription.tier === "free" ? "1"
    : subscription.tier === "undergraduate" ? "3"
    : subscription.tier === "masters" ? "5"
    : "∞";

  // Compact mode for short viewports
  const isCompact = viewportH < 600;

  if (loading) {
    return <BookLoader fullScreen />;
  }

  const filteredProjects = projects.filter(p => !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const topProjects = filteredProjects.slice(0, 8);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar userName={userName} userInitials={userInitials} tier={subscription.tier} onSignOut={signOut} userEmail={user?.email} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-[240px] h-full bg-sidebar text-sidebar-foreground flex flex-col animate-slide-in-right">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <button onClick={() => { setMobileMenuOpen(false); navigate("/"); }} className="font-heading text-base font-black tracking-tight text-sidebar-foreground bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity">PAPERSTUDIO</button>
              <button onClick={() => setMobileMenuOpen(false)} className="text-sidebar-foreground/70 cursor-pointer bg-transparent border-none p-0"><X size={18} /></button>
            </div>
            <div className="px-5 pb-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-black flex-shrink-0">{userInitials}</div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">{userName}</div>
                <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-sidebar-accent text-sidebar-foreground">{subscription.tier} tier</span>
              </div>
            </div>
            <nav className="flex-1 px-3 space-y-0.5">
              {[
                { icon: CzarIcon, label: "CZAR", path: "/czar", badge: "NEW" },
                { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
                { icon: FolderOpen, label: "My Projects", path: "/dashboard?tab=projects" },
                { icon: DownloadIcon, label: "Exports", path: "/export" },
                { icon: User, label: "Account", path: "/settings" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: CreditCard, label: "Usage & Billing", path: "/settings?tab=billing" },
                { icon: HelpCircle, label: "Help & Support", path: "/help" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
                >
                  <item.icon size={15} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {(item as any).badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-black tracking-wider">
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              ))}
              {isTestUser && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
                >
                  <ShieldCheck size={15} />
                  Admin
                </button>
              )}
            </nav>
            <div className="px-3 pb-5">
              <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* COMPACT HEADER (48px) */}
        <header className="h-12 bg-card border-b border-border flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-muted-foreground cursor-pointer"><Menu size={20} /></button>
          <div className="flex-1 hidden sm:flex items-center gap-2 max-w-xs">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects…"
              className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
          <button className="sm:hidden text-muted-foreground"><Search size={16} /></button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleNewProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus size={12} /> <span className="hidden sm:inline">New project</span><span className="sm:hidden">New</span>
            </button>
            <div className="relative">
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="relative text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-8 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-[12px] font-bold text-foreground">Notifications</span>
                    <button onClick={() => setShowNotifDropdown(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-[11px] text-muted-foreground py-6">No notifications yet</p>
                    ) : notifications.map(n => (
                      <div key={n.id} onClick={() => markNotifRead(n.id)} className={`px-3 py-2.5 border-b border-border/50 cursor-pointer hover:bg-secondary/50 ${!n.read ? "bg-primary/5" : ""}`}>
                        <div className="text-[12px] font-bold text-foreground">{n.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <PsThemeToggle size={15} />
            <UserProfilePopover
              userInitials={userInitials}
              userName={userName}
              email={user?.email}
              tier={subscription.tier}
              wordsUsed={subscription.words_used}
              wordLimit={subscription.word_limit}
              onSignOut={signOut}
              size="sm"
            />
          </div>
        </header>

        {/* COCKPIT BODY — fills remaining viewport, no outer scroll */}
        <div className="flex-1 min-h-0 bg-[#F9F7F5] flex flex-col p-2 sm:p-3 gap-2 sm:gap-3 overflow-hidden">

          {/* OAuth referral pill (only when active) */}
          {showOAuthReferralPrompt && (
            <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-bold text-foreground hidden sm:inline">Referral code?</span>
              <input
                value={oauthReferralInput}
                onChange={e => setOAuthReferralInput(e.target.value.toUpperCase())}
                placeholder="PS-ABC123"
                className="flex-1 px-2 py-1 border border-border rounded-md text-[11px] bg-background outline-none focus:border-primary font-mono min-w-0"
              />
              <button onClick={submitOAuthReferral} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">Apply</button>
              <button onClick={() => { setShowOAuthReferralPrompt(false); submitOAuthReferral(); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
          )}

          {/* HERO STRIP — single row */}
          <div className="bg-white rounded-xl border border-[#ece8e3] shadow-sm px-3 py-2.5 sm:px-4 sm:py-3 flex-shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <AnimatedRing size={isCompact ? 70 : 84} strokeWidth={9} percent={wordPct} color="#E8914A" bgColor="#F3EDE6">
                  <text x={isCompact ? 35 : 42} y={isCompact ? 38 : 45} textAnchor="middle" style={{ fontSize: isCompact ? 13 : 15, fontWeight: 900, fill: "#1a1a1a", fontFamily: "Nunito, sans-serif" }}>
                    {totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords.toLocaleString()}
                  </text>
                  <text x={isCompact ? 35 : 42} y={isCompact ? 50 : 58} textAnchor="middle" style={{ fontSize: 7, fill: "#9a9080", fontFamily: "Lato, sans-serif" }}>
                    words
                  </text>
                </AnimatedRing>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 flex-1 min-w-0">
                <button onClick={() => { if (Date.now() - overlayClosedAtRef.current < 350) return; setShowProjectsOverlay(true); }} className="text-left">
                  <KPI icon={<FileText size={12} />} label="Projects" value={projects.length.toString()} sub={`/${projectsMaxLabel}`} accent="#E8914A" />
                </button>
                <KPI icon={<BookOpen size={12} />} label="Chapters" value={chapsDrafted.toString()} sub={`/${allChapters.length}`} accent="#4DB68A" />
                <KPI icon={<Type size={12} />} label="Words left" value={(wordLimit - totalWords).toLocaleString()} sub={`${wordPct}%`} accent="#6366F1" />
                <KPI icon={<Activity size={12} />} label="Done" value={completedCount.toString()} sub="projects" accent="#dc2626" />
              </div>
              {!isTestUser && (
                <button
                  onClick={() => navigate("/settings?tab=billing")}
                  className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#1a1a1a] text-white text-[11px] font-bold hover:bg-[#333] transition-colors flex-shrink-0"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* MIDDLE ROW — 3 columns desktop, accordion mobile, fills remaining height */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">

            {/* COL 1: Top Projects */}
            <div className="hidden md:flex bg-white rounded-xl border border-[#ece8e3] shadow-sm flex-col min-h-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#ece8e3] flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-bold text-[#1a1a1a]">My Projects</span>
                <button onClick={() => { if (Date.now() - overlayClosedAtRef.current < 350) return; setShowProjectsOverlay(true); }} className="text-[10px] text-[#9a9080] hover:text-[#1a1a1a]">{projects.length} · view all</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {topProjects.length === 0 ? (
                  <div className="text-center py-6 px-3">
                    <FileText size={20} className="mx-auto text-[#c0b8ae] mb-2" />
                    <p className="text-[11px] text-[#9a9080] mb-2">No projects yet</p>
                    <button onClick={handleNewProject} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-[#1a1a1a]">
                      <Plus size={10} /> Create
                    </button>
                  </div>
                ) : topProjects.map((p) => {
                  const done = p.chapters.filter((c) => c.status === "completed").length;
                  const total = p.chapters.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={p.id} onClick={() => navigate(`/writer/${p.id}`)} className="flex items-center gap-2 px-3 py-2 border-b border-[#f3ede6] last:border-b-0 hover:bg-[#FAF8F5] transition-colors cursor-pointer group">
                      <AnimatedRing size={26} strokeWidth={3} percent={pct} color="#E8914A" bgColor="#F3EDE6" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-[#1a1a1a] truncate">{p.title}</div>
                        <div className="text-[9px] text-[#9a9080] mt-0.5">{done}/{total} ch · {pct}%</div>
                      </div>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete "${p.title}"?`)) return;
                        try { await deleteProject(p.id); setProjects(prev => prev.filter(proj => proj.id !== p.id)); toast.success("Project deleted"); }
                        catch (err: any) { toast.error(err.message); }
                      }} className="text-[#c0b8ae] hover:text-destructive opacity-0 group-hover:opacity-100 p-0.5">
                        <Trash2 size={11} />
                      </button>
                      <ChevronRight size={12} className="text-[#c0b8ae]" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COL 2: Writing Progress chart (or sparkline if compact) */}
            <div className="bg-white rounded-xl border border-[#ece8e3] shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#ece8e3] flex-shrink-0">
                <p className="text-[11px] font-bold text-[#1a1a1a]">Writing Progress</p>
                <p className="text-[9px] text-[#9a9080]">Words vs target</p>
              </div>
              <div className="flex-1 min-h-0 p-2">
                {barData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <FileText size={22} className="text-[#c0b8ae] mb-1" />
                    <p className="text-[10px] text-[#9a9080]">No data yet</p>
                  </div>
                ) : isCompact ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={barData}>
                      <Area type="monotone" dataKey="words" stroke="#E8914A" fill="#E8914A" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: "1px solid #ece8e3" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barGap={2} margin={{ top: 4, right: 4, bottom: 18, left: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9a9080" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: "1px solid #ece8e3" }} />
                      <Bar dataKey="target" fill="#F3EDE6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="words" radius={[3, 3, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.words >= entry.target ? "#4DB68A" : "#E8914A"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* COL 3: Quick Actions */}
            <div className="bg-white rounded-xl border border-[#ece8e3] shadow-sm p-2">
              <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#9a9080] mb-1.5 px-1">Quick Actions</div>
              <div className="grid grid-cols-2 gap-1.5">
                <QuickBtn icon={<PenLine size={12} />} label="Continue" onClick={() => activeProject && navigate(`/writer/${activeProject.id}`)} disabled={!activeProject} />
                <QuickBtn icon={<DownloadIcon size={12} />} label="Export" onClick={() => navigate("/export")} />
                <QuickBtn icon={<SpellCheck size={12} />} label="Grammar" onClick={() => activeProject && navigate(`/writer/${activeProject.id}`)} disabled={!activeProject} />
                <QuickBtn icon={<MessageCircle size={12} />} label="Help" onClick={() => navigate("/help")} />
              </div>
            </div>
          </div>

          {/* BOTTOM STRIP — 56px */}
          <div className="bg-white rounded-xl border border-[#ece8e3] shadow-sm px-3 py-2 flex-shrink-0 flex items-center gap-2 sm:gap-3 text-[11px] overflow-hidden">
            {/* Plan chip */}
            <button onClick={() => navigate("/settings?tab=billing")} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#ece8e3] hover:bg-[#f3ede6] transition-colors flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: subscription.status === "active" ? "#4DB68A" : "#dc2626" }} />
              <span className="font-bold capitalize text-[#1a1a1a]">{subscription.tier}</span>
              <span className="text-[#9a9080] hidden sm:inline">· {(totalWords / 1000).toFixed(1)}k/{(wordLimit / 1000).toFixed(0)}k</span>
            </button>

            {/* Referral chip — opens wallet overlay */}
            {referralCode && (
              <button onClick={() => setShowReferralOverlay(true)} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#ece8e3] hover:bg-[#f3ede6] transition-colors flex-shrink-0">
                <Share2 size={10} className="text-[#9a9080]" />
                <span className="font-mono font-bold text-[#1a1a1a]">{referralCode}</span>
                <span className="text-[9px] font-bold text-primary hidden sm:inline">Wallet</span>
              </button>
            )}

            {/* Latest activity inline */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {activities[0] ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: activities[0].color }} />
                  <span className="text-[#3a3530] truncate">{activities[0].text}</span>
                </>
              ) : (
                <span className="text-[#9a9080] truncate">No recent activity yet</span>
              )}
            </div>

            {/* View all activity popover */}
            {activities.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[10px] font-bold text-[#7a7060] hover:text-[#1a1a1a] underline flex-shrink-0">All activity</button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="w-72 p-0">
                  <div className="px-3 py-2 border-b border-border text-[11px] font-bold">Recent Activity</div>
                  <div className="max-h-60 overflow-y-auto">
                    {activities.map((a, i) => (
                      <div key={i} className="flex gap-2 items-start px-3 py-2 border-b border-border/50 last:border-b-0">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                        <div className="text-[11px] text-foreground leading-snug flex-1">{a.text}</div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {!isTestUser && (
              <button onClick={() => navigate("/settings?tab=billing")} className="md:hidden text-[10px] font-bold text-primary flex-shrink-0">Upgrade</button>
            )}
          </div>
        </div>
      </div>

      {/* PROJECTS OVERLAY (expanded list) */}
      {showProjectsOverlay && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); overlayClosedAtRef.current = Date.now(); setShowProjectsOverlay(false); }}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">All Projects ({projects.length})</span>
              <button onClick={() => { overlayClosedAtRef.current = Date.now(); setShowProjectsOverlay(false); }} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredProjects.map(p => {
                const done = p.chapters.filter(c => c.status === "completed").length;
                const total = p.chapters.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={p.id} onClick={() => { overlayClosedAtRef.current = Date.now(); setShowProjectsOverlay(false); navigate(`/writer/${p.id}`); }} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 hover:bg-secondary/40 cursor-pointer">
                    <AnimatedRing size={28} strokeWidth={3} percent={pct} color="#E8914A" bgColor="#F3EDE6" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-foreground truncate">{p.title}</div>
                      <div className="text-[10px] text-muted-foreground">{p.degree} · {done}/{total} ch · {pct}%</div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button onClick={() => { overlayClosedAtRef.current = Date.now(); setShowProjectsOverlay(false); handleNewProject(); }} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold">
                <Plus size={12} /> New project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFERRAL WALLET OVERLAY */}
      {showReferralOverlay && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowReferralOverlay(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <span className="text-sm font-bold text-foreground">Referral Wallet</span>
              <button onClick={() => setShowReferralOverlay(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="p-4">
              <ReferralPanel referralCode={referralCode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#FAF8F5] rounded-lg px-2 py-1.5 border border-[#ece8e3] min-w-0">
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: accent + "20", color: accent }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] text-[#9a9080] leading-none truncate">{label}</div>
        <div className="text-[12px] font-black text-[#1a1a1a] leading-tight mt-0.5 truncate">{value} <span className="text-[9px] font-bold text-[#b0a898]">{sub}</span></div>
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[#ece8e3] hover:border-primary/40 hover:bg-primary/5 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="text-primary flex-shrink-0">{icon}</span>
      <span className="text-[10px] font-bold text-[#1a1a1a] truncate">{label}</span>
    </button>
  );
}

