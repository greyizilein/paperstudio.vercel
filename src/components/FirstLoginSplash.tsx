// First-login welcome splash.
// Shows once per user (gated by localStorage `ps:welcomed:<uid>`):
// a full-screen brand moment where the quill writes "Paperstudio" in cursive,
// then the whole overlay fades out and unmounts. Honours prefers-reduced-motion
// by skipping the draw-on and just fading.

import { useEffect, useRef, useState } from "react";
import { CzarIcon } from "@/components/icons/CzarIcon";

const STORAGE_PREFIX = "ps:welcomed:";
const TOTAL_MS = 4200; // overlay lifetime

interface Props {
  userId: string;
}

export function FirstLoginSplash({ userId }: Props) {
  const key = STORAGE_PREFIX + userId;
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return !localStorage.getItem(key); } catch { return false; }
  });
  const textRef = useRef<SVGTextElement>(null);
  const [textLen, setTextLen] = useState<number>(2400);

  // Measure the rendered cursive once mounted so the dash animation matches its true length.
  useEffect(() => {
    if (!show || !textRef.current) return;
    try {
      const len = textRef.current.getComputedTextLength();
      if (len > 0) setTextLen(Math.ceil(len));
    } catch { /* SVG measurement unavailable — fall back to default */ }
  }, [show]);

  // Mark as seen + auto-dismiss after the splash plays.
  useEffect(() => {
    if (!show) return;
    try { localStorage.setItem(key, "1"); } catch { /* ignore quota */ }
    const t = window.setTimeout(() => setShow(false), TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [show, key]);

  if (!show) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{
        background: "#1f4d36",
        animation: `ps-splash-fade ${TOTAL_MS}ms ease-in-out forwards`,
      }}
    >
      <div className="w-full max-w-[min(88vw,720px)] flex flex-col items-center px-4 sm:px-6">
        {/* Quill scribbling above the signature */}
        <div className="mb-4 sm:mb-6" style={{ color: "#f5efe0" }}>
          <CzarIcon size={120} streaming />
        </div>

        {/* Signature: Allura cursive, drawn on via stroke-dashoffset, then filled. */}
        <svg
          viewBox="0 0 900 200"
          className="w-full h-auto max-w-[680px]"
          aria-label="Paperstudio"
          preserveAspectRatio="xMidYMid meet"
        >
          <text
            ref={textRef}
            x="450"
            y="135"
            textAnchor="middle"
            fontFamily="'Allura', cursive"
            fontSize="160"
            fill="#f5efe0"
            stroke="#f5efe0"
            strokeWidth="1.4"
            style={{
              ["--ps-sig-len" as any]: textLen,
              strokeDasharray: textLen,
              strokeDashoffset: textLen,
              fillOpacity: 0,
              animation: `ps-signature-draw 2.6s ease-in-out 0.2s forwards, ps-signature-fill 1.6s ease-out 1.6s forwards`,
              paintOrder: "stroke fill",
            }}
          >
            Paperstudio
          </text>
        </svg>

        {/* Subtle wordmark beneath, styled like the brand image */}
        <div
          className="mt-2 text-[11px] sm:text-[13px] tracking-[0.35em] font-semibold"
          style={{
            color: "#f5efe0",
            opacity: 0,
            animation: "ps-signature-fill 1.2s ease-out 2.4s forwards",
          }}
        >
          STUDIO
        </div>
      </div>
    </div>
  );
}

export default FirstLoginSplash;
