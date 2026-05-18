import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Copy, Wallet, Loader2, Users, TrendingUp, MessageCircle, CheckCircle2, Clock } from "lucide-react";

interface WalletData { balance_usd: number; lifetime_earned_usd: number; total_referrals: number; }
interface Earning { id: string; commission_usd: number; payment_amount_usd: number; created_at: string; }
interface Payout { id: string; amount_usd: number; amount_ngn: number; status: string; created_at: string; failure_reason: string | null; }
interface ReferredUser {
  id: string;
  display_name: string | null;
  subscribed: boolean;
  tier: string | null;
  signed_up_at: string;
}

export function ReferralPanel({ referralCode }: { referralCode: string }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData>({ balance_usd: 0, lifetime_earned_usd: 0, total_referrals: 0 });
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);

  const link = referralCode ? `${window.location.origin}/ref/${referralCode}` : "";

  const load = useCallback(async () => {
    if (!user || !referralCode) return;
    setLoading(true);

    // Load wallet, earnings, payouts in parallel
    const [w, e, p] = await Promise.all([
      supabase.from("referral_wallets").select("balance_usd, lifetime_earned_usd, total_referrals").eq("user_id", user.id).maybeSingle(),
      supabase.from("referral_earnings").select("id, commission_usd, payment_amount_usd, created_at").eq("referrer_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("referral_payouts").select("id, amount_usd, amount_ngn, status, created_at, failure_reason").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (w.data) setWallet(w.data as WalletData);
    setEarnings((e.data as Earning[]) || []);
    setPayouts((p.data as Payout[]) || []);

    // Load referred users: code → uses → profiles + subscriptions
    const { data: codeRow } = await supabase
      .from("referral_codes").select("id").eq("code", referralCode).maybeSingle();

    if (codeRow?.id) {
      const { data: uses } = await supabase
        .from("referral_uses")
        .select("id, referred_user_id, created_at")
        .eq("referral_code_id", codeRow.id)
        .order("created_at", { ascending: false });

      if (uses && uses.length > 0) {
        const userIds = uses.map((u: any) => u.referred_user_id).filter(Boolean);

        // Fetch profiles (display_name) and subscriptions in parallel
        const [profsRes, subsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
          supabase.from("subscriptions").select("user_id, tier, status").in("user_id", userIds),
        ]);

        const profsMap: Record<string, string | null> = {};
        (profsRes.data || []).forEach((pr: any) => { profsMap[pr.user_id] = pr.display_name; });

        const subsMap: Record<string, { tier: string; status: string }> = {};
        (subsRes.data || []).forEach((s: any) => { subsMap[s.user_id] = { tier: s.tier, status: s.status }; });

        const built: ReferredUser[] = uses.map((u: any) => {
          const sub = u.referred_user_id ? subsMap[u.referred_user_id] : null;
          return {
            id: u.id,
            display_name: u.referred_user_id ? (profsMap[u.referred_user_id] ?? null) : null,
            subscribed: !!sub && sub.status === "active" && sub.tier !== "free",
            tier: sub?.tier ?? null,
            signed_up_at: u.created_at,
          };
        });
        setReferredUsers(built);
      } else {
        setReferredUsers([]);
      }
    }

    setLoading(false);
  }, [user, referralCode]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: re-fetch when a new referral_uses row is inserted
  useEffect(() => {
    if (!referralCode) return;

    const channel = supabase.channel(`referral-uses:${referralCode}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "referral_uses",
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "referral_uses",
      }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [referralCode, load]);

  // Also watch subscriptions table so "Signed up → Subscribed" flips live
  useEffect(() => {
    const channel = supabase.channel(`referral-subs:${user?.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "subscriptions",
      }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const shareNative = async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Join PaperStudio", text: "Write your dissertation with AI — use my link:", url: link }); } catch {}
    } else { copy(); }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Write your dissertation with AI 🎓 Use my link: ${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  const withdraw = async () => {
    if (!user) return;
    if (wallet.balance_usd < 5) { toast.error("Minimum withdrawal is $5"); return; }
    if (!confirm(`Withdraw $${wallet.balance_usd.toFixed(2)} to your bank? Make sure your bank details in Settings are correct.`)) return;
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-referral-payout", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      toast.success(`Payout of $${data.amount_usd.toFixed(2)} submitted!`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Payout failed");
    } finally { setWithdrawing(false); }
  };

  if (!referralCode) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide">Referrals — earn 10%</h3>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Users className="w-3 h-3" />} label="Referrals" value={wallet.total_referrals.toString()} />
        <Stat icon={<TrendingUp className="w-3 h-3" />} label="Lifetime" value={`$${wallet.lifetime_earned_usd.toFixed(2)}`} />
        <Stat icon={<Wallet className="w-3 h-3" />} label="Balance" value={`$${wallet.balance_usd.toFixed(2)}`} highlight />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your link</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono truncate">{link}</code>
          <button onClick={copy} className="p-1.5 rounded hover:bg-muted" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={shareWhatsApp} className="flex items-center justify-center gap-1 flex-1 text-xs py-1.5 rounded bg-[#25D366] text-white font-semibold">
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </button>
          <button onClick={shareNative} className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground font-semibold">Share</button>
          <button
            onClick={withdraw}
            disabled={withdrawing || wallet.balance_usd < 5}
            className="flex-1 text-xs py-1.5 rounded bg-foreground text-background font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
          >
            {withdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
            Withdraw
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Min $5. Goes to the bank account in Settings via Paystack.</p>
      </div>

      {/* Referred users — live */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Who signed up {referredUsers.length > 0 && <span className="font-normal normal-case">({referredUsers.length})</span>}
        </div>
        {referredUsers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic py-2">No one has used your link yet — share it!</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-auto">
            {referredUsers.map((ru) => (
              <div key={ru.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ru.subscribed ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <span className="font-medium text-foreground">{ru.display_name || "Anonymous user"}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {ru.subscribed ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> Subscribed
                      {ru.tier && ru.tier !== "free" && <span className="capitalize">({ru.tier})</span>}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600">
                      <Clock className="w-3 h-3" /> Signed up
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">{new Date(ru.signed_up_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {earnings.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Commission earned</div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                <span className="font-mono font-bold text-emerald-600">+${Number(e.commission_usd).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {payouts.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Recent payouts</div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                <span className="font-mono">${Number(p.amount_usd).toFixed(2)}</span>
                <span className={`text-[10px] uppercase ${p.status === "success" ? "text-emerald-600" : p.status === "failed" ? "text-red-600" : "text-amber-600"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-border"}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
  );
}
