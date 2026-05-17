import { usePsTheme } from "@/contexts/PsThemeContext";
import { getPsTheme } from "@/lib/psThemes";
import { User } from "lucide-react";

interface PsAvatarProps {
  initials: string;
  /** Tailwind size classes — e.g. "w-7 h-7 text-[10px]". */
  sizeClass?: string;
  /** Optional click handler — turns the avatar into a button. */
  onClick?: () => void;
  className?: string;
}

/**
 * Theme-aware user avatar. Each theme picks its own treatment:
 * - classic        → contact-outline (Notion-style outlined silhouette)
 * - dark-luxe      → gold-ring       (initials with gold ring)
 * - editorial      → serif-monogram  (first letter in serif on cream)
 * - nordic-slate   → initials-circle (plain initials in primary circle)
 * - graphite-mono  → mono-square     (monospace initials, square corners)
 */
export function PsAvatar({ initials, sizeClass = "w-8 h-8 text-[11px]", onClick, className = "" }: PsAvatarProps) {
  const { themeId } = usePsTheme();
  const style = getPsTheme(themeId).avatar;
  const Comp = onClick ? "button" : "div";
  const interactive = onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : "";

  if (style === "contact-outline") {
    // Notion-style: outlined contact silhouette, soft circle background.
    return (
      <Comp
        onClick={onClick}
        className={`${sizeClass} rounded-full border border-border bg-secondary flex items-center justify-center text-foreground/80 flex-shrink-0 ${interactive} ${className}`}
        aria-label="Account"
      >
        <User strokeWidth={1.6} className="w-[55%] h-[55%]" />
      </Comp>
    );
  }

  if (style === "gold-ring") {
    return (
      <Comp
        onClick={onClick}
        className={`${sizeClass} rounded-full bg-card flex items-center justify-center font-bold text-accent flex-shrink-0 ring-2 ring-accent/60 ${interactive} ${className}`}
        style={{ fontFamily: "var(--ps-font-display)" }}
      >
        {initials}
      </Comp>
    );
  }

  if (style === "serif-monogram") {
    return (
      <Comp
        onClick={onClick}
        className={`${sizeClass} rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0 ${interactive} ${className}`}
        style={{ fontFamily: "var(--ps-font-display)", fontWeight: 600 }}
      >
        {initials.charAt(0)}
      </Comp>
    );
  }

  if (style === "mono-square") {
    return (
      <Comp
        onClick={onClick}
        className={`${sizeClass} rounded-[3px] bg-foreground text-background flex items-center justify-center font-bold flex-shrink-0 ${interactive} ${className}`}
        style={{ fontFamily: "var(--ps-font-mono)", letterSpacing: "0.02em" }}
      >
        {initials}
      </Comp>
    );
  }

  // Default: initials-circle
  return (
    <Comp
      onClick={onClick}
      className={`${sizeClass} rounded-full bg-primary flex items-center justify-center font-black text-primary-foreground flex-shrink-0 ${interactive} ${className}`}
    >
      {initials}
    </Comp>
  );
}
