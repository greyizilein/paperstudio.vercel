import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { getUnlimitedCzarSubscription, isAdminEmail } from "@/lib/admin";

interface CzarSub {
  tier: string;
  word_limit: number;
  words_used: number;
  bonus_words: number;
  bonus_used: number;
  status: string;
}

export function CzarUsageCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState<CzarSub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (isAdminEmail(user.email)) {
        setSub(getUnlimitedCzarSubscription());
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("czar_subscriptions")
        .select("tier, word_limit, words_used, bonus_words, bonus_used, status")
        .eq("user_id", user.id)
        .maybeSingle();
      setSub(data as CzarSub | null);
      setLoading(false);
    })();
  }, [user]);

  const isAdmin = isAdminEmail(user?.email);
  const bonusRemaining = Math.max((sub?.bonus_words ?? 0) - (sub?.bonus_used ?? 0), 0);
  const paidRemaining = Math.max((sub?.word_limit ?? 0) - (sub?.words_used ?? 0), 0);
  const totalRemaining = isAdmin ? Number.POSITIVE_INFINITY : bonusRemaining + paidRemaining;
  const totalLimit = (sub?.bonus_words ?? 0) + (sub?.word_limit ?? 0);
  const usedPct = totalLimit > 0 ? Math.min(100, Math.round(((totalLimit - (isAdmin ? 0 : bonusRemaining + paidRemaining)) / totalLimit) * 100)) : 0;
  const tierLabel = isAdmin ? "unlimited" : (sub?.tier && sub.tier !== "none" ? sub.tier : "free trial");

  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-sm p-5 mb-4 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "radial-gradient(ellipse 70% 50% at 80% -10%, hsl(var(--primary) / 0.08) 0%, transparent 60%)" }}
      />
      <div className="flex items-center gap-2 mb-3 relative">
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground">
          <CzarIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-black text-foreground tracking-tight">CZAR</div>
          <div className="text-[10px] text-muted-foreground capitalize">{tierLabel} plan</div>
        </div>
        <span className="text-[9px] font-bold tracking-wider text-muted-foreground px-1.5 py-0.5 border border-border rounded">NEW</span>
      </div>

      {loading ? (
        <div className="h-12 flex items-center text-[11px] text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="text-[28px] font-black text-foreground leading-none relative">
            {isAdmin ? "∞" : totalRemaining.toLocaleString()}
            <span className="text-[11px] font-semibold text-muted-foreground ml-1.5">words left</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {isAdmin ? <span>Unlimited admin access</span> : (
              <>
                {bonusRemaining > 0 && <span>{bonusRemaining.toLocaleString()} bonus</span>}
                {bonusRemaining > 0 && paidRemaining > 0 && <span> · </span>}
                {paidRemaining > 0 && <span>{paidRemaining.toLocaleString()} paid</span>}
                {totalLimit === 0 && <span>No allowance yet</span>}
              </>
            )}
          </div>

          {!isAdmin && totalLimit > 0 && (
            <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
            </div>
          )}
        </>
      )}

      <button onClick={() => navigate("/czar")} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-[12px] font-bold hover:opacity-85 transition-opacity relative">
        Open CZAR <ArrowRight size={12} />
      </button>
    </div>
  );
}
