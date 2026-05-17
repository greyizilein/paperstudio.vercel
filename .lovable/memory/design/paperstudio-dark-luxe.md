---
name: PaperStudio Themed App Shell
description: All protected app routes (Dashboard, Writer, NewProject, Settings, Export, Admin) wear a themed skin via the .ps-app wrapper in ProtectedRoute.tsx. Themes (Original / Dark Luxe / Editorial Paper / Nordic Slate) × {light, dark} are applied at runtime by PsThemeProvider. CZAR is excluded.
type: design
---

# Themed app shell (.ps-app)

The premium skin is implemented as a CSS-variable override scoped to a
single wrapper class, `.ps-app`, applied in `src/components/ProtectedRoute.tsx`.
Every app component already paints with semantic tokens (`bg-card`,
`text-foreground`, `bg-sidebar`, `bg-primary`, `border-border`, etc.), so
runtime token overrides re-skin the entire authenticated app without
touching component code.

## Theme system (src/lib/psThemes.ts + src/contexts/PsThemeContext.tsx)

Four curated themes, each shipping a light + dark variant and its own
font pairing:

| Theme              | Identity                                              | Display / Body fonts        |
|--------------------|-------------------------------------------------------|-----------------------------|
| `original`         | Aubergine + cream — the classic PaperStudio home base | Nunito + Lato               |
| `dark-luxe`        | Near-black + warm cream + gold (signature premium)   | Instrument Serif + Geist    |
| `editorial-paper`  | Library-quiet paper + ink + deep aubergine            | Fraunces + Inter            |
| `nordic-slate`     | Cool slate + muted blue (calm, modern)                | Inter Tight + Inter         |

`PsThemeProvider` (mounted in `App.tsx` inside `<AuthProvider>`):
- Seeds from localStorage (`ps_theme_id`, `ps_theme_mode`) for instant first paint.
- On user login, hydrates from `profiles.settings_json.app_theme` and `app_theme_mode`.
- Writes the choice back to both localStorage AND the profile (per-account, with local cache).
- Calls `applyPsTheme(themeId, mode)` which sets every CSS variable inline on `.ps-app` AND `<html>` (so portaled UI like popovers/dialogs follow the theme).

## Toggle placement
- **Topbar quick-toggle** (`<PsThemeToggle />`): Dashboard header + Settings header. Sun/moon icon. One click flips light↔dark for the active theme.
- **Settings → Appearance tab** (`<PsThemePicker />`): full theme cards with live mini-previews, plus the same light/dark switch.

## Premium treatments (gold gradient buttons, film grain)

These are **only** applied when `data-ps-premium="1"` is set on `.ps-app`,
which `applyPsTheme` only sets for `dark-luxe + dark`. Other themes get a
clean, tasteful look without gold gradients or grain so the aesthetic
doesn't feel forced. Selectors live in `src/index.css` under
`.ps-app[data-ps-premium="1"] ...`.

## Prose surface (academic editor)

In **dark modes**, `.prose-academic` and `.ps-paper` are forced to a
paper-cream background with dark ink so academic content stays readable
inside any dark theme. In **light modes** the editor inherits the theme's
own light surface — no override needed.

Selectors are scoped via `.ps-app[data-ps-mode="dark"] .prose-academic`.

## Scope
- **Inside `.ps-app`** (themed): Dashboard, Writer chrome, NewProject, Settings, Export, Admin, Help (when in app shell).
- **Outside `.ps-app`** (untouched):
  - `/czar` (owns its own `.czar-root` theming surface)
  - Marketing pages (`.paperstudio-marketing`)
  - Auth, ResetPassword, legal pages

## How to keep harmony
- Never use raw color classes (`text-white`, `bg-black`) in app components. Always use semantic tokens.
- New surfaces that should appear elevated: use `bg-card` (auto-styled with theme shadow).
- New CTAs: use `bg-primary` (auto-receives the gold gradient when on dark-luxe + dark).
- New informational panels that need cream paper background in dark modes: add `.ps-paper`.
- To read the active theme in code: `const { themeId, mode } = usePsTheme();`
