import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Copy, Wallet, Loader2, Users, TrendingUp } from "lucide-react";

interface Wallet { balance_usd: number; lifetime_earned_usd: number; total_referrals: number; }
interface Earning { id: string; commission_usd: number; payment_amount_usd: number; created_at: string; payment_reference: string | null; }
interface Payout { id: string; amount_usd: number; amount_ngn: number; status: string; created_at: string; failure_reason: string | null; }

export function ReferralPanel({ referralCode }: { referralCode: string }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet>({ balance_usd: 0, lifetime_earned_usd: 0, total_referrals: 0 });
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);

  const link = referralCode ? `${window.location.origin}/ref/${referralCode}` : "";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [w, e, p] = await Promise.all([
      supabase.from("referral_wallets").select("balance_usd, lifetime_earned_usd, total_referrals").eq("user_id", user.id).maybeSingle(),
      supabase.from("referral_earnings").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("referral_payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (w.data) setWallet(w.data as any);
    setEarnings((e.data as any) || []);
    setPayouts((p.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const share = async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Join PaperStudio", text: "Get $0 to start writing your dissertation with AI:", url: link }); } catch {}
    } else { copy(); }
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
          <button onClick={share} className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground font-semibold">Share</button>
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

      {earnings.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Recent earnings</div>
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
