import { useEffect, useState } from "react";

/**
 * Glowing "HUMANISING" pill — shown in the top strip while the humaniser
 * pipeline is running. Cycles through brand hues to imply progress without
 * ever exposing the underlying stage number or label.
 */
const HUES: { bg: string; fg: string; glow: string }[] = [
  { bg: "#4A154B", fg: "#FFF7E9", glow: "74, 21, 75" },   // aubergine
  { bg: "#1FA9A0", fg: "#06221F", glow: "31, 169, 160" }, // aqua
  { bg: "#E0A82E", fg: "#2A1A00", glow: "224, 168, 46" }, // gold
  { bg: "#2F8F4E", fg: "#EAFBEF", glow: "47, 143, 78" },  // green
];

export function HumanisingPill({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % HUES.length), 1400);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  const { bg, fg, glow } = HUES[idx];

  return (
    <div
      role="status"
      aria-label="Humanising draft"
      className="pointer-events-none select-none inline-flex items-center gap-1.5 h-6 px-3 rounded-full font-extrabold uppercase text-[10px] tracking-[0.14em] transition-colors duration-700 motion-safe:animate-pulse"
      style={{
        background: bg,
        color: fg,
        boxShadow: `0 0 14px rgba(${glow}, 0.55), 0 0 2px rgba(${glow}, 0.9)`,
        transition: "background-color 700ms ease, color 700ms ease, box-shadow 700ms ease",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: fg, opacity: 0.85 }}
      />
      Humanising
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: fg, opacity: 0.85 }}
      />
    </div>
  );
}

export default HumanisingPill;
