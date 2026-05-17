import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  applyPsTheme,
  DEFAULT_PS_MODE,
  DEFAULT_PS_THEME_ID,
  type PsMode,
  type PsThemeId,
} from "@/lib/psThemes";

interface PsThemeState {
  themeId: PsThemeId;
  mode: PsMode;
  setTheme: (id: PsThemeId) => void;
  setMode: (mode: PsMode) => void;
  toggleMode: () => void;
}

const Ctx = createContext<PsThemeState | null>(null);

const LS_THEME = "ps_theme_id";
const LS_MODE  = "ps_theme_mode";
// Bumped when we want to force-reset existing users to a new default.
// Bump 2026-04-26: introduced Classic (Notion B&W) theme as the default;
// reset every previously-saved theme so everyone lands on Classic on next load.
const LS_RESET_KEY = "ps_theme_reset_v3";

function readLocal(): { themeId: PsThemeId; mode: PsMode } {
  if (typeof window === "undefined") {
    return { themeId: DEFAULT_PS_THEME_ID, mode: DEFAULT_PS_MODE };
  }
  // One-time reset: if this user hasn't been migrated to the new default yet,
  // wipe their cached choice so they see Classic on first paint.
  if (localStorage.getItem(LS_RESET_KEY) !== "1") {
    localStorage.removeItem(LS_THEME);
    localStorage.removeItem(LS_MODE);
    localStorage.setItem(LS_RESET_KEY, "1");
    return { themeId: DEFAULT_PS_THEME_ID, mode: DEFAULT_PS_MODE };
  }
  const themeId = (localStorage.getItem(LS_THEME) as PsThemeId | null) ?? DEFAULT_PS_THEME_ID;
  const mode    = (localStorage.getItem(LS_MODE)  as PsMode    | null) ?? DEFAULT_PS_MODE;
  return { themeId, mode };
}

export function PsThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Seed from localStorage so first paint matches the user's last choice
  // (avoids a theme flash when the profile fetch resolves later).
  const initial = readLocal();
  const [themeId, setThemeIdState] = useState<PsThemeId>(initial.themeId);
  const [mode,    setModeState]    = useState<PsMode>(initial.mode);

  // Apply on mount + whenever theme/mode changes. Re-applies when .ps-app
  // mounts later (ProtectedRoute) because we also write to documentElement.
  useEffect(() => {
    applyPsTheme(themeId, mode);
    // Persist to localStorage immediately.
    try {
      localStorage.setItem(LS_THEME, themeId);
      localStorage.setItem(LS_MODE, mode);
    } catch {
      /* private mode / quota — non-fatal */
    }
  }, [themeId, mode]);

  // When .ps-app mounts (route change), re-apply so its inline vars are set.
  useEffect(() => {
    const id = window.setTimeout(() => applyPsTheme(themeId, mode), 0);
    return () => clearTimeout(id);
  });

  // Hydrate from profile when user logs in (per-account, with local cache).
  // IMPORTANT: As part of the 2026-04-26 default reset, we IGNORE any saved
  // app_theme/app_theme_mode in the profile until the user explicitly sets
  // a new one — and proactively clear the stale fields. This guarantees
  // every existing user lands on Classic regardless of what they had saved.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("settings_json")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data?.settings_json) return;
      const sj = data.settings_json as Record<string, any>;
      // Reset flag stored on the profile so we only do this once per user.
      if (sj.app_theme_reset_v2 === true) {
        // Already migrated — honour their choice.
        const remoteTheme = sj.app_theme as PsThemeId | undefined;
        const remoteMode  = sj.app_theme_mode as PsMode | undefined;
        if (remoteTheme && remoteTheme !== themeId) setThemeIdState(remoteTheme);
        if (remoteMode  && remoteMode  !== mode)    setModeState(remoteMode);
      } else {
        // First load after the v2 default change — wipe stale keys, mark migrated.
        const next = { ...sj, app_theme: null, app_theme_mode: null, app_theme_reset_v2: true };
        await supabase.from("profiles").update({ settings_json: next }).eq("user_id", user.id);
        // Do NOT set state from sj.app_theme — let the local Classic default stand.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persist to profile (debounced via microtask) when changed.
  const persistRemote = useCallback(async (nextTheme: PsThemeId, nextMode: PsMode) => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("settings_json")
      .eq("user_id", user.id)
      .maybeSingle();
    const merged = {
      ...(data?.settings_json as Record<string, any> | null ?? {}),
      app_theme: nextTheme,
      app_theme_mode: nextMode,
      // User has explicitly chosen — mark migration done so the v2 reset
      // doesn't fire again on next login.
      app_theme_reset_v2: true,
    };
    await supabase
      .from("profiles")
      .update({ settings_json: merged })
      .eq("user_id", user.id);
  }, [user]);

  const setTheme = useCallback((id: PsThemeId) => {
    setThemeIdState(id);
    void persistRemote(id, mode);
  }, [mode, persistRemote]);

  const setMode = useCallback((m: PsMode) => {
    setModeState(m);
    void persistRemote(themeId, m);
  }, [themeId, persistRemote]);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  return (
    <Ctx.Provider value={{ themeId, mode, setTheme, setMode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePsTheme(): PsThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePsTheme must be used inside <PsThemeProvider>");
  return v;
}
