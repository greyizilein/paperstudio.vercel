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
    description: "Decisive black & white. Crisp serif contrasts. The work speaks for itself.",
    premium: false,
    sidebar: "app-classic",
    avatar: "serif-monogram",
    light: tk({
      bg: "0 0% 100%", fg: "0 0% 4%",
      card: "0 0% 100%", cardFg: "0 0% 4%",
      popover: "0 0% 100%", popoverFg: "0 0% 4%",
      primary: "350 56% 38%", primaryFg: "0 0% 100%",
      primaryDark: "350 65% 24%", primaryMid: "350 46% 50%",
      primaryLight: "350 36% 72%", primaryPale: "350 22% 94%",
      secondary: "0 0% 95%", secondaryFg: "0 0% 4%",
      muted: "0 0% 92%", mutedFg: "0 0% 42%",
      accent: "130 38% 32%", accentFg: "0 0% 100%",
      destructive: "0 68% 48%", destructiveFg: "0 0% 100%",
      border: "0 0% 4% / 0.1", input: "0 0% 4% / 0.12", ring: "350 56% 38%",
      surface: "0 0% 100%", surfaceLight: "0 0% 96%",
      sidebarBg: "0 0% 8%", sidebarFg: "0 0% 95%",
      sidebarPrimary: "350 46% 55%", sidebarPrimaryFg: "0 0% 8%",
      sidebarAccent: "0 0% 14%", sidebarAccentFg: "0 0% 97%",
      sidebarBorder: "0 0% 95% / 0.07", sidebarRing: "350 46% 55%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.25rem", radiusSm: "0.125rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
    }),
    dark: tk({
      bg: "0 0% 3%", fg: "0 0% 94%",
      card: "350 6% 7%", cardFg: "0 0% 94%",
      popover: "350 5% 8%", popoverFg: "0 0% 94%",
      primary: "350 50% 54%", primaryFg: "0 0% 3%",
      primaryDark: "350 58% 34%", primaryMid: "350 44% 46%",
      primaryLight: "350 40% 68%", primaryPale: "350 22% 14%",
      secondary: "350 4% 9%", secondaryFg: "0 0% 94%",
      muted: "350 4% 12%", mutedFg: "0 0% 56%",
      accent: "130 42% 50%", accentFg: "0 0% 3%",
      destructive: "0 62% 54%", destructiveFg: "0 0% 100%",
      border: "0 0% 94% / 0.08", input: "0 0% 94% / 0.10", ring: "350 50% 54%",
      surface: "350 6% 7%", surfaceLight: "350 5% 11%",
      sidebarBg: "350 10% 4%", sidebarFg: "0 0% 93%",
      sidebarPrimary: "350 50% 54%", sidebarPrimaryFg: "0 0% 3%",
      sidebarAccent: "350 18% 12%", sidebarAccentFg: "0 0% 96%",
      sidebarBorder: "0 0% 94% / 0.06", sidebarRing: "350 50% 54%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.25rem", radiusSm: "0.125rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(350 50% 54% / 0.12) 0%, transparent 55%), hsl(0 0% 3%)",
    }),
  },

  // ── 2. Ink & Paper ──────────────────────────────────────────────────
  {
    id: "ink-paper",
    name: "Ink & Paper",
    description: "Warm parchment & gold. Human warmth, ink on cream, rich community.",
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
      bg: "32 12% 4%", fg: "38 22% 88%",
      card: "32 10% 8%", cardFg: "38 22% 88%",
      popover: "32 10% 9%", popoverFg: "38 22% 88%",
      primary: "42 58% 54%", primaryFg: "32 12% 4%",
      primaryDark: "42 62% 36%", primaryMid: "42 52% 46%",
      primaryLight: "42 50% 70%", primaryPale: "42 30% 14%",
      secondary: "32 8% 10%", secondaryFg: "38 22% 88%",
      muted: "32 8% 13%", mutedFg: "38 12% 56%",
      accent: "178 36% 42%", accentFg: "32 12% 4%",
      destructive: "0 60% 54%", destructiveFg: "0 0% 100%",
      border: "38 22% 88% / 0.08", input: "38 22% 88% / 0.10", ring: "42 58% 54%",
      surface: "32 10% 8%", surfaceLight: "32 8% 12%",
      sidebarBg: "34 16% 4%", sidebarFg: "38 22% 88%",
      sidebarPrimary: "42 58% 54%", sidebarPrimaryFg: "32 12% 4%",
      sidebarAccent: "34 14% 12%", sidebarAccentFg: "38 22% 92%",
      sidebarBorder: "38 22% 88% / 0.06", sidebarRing: "42 58% 54%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_FRAUNCES_GEIST.display, fontBody: F_FRAUNCES_GEIST.body, fontMono: F_FRAUNCES_GEIST.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(42 58% 54% / 0.10) 0%, transparent 55%), hsl(32 12% 4%)",
    }),
  },

  // ── 3. Nordic Frost ─────────────────────────────────────────────────
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    description: "Sharp violet on crisp white. The precision of a Cleanerz brand.",
    premium: false,
    sidebar: "app-classic",
    avatar: "initials-circle",
    light: tk({
      bg: "250 30% 99%", fg: "252 25% 8%",
      card: "0 0% 100%", cardFg: "252 25% 8%",
      popover: "0 0% 100%", popoverFg: "252 25% 8%",
      primary: "263 72% 52%", primaryFg: "0 0% 100%",
      primaryDark: "263 80% 34%", primaryMid: "263 62% 62%",
      primaryLight: "263 52% 78%", primaryPale: "263 40% 95%",
      secondary: "250 20% 95%", secondaryFg: "252 25% 8%",
      muted: "250 16% 93%", mutedFg: "252 12% 42%",
      accent: "200 60% 46%", accentFg: "0 0% 100%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "252 20% 88%", input: "252 20% 88%", ring: "263 72% 52%",
      surface: "0 0% 100%", surfaceLight: "250 20% 95%",
      sidebarBg: "252 30% 8%", sidebarFg: "250 20% 95%",
      sidebarPrimary: "263 62% 62%", sidebarPrimaryFg: "252 30% 8%",
      sidebarAccent: "252 25% 15%", sidebarAccentFg: "250 20% 96%",
      sidebarBorder: "250 20% 95% / 0.07", sidebarRing: "263 62% 62%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_FROST,
      bgGradient: "linear-gradient(180deg, hsl(250 30% 99%) 0%, hsl(250 24% 97%) 100%)",
    }),
    dark: tk({
      bg: "252 28% 5%", fg: "250 18% 94%",
      card: "252 28% 10%", cardFg: "250 18% 94%",
      popover: "252 26% 11%", popoverFg: "250 18% 94%",
      primary: "263 72% 62%", primaryFg: "252 28% 5%",
      primaryDark: "263 80% 42%", primaryMid: "263 64% 52%",
      primaryLight: "263 55% 76%", primaryPale: "263 35% 14%",
      secondary: "252 24% 12%", secondaryFg: "250 18% 94%",
      muted: "252 22% 15%", mutedFg: "250 12% 60%",
      accent: "200 55% 58%", accentFg: "252 28% 5%",
      destructive: "0 60% 56%", destructiveFg: "0 0% 100%",
      border: "250 18% 94% / 0.08", input: "250 18% 94% / 0.10", ring: "263 72% 62%",
      surface: "252 28% 10%", surfaceLight: "252 24% 14%",
      sidebarBg: "252 38% 4%", sidebarFg: "250 18% 94%",
      sidebarPrimary: "263 72% 62%", sidebarPrimaryFg: "252 28% 5%",
      sidebarAccent: "252 32% 15%", sidebarAccentFg: "250 18% 96%",
      sidebarBorder: "250 18% 94% / 0.06", sidebarRing: "263 72% 62%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_GEIST.display, fontBody: F_GEIST.body, fontMono: F_GEIST.mono,
      radius: "0.625rem", radiusSm: "0.375rem", spaceUnit: "5px", ease: EASE_FROST,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(263 72% 62% / 0.14) 0%, transparent 55%), hsl(252 28% 5%)",
    }),
  },

  // ── 4. Ember ────────────────────────────────────────────────────────
  {
    id: "ember",
    name: "Ember",
    description: "Electric orange. Clean white. The energy of Rethink.",
    premium: false,
    sidebar: "app-classic",
    avatar: "initials-circle",
    light: tk({
      bg: "0 0% 100%", fg: "20 8% 8%",
      card: "0 0% 100%", cardFg: "20 8% 8%",
      popover: "0 0% 100%", popoverFg: "20 8% 8%",
      primary: "20 100% 46%", primaryFg: "0 0% 100%",
      primaryDark: "20 100% 30%", primaryMid: "20 90% 56%",
      primaryLight: "20 80% 74%", primaryPale: "20 60% 95%",
      secondary: "20 10% 95%", secondaryFg: "20 8% 8%",
      muted: "20 8% 93%", mutedFg: "20 6% 42%",
      accent: "195 60% 38%", accentFg: "0 0% 100%",
      destructive: "0 68% 48%", destructiveFg: "0 0% 100%",
      border: "20 8% 8% / 0.09", input: "20 8% 8% / 0.11", ring: "20 100% 46%",
      surface: "0 0% 100%", surfaceLight: "20 10% 96%",
      sidebarBg: "20 10% 8%", sidebarFg: "20 8% 93%",
      sidebarPrimary: "20 90% 56%", sidebarPrimaryFg: "20 10% 8%",
      sidebarAccent: "20 8% 14%", sidebarAccentFg: "20 8% 95%",
      sidebarBorder: "20 8% 93% / 0.07", sidebarRing: "20 90% 56%",
      shadowSoft: SHADOW_LIGHT_SOFT, shadowElev: SHADOW_LIGHT_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(20 10% 96%) 100%)",
    }),
    dark: tk({
      bg: "22 10% 5%", fg: "20 6% 94%",
      card: "22 12% 10%", cardFg: "20 6% 94%",
      popover: "22 12% 11%", popoverFg: "20 6% 94%",
      primary: "20 100% 58%", primaryFg: "22 10% 5%",
      primaryDark: "20 100% 38%", primaryMid: "20 90% 48%",
      primaryLight: "20 80% 70%", primaryPale: "20 40% 14%",
      secondary: "22 8% 12%", secondaryFg: "20 6% 94%",
      muted: "22 8% 15%", mutedFg: "20 5% 58%",
      accent: "195 52% 48%", accentFg: "22 10% 5%",
      destructive: "0 62% 54%", destructiveFg: "0 0% 100%",
      border: "20 6% 94% / 0.08", input: "20 6% 94% / 0.10", ring: "20 100% 58%",
      surface: "22 12% 10%", surfaceLight: "22 8% 14%",
      sidebarBg: "22 16% 4%", sidebarFg: "20 6% 94%",
      sidebarPrimary: "20 100% 58%", sidebarPrimaryFg: "22 10% 5%",
      sidebarAccent: "22 18% 14%", sidebarAccentFg: "20 6% 96%",
      sidebarBorder: "20 6% 94% / 0.06", sidebarRing: "20 100% 58%",
      shadowSoft: SHADOW_DARK_SOFT, shadowElev: SHADOW_DARK_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.5rem", radiusSm: "0.25rem", spaceUnit: "5px", ease: EASE_ACADEMIA,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(20 100% 58% / 0.14) 0%, transparent 55%), hsl(22 10% 5%)",
    }),
  },

  // ── 5. Void ─────────────────────────────────────────────────────────
  {
    id: "void",
    name: "Void",
    description: "Pure black + electric charge. No compromise. Urban. Uncompromising.",
    premium: false,
    sidebar: "app-classic",
    avatar: "mono-square",
    light: tk({
      bg: "0 0% 98%", fg: "0 0% 4%",
      card: "0 0% 100%", cardFg: "0 0% 4%",
      popover: "0 0% 100%", popoverFg: "0 0% 4%",
      primary: "0 0% 5%", primaryFg: "0 0% 100%",
      primaryDark: "0 0% 2%", primaryMid: "0 0% 28%",
      primaryLight: "0 0% 70%", primaryPale: "0 0% 96%",
      secondary: "0 0% 94%", secondaryFg: "0 0% 4%",
      muted: "0 0% 92%", mutedFg: "0 0% 44%",
      accent: "72 100% 44%", accentFg: "0 0% 4%",
      destructive: "0 65% 50%", destructiveFg: "0 0% 100%",
      border: "0 0% 88%", input: "0 0% 88%", ring: "72 100% 44%",
      surface: "0 0% 100%", surfaceLight: "0 0% 95%",
      sidebarBg: "0 0% 6%", sidebarFg: "0 0% 94%",
      sidebarPrimary: "72 100% 44%", sidebarPrimaryFg: "0 0% 4%",
      sidebarAccent: "0 0% 12%", sidebarAccentFg: "0 0% 96%",
      sidebarBorder: "0 0% 94% / 0.07", sidebarRing: "72 100% 44%",
      shadowSoft: SHADOW_NOTION_SOFT, shadowElev: SHADOW_NOTION_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.25rem", radiusSm: "0.0625rem", spaceUnit: "4px", ease: EASE_VOID,
      bgGradient: "linear-gradient(180deg, hsl(0 0% 98%) 0%, hsl(0 0% 95%) 100%)",
    }),
    dark: tk({
      bg: "0 0% 2%", fg: "0 0% 96%",
      card: "0 0% 5%", cardFg: "0 0% 96%",
      popover: "0 0% 6%", popoverFg: "0 0% 96%",
      primary: "72 100% 48%", primaryFg: "0 0% 2%",
      primaryDark: "72 100% 32%", primaryMid: "72 90% 40%",
      primaryLight: "72 80% 62%", primaryPale: "72 60% 12%",
      secondary: "0 0% 8%", secondaryFg: "0 0% 96%",
      muted: "0 0% 11%", mutedFg: "0 0% 58%",
      accent: "280 60% 62%", accentFg: "0 0% 2%",
      destructive: "0 60% 56%", destructiveFg: "0 0% 100%",
      border: "0 0% 96% / 0.08", input: "0 0% 96% / 0.10", ring: "72 100% 48%",
      surface: "0 0% 5%", surfaceLight: "0 0% 9%",
      sidebarBg: "72 8% 2%", sidebarFg: "0 0% 95%",
      sidebarPrimary: "72 100% 48%", sidebarPrimaryFg: "0 0% 2%",
      sidebarAccent: "72 14% 10%", sidebarAccentFg: "0 0% 97%",
      sidebarBorder: "0 0% 96% / 0.06", sidebarRing: "72 100% 48%",
      shadowSoft: SHADOW_NOTION_SOFT, shadowElev: SHADOW_NOTION_ELEV,
      fontDisplay: F_INTER_TIGHT.display, fontBody: F_INTER_TIGHT.body, fontMono: F_INTER_TIGHT.mono,
      radius: "0.25rem", radiusSm: "0.0625rem", spaceUnit: "4px", ease: EASE_VOID,
      bgGradient: "radial-gradient(ellipse 80% 30% at 50% 0%, hsl(72 100% 48% / 0.15) 0%, transparent 55%), hsl(0 0% 2%)",
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
