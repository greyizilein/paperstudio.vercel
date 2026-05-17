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
  | "dark-academia"    // Aged parchment + burgundy + forest green (DEFAULT)
  | "ink-paper"        // Warm parchment + gold + teal — like a beautiful book
  | "nordic-frost"     // Ice blue + violet — crisp and intelligent
  | "ember"            // Terracotta + deep teal — warm and human
  | "void";            // Pure black + electric mint + violet — futuristic

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

const F_FRAUNCES_GEIST = {
  display: '"Fraunces", "Instrument Serif", Georgia, serif',
  body:    '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono:    '"DM Mono", "JetBrains Mono", ui-monospace, monospace',
};
const F_GEIST = {
  display: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  body:    '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono:    '"DM Mono", ui-monospace, monospace',
};
const EASE_ACADEMIA = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_FROST    = "cubic-bezier(0.32, 0.72, 0, 1)";
const EASE_VOID     = "cubic-bezier(0.4, 0, 0.2, 1)";

export const PS_THEMES: PsTheme[] = [
  // ── 1. Dark Academia — DEFAULT ──────────────────────────────────────
  {
    id: "dark-academia",
    name: "Dark Academia",
    description: "Aged parchment + burgundy + forest green. Oxford at midnight.",
    premium: false,
    sidebar: "app-classic",
    avatar: "serif-monogram",
    light: tk({
      bg: "36 22% 97%", fg: "28 12% 12%",
      card: "0 0% 100%", cardFg: "28 12% 12%",
      popover: "0 0% 100%", popoverFg: "28 12% 12%",
      primary: "350 54% 36%", primaryFg: "36 22% 97%",
      primaryDark: "350 60% 24%", primaryMid: "350 45% 48%",
      primaryLight: "350 35% 72%", primaryPale: "350 25% 93%",
      secondary: "36 18% 92%", secondaryFg: "28 12% 14%",
      muted: "36 14% 90%", mutedFg: "28 8% 40%",
      accent: "130 34% 34%", accentFg: "36 22% 97%",
      destructive: "0 65% 48%", destructiveFg: "0 0% 100%",
      border: "28 12% 12% / 0.09", input: "28 12% 12% / 0.11", ring: "350 54% 36%",
      surface: "0 0% 100%", surfaceLight: "36 18% 94%",
      sidebarBg: "28 14% 13%", sidebarFg: "36 20% 92%",
      sidebarPrimary: "350 45% 55%", sidebarPrimaryFg: "28 14% 13%",
      sidebarAccent: "28 10% 20%", sidebarAccentFg: "36 20% 95%",
      sidebarBorder: "36 20% 92% / 0.07", sidebarRing: "350 45% 55%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "linear-gradient(180deg, hsl(36 22% 97%) 0%, hsl(36 18% 94%) 100%)",
    }),
    dark: tk({
      bg: "28 12% 5%", fg: "36 20% 88%",
      card: "28 10% 9%", cardFg: "36 20% 88%",
      popover: "28 10% 10%", popoverFg: "36 20% 88%",
      primary: "350 48% 52%", primaryFg: "28 12% 5%",
      primaryDark: "350 55% 34%", primaryMid: "350 42% 44%",
      primaryLight: "350 38% 68%", primaryPale: "350 25% 15%",
      secondary: "28 8% 11%", secondaryFg: "36 20% 88%",
      muted: "28 8% 14%", mutedFg: "36 10% 56%",
      accent: "130 40% 48%", accentFg: "28 12% 5%",
      destructive: "0 60% 54%", destructiveFg: "0 0% 100%",
      border: "36 20% 88% / 0.08", input: "36 20% 88% / 0.10", ring: "350 48% 52%",
      surface: "28 10% 9%", surfaceLight: "28 8% 13%",
      sidebarBg: "28 14% 3%", sidebarFg: "36 20% 88%",
      sidebarPrimary: "350 48% 52%", sidebarPrimaryFg: "28 12% 5%",
      sidebarAccent: "28 10% 10%", sidebarAccentFg: "36 20% 92%",
      sidebarBorder: "36 20% 88% / 0.06", sidebarRing: "350 48% 52%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(350 48% 52% / 0.07) 0%, transparent 55%), hsl(28 12% 5%)",
    }),
  },

  // ── 2. Ink & Paper ──────────────────────────────────────────────────
  {
    id: "ink-paper",
    name: "Ink & Paper",
    description: "Warm parchment + gold + teal. Like a beautifully typeset book.",
    premium: false,
    sidebar: "notion-exact",
    avatar: "gold-ring",
    light: tk({
      bg: "38 28% 97%", fg: "28 16% 12%",
      card: "0 0% 100%", cardFg: "28 16% 12%",
      popover: "0 0% 100%", popoverFg: "28 16% 12%",
      primary: "28 16% 12%", primaryFg: "38 28% 97%",
      primaryDark: "28 20% 6%", primaryMid: "28 12% 32%",
      primaryLight: "28 10% 72%", primaryPale: "38 22% 94%",
      secondary: "38 22% 92%", secondaryFg: "28 16% 14%",
      muted: "38 18% 90%", mutedFg: "28 8% 42%",
      accent: "42 58% 46%", accentFg: "28 16% 12%",
      destructive: "0 65% 48%", destructiveFg: "0 0% 100%",
      border: "28 16% 12% / 0.09", input: "28 16% 12% / 0.11", ring: "42 58% 46%",
      surface: "0 0% 100%", surfaceLight: "38 22% 94%",
      sidebarBg: "38 22% 94%", sidebarFg: "28 16% 16%",
      sidebarPrimary: "28 16% 12%", sidebarPrimaryFg: "38 28% 97%",
      sidebarAccent: "38 18% 90%", sidebarAccentFg: "28 16% 12%",
      sidebarBorder: "28 16% 12% / 0.08", sidebarRing: "42 58% 46%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "linear-gradient(180deg, hsl(38 28% 97%) 0%, hsl(38 22% 94%) 100%)",
    }),
    dark: tk({
      bg: "28 8% 4%", fg: "38 22% 88%",
      card: "28 8% 8%", cardFg: "38 22% 88%",
      popover: "28 8% 9%", popoverFg: "38 22% 88%",
      primary: "42 58% 54%", primaryFg: "28 8% 4%",
      primaryDark: "42 62% 36%", primaryMid: "42 52% 46%",
      primaryLight: "42 50% 70%", primaryPale: "42 30% 14%",
      secondary: "28 6% 10%", secondaryFg: "38 22% 88%",
      muted: "28 6% 13%", mutedFg: "38 12% 56%",
      accent: "178 36% 42%", accentFg: "28 8% 4%",
      destructive: "0 60% 54%", destructiveFg: "0 0% 100%",
      border: "38 22% 88% / 0.08", input: "38 22% 88% / 0.10", ring: "42 58% 54%",
      surface: "28 8% 8%", surfaceLight: "28 6% 12%",
      sidebarBg: "28 10% 2%", sidebarFg: "38 22% 88%",
      sidebarPrimary: "42 58% 54%", sidebarPrimaryFg: "28 8% 4%",
      sidebarAccent: "28 8% 9%", sidebarAccentFg: "38 22% 92%",
      sidebarBorder: "38 22% 88% / 0.06", sidebarRing: "42 58% 54%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(42 58% 54% / 0.07) 0%, transparent 55%), hsl(28 8% 4%)",
    }),
  },

  // ── 3. Nordic Frost ─────────────────────────────────────────────────
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    description: "Ice blue + violet. Crisp, intelligent, modern.",
    premium: false,
    sidebar: "app-classic",
    avatar: "initials-circle",
    light: tk({
      bg: "210 28% 98%", fg: "215 30% 10%",
      card: "0 0% 100%", cardFg: "215 30% 10%",
      popover: "0 0% 100%", popoverFg: "215 30% 10%",
      primary: "217 80% 48%", primaryFg: "0 0% 100%",
      primaryDark: "217 88% 30%", primaryMid: "217 70% 58%",
      primaryLight: "217 60% 82%", primaryPale: "217 45% 94%",
      secondary: "210 22% 94%", secondaryFg: "215 30% 10%",
      muted: "210 18% 92%", mutedFg: "215 16% 40%",
      accent: "263 55% 50%", accentFg: "0 0% 100%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "215 25% 88%", input: "215 25% 88%", ring: "217 80% 48%",
      surface: "0 0% 100%", surfaceLight: "210 22% 94%",
      sidebarBg: "215 35% 12%", sidebarFg: "210 25% 94%",
      sidebarPrimary: "217 70% 60%", sidebarPrimaryFg: "215 35% 12%",
      sidebarAccent: "215 28% 20%", sidebarAccentFg: "210 25% 95%",
      sidebarBorder: "210 25% 94% / 0.07", sidebarRing: "217 70% 60%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_FROST,
      bgGradient: "linear-gradient(180deg, hsl(210 28% 98%) 0%, hsl(210 24% 96%) 100%)",
    }),
    dark: tk({
      bg: "215 32% 5%", fg: "210 25% 93%",
      card: "215 28% 9%", cardFg: "210 25% 93%",
      popover: "215 28% 10%", popoverFg: "210 25% 93%",
      primary: "217 80% 60%", primaryFg: "215 32% 5%",
      primaryDark: "217 88% 40%", primaryMid: "217 70% 50%",
      primaryLight: "217 60% 76%", primaryPale: "217 35% 14%",
      secondary: "215 24% 11%", secondaryFg: "210 25% 93%",
      muted: "215 22% 14%", mutedFg: "210 16% 60%",
      accent: "263 55% 64%", accentFg: "215 32% 5%",
      destructive: "0 60% 56%", destructiveFg: "0 0% 100%",
      border: "210 25% 93% / 0.08", input: "210 25% 93% / 0.10", ring: "217 80% 60%",
      surface: "215 28% 9%", surfaceLight: "215 24% 13%",
      sidebarBg: "215 35% 3%", sidebarFg: "210 25% 93%",
      sidebarPrimary: "217 80% 60%", sidebarPrimaryFg: "215 32% 5%",
      sidebarAccent: "215 28% 10%", sidebarAccentFg: "210 25% 95%",
      sidebarBorder: "210 25% 93% / 0.06", sidebarRing: "217 80% 60%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_FROST,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(217 80% 60% / 0.07) 0%, transparent 55%), hsl(215 32% 5%)",
    }),
  },

  // ── 4. Ember ────────────────────────────────────────────────────────
  {
    id: "ember",
    name: "Ember",
    description: "Terracotta + deep teal. Warm, human, grounded.",
    premium: false,
    sidebar: "app-classic",
    avatar: "initials-circle",
    light: tk({
      bg: "28 18% 97%", fg: "22 14% 12%",
      card: "0 0% 100%", cardFg: "22 14% 12%",
      popover: "0 0% 100%", popoverFg: "22 14% 12%",
      primary: "18 68% 48%", primaryFg: "0 0% 100%",
      primaryDark: "18 75% 30%", primaryMid: "18 60% 56%",
      primaryLight: "18 50% 76%", primaryPale: "18 35% 94%",
      secondary: "28 14% 92%", secondaryFg: "22 14% 14%",
      muted: "28 12% 90%", mutedFg: "22 8% 42%",
      accent: "170 42% 38%", accentFg: "0 0% 100%",
      destructive: "0 65% 48%", destructiveFg: "0 0% 100%",
      border: "22 14% 12% / 0.09", input: "22 14% 12% / 0.11", ring: "18 68% 48%",
      surface: "0 0% 100%", surfaceLight: "28 14% 93%",
      sidebarBg: "22 14% 13%", sidebarFg: "28 16% 92%",
      sidebarPrimary: "18 60% 56%", sidebarPrimaryFg: "22 14% 13%",
      sidebarAccent: "22 10% 20%", sidebarAccentFg: "28 16% 95%",
      sidebarBorder: "28 16% 92% / 0.07", sidebarRing: "18 60% 56%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "linear-gradient(180deg, hsl(28 18% 97%) 0%, hsl(28 14% 94%) 100%)",
    }),
    dark: tk({
      bg: "22 10% 5%", fg: "28 16% 88%",
      card: "22 8% 9%", cardFg: "28 16% 88%",
      popover: "22 8% 10%", popoverFg: "28 16% 88%",
      primary: "18 72% 55%", primaryFg: "22 10% 5%",
      primaryDark: "18 78% 36%", primaryMid: "18 64% 46%",
      primaryLight: "18 55% 70%", primaryPale: "18 30% 14%",
      secondary: "22 6% 11%", secondaryFg: "28 16% 88%",
      muted: "22 6% 14%", mutedFg: "28 8% 56%",
      accent: "170 48% 46%", accentFg: "22 10% 5%",
      destructive: "0 60% 54%", destructiveFg: "0 0% 100%",
      border: "28 16% 88% / 0.08", input: "28 16% 88% / 0.10", ring: "18 72% 55%",
      surface: "22 8% 9%", surfaceLight: "22 6% 13%",
      sidebarBg: "22 12% 3%", sidebarFg: "28 16% 88%",
      sidebarPrimary: "18 72% 55%", sidebarPrimaryFg: "22 10% 5%",
      sidebarAccent: "22 8% 10%", sidebarAccentFg: "28 16% 92%",
      sidebarBorder: "28 16% 88% / 0.06", sidebarRing: "18 72% 55%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(18 72% 55% / 0.07) 0%, transparent 55%), hsl(22 10% 5%)",
    }),
  },

  // ── 5. Void ─────────────────────────────────────────────────────────
  {
    id: "void",
    name: "Void",
    description: "Pure black + electric mint + violet. Minimal, sharp, futuristic.",
    premium: false,
    sidebar: "app-classic",
    avatar: "mono-square",
    light: tk({
      bg: "0 0% 99%", fg: "240 6% 10%",
      card: "0 0% 100%", cardFg: "240 6% 10%",
      popover: "0 0% 100%", popoverFg: "240 6% 10%",
      primary: "240 6% 10%", primaryFg: "0 0% 100%",
      primaryDark: "240 8% 4%", primaryMid: "240 5% 30%",
      primaryLight: "240 4% 75%", primaryPale: "240 4% 96%",
      secondary: "240 4% 94%", secondaryFg: "240 6% 10%",
      muted: "240 4% 92%", mutedFg: "240 4% 44%",
      accent: "159 68% 42%", accentFg: "240 6% 10%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "240 4% 88%", input: "240 4% 88%", ring: "159 68% 42%",
      surface: "0 0% 100%", surfaceLight: "240 4% 95%",
      sidebarBg: "240 6% 8%", sidebarFg: "240 4% 94%",
      sidebarPrimary: "159 68% 44%", sidebarPrimaryFg: "240 6% 8%",
      sidebarAccent: "240 5% 14%", sidebarAccentFg: "240 4% 96%",
      sidebarBorder: "240 4% 94% / 0.07", sidebarRing: "159 68% 44%",
      shadowSoft: SHADOW_NOTION_SOFT, shadowElev: SHADOW_NOTION_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.375rem", radiusSm: "0.125rem", spaceUnit: "4px", ease: EASE_VOID,
      bgGradient: "linear-gradient(180deg, hsl(0 0% 99%) 0%, hsl(240 4% 96%) 100%)",
    }),
    dark: tk({
      bg: "240 6% 3%", fg: "240 4% 94%",
      card: "240 5% 7%", cardFg: "240 4% 94%",
      popover: "240 5% 8%", popoverFg: "240 4% 94%",
      primary: "159 68% 44%", primaryFg: "240 6% 3%",
      primaryDark: "159 72% 28%", primaryMid: "159 60% 36%",
      primaryLight: "159 55% 62%", primaryPale: "159 40% 12%",
      secondary: "240 4% 10%", secondaryFg: "240 4% 94%",
      muted: "240 4% 13%", mutedFg: "240 4% 58%",
      accent: "270 55% 62%", accentFg: "240 6% 3%",
      destructive: "0 60% 56%", destructiveFg: "0 0% 100%",
      border: "240 4% 94% / 0.08", input: "240 4% 94% / 0.10", ring: "159 68% 44%",
      surface: "240 5% 7%", surfaceLight: "240 4% 11%",
      sidebarBg: "240 8% 2%", sidebarFg: "240 4% 94%",
      sidebarPrimary: "159 68% 44%", sidebarPrimaryFg: "240 6% 3%",
      sidebarAccent: "240 5% 8%", sidebarAccentFg: "240 4% 96%",
      sidebarBorder: "240 4% 94% / 0.06", sidebarRing: "159 68% 44%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.375rem", radiusSm: "0.125rem", spaceUnit: "4px", ease: EASE_VOID,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(159 68% 44% / 0.07) 0%, transparent 55%), hsl(240 6% 3%)",
    }),
  },
];

// Default = Dark Academia (dark mode).
export const DEFAULT_PS_THEME_ID: PsThemeId = "dark-academia";
export const DEFAULT_PS_MODE: PsMode = "dark";

export function getPsTheme(id: string): PsTheme {
  return PS_THEMES.find((t) => t.id === id) ?? PS_THEMES[0]; // dark-academia fallback
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
