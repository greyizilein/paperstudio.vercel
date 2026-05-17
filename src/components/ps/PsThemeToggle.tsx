import { Sun, Moon } from "lucide-react";
import { usePsTheme } from "@/contexts/PsThemeContext";

/** Compact sun/moon toggle for the app topbar. */
export function PsThemeToggle({ size = 16 }: { size?: number }) {
  const { mode, toggleMode } = usePsTheme();
  const isDark = mode === "dark";
  return (
    <button
      onClick={toggleMode}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-secondary/60"
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
