// CZAR theme system — 21 WCAG-AA contrast-checked themes.
// Each theme defines a complete CSS-variable palette applied to `.czar-root`.

export interface CzarTheme {
  id: string;
  name: string;
  category: "Dark" | "Light" | "Vivid";
  swatch: string;        // colour shown in picker
  vars: Record<string, string>;
}

// Relative luminance per WCAG. Used to auto-derive a guaranteed-contrast
// foreground colour for the assistant streaming bubble so light themes
// never end up with white text on a white background.
function luminance(hex: string): number {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return 0;
  const [r, g, b] = m.map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const t = (
  bg: string,
  bgElev: string,
  surface: string,
  surfaceHover: string,
  border: string,
  text: string,
  textDim: string,
  textFaint: string,
  accent: string,
  accentFg: string,
  danger: string,
): CzarTheme["vars"] => {
  // Force a high-contrast assistant foreground based on the bubble background
  // (--czar-surface). Light surfaces → near-black; dark surfaces → near-white.
  const surfaceLum = luminance(surface);
  const assistantFg = surfaceLum > 0.55 ? "#1a1a1a" : "#f3eef5";
  // Same for the page background (used by the streaming/typing indicators).
  const bgLum = luminance(bg);
  const safeText = bgLum > 0.55 && luminance(text) > 0.55 ? "#1a1a1a" : text;
  const safeTextDim = bgLum > 0.55 && luminance(textDim) > 0.55 ? "#4a4a4a" : textDim;

  // Auto-derive per-bubble variables so all 20 legacy themes get sensible
  // defaults without any schema changes.
  // asstBubble = surface (AI messages sit on the same card surface)
  // userBubble = surfaceHover (user bubbles are subtly distinct)
  const userBubbleLum = luminance(surfaceHover);
  const userBubbleFg = userBubbleLum > 0.55 ? "#1a1a1a" : "#f3eef5";

  return {
    "--czar-bg": bg,
    "--czar-bg-elev": bgElev,
    "--czar-surface": surface,
    "--czar-surface-hover": surfaceHover,
    "--czar-border": border,
    "--czar-text": safeText,
    "--czar-text-dim": safeTextDim,
    "--czar-text-faint": textFaint,
    "--czar-accent": accent,
    "--czar-accent-fg": accentFg,
    "--czar-danger": danger,
    "--czar-assistant-fg": assistantFg,
    // Bubble variables — used by CzarThread for distinct message styling.
    // Assistant: a soft accent-tinted surface (10% accent on surface).
    // User: solid accent fill so it reads as the user's own colour.
    "--czar-asst-bubble": `color-mix(in srgb, ${accent} 10%, ${surface})`,
    "--czar-asst-bubble-fg": assistantFg,
    "--czar-user-bubble": accent,
    "--czar-user-bubble-fg": accentFg,
  };
};

export const CZAR_THEMES: CzarTheme[] = [
  // ── DARK ─────────────────────────────────────────────────────────────
  { id: "midnight", name: "Midnight", category: "Dark", swatch: "#0E0E10",
    vars: {
      ...t("#0E0E10","#0A0A0C","#1A1A1E","#23232A","#2A2A33","#FFFFFF","#C7C7CF","#9A9AA3","#FFFFFF","#0E0E10","#FF6B6B"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 75% at 22% 48%, rgba(255,255,255,0.10) 0%, transparent 62%)",
        "radial-gradient(ellipse 68% 82% at 72% 85%, rgba(255,255,255,0.06) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 42% at 85% 8%,  rgba(255,255,255,0.08) 0%, transparent 52%)",
        "#0E0E10",
      ].join(", "),
    },
  },
  { id: "charcoal", name: "Charcoal", category: "Dark", swatch: "#1C1C1F",
    vars: {
      ...t("#1C1C1F","#16161A","#26262B","#2F2F35","#383840","#F5F5F7","#C5C5CC","#94949C","#E8E8EC","#1C1C1F","#FF7676"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 78% at 28% 52%, rgba(232,232,236,0.10) 0%, transparent 62%)",
        "radial-gradient(ellipse 65% 80% at 70% 82%, rgba(232,232,236,0.06) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 46% at 90% 12%, rgba(232,232,236,0.07) 0%, transparent 52%)",
        "#1C1C1F",
      ].join(", "),
    },
  },
  { id: "slate", name: "Slate", category: "Dark", swatch: "#1B2330",
    vars: {
      ...t("#1B2330","#141A24","#252E3D","#2E3849","#3A4558","#F1F4F9","#BFC7D4","#8E97A4","#7AA8FF","#0B1320","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 85% 72% at 20% 55%, rgba(122,168,255,0.13) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 74% 88%, rgba(122,168,255,0.08) 0%, transparent 55%)",
        "radial-gradient(ellipse 48% 44% at 92% 5%,  rgba(122,168,255,0.09) 0%, transparent 52%)",
        "#1B2330",
      ].join(", "),
    },
  },
  { id: "forest", name: "Forest", category: "Dark", swatch: "#0F1F18",
    vars: {
      ...t("#0F1F18","#0A1812","#173127","#1F3D32","#2A4D40","#EFF6F1","#BCD0C2","#8AA092","#6FE3A8","#0A1812","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 24% 50%, rgba(111,227,168,0.12) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 82% at 68% 84%, rgba(111,227,168,0.07) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 88% 10%, rgba(111,227,168,0.09) 0%, transparent 52%)",
        "#0F1F18",
      ].join(", "),
    },
  },
  { id: "oxblood", name: "Oxblood", category: "Dark", swatch: "#1F1213",
    vars: {
      ...t("#1F1213","#180D0E","#2D1B1D","#3A2426","#4A2F32","#FAF1F2","#D7BFC2","#A18B8E","#FF8A95","#1F1213","#FF6B6B"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 86% 74% at 26% 54%, rgba(255,138,149,0.13) 0%, transparent 62%)",
        "radial-gradient(ellipse 62% 78% at 72% 90%, rgba(255,138,149,0.08) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 46% at 86% 6%,  rgba(255,138,149,0.10) 0%, transparent 52%)",
        "#1F1213",
      ].join(", "),
    },
  },
  { id: "indigo", name: "Indigo", category: "Dark", swatch: "#15172B",
    vars: {
      ...t("#15172B","#0F1122","#22253E","#2C2F4A","#3A3D5A","#F1F2FA","#C6C8DC","#9396AE","#9DA0FF","#15172B","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 78% at 22% 46%, rgba(157,160,255,0.14) 0%, transparent 62%)",
        "radial-gradient(ellipse 68% 86% at 74% 86%, rgba(157,160,255,0.09) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 44% at 90% 8%,  rgba(157,160,255,0.10) 0%, transparent 52%)",
        "#15172B",
      ].join(", "),
    },
  },
  { id: "carbon", name: "Carbon", category: "Dark", swatch: "#0A0A0A",
    vars: {
      ...t("#0A0A0A","#050505","#171717","#222222","#2C2C2C","#FFFFFF","#C2C2C2","#8E8E8E","#FFFFFF","#0A0A0A","#FF6B6B"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 84% 72% at 30% 50%, rgba(255,255,255,0.09) 0%, transparent 62%)",
        "radial-gradient(ellipse 62% 78% at 66% 82%, rgba(255,255,255,0.05) 0%, transparent 55%)",
        "radial-gradient(ellipse 48% 42% at 88% 12%, rgba(255,255,255,0.07) 0%, transparent 52%)",
        "#0A0A0A",
      ].join(", "),
    },
  },

  // ── LIGHT ────────────────────────────────────────────────────────────
  { id: "paper", name: "Paper", category: "Light", swatch: "#FBFBF7",
    vars: {
      ...t("#FBFBF7","#F4F4EE","#FFFFFF","#F0F0EA","#E2E2DA","#1A1A1A","#4F4F4F","#7A7A7A","#1A1A1A","#FFFFFF","#C8302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 25% 52%, rgba(26,26,26,0.40) 0%, transparent 62%)",
        "radial-gradient(ellipse 65% 82% at 70% 86%, rgba(26,26,26,0.26) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 88% 7%,  rgba(26,26,26,0.30) 0%, transparent 52%)",
        "#FBFBF7",
      ].join(", "),
    },
  },
  { id: "cream", name: "Cream", category: "Light", swatch: "#FAF6EE",
    vars: {
      ...t("#FAF6EE","#F2EBDA","#FFFDF6","#F1ECDD","#E0D8C2","#1F1A12","#544B3C","#857B69","#8B5E2A","#FFFDF6","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 78% at 22% 48%, rgba(139,94,42,0.48) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 72% 88%, rgba(139,94,42,0.32) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 46% at 90% 9%,  rgba(139,94,42,0.38) 0%, transparent 52%)",
        "#FAF6EE",
      ].join(", "),
    },
  },
  { id: "linen", name: "Linen", category: "Light", swatch: "#F5F1EA",
    vars: {
      ...t("#F5F1EA","#EDE7DC","#FFFFFF","#EDE9DF","#D9D2C2","#1B1A18","#52504C","#7E7C76","#3F3F3D","#FFFFFF","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 86% 74% at 28% 54%, rgba(63,63,61,0.38) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 80% at 68% 84%, rgba(63,63,61,0.24) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 86% 8%,  rgba(63,63,61,0.28) 0%, transparent 52%)",
        "#F5F1EA",
      ].join(", "),
    },
  },
  { id: "mist", name: "Mist", category: "Light", swatch: "#EEF2F5",
    vars: {
      ...t("#EEF2F5","#E2E8EE","#FFFFFF","#E6ECF1","#CFD8E0","#161B22","#4B5563","#737E8C","#1E4F7A","#FFFFFF","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 80% at 24% 50%, rgba(30,79,122,0.45) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 74% 88%, rgba(30,79,122,0.30) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 90% 6%,  rgba(30,79,122,0.35) 0%, transparent 52%)",
        "#EEF2F5",
      ].join(", "),
    },
  },
  { id: "ivory", name: "Ivory", category: "Light", swatch: "#FFFCEC",
    vars: {
      ...t("#FFFCEC","#F8F2D5","#FFFFFF","#F4EFD5","#DCD3A6","#1F1A0A","#544D33","#827B57","#1A1A1A","#FFFCEC","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 26% 52%, rgba(26,26,26,0.40) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 82% at 70% 86%, rgba(26,26,26,0.26) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 44% at 92% 10%, rgba(26,26,26,0.30) 0%, transparent 52%)",
        "#FFFCEC",
      ].join(", "),
    },
  },
  { id: "pearl", name: "Pearl", category: "Light", swatch: "#F0EFF4",
    vars: {
      ...t("#F0EFF4","#E5E4EC","#FFFFFF","#E8E7EE","#D2D0DA","#181820","#4D4D58","#787884","#3A3A4A","#FFFFFF","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 86% 72% at 22% 56%, rgba(58,58,74,0.40) 0%, transparent 62%)",
        "radial-gradient(ellipse 62% 80% at 74% 82%, rgba(58,58,74,0.26) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 46% at 88% 8%,  rgba(58,58,74,0.30) 0%, transparent 52%)",
        "#F0EFF4",
      ].join(", "),
    },
  },
  { id: "sand", name: "Sand", category: "Light", swatch: "#F2EBD8",
    vars: {
      ...t("#F2EBD8","#E8DEBF","#FFFCEF","#ECE3CB","#D7C9A4","#1F1A0F","#554E3D","#807868","#7A4F1B","#FFFCEF","#B5302E"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 78% at 26% 50%, rgba(122,79,27,0.48) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 82% at 70% 88%, rgba(122,79,27,0.32) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 88% 7%,  rgba(122,79,27,0.38) 0%, transparent 52%)",
        "#F2EBD8",
      ].join(", "),
    },
  },

  // ── VIVID ────────────────────────────────────────────────────────────
  { id: "sunset", name: "Sunset", category: "Vivid", swatch: "#FF7A45",
    vars: {
      ...t("#1A0E0A","#120907","#2A1612","#37201A","#492A22","#FFF5F0","#F2C9B4","#C49880","#FF8E5C","#1A0E0A","#FF6B6B"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 78% at 24% 48%, rgba(255,142,92,0.28) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 70% 86%, rgba(255,142,92,0.18) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 88% 8%,  rgba(255,200,120,0.22) 0%, transparent 52%)",
        "#1A0E0A",
      ].join(", "),
    },
  },
  { id: "ocean", name: "Ocean", category: "Vivid", swatch: "#0EA5E9",
    vars: {
      ...t("#031824","#011018","#0A2E40","#10384E","#1B4A66","#EAF6FB","#A9D1E2","#7AA6B7","#38BDF8","#031824","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 22% 50%, rgba(56,189,248,0.22) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 82% at 72% 88%, rgba(56,189,248,0.14) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 44% at 90% 6%,  rgba(56,189,248,0.18) 0%, transparent 52%)",
        "#031824",
      ].join(", "),
    },
  },
  { id: "lavender", name: "Lavender", category: "Vivid", swatch: "#A78BFA",
    vars: {
      ...t("#1A1530","#120F22","#2A2245","#332B55","#42386B","#F4F0FF","#CDC2EC","#998FBE","#A78BFA","#1A1530","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 80% at 26% 52%, rgba(167,139,250,0.28) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 72% 88%, rgba(167,139,250,0.18) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 86% 8%,  rgba(167,139,250,0.22) 0%, transparent 52%)",
        "#1A1530",
      ].join(", "),
    },
  },
  { id: "matcha", name: "Matcha", category: "Vivid", swatch: "#84CC16",
    vars: {
      ...t("#0F1A0A","#0A1207","#1A2A14","#22361B","#2D4523","#F1F8E8","#C5D8B0","#94A584","#A3E635","#0F1A0A","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 24% 50%, rgba(163,230,53,0.26) 0%, transparent 62%)",
        "radial-gradient(ellipse 66% 84% at 70% 86%, rgba(163,230,53,0.16) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 90% 10%, rgba(163,230,53,0.20) 0%, transparent 52%)",
        "#0F1A0A",
      ].join(", "),
    },
  },
  { id: "rose", name: "Rose", category: "Vivid", swatch: "#FB7185",
    vars: {
      ...t("#1F0E13","#16080D","#311A22","#3F222C","#532E3A","#FFF1F4","#EBC0CA","#B8919A","#FB7185","#1F0E13","#FF6B6B"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 88% 76% at 25% 50%, rgba(251,113,133,0.30) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 80% at 72% 88%, rgba(251,113,133,0.20) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 46% at 88% 6%,  rgba(251,113,133,0.24) 0%, transparent 52%)",
        "#1F0E13",
      ].join(", "),
    },
  },
  { id: "mono-cyan", name: "Mono Cyan", category: "Vivid", swatch: "#22D3EE",
    vars: {
      ...t("#001317","#000A0C","#072025","#0C2C33","#114048","#E9FBFD","#A1D8DF","#74A6AD","#22D3EE","#001317","#FF7A7A"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 78% at 22% 50%, rgba(34,211,238,0.22) 0%, transparent 62%)",
        "radial-gradient(ellipse 64% 82% at 70% 84%, rgba(34,211,238,0.14) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 44% at 88% 8%,  rgba(34,211,238,0.18) 0%, transparent 52%)",
        "#001317",
      ].join(", "),
    },
  },

  // Grove — luminous spring-green gradient. CZAR default theme.
  { id: "grove", name: "Grove", category: "Vivid", swatch: "#4ADE80",
    vars: {
      ...t("#F2FFF4","#E8FFF0","#FFFFFF","#EEF9F1","#C6F6D5","#141414","#3D3D3D","#737373","#22C55E","#FFFFFF","#EF4444"),
      "--czar-bg-gradient": [
        "radial-gradient(ellipse 90% 80% at 25% 50%, rgba(74,222,128,0.78) 0%, transparent 62%)",
        "radial-gradient(ellipse 70% 85% at 68% 88%, rgba(134,239,172,0.48) 0%, transparent 55%)",
        "radial-gradient(ellipse 52% 44% at 88% 6%,  rgba(254,249,195,0.52) 0%, transparent 52%)",
        "#F2FFF4",
      ].join(", "),
      "--czar-user-bubble": "#22C55E",
      "--czar-user-bubble-fg": "#FFFFFF",
      "--czar-asst-bubble": "#FFFFFF",
      "--czar-asst-bubble-fg": "#141414",
    },
  },

  // Violet — bold purple palette.
  { id: "violet", name: "Violet", category: "Vivid", swatch: "#5955CC",
    vars: {
      ...t("#2E2A8A","#221E70","#3D38B0","#4A46BE","#5A56CC","#F0EEFF","#B8B3FF","#8580CC","#9990FF","#1A1660","#FF7A9A"),
      "--czar-asst-bubble": "#3D38B0",
      "--czar-asst-bubble-fg": "#F0EEFF",
      "--czar-user-bubble": "#FFFFFF",
      "--czar-user-bubble-fg": "#1A1660",
    },
  },
];

export const DEFAULT_THEME_ID = "grove";

export function applyTheme(themeId: string) {
  const theme = CZAR_THEMES.find((x) => x.id === themeId) ?? CZAR_THEMES[0];
  const root = document.querySelector(".czar-root") as HTMLElement | null;
  if (!root) return;
  // Clear the gradient first — non-gradient themes don't include this var, so
  // without this removal it persists when switching away from grove.
  root.style.removeProperty("--czar-bg-gradient");
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.czarTheme = theme.id;

  // Mirror CZAR theme to <html> so the page background + scrollbar match the
  // active palette. Only the bg and accent vars are propagated — full
  // CZAR tokens stay scoped to .czar-root.
  const html = document.documentElement;
  html.dataset.czarTheme = theme.id;
  html.style.setProperty("--czar-page-bg", theme.vars["--czar-bg"] ?? "");
  html.style.setProperty("--czar-page-accent", theme.vars["--czar-accent"] ?? "");
  html.style.setProperty("--czar-page-text", theme.vars["--czar-text"] ?? "");
  // Drive the page background color directly so the area outside the root matches
  if (root.closest("body")) {
    document.body.style.background = theme.vars["--czar-bg"] ?? "";
  }
}

export function getTheme(themeId: string): CzarTheme {
  return CZAR_THEMES.find((x) => x.id === themeId) ?? CZAR_THEMES[0];
}
