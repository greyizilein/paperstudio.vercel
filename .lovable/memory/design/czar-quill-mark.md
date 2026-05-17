---
name: czar-quill-mark
description: CZAR brand mark is a quill (feather + nib) drawn from PAPERSTUDIO identity; scribbles when streaming
type: design
---
The CZAR icon (`src/components/icons/CzarIcon.tsx`) is the PAPERSTUDIO quill — a single-colour vector (feather + nib + ink dot) on a 64×64 viewBox using `currentColor`. It scales cleanly from 12px (favicon, sidebar mini) to 200px+ (CzarThread empty-state hero, first-login splash).

When `streaming` is true the quill body tilts at the nib pivot (`czar-quill-write`, ~1.6s loop) and an ink trail draws + fades beneath it (`czar-quill-ink`). When false it is fully static.

Brand colours: cream `#f5efe0` on PAPERSTUDIO green `#1f4d36`. Favicon = `/public/favicon.png` (cream quill on green). The `<meta name="theme-color">` in `index.html` matches the green so mobile chrome blends.

First-login splash (`src/components/FirstLoginSplash.tsx`, mounted in `ProtectedRoute`) shows once per user (gated by `localStorage["ps:welcomed:<uid>"]`): a green overlay with the scribbling quill above an Allura-cursive "Paperstudio" signature whose stroke draws on then fills. ~4.2s total, then fades and unmounts.

Do NOT add the quill to other pages — sidebar/CZAR header/empty-state/splash only.
