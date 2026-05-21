import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getUserSubscription, type Subscription } from "@/lib/projectService";
import { AI_MODELS, getModelsForTier } from "@/lib/aiModels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PsThemePicker } from "@/components/ps/PsThemePicker";
import { PsThemeToggle } from "@/components/ps/PsThemeToggle";
import { ReferralPanel } from "@/components/dashboard/ReferralPanel";

const SETTING_GROUPS = [
  {
    label: "Writing Defaults", minTier: "free", settings: [
      { key: "default_ai_model", label: "Default AI Model", type: "model" },
      { key: "default_citation_style", label: "Default Citation Style", type: "select", options: ["Harvard", "APA 7", "APA 6", "Chicago", "MLA", "IEEE", "Vancouver", "OSCOLA", "Turabian", "AMA", "CSE", "Bluebook"] },
      { key: "default_language_style", label: "Default Language Style", type: "select", options: ["English (UK)", "English (US)"] },
      { key: "output_language_variant", label: "Language Variant", type: "select", options: ["English (UK)", "English (US)", "English (Australian)", "English (Canadian)"] },
      { key: "default_formality", label: "Default Formality Level", type: "select", options: ["Standard journal (default)", "Very formal (PhD)", "Semi-formal"] },
      { key: "default_hedging", label: "Default Hedging Level", type: "select", options: ["Low (assertive)", "Medium (standard)", "High (cautious)"] },
      { key: "default_voice", label: "Default Voice", type: "select", options: ["Third person only", "First person (singular)", "First person (plural — 'we')"] },
      { key: "paragraph_length", label: "Paragraph Length", type: "select", options: ["Short (3–5 sentences)", "Medium (5–8 sentences)", "Long (8–12 sentences)"] },
      { key: "evidence_style", label: "Evidence Integration Style", type: "select", options: ["Paraphrase-dominant", "Quote-heavy", "Balanced"] },
      { key: "transition_style", label: "Transition Sentence Style", type: "select", options: ["Explicit", "Implicit", "Minimal"] },
    ]
  },
  {
    label: "Source & Research", minTier: "undergraduate", settings: [
      { key: "default_source_date_range", label: "Default Source Date Range", type: "select", options: ["2016–2024", "2018–2024", "2020–2024", "No restriction"] },
      { key: "default_geo_scope", label: "Default Geographic Scope", type: "select", options: ["Global", "UK-focused", "US-focused", "Europe", "Africa", "Asia", "Custom"] },
      { key: "default_source_density", label: "Source Density (per 1000 words)", type: "select", options: ["3–5", "5–8", "8–12", "12+"] },
      { key: "default_doi_inclusion", label: "Include DOI by Default", type: "select", options: ["Yes", "No"] },
      { key: "default_seminal_works", label: "Seminal Works Preference", type: "select", options: ["Include sparingly", "Include generously", "Exclude"] },
      { key: "theorist_depth", label: "Theorist Citation Depth", type: "select", options: ["Surface (name only)", "Moderate (name + concept)", "Deep (full theoretical grounding)"] },
      { key: "preferred_theorists", label: "Preferred Theorists / Authors", type: "text" },
    ]
  },
  {
    label: "Analysis & Charts", minTier: "masters", settings: [
      { key: "default_chart_colour", label: "Default Chart Colour Scheme", type: "select", options: ["Professional blue", "Greyscale", "Warm tones", "University colours"] },
      { key: "default_chart_resolution", label: "Default Chart Resolution", type: "select", options: ["150 DPI", "300 DPI", "SVG"] },
      { key: "default_analysis_software", label: "Default Analysis Software", type: "select", options: ["SPSS", "R", "Stata", "NVivo", "Atlas.ti", "JASP", "Excel"] },
      { key: "default_significance_asterisks", label: "Significance Asterisks", type: "select", options: ["Yes (standard)", "No"] },
      { key: "stat_reporting_format", label: "Statistical Reporting Format", type: "select", options: ["APA standard", "Abbreviated", "Verbose"] },
      { key: "auto_number_figures", label: "Auto-number Figures & Tables", type: "select", options: ["Yes", "No"] },
    ]
  },
  {
    label: "Export & Format", minTier: "free", settings: [
      { key: "default_export_format", label: "Default Export Format", type: "select", options: ["DOCX", "PDF", "LaTeX", "Markdown", "Plain Text"] },
      { key: "default_line_spacing", label: "Line Spacing", type: "select", options: ["1.5", "2.0 (double)", "1.15"] },
      { key: "default_caption_position", label: "Caption Position", type: "select", options: ["Below figure", "Above figure"] },
      { key: "page_numbering_style", label: "Page Numbering Style", type: "select", options: ["Arabic (1, 2, 3)", "Roman (i, ii, iii)", "None"] },
      { key: "page_margins", label: "Page Margins", type: "select", options: ["Normal (2.5cm)", "Narrow (1.5cm)", "Wide (3cm)", "Mirror (thesis binding)"] },
      { key: "include_word_count_sections", label: "Show Section Word Counts in Export", type: "select", options: ["No", "Yes"] },
      { key: "generate_toc", label: "Auto Table of Contents", type: "select", options: ["Yes", "No"] },
      { key: "footnotes_style", label: "Footnotes vs Endnotes (Chicago/OSCOLA)", type: "select", options: ["Footnotes", "Endnotes"] },
    ]
  },
  {
    label: "Advanced", minTier: "phd", settings: [
      { key: "enable_parallel_generation", label: "Enable Parallel Chapter Generation", type: "select", options: ["No", "Yes"] },
      { key: "custom_banned_phrases", label: "Custom Banned Phrases", type: "text" },
      { key: "auto_generate_objectives", label: "Auto-generate Objectives", type: "select", options: ["Yes", "No"] },
      { key: "sentence_complexity", label: "Sentence Complexity", type: "select", options: ["Simple", "Moderate", "Complex"] },
      { key: "research_paradigm", label: "Default Research Paradigm", type: "select", options: ["Positivist", "Interpretivist", "Pragmatist", "Critical realism"] },
      { key: "abstract_style", label: "Abstract Format", type: "select", options: ["Unstructured", "Structured (with headings)"] },
      { key: "auto_generate_abstract", label: "Auto-generate Abstract on Export", type: "select", options: ["Yes", "No"] },
    ]
  },
  {
    label: "Accessibility & Preferences", minTier: "free", settings: [
      { key: "auto_save_interval", label: "Auto-save Interval", type: "select", options: ["30 seconds", "1 minute", "5 minutes", "Off"] },
      { key: "chart_color_scheme", label: "Chart Colour Accessibility", type: "select", options: ["Standard", "Monochrome", "Colorblind-safe (Okabe-Ito)"] },
      { key: "watermark_text", label: "Export Watermark", type: "select", options: ["None", "Show institution name"] },
    ]
  },
  {
    label: "Notifications", minTier: "free", settings: [
      { key: "notif_generation_complete", label: "Generation Complete", type: "select", options: ["On", "Off"] },
      { key: "notif_referral_activity", label: "Referral Activity", type: "select", options: ["On", "Off"] },
      { key: "notif_payment_billing", label: "Payment / Billing", type: "select", options: ["On", "Off"] },
      { key: "notif_browser_push", label: "Browser Push Notifications", type: "select", options: ["Off", "On"] },
      { key: "notif_email_updates", label: "Email Updates from PAPERSTUDIO", type: "select", options: ["On", "Off"] },
    ]
  },
];

const TIER_ORDER = ["free", "undergraduate", "masters", "phd", "custom"];
function tierAllowed(userTier: string, minTier: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(minTier);
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const tierParam = searchParams.get("tier");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [subscription, setSubscription] = useState<Subscription>({ tier: "free", word_limit: 3000, words_used: 0, status: "active" });

  // Payout
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [altEmail, setAltEmail] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Technical settings
  const [settingsJson, setSettingsJson] = useState<Record<string, string>>({});
  const [referralCode, setReferralCode] = useState("");

  const isAdmin = user?.email === "grey.izilein@gmail.com";

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    loadProfile();
  }, [user]);

  // Auto-fire checkout if user landed on /settings?tab=billing&tier=undergraduate
  // (e.g. clicked a pricing card from the marketing page).
  const autoCheckoutFiredRef = useRef(false);
  useEffect(() => {
    if (!user || !tierParam || autoCheckoutFiredRef.current) return;
    const validTiers = ["undergraduate", "masters", "phd"];
    if (!validTiers.includes(tierParam.toLowerCase())) return;
    autoCheckoutFiredRef.current = true;
    handleUpgrade(tierParam.toLowerCase());
  }, [user, tierParam]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sub, profileRes] = await Promise.all([
        getUserSubscription(user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setSubscription(sub);
      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name || "");
        setUniversity(profileRes.data.university || "");
        setBankName((profileRes.data as any).bank_name || "");
        setAccountNumber((profileRes.data as any).account_number || "");
        setPhoneNumber((profileRes.data as any).phone_number || "");
        setAltEmail((profileRes.data as any).alt_email || "");
        setSettingsJson((profileRes.data as any).settings_json || {});
        setReferralCode((profileRes.data as any).referral_code || "");
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        university,
        bank_name: bankName,
        account_number: accountNumber,
        phone_number: phoneNumber,
        alt_email: altEmail,
        settings_json: settingsJson,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast.error(err.message); }
    finally { setChangingPassword(false); }
  };

  const handleUpgrade = async (tier: string) => {
    if (!user) return;
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const res = await supabase.functions.invoke("create-paystack-checkout", {
        body: { tier, callback_url: callbackUrl },
      });
      if (res.error) {
        let serverMsg = "";
        try {
          const body = await (res.error as any).context?.json?.();
          serverMsg = body?.error ?? "";
        } catch { /* body not JSON */ }
        throw new Error(serverMsg || "Checkout failed. Please try again.");
      }
      const { authorization_url } = res.data;
      if (authorization_url) window.location.href = authorization_url;
    } catch (err: any) { toast.error(err.message); }
  };

  const wordPct = subscription.word_limit > 0 ? Math.min(Math.round((subscription.words_used / subscription.word_limit) * 100), 100) : 0;
  const remaining = Math.max(subscription.word_limit - subscription.words_used, 0);

  const updateSetting = (key: string, value: string) => {
    setSettingsJson(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  }

  const plans = [
    { tier: "undergraduate", label: "Undergraduate", price: "$30",     words: "50,000 words" },
    { tier: "masters",       label: "Masters",       price: "$150",    words: "80,000 words" },
    { tier: "phd",           label: "PhD",           price: "$280",    words: "100,000 words" },
    { tier: "enterprise",    label: "Enterprise Pack", price: "Custom", words: "200,000+ words" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <span className="font-heading text-sm font-black tracking-tight text-foreground">Settings</span>
        <div className="ml-auto"><PsThemeToggle size={15} /></div>
      </header>

      <div className="max-w-[640px] mx-auto px-4 py-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full flex-wrap h-auto gap-0.5">
            <TabsTrigger value="profile" className="flex-1 text-[11px]">Profile</TabsTrigger>
            <TabsTrigger value="appearance" className="flex-1 text-[11px]">Appearance</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 text-[11px]">Password</TabsTrigger>
            <TabsTrigger value="billing" className="flex-1 text-[11px]">Billing</TabsTrigger>
            <TabsTrigger value="technical" className="flex-1 text-[11px]">Settings</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Email</label>
              <input value={email} disabled className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-secondary text-[13px] text-muted-foreground" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">University</label>
              <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. University of Manchester" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
            </div>

            {/* Payout Info */}
            <div className="pt-3 border-t border-border">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Payout Information (for referral rewards)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Bank Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Account Number</label>
                <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Phone Number</label>
                <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+234..." className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Alt Email</label>
                <input value={altEmail} onChange={e => setAltEmail(e.target.value)} placeholder="backup@email.com" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
              </div>
            </div>

            <button onClick={handleSaveProfile} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
            </button>

            {/* Referral Programme */}
            {referralCode && (
              <div className="pt-4 border-t border-border">
                <ReferralPanel referralCode={referralCode} />
              </div>
            )}
          </TabsContent>

          {/* Appearance — theme + light/dark */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="mb-3">
                <h2 className="font-heading text-[15px] font-bold text-foreground">Appearance</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Choose a theme and switch between light and dark. Your choice syncs across devices.
                </p>
              </div>
              <PsThemePicker />
            </div>
          </TabsContent>

          {/* Password */}
          <TabsContent value="password" className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">New Password</label>
              <div className="relative mt-1">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Confirm Password</label>
              <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
            </div>
            <button onClick={handleChangePassword} disabled={changingPassword} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer">
              {changingPassword ? <Loader2 size={14} className="animate-spin" /> : null} Change password
            </button>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing" className="space-y-5 mt-4">
            {/* Current plan */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Current Plan</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-heading font-black text-foreground capitalize">{subscription.tier}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${subscription.status === "active" ? "bg-green/10 text-green" : "bg-destructive/10 text-destructive"}`}>
                      {subscription.status}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">{subscription.word_limit.toLocaleString()} words</span>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Word credits</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{wordPct}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${wordPct}%`, background: wordPct >= 90 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  <b className="text-foreground">{subscription.words_used.toLocaleString()}</b> used · <b className="text-foreground">{remaining.toLocaleString()}</b> remaining
                </div>
              </div>
            </div>

            {/* Upgrade options */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Upgrade</span>
              <div className="grid gap-2.5 mt-2">
                {plans.filter(p => p.tier !== subscription.tier).map(p => (
                  <div key={p.tier} id={`tier-${p.tier}`} className={`flex items-center justify-between bg-card border rounded-xl px-4 py-3 ${tierParam === p.tier ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                    <div>
                      <div className="text-[13px] font-bold text-foreground">{p.label}</div>
                      {p.tier !== "enterprise" && (
                        <div className="text-[11px] text-muted-foreground">{p.words} · {p.price}</div>
                      )}
                      {p.tier === "enterprise" && (
                        <div className="text-[11px] text-muted-foreground">High-volume — contact us for pricing</div>
                      )}
                    </div>
                    <div className="text-right">
                      {p.tier === "enterprise" ? (
                        <button onClick={() => window.location.href = "/contact"} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-[11px] font-bold hover:bg-secondary/80 transition-colors cursor-pointer">
                          Contact us
                        </button>
                      ) : (
                        <button onClick={() => handleUpgrade(p.tier)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors cursor-pointer">
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Technical Settings */}
          <TabsContent value="technical" className="space-y-5 mt-4">
            {SETTING_GROUPS.map(group => {
              const allowed = tierAllowed(subscription.tier, group.minTier, isAdmin);
              return (
                <div key={group.label} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{group.label}</span>
                    {!allowed && <Lock size={11} className="text-muted-foreground" />}
                    {!allowed && <span className="text-[9px] text-muted-foreground capitalize">{group.minTier}+ only</span>}
                  </div>
                  <div className="space-y-3">
                    {group.settings.map(s => (
                      <div key={s.key} className={!allowed ? "opacity-40 pointer-events-none" : ""}>
                        <label className="text-[11px] font-bold text-foreground">{s.label}</label>
                        {s.type === "model" ? (
                          <select
                            value={settingsJson[s.key] || ""}
                            onChange={e => updateSetting(s.key, e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground outline-none"
                          >
                            <option value="">Use project default</option>
                            {getModelsForTier(isAdmin ? "phd" : subscription.tier).map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
                            ))}
                          </select>
                        ) : s.type === "text" ? (
                          <input
                            value={settingsJson[s.key] || ""}
                            onChange={e => updateSetting(s.key, e.target.value)}
                            placeholder="Comma-separated phrases"
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
                          />
                        ) : (
                          <select
                            value={settingsJson[s.key] || ""}
                            onChange={e => updateSetting(s.key, e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground outline-none"
                          >
                            <option value="">Default</option>
                            {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <button onClick={handleSaveProfile} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save all settings
            </button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
