import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type MarketingMode = "dark" | "light";

interface MarketingThemeState {
  mode: MarketingMode;
  toggleMode: () => void;
}

const Ctx = createContext<MarketingThemeState | null>(null);
const LS_KEY = "ps_marketing_mode";

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MarketingMode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(LS_KEY) as MarketingMode) ?? "dark";
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, mode); } catch { /* quota */ }
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <Ctx.Provider value={{ mode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMarketingTheme(): MarketingThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarketingTheme must be used inside <MarketingThemeProvider>");
  return v;
}
