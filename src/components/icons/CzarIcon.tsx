// CZAR mark — a quill in motion. Pure vector, scales from 12px to 200px+.
// Inherits surrounding text colour via `currentColor`, matching the cream-on-green
// brand mark from the PAPERSTUDIO identity.
//
// When `streaming` is true, the quill subtly tilts as if writing, and an ink
// stroke under the nib draws and fades on a loop — the visual signature of a
// CZAR turn actively scribbling on the page.

interface Props {
  size?: number;
  className?: string;
  /** When true, animates the quill into a scribbling state. */
  streaming?: boolean;
}

export function CzarIcon({ size = 16, className, streaming = false }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Quill body — pivots from the nib for a natural writing tilt */}
      <g
        style={{
          transformOrigin: "26px 52px",
          animation: streaming ? "czar-quill-write 1.6s ease-in-out infinite" : undefined,
        }}
      >
        {/* Feather: a soft tear-drop that sweeps from upper-right down to the nib.
            Drawn as a single filled path so it reads cleanly even at 12px. */}
        <path
          d="M50 6
             C 40 10, 32 18, 27 30
             C 24 38, 23 46, 24 52
             L 28 52
             C 30 46, 33 40, 38 34
             C 44 26, 49 18, 52 10
             C 53 8, 52 6, 50 6 Z"
          fill="currentColor"
        />
        {/* Subtle barb line down the spine of the feather — visible only at larger sizes,
            disappears visually at favicon scale. */}
        <path
          d="M48 10 C 40 18, 33 28, 28 44"
          stroke="hsl(var(--background, 0 0% 100%) / 0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nib — narrow triangle finishing the quill at its writing tip */}
        <path
          d="M24 52 L 28 52 L 26 58 Z"
          fill="currentColor"
        />
        {/* Tiny ink dot at the very tip */}
        <circle cx="26" cy="58.5" r="1.1" fill="currentColor" />
      </g>

      {/* Ink trail under the nib — a flourish that draws on, holds, then fades.
          Only animated while streaming; static (invisible) otherwise. */}
      <path
        d="M14 60 C 22 56, 32 62, 44 58 C 50 56, 54 60, 58 58"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        style={{
          opacity: streaming ? 1 : 0,
          strokeDasharray: 80,
          strokeDashoffset: 80,
          animation: streaming ? "czar-quill-ink 1.6s ease-in-out infinite" : undefined,
        }}
      />
    </svg>
  );
}

export default CzarIcon;
