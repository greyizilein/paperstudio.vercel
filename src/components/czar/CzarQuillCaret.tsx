// Inline animated quill that replaces the blinking block caret while CZAR is
// streaming a *deliverable* (a piece of work). Uses the existing CzarIcon
// vector so it's always pixel-identical to the brand mark.
//
// Sized to the surrounding line-height (1em), tilted -20° so the nib points
// down-left into the trailing character, and bobs on the same `czar-quill-write`
// keyframe as the splash animation. Fades out over 220ms when streaming ends.

import { useEffect, useState } from "react";
import { CzarIcon } from "@/components/icons/CzarIcon";

interface Props {
  streaming?: boolean;
  /** Optional pixel size override; defaults to ~1.15em via CSS. */
  size?: number;
}

export function CzarQuillCaret({ streaming = false, size }: Props) {
  // Linger one frame after streaming ends so the fade-out can play.
  const [visible, setVisible] = useState(streaming);
  useEffect(() => {
    if (streaming) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(false), 240);
    return () => window.clearTimeout(t);
  }, [streaming]);
  if (!visible && !streaming) return null;
  return (
    <span
      className="czar-quill-caret"
      aria-hidden="true"
      style={{
        opacity: streaming ? 1 : 0,
        transition: "opacity 220ms ease-out",
        color: "var(--czar-accent)",
        // Pull the quill flush with the trailing glyph and rotate so the nib
        // sits where the caret block used to sit.
        transform: "rotate(-20deg) translate(-1px, 1px)",
      }}
    >
      <CzarIcon size={size ?? 16} streaming />
    </span>
  );
}

export default CzarQuillCaret;
