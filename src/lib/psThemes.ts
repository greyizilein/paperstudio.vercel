// PaperStudio theme system — 5 curated themes × {light, dark} = 10 looks.
// Each theme is a FULL native rebuild: palette + fonts + spacing scale +
// radius scale + motion curve + sidebar layout variant + avatar treatment.
// Applied to `.ps-app` (and mirrored on documentElement so portaled UI follows).
//
// Token vocabulary (every theme writes all of these):
//   --background, --foreground, --card, --popover, --primary, --secondary,
//   --muted, --accent, --border, --input, --ring, --sidebar-*
//   --ps-font-display, --ps-font-body, --ps-font-mono
//   --ps-radius              (base radius — cards/buttons; px or rem string)
//   --ps-radius-sm           (small controls)
//   --ps-space-unit          (spacing rhythm — used by app shells that opt in)
//   --ps-ease                (signature motion curve)
//   --ps-shadow-soft, --ps-shadow-elev
//
// Layout vars (data-attributes on .ps-app, read by components):
//   data-ps-sidebar="notion-exact" | "app-classic"
//   data-ps-avatar="contact-outline" | "initials-circle" | "gold-ring" | "serif-monogram" | "mono-square"

export type PsMode = "light" | "dark";
export type PsThemeId =
  | "classic"          // Notion-faithful B&W (DEFAULT)
  | "dark-luxe"        // Near-black + gold + Instrument Serif (premium dark)
  | "editorial-paper"  // Paper-cream + Fraunces (library)
  | "nordic-slate"     // Cool slate + Inter Tight (Scandi)
  | "graphite-mono";   // Charcoal + warm accent + JetBrains (architectural)

export type PsSidebarVariant = "notion-exact" | "app-classic";
export type PsAvatarStyle =
  | "contact-outline"     // Notion-style outlined contact silhouette
  | "initials-circle"     // Plain initials in circle (current Original)
  | "gold-ring"           // Initials with gold ring (Dark Luxe)
  | "serif-monogram"      // First letter in serif on cream (Editorial)
  | "mono-square";        // Initials in monospace, square corners (Graphite)

export interface PsTheme {
  id: PsThemeId;
  name: string;
  description: string;
  premium: boolean;
  sidebar: PsSidebarVariant;
  avatar: PsAvatarStyle;
  // Two complete variable maps — one per mode.
  light: Record<string, string>;
  dark: Record<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────────
const tk = (v: {
  bg: string; fg: string;
  card: string; cardFg: string;
  popover: string; popoverFg: string;
  primary: string; primaryFg: string;
  primaryDark: string; primaryMid: string; primaryLight: string; primaryPale: string;
  secondary: string; secondaryFg: string;
  muted: string; mutedFg: string;
  accent: string; accentFg: string;
  destructive: string; destructiveFg: string;
  border: string; input: string; ring: string;
  surface: string; surfaceLight: string;
  sidebarBg: string; sidebarFg: string;
  sidebarPrimary: string; sidebarPrimaryFg: string;
  sidebarAccent: string; sidebarAccentFg: string;
  sidebarBorder: string; sidebarRing: string;
  shadowSoft: string; shadowElev: string;
  fontDisplay: string; fontBody: string; fontMono: string;
  radius: string; radiusSm: string; spaceUnit: string; ease: string;
  bgGradient?: string;
}): Record<string, string> => ({
  "--background": v.bg, "--foreground": v.fg,
  "--card": v.card, "--card-foreground": v.cardFg,
  "--popover": v.popover, "--popover-foreground": v.popoverFg,
  "--primary": v.primary, "--primary-foreground": v.primaryFg,
  "--primary-dark": v.primaryDark, "--primary-mid": v.primaryMid,
  "--primary-light": v.primaryLight, "--primary-pale": v.primaryPale,
  "--secondary": v.secondary, "--secondary-foreground": v.secondaryFg,
  "--muted": v.muted, "--muted-foreground": v.mutedFg,
  "--accent": v.accent, "--accent-foreground": v.accentFg,
  "--destructive": v.destructive, "--destructive-foreground": v.destructiveFg,
  "--border": v.border, "--input": v.input, "--ring": v.ring,
  "--surface": v.surface, "--surface-light": v.surfaceLight,
  "--sidebar-background": v.sidebarBg, "--sidebar-foreground": v.sidebarFg,
  "--sidebar-primary": v.sidebarPrimary, "--sidebar-primary-foreground": v.sidebarPrimaryFg,
  "--sidebar-accent": v.sidebarAccent, "--sidebar-accent-foreground": v.sidebarAccentFg,
  "--sidebar-border": v.sidebarBorder, "--sidebar-ring": v.sidebarRing,
  "--ps-shadow-soft": v.shadowSoft, "--ps-shadow-elev": v.shadowElev,
  "--ps-font-display": v.fontDisplay, "--ps-font-body": v.fontBody, "--ps-font-mono": v.fontMono,
  "--ps-radius": v.radius, "--ps-radius-sm": v.radiusSm,
  "--ps-space-unit": v.spaceUnit, "--ps-ease": v.ease,
  "--radius": v.radius,
  "--ps-bg-gradient": v.bgGradient ?? "none",
});

// ── Font stacks ──────────────────────────────────────────────────────
// Classic = Notion: Inter for everything, the same stack Notion ships.
const F_NOTION = {
  display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  body:    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono:    '"iA Writer Mono", "JetBrains Mono", "Menlo", ui-monospace, monospace',
};
const F_INSTRUMENT_GEIST = {
  display: '"Instrument Serif", "Fraunces", Georgia, serif',
  body:    '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono:    '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};
const F_FRAUNCES_INTER = {
  display: '"Fraunces", "Instrument Serif", Georgia, serif',
  body:    '"Inter", -apple-system, system-ui, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, monospace',
};
const F_INTER_TIGHT = {
  display: '"Inter Tight", "Inter", -apple-system, system-ui, sans-serif',
  body:    '"Inter", -apple-system, system-ui, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, monospace',
};
const F_GRAPHITE = {
  display: '"Inter Tight", "Inter", -apple-system, system-ui, sans-serif',
  body:    '"Inter", -apple-system, system-ui, sans-serif',
  mono:    '"JetBrains Mono", "Geist Mono", ui-monospace, monospace',
};

// ── Motion curves (each theme has its own signature ease) ─────────────
const EASE_NOTION   = "cubic-bezier(0.4, 0, 0.2, 1)";       // Material/Notion: snappy
const EASE_LUXE     = "cubic-bezier(0.22, 1, 0.36, 1)";     // OutExpo: editorial swell
const EASE_PAPER    = "cubic-bezier(0.16, 1, 0.3, 1)";      // Soft, library-quiet
const EASE_NORDIC   = "cubic-bezier(0.32, 0.72, 0, 1)";     // iOS spring-ish
const EASE_GRAPHITE = "cubic-bezier(0.65, 0, 0.35, 1)";     // Architectural sine

// Standard premium shadows for dark backgrounds
const SHADOW_DARK_SOFT = "0 1px 0 hsl(38 25% 88% / 0.04) inset, 0 8px 24px -12px hsl(0 0% 0% / 0.6)";
const SHADOW_DARK_ELEV = "0 1px 0 hsl(38 25% 88% / 0.06) inset, 0 24px 48px -20px hsl(0 0% 0% / 0.7)";
// Notion-light: nearly invisible — just hairlines + tiny lift on cards.
const SHADOW_NOTION_SOFT = "0 1px 2px hsl(0 0% 0% / 0.04)";
const SHADOW_NOTION_ELEV = "0 6px 16px -6px hsl(0 0% 0% / 0.10), 0 2px 4px hsl(0 0% 0% / 0.04)";
// Light, slightly warmer for paper themes
const SHADOW_LIGHT_SOFT = "0 1px 2px hsl(24 10% 20% / 0.04), 0 4px 16px -8px hsl(24 10% 20% / 0.08)";
const SHADOW_LIGHT_ELEV = "0 4px 8px hsl(24 10% 20% / 0.06), 0 24px 48px -16px hsl(24 10% 20% / 0.12)";

// ════════════════════════════════════════════════════════════════════
// THEMES
// ════════════════════════════════════════════════════════════════════

export const PS_THEMES: PsTheme[] = [
  // ── 1. Classic (Notion B&W) — DEFAULT ───────────────────────────────
  // Faithful Notion replica. Off-white #FBFBFA, ink #37352F, hairline
  // borders, Inter everything, Notion-exact sidebar layout, contact-icon
  // avatar. Tight 4px radius, 4px space rhythm, Material easing.
  {
    id: "classic",
    name: "Classic",
    description: "Notion-faithful black & white. Calm, generous, native.",
    premium: false,
    sidebar: "notion-exact",
    avatar: "contact-outline",
    light: tk({
      // Notion canvas: warm off-white #FBFBFA
      bg: "40 14% 98%", fg: "30 8% 20%",
      // Pages sit on pure white surfaces with hairline borders
      card: "0 0% 100%", cardFg: "30 8% 18%",
      popover: "0 0% 100%", popoverFg: "30 8% 18%",
      // Primary = ink (Notion has no brand color in chrome — actions are dark)
      primary: "30 8% 18%", primaryFg: "0 0% 100%",
      primaryDark: "30 10% 10%", primaryMid: "30 6% 36%",
      primaryLight: "30 6% 88%", primaryPale: "40 14% 96%",
      // Secondary = sidebar grey #F7F6F3
      secondary: "40 12% 96%", secondaryFg: "30 8% 22%",
      muted: "40 10% 95%", mutedFg: "30 4% 46%",
      // Accent = Notion blue (used VERY sparingly, only for selection / focus)
      accent: "212 92% 45%", accentFg: "0 0% 100%",
      destructive: "5 75% 51%", destructiveFg: "0 0% 100%",
      border: "30 8% 90%", input: "30 8% 90%", ring: "30 8% 18%",
      surface: "0 0% 100%", surfaceLight: "40 12% 97%",
      // Notion sidebar: light grey #F7F6F3, ink text. NOT dark.
      sidebarBg: "40 12% 96%", sidebarFg: "30 8% 22%",
      sidebarPrimary: "30 8% 18%", sidebarPrimaryFg: "0 0% 100%",
      sidebarAccent: "30 6% 91%", sidebarAccentFg: "30 8% 18%",
      sidebarBorder: "30 8% 90%", sidebarRing: "212 92% 45%",
      shadowSoft: SHADOW_NOTION_SOFT, shadowElev: SHADOW_NOTION_ELEV,
      fontDisplay: F_NOTION.display, fontBody: F_NOTION.body, fontMono: F_NOTION.mono,
      radius: "0.375rem", radiusSm: "0.25rem", spaceUnit: "4px", ease: EASE_NOTION,
      bgGradient: "linear-gradient(180deg, hsl(40 14% 98%) 0%, hsl(40 12% 96%) 100%)",
    }),
    dark: tk({
      // AMOLED-deep: true black canvas for OLED punch
      bg: "0 0% 4%", fg: "0 0% 88%",
      card: "0 0% 8%", cardFg: "0 0% 90%",
      popover: "0 0% 10%", popoverFg: "0 0% 90%",
      primary: "0 0% 92%", primaryFg: "0 0% 8%",
      primaryDark: "0 0% 80%", primaryMid: "0 0% 60%",
      primaryLight: "0 0% 20%", primaryPale: "0 0% 12%",
      secondary: "0 0% 10%", secondaryFg: "0 0% 88%",
      muted: "0 0% 12%", mutedFg: "0 0% 55%",
      accent: "212 90% 62%", accentFg: "0 0% 8%",
      destructive: "5 75% 56%", destructiveFg: "0 0% 100%",
      border: "0 0% 16%", input: "0 0% 18%", ring: "0 0% 92%",
      surface: "0 0% 8%", surfaceLight: "0 0% 12%",
      sidebarBg: "0 0% 3%", sidebarFg: "0 0% 86%",
      sidebarPrimary: "0 0% 92%", sidebarPrimaryFg: "0 0% 8%",
      sidebarAccent: "0 0% 8%", sidebarAccentFg: "0 0% 92%",
      sidebarBorder: "0 0% 16%", sidebarRing: "212 90% 62%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_NOTION.display, fontBody: F_NOTION.body, fontMono: F_NOTION.mono,
      radius: "0.375rem", radiusSm: "0.25rem", spaceUnit: "4px", ease: EASE_NOTION,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(212 90% 62% / 0.05) 0%, transparent 55%), hsl(0 0% 4%)",
    }),
  },

  // ── 2. Dark Luxe ────────────────────────────────────────────────────
  // Near-black + warm cream + gold + Instrument Serif/Geist.
  {
    id: "dark-luxe",
    name: "Dark Luxe",
    description: "Near-black + warm cream + gold. Editorial premium.",
    premium: true,
    sidebar: "app-classic",
    avatar: "gold-ring",
    light: tk({
      bg: "38 30% 96%", fg: "30 14% 10%",
      card: "0 0% 100%", cardFg: "30 14% 10%",
      popover: "0 0% 100%", popoverFg: "30 14% 10%",
      primary: "295 28% 28%", primaryFg: "38 50% 96%",
      primaryDark: "295 32% 18%", primaryMid: "295 26% 38%",
      primaryLight: "295 22% 60%", primaryPale: "295 20% 92%",
      secondary: "38 25% 92%", secondaryFg: "30 14% 12%",
      muted: "38 22% 90%", mutedFg: "30 10% 38%",
      accent: "38 58% 48%", accentFg: "38 50% 96%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "30 14% 10% / 0.10", input: "30 14% 10% / 0.12", ring: "38 58% 48%",
      surface: "0 0% 100%", surfaceLight: "38 25% 94%",
      sidebarBg: "30 12% 12%", sidebarFg: "38 36% 94%",
      sidebarPrimary: "38 58% 60%", sidebarPrimaryFg: "30 14% 10%",
      sidebarAccent: "30 10% 18%", sidebarAccentFg: "38 36% 95%",
      sidebarBorder: "38 25% 88% / 0.08", sidebarRing: "38 58% 60%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_INSTRUMENT_GEIST.display, fontBody: F_INSTRUMENT_GEIST.body, fontMono: F_INSTRUMENT_GEIST.mono,
      radius: "0.875rem", radiusSm: "0.5rem", spaceUnit: "6px", ease: EASE_LUXE,
      bgGradient: "linear-gradient(160deg, hsl(38 30% 96%) 0%, hsl(36 28% 93%) 100%)",
    }),
    dark: tk({
      // AMOLED-deep: near-black canvas with warm undertone
      bg: "30 8% 3%", fg: "38 36% 92%",
      card: "30 10% 7%", cardFg: "38 36% 92%",
      popover: "30 10% 8%", popoverFg: "38 36% 92%",
      primary: "295 28% 28%", primaryFg: "38 50% 95%",
      primaryDark: "295 32% 18%", primaryMid: "295 26% 38%",
      primaryLight: "295 22% 60%", primaryPale: "295 20% 15%",
      secondary: "30 8% 9%", secondaryFg: "38 36% 92%",
      muted: "30 8% 11%", mutedFg: "36 14% 58%",
      accent: "38 58% 60%", accentFg: "30 10% 6%",
      destructive: "0 60% 55%", destructiveFg: "0 0% 100%",
      border: "38 25% 88% / 0.08", input: "38 25% 88% / 0.10", ring: "38 58% 60%",
      surface: "30 10% 7%", surfaceLight: "30 10% 10%",
      sidebarBg: "30 12% 2%", sidebarFg: "38 36% 92%",
      sidebarPrimary: "38 58% 60%", sidebarPrimaryFg: "30 10% 6%",
      sidebarAccent: "30 10% 8%", sidebarAccentFg: "38 36% 95%",
      sidebarBorder: "38 25% 88% / 0.06", sidebarRing: "38 58% 60%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_INSTRUMENT_GEIST.display, fontBody: F_INSTRUMENT_GEIST.body, fontMono: F_INSTRUMENT_GEIST.mono,
      radius: "0.875rem", radiusSm: "0.5rem", spaceUnit: "6px", ease: EASE_LUXE,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(38 58% 60% / 0.07) 0%, transparent 55%), hsl(30 8% 3%)",
    }),
  },

  // ── 3. Editorial Paper ──────────────────────────────────────────────
  // Library-quiet. Paper-cream + ink-black + deep aubergine + Fraunces.
  // Uses Notion-exact sidebar (light, sectioned) for a "book index" feel.
  {
    id: "editorial-paper",
    name: "Editorial Paper",
    description: "Paper-cream + Fraunces serif. Library-quiet, scholarly.",
    premium: false,
    sidebar: "notion-exact",
    avatar: "serif-monogram",
    light: tk({
      bg: "36 30% 97%", fg: "0 0% 8%",
      card: "0 0% 100%", cardFg: "0 0% 8%",
      popover: "0 0% 100%", popoverFg: "0 0% 8%",
      primary: "291 45% 22%", primaryFg: "36 30% 97%",
      primaryDark: "291 55% 14%", primaryMid: "291 35% 35%",
      primaryLight: "291 25% 80%", primaryPale: "291 20% 94%",
      secondary: "36 22% 92%", secondaryFg: "0 0% 8%",
      muted: "36 18% 90%", mutedFg: "0 0% 36%",
      accent: "12 35% 42%", accentFg: "36 30% 97%",
      destructive: "0 60% 45%", destructiveFg: "0 0% 100%",
      border: "0 0% 8% / 0.10", input: "0 0% 8% / 0.12", ring: "291 45% 22%",
      surface: "0 0% 100%", surfaceLight: "36 22% 94%",
      sidebarBg: "36 24% 95%", sidebarFg: "0 0% 14%",
      sidebarPrimary: "291 45% 22%", sidebarPrimaryFg: "36 30% 97%",
      sidebarAccent: "36 18% 90%", sidebarAccentFg: "0 0% 8%",
      sidebarBorder: "0 0% 8% / 0.08", sidebarRing: "291 45% 22%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_FRAUNCES_INTER.display, fontBody: F_FRAUNCES_INTER.body, fontMono: F_FRAUNCES_INTER.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_PAPER,
      bgGradient: "linear-gradient(180deg, hsl(36 30% 97%) 0%, hsl(36 26% 95%) 100%)",
    }),
    dark: tk({
      // AMOLED-deep: true black with paper undertone for reading comfort
      bg: "0 0% 5%", fg: "36 22% 92%",
      card: "0 0% 9%", cardFg: "36 22% 92%",
      popover: "0 0% 10%", popoverFg: "36 22% 92%",
      primary: "291 35% 60%", primaryFg: "0 0% 6%",
      primaryDark: "291 45% 38%", primaryMid: "291 30% 48%",
      primaryLight: "291 30% 75%", primaryPale: "291 20% 14%",
      secondary: "0 0% 12%", secondaryFg: "36 22% 92%",
      muted: "0 0% 14%", mutedFg: "36 12% 58%",
      accent: "12 50% 60%", accentFg: "0 0% 6%",
      destructive: "0 60% 55%", destructiveFg: "0 0% 100%",
      border: "36 22% 92% / 0.08", input: "36 22% 92% / 0.10", ring: "291 35% 60%",
      surface: "0 0% 9%", surfaceLight: "0 0% 12%",
      sidebarBg: "0 0% 4%", sidebarFg: "36 22% 92%",
      sidebarPrimary: "291 35% 60%", sidebarPrimaryFg: "0 0% 6%",
      sidebarAccent: "0 0% 10%", sidebarAccentFg: "36 22% 95%",
      sidebarBorder: "36 22% 92% / 0.06", sidebarRing: "291 35% 60%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_INTER.display, fontBody: F_FRAUNCES_INTER.body, fontMono: F_FRAUNCES_INTER.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_PAPER,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(291 35% 60% / 0.05) 0%, transparent 55%), hsl(0 0% 5%)",
    }),
  },

  // ── 4. Nordic Slate ─────────────────────────────────────────────────
  // Cool slate + soft white + muted blue + Inter Tight. iOS-spring motion.
  {
    id: "nordic-slate",
    name: "Nordic Slate",
    description: "Cool slate + muted blue. Calm Scandi modernism.",
    premium: false,
    sidebar: "app-classic",
    avatar: "initials-circle",
    light: tk({
      bg: "210 25% 98%", fg: "215 25% 12%",
      card: "0 0% 100%", cardFg: "215 25% 12%",
      popover: "0 0% 100%", popoverFg: "215 25% 12%",
      primary: "212 38% 38%", primaryFg: "210 25% 98%",
      primaryDark: "212 50% 22%", primaryMid: "212 35% 50%",
      primaryLight: "212 30% 82%", primaryPale: "212 25% 94%",
      secondary: "210 20% 94%", secondaryFg: "215 25% 12%",
      muted: "210 18% 92%", mutedFg: "215 14% 40%",
      accent: "200 50% 45%", accentFg: "210 25% 98%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "215 20% 88%", input: "215 20% 88%", ring: "212 38% 38%",
      surface: "0 0% 100%", surfaceLight: "210 20% 94%",
      sidebarBg: "215 30% 14%", sidebarFg: "210 22% 95%",
      sidebarPrimary: "200 50% 55%", sidebarPrimaryFg: "215 30% 14%",
      sidebarAccent: "215 25% 22%", sidebarAccentFg: "210 22% 95%",
      sidebarBorder: "210 22% 95% / 0.08", sidebarRing: "200 50% 55%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_NORDIC,
      bgGradient: "linear-gradient(180deg, hsl(210 25% 98%) 0%, hsl(210 22% 96%) 100%)",
    }),
    dark: tk({
      // AMOLED-deep: cool slate canvas — like frosted nordic glass over void
      bg: "215 28% 5%", fg: "210 22% 94%",
      card: "215 25% 9%", cardFg: "210 22% 94%",
      popover: "215 25% 10%", popoverFg: "210 22% 94%",
      primary: "200 60% 58%", primaryFg: "215 28% 5%",
      primaryDark: "200 65% 38%", primaryMid: "200 50% 48%",
      primaryLight: "200 55% 75%", primaryPale: "212 30% 14%",
      secondary: "215 22% 11%", secondaryFg: "210 22% 94%",
      muted: "215 20% 14%", mutedFg: "210 14% 60%",
      accent: "200 60% 58%", accentFg: "215 28% 5%",
      destructive: "0 60% 58%", destructiveFg: "0 0% 100%",
      border: "210 22% 94% / 0.08", input: "210 22% 94% / 0.10", ring: "200 60% 58%",
      surface: "215 25% 9%", surfaceLight: "215 22% 12%",
      sidebarBg: "215 32% 4%", sidebarFg: "210 22% 94%",
      sidebarPrimary: "200 60% 58%", sidebarPrimaryFg: "215 28% 5%",
      sidebarAccent: "215 25% 10%", sidebarAccentFg: "210 22% 95%",
      sidebarBorder: "210 22% 94% / 0.06", sidebarRing: "200 60% 58%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_NORDIC,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(200 60% 58% / 0.06) 0%, transparent 55%), hsl(215 28% 5%)",
    }),
  },

  // ── 5. Graphite Mono ────────────────────────────────────────────────
  // Charcoal canvas + soft white ink + warm rust accent + Inter/JetBrains.
  // Architectural, minimal — feels like a pro CAD/code tool. Square-ish radii.
  {
    id: "graphite-mono",
    name: "Graphite Mono",
    description: "Charcoal + warm rust accent. Architectural, professional.",
    premium: false,
    sidebar: "app-classic",
    avatar: "mono-square",
    light: tk({
      bg: "20 6% 95%", fg: "20 8% 14%",
      card: "0 0% 100%", cardFg: "20 8% 14%",
      popover: "0 0% 100%", popoverFg: "20 8% 14%",
      primary: "20 8% 18%", primaryFg: "20 6% 96%",
      primaryDark: "20 10% 10%", primaryMid: "20 6% 36%",
      primaryLight: "20 6% 82%", primaryPale: "20 6% 94%",
      secondary: "20 6% 92%", secondaryFg: "20 8% 14%",
      muted: "20 5% 90%", mutedFg: "20 4% 42%",
      accent: "18 65% 48%", accentFg: "0 0% 100%",
      destructive: "0 70% 48%", destructiveFg: "0 0% 100%",
      border: "20 6% 86%", input: "20 6% 86%", ring: "18 65% 48%",
      surface: "0 0% 100%", surfaceLight: "20 6% 93%",
      sidebarBg: "20 8% 14%", sidebarFg: "20 6% 92%",
      sidebarPrimary: "18 65% 56%", sidebarPrimaryFg: "20 8% 14%",
      sidebarAccent: "20 6% 22%", sidebarAccentFg: "20 6% 96%",
      sidebarBorder: "20 6% 92% / 0.08", sidebarRing: "18 65% 56%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_GRAPHITE.display, fontBody: F_GRAPHITE.body, fontMono: F_GRAPHITE.mono,
      radius: "0.25rem", radiusSm: "0.125rem", spaceUnit: "4px", ease: EASE_GRAPHITE,
      bgGradient: "linear-gradient(180deg, hsl(20 6% 95%) 0%, hsl(20 6% 93%) 100%)",
    }),
    dark: tk({
      // AMOLED-deep: near-void charcoal with warm ember undertone
      bg: "20 6% 5%", fg: "20 6% 92%",
      card: "20 6% 9%", cardFg: "20 6% 92%",
      popover: "20 6% 10%", popoverFg: "20 6% 92%",
      primary: "20 6% 92%", primaryFg: "20 8% 8%",
      primaryDark: "20 6% 80%", primaryMid: "20 6% 60%",
      primaryLight: "20 6% 20%", primaryPale: "20 6% 12%",
      secondary: "20 6% 11%", secondaryFg: "20 6% 92%",
      muted: "20 5% 13%", mutedFg: "20 4% 58%",
      accent: "18 75% 58%", accentFg: "20 8% 6%",
      destructive: "0 70% 56%", destructiveFg: "0 0% 100%",
      border: "20 6% 92% / 0.08", input: "20 6% 92% / 0.10", ring: "18 75% 58%",
      surface: "20 6% 9%", surfaceLight: "20 6% 12%",
      sidebarBg: "20 8% 4%", sidebarFg: "20 6% 92%",
      sidebarPrimary: "18 75% 58%", sidebarPrimaryFg: "20 8% 6%",
      sidebarAccent: "20 6% 10%", sidebarAccentFg: "20 6% 95%",
      sidebarBorder: "20 6% 92% / 0.06", sidebarRing: "18 75% 58%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_GRAPHITE.display, fontBody: F_GRAPHITE.body, fontMono: F_GRAPHITE.mono,
      radius: "0.25rem", radiusSm: "0.125rem", spaceUnit: "4px", ease: EASE_GRAPHITE,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(18 75% 58% / 0.05) 0%, transparent 55%), hsl(20 6% 5%)",
    }),
  },
];

// Default = Classic (Notion B&W) light. Replaces the previous dark-luxe default.
export const DEFAULT_PS_THEME_ID: PsThemeId = "classic";
export const DEFAULT_PS_MODE: PsMode = "light";

export function getPsTheme(id: string): PsTheme {
  return PS_THEMES.find((t) => t.id === id) ?? PS_THEMES[0]; // classic fallback
}

/** Apply a theme + mode by writing CSS variables to .ps-app and documentElement. */
export function applyPsTheme(themeId: PsThemeId, mode: PsMode) {
  const theme = getPsTheme(themeId);
  const vars = mode === "dark" ? theme.dark : theme.light;
  const targets: HTMLElement[] = [];
  const root = document.querySelector(".ps-app") as HTMLElement | null;
  if (root) targets.push(root);
  // Mirror to <html> so portaled UI (popovers, dialogs) outside .ps-app
  // can still pick up the tokens.
  targets.push(document.documentElement);

  for (const el of targets) {
    for (const [k, v] of Object.entries(vars)) {
      el.style.setProperty(k, v);
    }
    el.dataset.psTheme = themeId;
    el.dataset.psMode = mode;
    el.dataset.psSidebar = theme.sidebar;
    el.dataset.psAvatar = theme.avatar;
    // Premium flag drives the grain overlay + gold button gradient via CSS.
    if (theme.premium && mode === "dark") {
      el.dataset.psPremium = "1";
    } else {
      delete el.dataset.psPremium;
    }
  }
}
