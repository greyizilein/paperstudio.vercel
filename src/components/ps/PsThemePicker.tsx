import { Check, Sparkles } from "lucide-react";
import { usePsTheme } from "@/contexts/PsThemeContext";
import { PS_THEMES, getPsTheme, type PsThemeId, type PsMode, type PsSidebarVariant } from "@/lib/psThemes";

/**
 * Settings → Appearance picker.
 * 5 theme cards with native previews: sidebar layout, display font, accent colour, Premium flag.
 * Selected theme + mode persist to localStorage AND profile.settings_json.
 * Light/Dark quick-toggle lives in the topbar only.
 */
export function PsThemePicker() {
  const { themeId, mode, setTheme } = usePsTheme();

  return (
    <div className="space-y-5">
      {/* Theme cards */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          Theme
        </label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PS_THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              themeId={t.id}
              activeId={themeId}
              activeMode={mode}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-muted-foreground leading-relaxed">
          Each theme is a full native rebuild — palette, fonts, sidebar layout,
          spacing, motion and avatar all change together so the app feels native to the chosen aesthetic.
        </p>
      </div>
    </div>
  );
}

function ThemeCard({
  themeId, activeId, activeMode, onSelect,
}: { themeId: PsThemeId; activeId: PsThemeId; activeMode: PsMode; onSelect: () => void }) {
  const theme = getPsTheme(themeId);
  const selected = themeId === activeId;
  // Show the variant that matches the user's current mode so the preview
  // tells them what they'll actually see.
  const vars      = activeMode === "dark" ? theme.dark : theme.light;
  const bg        = `hsl(${vars["--background"]})`;
  const fg        = `hsl(${vars["--foreground"]})`;
  const card      = `hsl(${vars["--card"]})`;
  const primary   = `hsl(${vars["--primary"]})`;
  const accent    = `hsl(${vars["--accent"]})`;
  const sidebarBg = `hsl(${vars["--sidebar-background"]})`;
  const sidebarFg = `hsl(${vars["--sidebar-foreground"]})`;
  const border    = `hsl(${vars["--border"]})`;
  const radius    = vars["--ps-radius"];
  const fontDisplay = vars["--ps-font-display"];
  const fontBody    = vars["--ps-font-body"];
  // Pick the first family from the stack for the readable label.
  const displayName = (fontDisplay.split(",")[0] || "").replace(/['"]/g, "").trim();
  const bodyName    = (fontBody.split(",")[0] || "").replace(/['"]/g, "").trim();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-left overflow-hidden border transition-all cursor-pointer ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
      }`}
      style={{ background: bg, color: fg, borderRadius: `calc(${radius} + 4px)` }}
    >
      {/* Mini app-shell preview: sidebar silhouette + content slab */}
      <div className="flex" style={{ height: 86 }}>
        <SidebarPreview
          variant={theme.sidebar}
          bg={sidebarBg}
          fg={sidebarFg}
          accent={accent}
          radius={vars["--ps-radius-sm"]}
        />
        <div className="flex-1 p-2.5 min-w-0" style={{ background: bg }}>
          <div
            className="text-[12.5px] font-bold tracking-tight truncate"
            style={{ fontFamily: fontDisplay, color: fg }}
          >
            {theme.name}
          </div>
          {/* Mock card */}
          <div
            className="mt-1.5 p-1.5"
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: vars["--ps-radius-sm"],
            }}
          >
            <div
              className="text-[8.5px] font-semibold opacity-90 mb-1"
              style={{ fontFamily: fontBody, color: fg }}
            >
              Chapter draft
            </div>
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-1 rounded-full" style={{ background: primary, opacity: 0.85 }} />
              <div className="w-2.5 h-1 rounded-full" style={{ background: accent }} />
            </div>
          </div>
        </div>
      </div>

      {/* Meta row: fonts + sidebar variant */}
      <div
        className="px-3 py-2 border-t flex items-center gap-2 text-[9.5px]"
        style={{ borderColor: border, fontFamily: fontBody, color: fg, opacity: 0.8 }}
      >
        <span className="font-semibold truncate" title={`${displayName} / ${bodyName}`}>
          {displayName === bodyName ? displayName : `${displayName} · ${bodyName}`}
        </span>
        <span className="opacity-50">•</span>
        <span className="opacity-75 capitalize">{sidebarLabel(theme.sidebar)}</span>
        {theme.premium && (
          <span
            className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wider"
            style={{ background: accent, color: `hsl(${vars["--accent-foreground"]})` }}
          >
            <Sparkles size={8} strokeWidth={3} /> PRO
          </span>
        )}
      </div>

      {/* Description */}
      <div
        className="px-3 pb-2.5 -mt-1 text-[10px] opacity-75"
        style={{ fontFamily: fontBody, color: fg }}
      >
        {theme.description}
      </div>

      {selected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: accent, color: `hsl(${vars["--accent-foreground"]})` }}
        >
          <Check size={11} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function sidebarLabel(v: PsSidebarVariant) {
  return v === "notion-exact" ? "Notion sidebar" : "Classic sidebar";
}

/** Tiny silhouette of the sidebar layout (Notion vs app-classic). */
function SidebarPreview({
  variant, bg, fg, accent, radius,
}: { variant: PsSidebarVariant; bg: string; fg: string; accent: string; radius: string }) {
  const itemBase = { background: fg, opacity: 0.18, borderRadius: radius } as React.CSSProperties;
  const itemActive = { background: fg, opacity: 0.5, borderRadius: radius } as React.CSSProperties;

  if (variant === "notion-exact") {
    return (
      <div
        className="flex flex-col gap-1 p-1.5 flex-shrink-0"
        style={{ width: 54, background: bg }}
      >
        {/* Workspace row */}
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: accent }} />
          <div className="flex-1 h-1.5" style={itemBase} />
        </div>
        {/* Utility group (Search / Inbox / Settings) */}
        <div className="space-y-0.5 mt-0.5">
          <div className="h-1.5" style={itemBase} />
          <div className="h-1.5" style={itemBase} />
        </div>
        {/* Section label */}
        <div className="h-[3px] w-5 mt-1 rounded-full" style={{ background: fg, opacity: 0.4 }} />
        {/* Pages */}
        <div className="space-y-0.5">
          <div className="h-1.5" style={itemActive} />
          <div className="h-1.5" style={itemBase} />
          <div className="h-1.5" style={itemBase} />
        </div>
        {/* Pinned bottom CTA */}
        <div className="mt-auto h-2.5" style={{ background: accent, borderRadius: radius, opacity: 0.9 }} />
      </div>
    );
  }

  // app-classic — current PaperStudio shell silhouette
  return (
    <div
      className="flex flex-col gap-1.5 p-1.5 flex-shrink-0"
      style={{ width: 54, background: bg }}
    >
      {/* Brand */}
      <div className="h-2 w-9 rounded-sm" style={{ background: accent, opacity: 0.95 }} />
      {/* User row */}
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: fg, opacity: 0.5 }} />
        <div className="flex-1 h-1.5" style={itemBase} />
      </div>
      {/* Nav items */}
      <div className="space-y-0.5 mt-0.5">
        <div className="h-1.5" style={itemActive} />
        <div className="h-1.5" style={itemBase} />
        <div className="h-1.5" style={itemBase} />
        <div className="h-1.5" style={itemBase} />
        <div className="h-1.5" style={itemBase} />
      </div>
    </div>
  );
}
