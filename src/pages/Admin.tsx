import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2, DollarSign, Activity, Users, Zap, Plus, Copy, Save, Search, Mail, RefreshCw, Banknote, Bell, TrendingUp, LogIn, Menu, X, LogOut, Settings, HelpCircle, ShieldCheck, Trash2, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "grey.izilein@gmail.com";
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface UsageLog {
  id: string; user_id: string; tier: string; action: string; model: string;
  input_tokens: number; output_tokens: number; estimated_cost_usd: number; created_at: string;
}
interface ReferralCode {
  id: string; code: string; owner_email: string; reward_description: string;
  max_uses: number | null; uses_count: number; active: boolean; created_at: string;
}
interface ReferralUse {
  id: string; referral_code_id: string; referred_email: string | null;
  payment_tier: string | null; payment_amount: number | null; status: string; created_at: string;
}
interface UserProfile {
  user_id: string; display_name: string | null; university: string | null;
  referral_code: string | null; bank_name: string | null; created_at: string;
  email: string | null;
}
interface SubRecord {
  id: string; user_id: string; tier: string; status: string;
  word_limit: number; words_used: number; created_at: string;
}
interface AppSetting {
  id: string; key: string; value: any; updated_at: string;
}
interface Complaint {
  id: string; user_id: string | null; user_email: string | null; subject: string; body: string;
  status: string; admin_notes: string | null; admin_reply: string | null;
  created_at: string; resolved_at: string | null;
}
interface PromoCode {
  id: string; code: string; discount_type: string; discount_value: number;
  applies_to_tier: string | null; max_uses: number | null; uses_count: number;
  expires_at: string | null; active: boolean; created_at: string;
}
interface Refund {
  id: string; user_id: string | null; user_email: string | null;
  amount_usd: number | null; reason: string | null; status: string; notes: string | null; created_at: string;
}
interface ReferralPayout {
  id: string; user_id: string; amount_usd: number; amount_ngn: number;
  bank_name: string | null; account_number: string | null; status: string;
  failure_reason: string | null; completed_at: string | null; created_at: string;
}
interface ReferralWallet {
  user_id: string; balance_usd: number; pending_usd: number;
  lifetime_earned_usd: number; total_referrals: number;
}
interface ReferralEarning {
  id: string; referrer_id: string | null; referee_id: string | null;
  payment_amount_usd: number | null; commission_usd: number | null; status: string; created_at: string;
}
interface EmailLog {
  id: string; to_email: string | null; to_tier: string | null;
  subject: string | null; body: string | null; sent_count: number | null; created_at: string;
}

interface ImageJobRow {
  id: string; user_id: string; project_title: string; status: string;
  total: number; completed: number; error: string | null; created_at: string;
}
interface ImageAttemptRow {
  id: string; figure_title: string | null; model: string | null;
  status: string; duration_ms: number | null; error: string | null; created_at: string;
}

type Tab = "analytics" | "referrals" | "users" | "subscriptions" | "settings" | "calculator"
  | "revenue" | "email" | "complaints" | "promotions" | "refunds" | "payouts" | "activity" | "broadcast" | "images";

// Cost per 1K tokens
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-3.1-pro": { input: 0.00125, output: 0.01 },
  "qwen-3.6-plus": { input: 0.0008, output: 0.002 },
  "gpt-5": { input: 0.005, output: 0.015 },
  "gpt-5.2": { input: 0.01, output: 0.03 },
};

const TIER_PRICES: Record<string, number> = { free: 0, undergraduate: 30, masters: 100, phd: 180 };

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("analytics");

  // Referral state
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [referralUses, setReferralUses] = useState<ReferralUse[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newReward, setNewReward] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [refLoading, setRefLoading] = useState(false);

  // Users & Subscriptions
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // Complaints
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintFilter, setComplaintFilter] = useState<"all" | "open" | "in-progress" | "resolved">("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [complaintStatus, setComplaintStatus] = useState("open");

  // Promotions
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", discount_type: "percent", discount_value: "", applies_to_tier: "", max_uses: "", expires_at: "" });
  const [promoLoading, setPromoLoading] = useState(false);

  // Refunds
  const [refundSearch, setRefundSearch] = useState("");
  const [refundUser, setRefundUser] = useState<{ profile: UserProfile; sub: SubRecord } | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundTier, setRefundTier] = useState("free");
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);

  // Payouts — real tables
  const [payoutUses, setPayoutUses] = useState<ReferralPayout[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "success" | "failed">("all");
  const [referralWallets, setReferralWallets] = useState<ReferralWallet[]>([]);
  const [referralEarnings, setReferralEarnings] = useState<ReferralEarning[]>([]);
  const [payoutSubTab, setPayoutSubTab] = useState<"requests" | "wallets" | "earnings">("requests");

  // CZAR subscriptions
  const [czarSubscriptions, setCzarSubscriptions] = useState<any[]>([]);

  // Add user
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserTier, setNewUserTier] = useState("free");
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Email
  const [emailTo, setEmailTo] = useState("all");
  const [emailToSpecific, setEmailToSpecific] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailLog, setEmailLog] = useState<EmailLog[]>([]);

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("info");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // App settings
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");

  // Token calculator
  const [calcUsers, setCalcUsers] = useState({ free: 50, undergraduate: 30, masters: 15, phd: 5 });
  const [calcChapters, setCalcChapters] = useState(5);
  const [calcModel, setCalcModel] = useState("gemini-2.5-flash");

  // Image jobs (diagnostics)
  const [imageJobs, setImageJobs] = useState<ImageJobRow[]>([]);
  const [imageAttempts, setImageAttempts] = useState<ImageAttemptRow[]>([]);
  const [imageJobFilter, setImageJobFilter] = useState<"all" | "failed" | "processing" | "completed">("all");

  useEffect(() => {
    if (!user) return;
    if (user.email !== ADMIN_EMAIL) { navigate("/dashboard"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadLogs(), loadReferrals(), loadUsers(), loadSettings(),
      loadComplaints(), loadPromoCodes(), loadRefunds(), loadPayouts(), loadEmailLog(), loadImageJobs()]);
    setLoading(false);
  };

  const loadLogs = async () => {
    const { data } = await supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(1000);
    if (data) setLogs(data as unknown as UsageLog[]);
  };

  const loadReferrals = async () => {
    const [codesRes, usesRes] = await Promise.all([
      supabase.from("referral_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("referral_uses").select("*").order("created_at", { ascending: false }),
    ]);
    if (codesRes.data) setReferralCodes(codesRes.data as unknown as ReferralCode[]);
    if (usesRes.data) setReferralUses(usesRes.data as unknown as ReferralUse[]);
  };

  const loadUsers = async () => {
    const [profRes, subRes, czarRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, university, referral_code, bank_name, account_number, phone_number, created_at, email").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("czar_subscriptions").select("user_id, tier, status, word_limit, words_used"),
    ]);
    if (profRes.data) setProfiles(profRes.data as unknown as UserProfile[]);
    if (subRes.data) setSubscriptions(subRes.data as unknown as SubRecord[]);
    if (czarRes.data) setCzarSubscriptions(czarRes.data);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from("app_settings").select("*");
    if (data) setAppSettings(data as unknown as AppSetting[]);
  };

  const loadImageJobs = async () => {
    const [jobsRes, attemptsRes] = await Promise.all([
      supabase.from("image_jobs")
        .select("id, user_id, project_title, status, total, completed, error, created_at")
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("image_generation_attempts")
        .select("id, figure_title, model, status, duration_ms, error, created_at")
        .order("created_at", { ascending: false }).limit(150),
    ]);
    if (jobsRes.data) setImageJobs(jobsRes.data as unknown as ImageJobRow[]);
    if (attemptsRes.data) setImageAttempts(attemptsRes.data as unknown as ImageAttemptRow[]);
  };

  const loadComplaints = async () => {
    const { data } = await supabase.from("complaints")
      .select("id, user_id, user_email, subject, body, status, admin_notes, admin_reply, created_at, resolved_at")
      .order("created_at", { ascending: false });
    if (data) setComplaints(data as unknown as Complaint[]);
  };

  const loadPromoCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    if (data) setPromoCodes(data as unknown as PromoCode[]);
  };

  const loadRefunds = async () => {
    const { data } = await supabase.from("refunds").select("*").order("created_at", { ascending: false });
    if (data) setRefunds(data as unknown as Refund[]);
  };

  const loadPayouts = async () => {
    const [payoutsRes, walletsRes, earningsRes] = await Promise.all([
      supabase.from("referral_payouts")
        .select("id, user_id, amount_usd, amount_ngn, bank_name, account_number, status, failure_reason, completed_at, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("referral_wallets")
        .select("user_id, balance_usd, pending_usd, lifetime_earned_usd, total_referrals"),
      supabase.from("referral_earnings")
        .select("id, referrer_id, referee_id, payment_amount_usd, commission_usd, status, created_at")
        .order("created_at", { ascending: false }).limit(200),
    ]);
    if (payoutsRes.data) setPayoutUses(payoutsRes.data as unknown as ReferralPayout[]);
    if (walletsRes.data) setReferralWallets(walletsRes.data as unknown as ReferralWallet[]);
    if (earningsRes.data) setReferralEarnings(earningsRes.data as unknown as ReferralEarning[]);
  };

  const loadEmailLog = async () => {
    const { data } = await supabase.from("admin_emails")
      .select("id, to_email, to_tier, subject, body, sent_count, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (data) setEmailLog(data as unknown as EmailLog[]);
  };

  const createReferralCode = async () => {
    if (!newCode.trim() || !newOwnerEmail.trim()) { toast.error("Code and owner email required"); return; }
    setRefLoading(true);
    const { error } = await supabase.from("referral_codes").insert({
      code: newCode.trim().toUpperCase(), owner_email: newOwnerEmail.trim(),
      reward_description: newReward.trim(), max_uses: newMaxUses ? parseInt(newMaxUses) : null,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Code created"); setNewCode(""); setNewOwnerEmail(""); setNewReward(""); setNewMaxUses(""); loadReferrals(); }
    setRefLoading(false);
  };

  const toggleCodeActive = async (code: ReferralCode) => {
    await supabase.from("referral_codes").update({ active: !code.active } as any).eq("id", code.id);
    loadReferrals();
  };

  const saveComplaintUpdate = async () => {
    if (!selectedComplaint) return;
    const { error } = await supabase.from("complaints").update({
      status: complaintStatus,
      admin_notes: adminNotes || null,
      admin_reply: adminReply || null,
      resolved_at: complaintStatus === "resolved" ? new Date().toISOString() : null,
    } as any).eq("id", selectedComplaint.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Complaint updated");
    setSelectedComplaint(null);
    loadComplaints();
  };

  const createPromoCode = async () => {
    if (!newPromo.code || !newPromo.discount_value) { toast.error("Code and discount value required"); return; }
    setPromoLoading(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: newPromo.code.trim().toUpperCase(),
      discount_type: newPromo.discount_type,
      discount_value: parseFloat(newPromo.discount_value),
      applies_to_tier: newPromo.applies_to_tier || null,
      max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
      expires_at: newPromo.expires_at || null,
      active: true,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Promo code created"); setNewPromo({ code: "", discount_type: "percent", discount_value: "", applies_to_tier: "", max_uses: "", expires_at: "" }); loadPromoCodes(); }
    setPromoLoading(false);
  };

  const togglePromoActive = async (p: PromoCode) => {
    await supabase.from("promo_codes").update({ active: !p.active } as any).eq("id", p.id);
    loadPromoCodes();
  };

  const searchRefundUser = async () => {
    if (!refundSearch.trim()) return;
    const q = refundSearch.toLowerCase().trim();
    const prof = profiles.find(p =>
      (p.display_name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      p.user_id.toLowerCase().includes(q)
    );
    if (!prof) { toast.error("User not found — search by name, email or user ID"); return; }
    const sub = subscriptions.find(s => s.user_id === prof.user_id);
    if (!sub) { toast.error("No subscription found for this user"); return; }
    setRefundUser({ profile: prof, sub });
    setRefundTier(sub.tier);
  };

  const applyTierOverride = async () => {
    if (!refundUser) return;
    const limits: Record<string, number> = { free: 3000, undergraduate: 50000, masters: 80000, phd: 120000 };
    await supabase.from("subscriptions").update({ tier: refundTier, word_limit: limits[refundTier] || 3000, status: "active" } as any).eq("user_id", refundUser.profile.user_id);
    toast.success(`Tier set to ${refundTier}`);
    loadUsers();
  };

  const resetWordCredits = async () => {
    if (!refundUser) return;
    await supabase.from("subscriptions").update({ words_used: 0 } as any).eq("user_id", refundUser.profile.user_id);
    toast.success("Word credits reset to 0");
    loadUsers();
  };

  const logRefund = async () => {
    if (!refundUser || !refundAmount) return;
    setRefundLoading(true);
    const { error } = await supabase.from("refunds").insert({
      user_id: refundUser.profile.user_id,
      user_email: refundUser.profile.email,
      amount_usd: parseFloat(refundAmount),
      reason: refundReason || "Manual refund",
      status: "pending",
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Refund logged"); setRefundAmount(""); setRefundReason(""); loadRefunds(); }
    setRefundLoading(false);
  };

  const markPayoutPaid = async (id: string) => {
    await supabase.from("referral_payouts").update({ status: "success", completed_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Marked as paid");
    loadPayouts();
  };

  const addUser = async () => {
    if (!newUserEmail.trim()) { toast.error("Email required"); return; }
    setAddUserLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newUserEmail.trim(), tier: newUserTier },
      });
      if (error) throw error;
      toast.success(`Invite sent to ${newUserEmail}`);
      setShowAddUser(false); setNewUserEmail(""); setNewUserTier("free");
      loadUsers();
    } catch (e: any) { toast.error(e.message || "Failed to create user"); }
    setAddUserLoading(false);
  };

  const sendEmail = async () => {
    if (!emailSubject || !emailBody) { toast.error("Subject and body required"); return; }
    setEmailSending(true);
    try {
      const to = emailTo === "specific" ? emailToSpecific : emailTo;
      const { data, error } = await supabase.functions.invoke("send-admin-email", {
        body: { to, subject: emailSubject, body: emailBody },
      });
      if (error) throw error;
      toast.success("Email sent");
      setEmailSubject(""); setEmailBody("");
      loadEmailLog();
    } catch (e: any) { toast.error(e.message || "Send failed"); }
    setEmailSending(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) { toast.error("Title and message required"); return; }
    setBroadcastSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-notification", {
        body: { title: broadcastTitle, message: broadcastMessage, type: broadcastType, target: broadcastTarget },
      });
      if (error) throw error;
      toast.success(`Broadcast sent to ${data?.notified || "all"} users`);
      setBroadcastTitle(""); setBroadcastMessage("");
    } catch (e: any) { toast.error(e.message || "Broadcast failed"); }
    setBroadcastSending(false);
  };

  const deleteUser = async (userId: string, displayName: string | null) => {
    if (!confirm(`Delete user "${displayName || userId}"? This removes their profile and subscription. This cannot be undone.`)) return;
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId }
      });
      if (error) throw error;
      
      toast.success("User completely removed from auth and database.");
      setProfiles(prev => prev.filter(p => p.user_id !== userId));
      setSubscriptions(prev => prev.filter(s => s.user_id !== userId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const updateAppSetting = (key: string, value: any) => {
    setAppSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const saveAppSettings = async () => {
    setSettingsSaving(true);
    for (const s of appSettings) {
      await supabase.from("app_settings").update({ value: s.value } as any).eq("key", s.key);
    }
    toast.success("Settings saved");
    setSettingsSaving(false);
  };

  const createSetting = async () => {
    if (!newSettingKey.trim() || !newSettingValue.trim()) { toast.error("Key and Value required"); return; }
    setSettingsSaving(true);
    try {
      const { data, error } = await supabase.from("app_settings").insert({
        key: newSettingKey.trim().toLowerCase(),
        value: newSettingValue.trim()
      } as any).select().single();
      
      if (error) throw error;
      if (data) {
        toast.success("Setting created");
        setAppSettings([...appSettings, data as unknown as AppSetting]);
        setNewSettingKey("");
        setNewSettingValue("");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create setting");
    }
    setSettingsSaving(false);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user || user.email !== ADMIN_EMAIL) return null;

  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const totalSpend = logs.reduce((s, l) => s + Number(l.estimated_cost_usd), 0);
  const spend24h = logs.filter(l => new Date(l.created_at) >= h24).reduce((s, l) => s + Number(l.estimated_cost_usd), 0);
  const spend7d = logs.filter(l => new Date(l.created_at) >= d7).reduce((s, l) => s + Number(l.estimated_cost_usd), 0);

  const tierMap: Record<string, number> = {};
  logs.forEach(l => { tierMap[l.tier] = (tierMap[l.tier] || 0) + Number(l.estimated_cost_usd); });
  const tierData = Object.entries(tierMap).map(([name, value]) => ({ name, value: +value.toFixed(4) })).sort((a, b) => b.value - a.value);

  const actionMap: Record<string, number> = {};
  logs.forEach(l => { actionMap[l.action] = (actionMap[l.action] || 0) + Number(l.estimated_cost_usd); });
  const actionData = Object.entries(actionMap).map(([name, value]) => ({ name: name.replace(/_/g, " "), value: +value.toFixed(4) })).sort((a, b) => b.value - a.value);

  const userMap: Record<string, { cost: number; calls: number; tier: string }> = {};
  logs.forEach(l => {
    if (!userMap[l.user_id]) userMap[l.user_id] = { cost: 0, calls: 0, tier: l.tier };
    userMap[l.user_id].cost += Number(l.estimated_cost_usd); userMap[l.user_id].calls += 1;
  });
  const topUsers = Object.entries(userMap).map(([id, d]) => ({ id: id.slice(0, 8), tier: d.tier, cost: d.cost, calls: d.calls })).sort((a, b) => b.cost - a.cost).slice(0, 10);

  const recentLogs = logs.slice(0, 50);
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";
  const userInitials = userName.slice(0, 2).toUpperCase();

  // Filtered users
  const filteredProfiles = profiles.filter(p =>
    !userSearch || (p.display_name || "").toLowerCase().includes(userSearch.toLowerCase()) || p.user_id.includes(userSearch) || (p.email || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  // Token calculator
  const avgTokensPerChapter = 8000; // ~5000 words
  const calcEstimate = () => {
    const costs = MODEL_COSTS[calcModel] || MODEL_COSTS["gemini-2.5-flash"];
    const totalChapters = Object.values(calcUsers).reduce((s, v) => s + v, 0) * calcChapters;
    const inputCost = (totalChapters * 2000 / 1000) * costs.input; // ~2K input tokens per chapter
    const outputCost = (totalChapters * avgTokensPerChapter / 1000) * costs.output;
    return { totalChapters, inputCost, outputCost, total: inputCost + outputCost };
  };
  const calcResult = calcEstimate();

  const revenueByTier = (["free", "undergraduate", "masters", "phd"] as const).map(t => ({
    tier: t,
    count: subscriptions.filter(s => s.tier === t && s.status === "active").length,
    revenue: subscriptions.filter(s => s.tier === t && s.status === "active").length * TIER_PRICES[t],
  }));
  const totalMRR = revenueByTier.reduce((s, r) => s + r.revenue, 0);

  const filteredComplaints = complaints.filter(c => complaintFilter === "all" || c.status === complaintFilter);
  const filteredPayouts = payoutUses.filter(p =>
    payoutFilter === "all" || p.status === payoutFilter
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "analytics", label: "AI Analytics" },
    { key: "revenue", label: "Revenue" },
    { key: "users", label: "Users" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "referrals", label: "Referrals" },
    { key: "payouts", label: "Payouts" },
    { key: "email", label: "Email" },
    { key: "complaints", label: "Complaints" },
    { key: "promotions", label: "Promotions" },
    { key: "refunds", label: "Refunds" },
    { key: "activity", label: "Activity" },
    { key: "broadcast", label: "Broadcast" },
    { key: "settings", label: "Settings" },
    { key: "images", label: "Image Jobs" },
    { key: "calculator", label: "Calculator" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar userName={userName} userInitials={userInitials} tier="Admin" onSignOut={signOut} userEmail={user.email} avatarUrl={user.user_metadata?.avatar_url} />

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-[240px] h-full bg-sidebar text-sidebar-foreground flex flex-col animate-slide-in-right">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <button onClick={() => { setMobileMenuOpen(false); navigate("/"); }} className="font-heading text-base font-black tracking-tight text-sidebar-foreground bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity">PAPERSTUDIO</button>
              <button onClick={() => setMobileMenuOpen(false)} className="text-sidebar-foreground/70 cursor-pointer bg-transparent border-none p-0"><X size={18} /></button>
            </div>
            <nav className="flex-1 px-3 space-y-0.5">
              {[
                { icon: ShieldCheck, label: "Admin", path: "/admin" },
                { icon: Settings, label: "Settings", path: "/settings" },
                { icon: HelpCircle, label: "Help", path: "/help" },
              ].map((item) => (
                <button key={item.label} onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer">
                  <item.icon size={15} /> {item.label}
                </button>
              ))}
            </nav>
            <div className="px-3 pb-5">
              <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-muted-foreground cursor-pointer"><Menu size={20} /></button>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="flex gap-1 mb-6 p-0.5 rounded-lg bg-secondary overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Analytics Tab */}
        {tab === "analytics" && (
          loading ? <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div> : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard icon={DollarSign} label="Total Spend" value={`$${totalSpend.toFixed(4)}`} />
                <SummaryCard icon={Zap} label="Last 24h" value={`$${spend24h.toFixed(4)}`} />
                <SummaryCard icon={Activity} label="Last 7d" value={`$${spend7d.toFixed(4)}`} />
                <SummaryCard icon={Users} label="Total Calls" value={logs.length.toString()} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Spend by Tier</h2>
                  {tierData.length === 0 ? <p className="text-muted-foreground text-xs">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={tierData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v}`} /><Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Spend by Action</h2>
                  {actionData.length === 0 ? <p className="text-muted-foreground text-xs">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart><Pie data={actionData} cx="50%" cy="45%" outerRadius={90} dataKey="value" nameKey="name" label={false}>
                        {actionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie><Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} /><Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} /></PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">Top Users by Cost</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-3">User</th><th className="text-left py-2 pr-3">Tier</th><th className="text-right py-2 pr-3">Calls</th><th className="text-right py-2">Cost</th></tr></thead>
                    <tbody>{topUsers.map(u => (
                      <tr key={u.id} className="border-b border-border/50"><td className="py-1.5 pr-3 font-mono text-foreground">{u.id}…</td><td className="py-1.5 pr-3 text-muted-foreground capitalize">{u.tier}</td><td className="py-1.5 pr-3 text-right text-foreground">{u.calls}</td><td className="py-1.5 text-right font-mono text-foreground">${u.cost.toFixed(4)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">Recent AI Activity</h2>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-2">Time</th><th className="text-left py-2 pr-2">Action</th><th className="text-left py-2 pr-2">Model</th><th className="text-left py-2 pr-2">Tier</th><th className="text-right py-2 pr-2">In</th><th className="text-right py-2 pr-2">Out</th><th className="text-right py-2">Cost</th></tr></thead>
                    <tbody>{recentLogs.map(l => (
                      <tr key={l.id} className="border-b border-border/30"><td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td><td className="py-1 pr-2 text-foreground">{l.action.replace(/_/g, " ")}</td><td className="py-1 pr-2 text-muted-foreground font-mono">{l.model.split("/").pop()}</td><td className="py-1 pr-2 text-muted-foreground capitalize">{l.tier}</td><td className="py-1 pr-2 text-right text-foreground">{l.input_tokens.toLocaleString()}</td><td className="py-1 pr-2 text-right text-foreground">{l.output_tokens.toLocaleString()}</td><td className="py-1 text-right font-mono text-foreground">${Number(l.estimated_cost_usd).toFixed(4)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="text-muted-foreground" />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name, email or ID…" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none" />
              </div>
              <button onClick={() => setShowAddUser(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90">
                <UserPlus size={14} /> Add User
              </button>
            </div>
            {showAddUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
                  <h3 className="text-sm font-bold text-foreground mb-4">Invite New User</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Email Address</label>
                      <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Starting Tier</label>
                      <select value={newUserTier} onChange={e => setNewUserTier(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                        <option value="free">Free</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="masters">Masters</option>
                        <option value="phd">PhD</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-muted-foreground">An invite email will be sent. The user sets their own password.</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={addUser} disabled={addUserLoading} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {addUserLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Send Invite
                      </button>
                      <button onClick={() => { setShowAddUser(false); setNewUserEmail(""); setNewUserTier("free"); }} className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">Email</th><th className="text-left py-2 px-3">Tier</th><th className="text-left py-2 px-3">CZAR</th><th className="text-left py-2 px-3">Status</th><th className="text-right py-2 px-3">Words</th><th className="text-left py-2 px-3">Bank</th><th className="text-left py-2 px-3">Joined</th><th className="py-2 px-3"></th>
                  </tr></thead>
                  <tbody>{filteredProfiles.map(p => {
                    const sub = subscriptions.find(s => s.user_id === p.user_id);
                    const czar = czarSubscriptions.find((c: any) => c.user_id === p.user_id);
                    return (
                      <tr key={p.user_id} className="border-b border-border/30 hover:bg-secondary/30">
                        <td className="py-2 px-3 text-foreground font-semibold whitespace-nowrap">{p.display_name || "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px]">{p.email || "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">{sub?.tier || "free"}</td>
                        <td className="py-2 px-3">
                          {czar ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary capitalize">{czar.tier}</span> : <span className="text-muted-foreground text-[11px]">—</span>}
                        </td>
                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub?.status === "active" ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{sub?.status || "—"}</span></td>
                        <td className="py-2 px-3 text-right font-mono text-foreground text-[11px]">{sub ? `${sub.words_used.toLocaleString()}/${sub.word_limit.toLocaleString()}` : "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px]">{(p as any).bank_name ? `${(p as any).bank_name} ···${((p as any).account_number || "").slice(-4)}` : "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-3">
                          {p.email !== ADMIN_EMAIL && (
                            <button onClick={() => deleteUser(p.user_id, p.display_name)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Delete user">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground">{filteredProfiles.length} users</div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {tab === "subscriptions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["free", "undergraduate", "masters", "phd"].map(t => {
                const count = subscriptions.filter(s => s.tier === t).length;
                const active = subscriptions.filter(s => s.tier === t && s.status === "active").length;
                return (
                  <div key={t} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-[11px] text-muted-foreground capitalize">{t}</div>
                    <div className="text-xl font-bold text-foreground">{count}</div>
                    <div className="text-[10px] text-muted-foreground">{active} active</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3">User ID</th><th className="text-left py-2 px-3">Tier</th><th className="text-left py-2 px-3">Status</th><th className="text-right py-2 px-3">Words Used</th><th className="text-right py-2 px-3">Limit</th><th className="text-left py-2 px-3">Created</th>
                  </tr></thead>
                  <tbody>{subscriptions.map(s => (
                    <tr key={s.id} className="border-b border-border/30">
                      <td className="py-2 px-3 font-mono text-foreground">{s.user_id.slice(0, 8)}…</td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">{s.tier}</td>
                      <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === "active" ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{s.status}</span></td>
                      <td className="py-2 px-3 text-right font-mono text-foreground">{s.words_used.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">{s.word_limit.toLocaleString()}</td>
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {tab === "referrals" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Create Referral Code</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div><label className="block text-xs font-bold text-foreground mb-1">Code</label><input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="e.g. FRIEND50" className="w-full px-2.5 py-2 border border-border rounded-md text-sm outline-none focus:border-primary bg-background" /></div>
                <div><label className="block text-xs font-bold text-foreground mb-1">Owner Email</label><input value={newOwnerEmail} onChange={e => setNewOwnerEmail(e.target.value)} placeholder="referrer@email.com" className="w-full px-2.5 py-2 border border-border rounded-md text-sm outline-none focus:border-primary bg-background" /></div>
                <div><label className="block text-xs font-bold text-foreground mb-1">Reward</label><input value={newReward} onChange={e => setNewReward(e.target.value)} placeholder="e.g. 10% discount" className="w-full px-2.5 py-2 border border-border rounded-md text-sm outline-none focus:border-primary bg-background" /></div>
                <div><label className="block text-xs font-bold text-foreground mb-1">Max Uses</label><input value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)} placeholder="Unlimited" type="number" className="w-full px-2.5 py-2 border border-border rounded-md text-sm outline-none focus:border-primary bg-background" /></div>
              </div>
              <button onClick={createReferralCode} disabled={refLoading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"><Plus size={14} /> Create Code</button>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Referral Codes</h2>
              {referralCodes.length === 0 ? <p className="text-muted-foreground text-xs">No codes yet</p> : (
                <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-3">Code</th><th className="text-left py-2 pr-3">Owner</th><th className="text-left py-2 pr-3">Reward</th><th className="text-center py-2 pr-3">Uses</th><th className="text-center py-2 pr-3">Status</th><th className="text-right py-2">Actions</th></tr></thead>
                  <tbody>{referralCodes.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 pr-3"><span className="font-mono font-bold text-foreground">{c.code}</span><button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${c.code}`); toast.success("Link copied!"); }} className="ml-1.5 text-muted-foreground hover:text-primary"><Copy size={10} /></button></td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.owner_email}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.reward_description || "—"}</td>
                      <td className="py-2 pr-3 text-center text-foreground">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                      <td className="py-2 pr-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{c.active ? "Active" : "Inactive"}</span></td>
                      <td className="py-2 text-right"><button onClick={() => toggleCodeActive(c)} className="text-xs font-bold text-primary hover:underline">{c.active ? "Deactivate" : "Activate"}</button></td>
                    </tr>
                  ))}</tbody></table></div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Referral Activity</h2>
              {referralUses.length === 0 ? <p className="text-muted-foreground text-xs">No referral activity yet</p> : (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-2">Date</th><th className="text-left py-2 pr-2">Code</th><th className="text-left py-2 pr-2">Email</th><th className="text-left py-2 pr-2">Tier</th><th className="text-right py-2 pr-2">Amount</th><th className="text-center py-2">Status</th></tr></thead>
                  <tbody>{referralUses.map(u => {
                    const code = referralCodes.find(c => c.id === u.referral_code_id);
                    return (
                      <tr key={u.id} className="border-b border-border/30">
                        <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-1.5 pr-2 font-mono font-bold text-foreground">{code?.code || "—"}</td>
                        <td className="py-1.5 pr-2 text-foreground">{u.referred_email || "—"}</td>
                        <td className="py-1.5 pr-2 text-muted-foreground capitalize">{u.payment_tier || "—"}</td>
                        <td className="py-1.5 pr-2 text-right font-mono text-foreground">{u.payment_amount ? `₦${Number(u.payment_amount).toLocaleString()}` : "—"}</td>
                        <td className="py-1.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === "paid" ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{u.status}</span></td>
                      </tr>
                    );
                  })}</tbody></table></div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-sm font-semibold text-foreground">Global App Settings</h2>
            {appSettings.map(s => (
              <div key={s.key} className="bg-card border border-border rounded-xl p-4">
                <label className="text-xs font-bold text-foreground capitalize">{s.key.replace(/_/g, " ")}</label>
                <input
                  value={typeof s.value === "string" ? s.value.replace(/^"|"$/g, "") : JSON.stringify(s.value)}
                  onChange={e => updateAppSetting(s.key, JSON.stringify(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none"
                />
                <div className="text-[10px] text-muted-foreground mt-1">Updated: {new Date(s.updated_at).toLocaleString()}</div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2">
              <button onClick={saveAppSettings} disabled={settingsSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
              </button>
            </div>

            <h2 className="text-sm font-semibold text-foreground mt-8">Add New Setting</h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground capitalize">Key</label>
                <input
                  value={newSettingKey}
                  onChange={e => setNewSettingKey(e.target.value)}
                  placeholder="e.g. paystack_payout_mode"
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground capitalize">Value</label>
                <input
                  value={newSettingValue}
                  onChange={e => setNewSettingValue(e.target.value)}
                  placeholder="e.g. auto"
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none"
                />
              </div>
              <button onClick={createSetting} disabled={settingsSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold hover:bg-border transition-colors disabled:opacity-50 mt-2">
                <Plus size={14} /> Add Setting
              </button>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {tab === "revenue" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={Users} label="Total Users" value={subscriptions.length.toString()} />
              <SummaryCard icon={Activity} label="Active Subs" value={subscriptions.filter(s => s.status === "active").length.toString()} />
              <SummaryCard icon={TrendingUp} label="Est. MRR" value={`$${totalMRR.toLocaleString()}`} />
              <SummaryCard icon={DollarSign} label="Total Revenue" value={`$${totalMRR.toLocaleString()}`} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Revenue by Tier</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => `$${v}`} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead><tr className="border-b border-border text-muted-foreground bg-secondary/50">
                    <th className="text-left py-2 px-3">Tier</th>
                    <th className="text-right py-2 px-3">Active Users</th>
                    <th className="text-right py-2 px-3">Price/User</th>
                    <th className="text-right py-2 px-3">Revenue</th>
                  </tr></thead>
                  <tbody>{revenueByTier.map(r => (
                    <tr key={r.tier} className="border-b border-border/30">
                      <td className="py-2 px-3 capitalize font-semibold text-foreground">{r.tier}</td>
                      <td className="py-2 px-3 text-right text-foreground">{r.count}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">${TIER_PRICES[r.tier]}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">${r.revenue.toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {tab === "email" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Compose Email</h2>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-foreground mb-1 block">To</label>
                    <select value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary">
                      <option value="all">All Users</option>
                      <option value="tier:undergraduate">Undergraduate tier only</option>
                      <option value="tier:masters">Masters tier only</option>
                      <option value="tier:phd">PhD tier only</option>
                      <option value="specific">Specific email address</option>
                    </select>
                  </div>
                  {emailTo === "specific" && (
                    <div className="flex-1">
                      <label className="text-xs font-bold text-foreground mb-1 block">Email Address</label>
                      <input value={emailToSpecific} onChange={e => setEmailToSpecific(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Subject</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject…" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Body</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Email body…" rows={6} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary resize-y" />
                </div>
                <button onClick={sendEmail} disabled={emailSending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                  {emailSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send Email
                </button>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Sent Email Log {emailLog.length > 0 && <span className="text-muted-foreground font-normal">({emailLog.length})</span>}</h2>
              {emailLog.length === 0 ? (
                <p className="text-muted-foreground text-xs py-4 text-center">No emails sent yet</p>
              ) : (
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3">To</th><th className="text-left py-2 pr-3">Subject</th><th className="text-center py-2 pr-3">Recipients</th><th className="text-right py-2">Date</th>
                    </tr></thead>
                    <tbody>{emailLog.map(e => (
                      <tr key={e.id} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-foreground">{e.to_email || (e.to_tier ? `Tier: ${e.to_tier}` : "All users")}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{e.subject || "—"}</td>
                        <td className="py-1.5 pr-3 text-center text-foreground font-mono">{e.sent_count ?? "—"}</td>
                        <td className="py-1.5 text-right text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {tab === "complaints" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(["all", "open", "in-progress", "resolved"] as const).map(f => (
                <button key={f} onClick={() => setComplaintFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${complaintFilter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{f}</button>
              ))}
            </div>
            {filteredComplaints.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No complaints found</p>
            ) : filteredComplaints.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{c.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === "resolved" ? "bg-green/10 text-green" : c.status === "in-progress" ? "bg-yellow/10 text-yellow-600" : "bg-destructive/10 text-destructive"}`}>{c.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.user_email || "Anonymous"} · {new Date(c.created_at).toLocaleDateString()}</div>
                    <p className="text-sm text-foreground mt-2 leading-relaxed">{c.body}</p>
                  </div>
                  <button onClick={() => { setSelectedComplaint(c); setAdminReply(c.admin_reply || ""); setAdminNotes(c.admin_notes || ""); setComplaintStatus(c.status); }} className="text-xs font-bold text-primary hover:underline flex-shrink-0">Respond</button>
                </div>
              </div>
            ))}
            {selectedComplaint && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl">
                  <h3 className="text-sm font-bold text-foreground mb-4">Respond: {selectedComplaint.subject}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Status</label>
                      <select value={complaintStatus} onChange={e => setComplaintStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                        <option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Admin Notes (internal)</label>
                      <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Reply to User</label>
                      <textarea value={adminReply} onChange={e => setAdminReply(e.target.value)} rows={4} placeholder="Your reply…" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none resize-y" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveComplaintUpdate} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90">Save</button>
                      <button onClick={() => setSelectedComplaint(null)} className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Promotions Tab */}
        {tab === "promotions" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Create Promo Code</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div><label className="text-xs font-bold text-foreground mb-1 block">Code</label><input value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER25" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" /></div>
                <div><label className="text-xs font-bold text-foreground mb-1 block">Discount Type</label>
                  <select value={newPromo.discount_type} onChange={e => setNewPromo(p => ({ ...p, discount_type: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                    <option value="percent">Percentage (%)</option><option value="flat_usd">Flat USD ($)</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-foreground mb-1 block">Value</label><input value={newPromo.discount_value} onChange={e => setNewPromo(p => ({ ...p, discount_value: e.target.value }))} placeholder="10" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" /></div>
                <div><label className="text-xs font-bold text-foreground mb-1 block">Applies to Tier</label>
                  <select value={newPromo.applies_to_tier} onChange={e => setNewPromo(p => ({ ...p, applies_to_tier: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                    <option value="">All tiers</option><option value="undergraduate">Undergraduate</option><option value="masters">Masters</option><option value="phd">PhD</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-foreground mb-1 block">Max Uses</label><input value={newPromo.max_uses} onChange={e => setNewPromo(p => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" /></div>
                <div><label className="text-xs font-bold text-foreground mb-1 block">Expires</label><input type="date" value={newPromo.expires_at} onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" /></div>
              </div>
              <button onClick={createPromoCode} disabled={promoLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                {promoLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Code
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead><tr className="border-b border-border text-muted-foreground bg-secondary/50">
                    <th className="text-left py-2 px-3">Code</th><th className="text-left py-2 px-3">Type</th><th className="text-right py-2 px-3">Value</th><th className="text-left py-2 px-3">Tier</th><th className="text-center py-2 px-3">Uses</th><th className="text-center py-2 px-3">Status</th><th className="text-left py-2 px-3">Expires</th><th className="text-right py-2 px-3">Action</th>
                  </tr></thead>
                  <tbody>{promoCodes.map(p => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{p.code}</td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">{p.discount_type}</td>
                      <td className="py-2 px-3 text-right text-foreground">{p.discount_type === "percent" ? `${p.discount_value}%` : `$${p.discount_value}`}</td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">{p.applies_to_tier || "All"}</td>
                      <td className="py-2 px-3 text-center text-foreground">{p.uses_count}{p.max_uses ? `/${p.max_uses}` : ""}</td>
                      <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{p.active ? "Active" : "Off"}</span></td>
                      <td className="py-2 px-3 text-muted-foreground">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Never"}</td>
                      <td className="py-2 px-3 text-right"><button onClick={() => togglePromoActive(p)} className="text-xs font-bold text-primary hover:underline">{p.active ? "Disable" : "Enable"}</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Refunds Tab */}
        {tab === "refunds" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">User Subscription Override</h2>
              <div className="flex gap-2 mb-4">
                <input value={refundSearch} onChange={e => setRefundSearch(e.target.value)} placeholder="Search by name or user ID…" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                <button onClick={searchRefundUser} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 flex items-center gap-1.5"><Search size={14} /> Find</button>
              </div>
              {refundUser && (
                <div className="border border-border rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><div className="text-[11px] text-muted-foreground">Name</div><div className="text-sm font-bold text-foreground">{refundUser.profile.display_name || "—"}</div></div>
                    <div><div className="text-[11px] text-muted-foreground">Tier</div><div className="text-sm font-bold text-foreground capitalize">{refundUser.sub.tier}</div></div>
                    <div><div className="text-[11px] text-muted-foreground">Words Used</div><div className="text-sm font-bold text-foreground">{refundUser.sub.words_used.toLocaleString()}</div></div>
                    <div><div className="text-[11px] text-muted-foreground">Status</div><div className="text-sm font-bold text-foreground capitalize">{refundUser.sub.status}</div></div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Set Tier</label>
                      <select value={refundTier} onChange={e => setRefundTier(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                        <option value="free">Free</option><option value="undergraduate">Undergraduate</option><option value="masters">Masters</option><option value="phd">PhD</option>
                      </select>
                    </div>
                    <button onClick={applyTierOverride} className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90">Apply Tier</button>
                    <button onClick={resetWordCredits} className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 flex items-center gap-1"><RefreshCw size={12} /> Reset Credits</button>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="text-xs font-bold text-foreground mb-3">Log Refund</h3>
                    <div className="flex flex-wrap gap-3">
                      <input value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="Amount USD" className="w-28 px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                      <input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason" className="flex-1 min-w-[120px] px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                      <button onClick={logRefund} disabled={refundLoading} className="px-3 py-2 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1">
                        {refundLoading ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />} Log Refund
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {refunds.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">Refund History</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead><tr className="border-b border-border text-muted-foreground bg-secondary/50">
                      <th className="text-left py-2 px-3">User</th><th className="text-right py-2 px-3">Amount</th><th className="text-left py-2 px-3">Reason</th><th className="text-right py-2 px-3">Date</th>
                    </tr></thead>
                    <tbody>{refunds.map(r => (
                      <tr key={r.id} className="border-b border-border/30">
                        <td className="py-2 px-3 text-foreground">{r.user_email || "—"}</td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">{r.amount_usd ? `$${r.amount_usd}` : "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.reason || "—"}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {tab === "payouts" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={Wallet} label="Total Requests" value={payoutUses.length.toString()} />
              <SummaryCard icon={Activity} label="Pending" value={payoutUses.filter(p => p.status === "pending").length.toString()} />
              <SummaryCard icon={TrendingUp} label="Paid Out" value={payoutUses.filter(p => p.status === "success").length.toString()} />
              <SummaryCard icon={DollarSign} label="Wallets" value={referralWallets.length.toString()} />
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-secondary w-fit">
              {([["requests", "Payout Requests"], ["wallets", "Wallet Balances"], ["earnings", "Commission Earnings"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setPayoutSubTab(key)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${payoutSubTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
              ))}
            </div>

            {/* Payout Requests */}
            {payoutSubTab === "requests" && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "pending", "success", "failed"] as const).map(f => (
                    <button key={f} onClick={() => setPayoutFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${payoutFilter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{f}</button>
                  ))}
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[700px]">
                      <thead><tr className="border-b border-border text-muted-foreground bg-secondary/50">
                        <th className="text-left py-2 px-3">User ID</th><th className="text-right py-2 px-3">USD</th><th className="text-right py-2 px-3">NGN</th><th className="text-left py-2 px-3">Bank</th><th className="text-left py-2 px-3">Account</th><th className="text-center py-2 px-3">Status</th><th className="text-left py-2 px-3">Date</th><th className="text-right py-2 px-3">Action</th>
                      </tr></thead>
                      <tbody>{filteredPayouts.length === 0 ? (
                        <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No payout requests yet</td></tr>
                      ) : filteredPayouts.map(p => {
                        const prof = profiles.find(pr => pr.user_id === p.user_id);
                        return (
                          <tr key={p.id} className="border-b border-border/30">
                            <td className="py-2 px-3 text-foreground text-[11px]">{prof?.email || p.user_id.slice(0, 10) + "…"}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">${Number(p.amount_usd).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">₦{Number(p.amount_ngn).toLocaleString()}</td>
                            <td className="py-2 px-3 text-muted-foreground">{p.bank_name || "—"}</td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">{p.account_number || "—"}</td>
                            <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === "success" ? "bg-green/10 text-green" : p.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>{p.status}</span></td>
                            <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-right">
                              {p.status === "pending" && <button onClick={() => markPayoutPaid(p.id)} className="text-xs font-bold text-primary hover:underline">Mark Paid</button>}
                              {p.failure_reason && <span className="text-[10px] text-destructive ml-1" title={p.failure_reason}>⚠</span>}
                            </td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground">{filteredPayouts.length} records</div>
                </div>
              </>
            )}

            {/* Wallet Balances */}
            {payoutSubTab === "wallets" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead><tr className="border-b border-border text-muted-foreground bg-secondary/50">
                      <th className="text-left py-2 px-3">User</th><th className="text-right py-2 px-3">Balance</th><th className="text-right py-2 px-3">Pending</th><th className="text-right py-2 px-3">Lifetime</th><th className="text-right py-2 px-3">Referrals</th>
                    </tr></thead>
                    <tbody>{referralWallets.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No wallet data yet</td></tr>
                    ) : referralWallets.map(w => {
                      const prof = profiles.find(p => p.user_id === w.user_id);
                      return (
                        <tr key={w.user_id} className="border-b border-border/30">
                          <td className="py-2 px-3 text-foreground">{prof?.email || w.user_id.slice(0, 10) + "…"}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-foreground">${Number(w.balance_usd).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-600">${Number(w.pending_usd).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">${Number(w.lifetime_earned_usd).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-foreground">{w.total_referrals}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Commission Earnings */}
            {payoutSubTab === "earnings" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Referrer</th><th className="text-left py-2 px-3">Referee</th><th className="text-right py-2 px-3">Payment</th><th className="text-right py-2 px-3">Commission</th><th className="text-center py-2 px-3">Status</th>
                    </tr></thead>
                    <tbody>{referralEarnings.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No commission earnings yet</td></tr>
                    ) : referralEarnings.map(e => {
                      const referrer = profiles.find(p => p.user_id === e.referrer_id);
                      const referee = profiles.find(p => p.user_id === e.referee_id);
                      return (
                        <tr key={e.id} className="border-b border-border/30">
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-foreground">{referrer?.email || (e.referrer_id || "—").slice(0, 8) + "…"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{referee?.email || (e.referee_id || "—").slice(0, 8) + "…"}</td>
                          <td className="py-2 px-3 text-right font-mono text-foreground">${Number(e.payment_amount_usd || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-green">${Number(e.commission_usd || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === "credited" ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{e.status}</span></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={Users} label="Total Profiles" value={profiles.length.toString()} />
              <SummaryCard icon={LogIn} label="Active Subs" value={subscriptions.filter(s => s.status === "active").length.toString()} />
              <SummaryCard icon={Activity} label="AI Calls (all time)" value={logs.length.toString()} />
              <SummaryCard icon={Zap} label="AI Calls (7d)" value={logs.filter(l => new Date(l.created_at) >= new Date(Date.now() - 7 * 86400000)).length.toString()} />
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">User Activity</h2></div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">User ID</th><th className="text-left py-2 px-3">Tier</th><th className="text-left py-2 px-3">Status</th><th className="text-right py-2 px-3">Words Used</th><th className="text-right py-2 px-3">Joined</th>
                  </tr></thead>
                  <tbody>{profiles.map(p => {
                    const sub = subscriptions.find(s => s.user_id === p.user_id);
                    return (
                      <tr key={p.user_id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="py-2 px-3 font-semibold text-foreground">{p.display_name || "—"}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground text-[10px]">{p.user_id.slice(0, 12)}…</td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">{sub?.tier || "free"}</td>
                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub?.status === "active" ? "bg-green/10 text-green" : "bg-secondary text-muted-foreground"}`}>{sub?.status || "—"}</span></td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">{sub?.words_used?.toLocaleString() || "0"}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {tab === "broadcast" && (
          <div className="max-w-xl space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Send Broadcast Notification</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Target</label>
                  <select value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary">
                    <option value="all">All Users</option>
                    <option value="tier:undergraduate">Undergraduate only</option>
                    <option value="tier:masters">Masters only</option>
                    <option value="tier:phd">PhD only</option>
                    <option value="tier:free">Free tier only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Type</label>
                  <select value={broadcastType} onChange={e => setBroadcastType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary">
                    <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Alert</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Title</label>
                  <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Notification title…" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Message</label>
                  <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={4} placeholder="Notification message…" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none focus:border-primary resize-y" />
                </div>
                <button onClick={sendBroadcast} disabled={broadcastSending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                  {broadcastSending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Send Broadcast
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Jobs Tab — diagnostics for batch image generation */}
        {tab === "images" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Image Generation Jobs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Recent batch jobs and per-figure model attempts. Useful for debugging stuck or failing image runs.</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={imageJobFilter} onChange={e => setImageJobFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg bg-background outline-none">
                  <option value="all">All statuses</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>
                <button onClick={loadImageJobs} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-secondary">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={Activity} label="Total jobs" value={imageJobs.length.toString()} />
              <SummaryCard icon={Zap} label="Processing" value={imageJobs.filter(j => j.status === "processing" || j.status === "queued").length.toString()} />
              <SummaryCard icon={TrendingUp} label="Completed" value={imageJobs.filter(j => j.status === "completed").length.toString()} />
              <SummaryCard icon={X} label="Failed" value={imageJobs.filter(j => j.status === "failed" || j.status === "cancelled").length.toString()} />
            </div>

            {/* Jobs table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-foreground">Recent jobs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">When</th>
                      <th className="px-3 py-2 text-left font-semibold">Project</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Progress</th>
                      <th className="px-3 py-2 text-left font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imageJobs
                      .filter(j => imageJobFilter === "all" ||
                        (imageJobFilter === "failed" && (j.status === "failed" || j.status === "cancelled")) ||
                        (imageJobFilter === "processing" && (j.status === "processing" || j.status === "queued")) ||
                        (imageJobFilter === "completed" && j.status === "completed"))
                      .map(j => (
                        <tr key={j.id} className="border-t border-border">
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{new Date(j.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 max-w-[220px] truncate font-medium text-foreground">{j.project_title}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === "completed" ? "bg-primary/10 text-primary" :
                              j.status === "failed" || j.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                              "bg-secondary text-muted-foreground"
                            }`}>{j.status}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{j.completed} / {j.total}</td>
                          <td className="px-3 py-2 max-w-[300px] truncate text-destructive">{j.error || "—"}</td>
                        </tr>
                      ))}
                    {imageJobs.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No image jobs yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-attempt diagnostics */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-foreground">Recent model attempts</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Per-figure log: which model, how long, and why it failed (if it did).</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">When</th>
                      <th className="px-3 py-2 text-left font-semibold">Figure</th>
                      <th className="px-3 py-2 text-left font-semibold">Model</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Duration</th>
                      <th className="px-3 py-2 text-left font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imageAttempts.map(a => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate text-foreground">{a.figure_title || "—"}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{a.model || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === "success" ? "bg-primary/10 text-primary" :
                            a.status === "rate_limited" ? "bg-secondary text-muted-foreground" :
                            "bg-destructive/10 text-destructive"
                          }`}>{a.status}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{a.duration_ms ? `${(a.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate text-destructive">{a.error || "—"}</td>
                      </tr>
                    ))}
                    {imageAttempts.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No attempts logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Token Calculator Tab */}
        {tab === "calculator" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Token Cost Estimator</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {(["free", "undergraduate", "masters", "phd"] as const).map(t => (
                  <div key={t}>
                    <label className="text-xs font-bold text-foreground capitalize">{t} users</label>
                    <input type="number" value={calcUsers[t]} onChange={e => setCalcUsers(prev => ({ ...prev, [t]: parseInt(e.target.value) || 0 }))} className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-foreground">Avg chapters per user</label>
                  <input type="number" value={calcChapters} onChange={e => setCalcChapters(parseInt(e.target.value) || 1)} className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground">Model</label>
                  <select value={calcModel} onChange={e => setCalcModel(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-background outline-none">
                    {Object.keys(MODEL_COSTS).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Estimate</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><div className="text-[11px] text-muted-foreground">Total Chapters</div><div className="text-lg font-bold text-foreground">{calcResult.totalChapters.toLocaleString()}</div></div>
                <div><div className="text-[11px] text-muted-foreground">Input Cost</div><div className="text-lg font-bold text-foreground">${calcResult.inputCost.toFixed(2)}</div></div>
                <div><div className="text-[11px] text-muted-foreground">Output Cost</div><div className="text-lg font-bold text-foreground">${calcResult.outputCost.toFixed(2)}</div></div>
                <div><div className="text-[11px] text-muted-foreground">Total Estimated</div><div className="text-lg font-black text-primary">${calcResult.total.toFixed(2)}</div></div>
              </div>
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <h3 className="text-xs font-bold text-foreground mb-2">Cost per model (all users, {calcChapters} chapters each)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(MODEL_COSTS).map(([model, costs]) => {
                    const total = Object.values(calcUsers).reduce((s, v) => s + v, 0) * calcChapters;
                    const cost = (total * 2000 / 1000) * costs.input + (total * avgTokensPerChapter / 1000) * costs.output;
                    return (
                      <div key={model} className="bg-background rounded-lg px-3 py-2 border border-border">
                        <div className="text-[10px] text-muted-foreground font-mono">{model}</div>
                        <div className="text-sm font-bold text-foreground">${cost.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Icon size={18} className="text-primary" /></div>
      <div><div className="text-[11px] text-muted-foreground">{label}</div><div className="text-lg font-bold text-foreground">{value}</div></div>
    </div>
  );
}
