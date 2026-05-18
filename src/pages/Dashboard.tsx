import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, getUserSubscription } from "@/lib/projectService";
import { supabase } from "@/integrations/supabase/client";
import { BookLoader } from "@/components/ui/BookLoader";

// Smart redirect: send users directly into their most recent writer.
// If they have no projects yet, send them to create one.
// All project management is now accessible from within the Writer UI.
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    redirect();
    runIdleSideEffects();
  }, [user]);

  const redirect = async () => {
    try {
      const projects = await fetchProjects(user!.id);
      if (projects.length === 0) {
        navigate("/new-project", { replace: true });
      } else {
        navigate(`/writer/${projects[0].id}`, { replace: true });
      }
    } catch {
      navigate("/new-project", { replace: true });
    }
  };

  const runIdleSideEffects = () => {
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback
        ? (window as any).requestIdleCallback(cb, { timeout: 800 })
        : setTimeout(cb, 250);
    idle(() => {
      registerReferral();
    });
  };

  const registerReferral = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("settings_json").eq("user_id", user.id).maybeSingle();
    const settings = (prof?.settings_json as Record<string, string>) || {};
    if (settings.referral_prompted === "true") return;
    const { data: referralUse } = await supabase.from("referral_uses").select("id").eq("referred_user_id", user.id).maybeSingle();
    if (referralUse) return;
    // Check localStorage first, then fall back to metadata set during email signup
    const localCode = (localStorage.getItem("ps_referral_code") || "").trim().toUpperCase();
    const metaCode = ((user.user_metadata?.referral_code as string) || "").trim().toUpperCase();
    const stashed = localCode || metaCode;
    if (!stashed) return;
    const { data: refCode } = await supabase.from("referral_codes").select("id").eq("code", stashed).eq("active", true).maybeSingle();
    if (!refCode) return;
    await supabase.from("referral_uses").insert({ referral_code_id: refCode.id, referred_user_id: user.id, referred_email: user.email, status: "pending" } as any);
    const { data: codeRow } = await supabase.from("referral_codes").select("uses_count").eq("id", refCode.id).maybeSingle();
    await supabase.from("referral_codes").update({ uses_count: (codeRow?.uses_count ?? 0) + 1 } as any).eq("id", refCode.id);
    await supabase.from("profiles").update({ settings_json: { ...settings, referral_prompted: "true" } } as any).eq("user_id", user.id);
    localStorage.removeItem("ps_referral_code");
  };

  return <BookLoader fullScreen />;
}
