// Shared helper: resolve a request's user tier + email + id from the Authorization header.
// Mirrors the inline block in generate-chapter so other reasoning functions can route
// to Claude when the user is on a paid tier (or is the admin).

import { createClient } from "npm:@supabase/supabase-js@2";
import { isAdminEmail } from "./pick-model.ts";

export interface ResolvedTier {
  userId: string | null;
  email: string | null;
  /** Lowercase tier — "free" | "undergraduate" | "masters" | "phd" | "custom" | "none". Admin → "phd". */
  tier: string;
  isAdmin: boolean;
}

export async function resolveTier(req: Request): Promise<ResolvedTier> {
  const out: ResolvedTier = { userId: null, email: null, tier: "free", isAdmin: false };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return out;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !supabaseKey) return out;

  try {
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseKey },
    });
    if (!userResp.ok) return out;
    const userData = await userResp.json();
    out.userId = userData?.id ?? null;
    out.email = userData?.email ?? null;
    if (out.userId) {
      const { data: sub } = await createClient(supabaseUrl, supabaseKey)
        .from("subscriptions").select("tier").eq("user_id", out.userId).maybeSingle();
      if (sub?.tier) out.tier = String(sub.tier).toLowerCase();
    }
  } catch (e) {
    console.warn("resolveTier failed (non-fatal):", e);
  }

  out.isAdmin = isAdminEmail(out.email);
  if (out.isAdmin) out.tier = "phd";
  return out;
}

/** True when this request should be routed to Claude for reasoning tasks.
 *  Reasoning is universal — every tier (including free) routes to Claude.
 *  Thinking budget is the tier-gated knob (see shouldUseThinking). */
export function shouldUseClaude(_t: ResolvedTier): boolean {
  return true;
}

/** True when this request should also enable Claude extended thinking. */
export function shouldUseThinking(t: ResolvedTier): boolean {
  if (t.isAdmin) return true;
  return t.tier === "masters" || t.tier === "phd" || t.tier === "custom";
}
