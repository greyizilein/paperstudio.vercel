import { useEffect, useState } from "react";
import { ImageIcon, Check, X, Download, Loader2 } from "lucide-react";

/**
 * Animated "streaming download" vector. Two stacked arrows fall into a tray,
 * staggered so it reads as a continuous download stream. Pure SVG — no images.
 */
export function StreamingDownloadIcon({ size = 44 }: { size?: number }) {
  const accent = "var(--czar-accent, hsl(var(--primary)))";
  const tray = "var(--czar-text, currentColor)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <style>{`
        @keyframes ps-dl-fall {
          0%   { transform: translateY(-18px); opacity: 0; }
          25%  { opacity: 1; }
          70%  { transform: translateY(0);     opacity: 1; }
          100% { transform: translateY(6px);   opacity: 0; }
        }
        .ps-dl-a1 { animation: ps-dl-fall 1.4s ease-in infinite; transform-origin: center; }
        .ps-dl-a2 { animation: ps-dl-fall 1.4s ease-in infinite; animation-delay: .7s; transform-origin: center; }
      `}</style>
      {/* Arrow 1 */}
      <g className="ps-dl-a1">
        <path d="M32 8 V34" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M20 26 L32 38 L44 26" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* Arrow 2 (offset) */}
      <g className="ps-dl-a2" opacity="0.55">
        <path d="M32 8 V34" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M20 26 L32 38 L44 26" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* Tray */}
      <path d="M14 52 H50" stroke={tray} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 52 V46" stroke={tray} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 52 V46" stroke={tray} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

const ACK_KEY = "ps:image-notice-ack:v1";

/** Has the user already acknowledged the "images render in download only" notice? */
export function hasAckedImageNotice(): boolean {
  try { return localStorage.getItem(ACK_KEY) === "1"; } catch { return false; }
}
export function ackImageNotice() {
  try { localStorage.setItem(ACK_KEY, "1"); } catch { /* ignore */ }
}

/** One-time acknowledgment popup. Uses CZAR CSS variables so it matches the active theme. */
export function ImageAckModal({ open, onAcknowledge }: { open: boolean; onAcknowledge: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
      <div className="rounded-2xl shadow-xl max-w-sm w-full p-5" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--czar-bg)", border: "1px solid var(--czar-border)", color: "var(--czar-accent)" }}>
            <ImageIcon size={18} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--czar-text)" }}>About images &amp; figures</h3>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--czar-text-dim)" }}>
              Generated charts, figures, and images don't appear inline in the app. They're embedded directly into your document and visible after you <span className="font-semibold">download</span> as <span className="font-mono">.docx</span> or <span className="font-mono">.pdf</span>.
            </p>
          </div>
        </div>
        <button
          onClick={onAcknowledge}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
        >
          <Check size={14} /> OK, got it
        </button>
      </div>
    </div>
  );
}

export interface ImageProgressInfo {
  total: number;
  done: number;
  failed: number;
  loading: number;
}

/** Live image-progress modal with wait/exit/download options. */
export function ImageProgressModal({
  open,
  info,
  onWait,
  onExit,
  onDownloadAnyway,
}: {
  open: boolean;
  info: ImageProgressInfo;
  onWait: () => void;
  onExit: () => void;
  onDownloadAnyway?: () => void;
}) {
  if (!open) return null;
  const pct = info.total > 0 ? Math.round((info.done / info.total) * 100) : 0;
  const stillLoading = info.loading > 0;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
        style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
      >
        <div className="flex justify-center mb-3">
          {stillLoading ? (
            <StreamingDownloadIcon size={56} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(77,182,138,0.15)" }}>
              <Check size={30} className="text-[#4DB68A]" />
            </div>
          )}
        </div>

        <h3 className="text-[17px] font-extrabold mb-1.5 tracking-tight" style={{ color: "var(--czar-text)" }}>
          {stillLoading ? "Hold! Creating Images" : "Images ready"}
        </h3>

        <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: "var(--czar-text-dim)" }}>
          {stillLoading
            ? "Please don't close this window — your figures are being generated and embedded into your document."
            : "All figures are embedded. Your document is ready to download."}
          <br />
          <span style={{ color: "var(--czar-text-faint)" }}>
            {info.done} of {info.total} ready{info.failed ? ` · ${info.failed} failed` : ""}
          </span>
        </p>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "var(--czar-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: stillLoading ? "var(--czar-accent)" : "#4DB68A" }}
          />
        </div>
        <div className="text-[10.5px] text-right mb-4" style={{ color: "var(--czar-text-faint)" }}>{pct}%</div>

        {/* Only show actions when finished. While loading, the modal HOLDS the screen. */}
        {!stillLoading && (
          <div className="flex flex-col gap-2">
            {onDownloadAnyway && (
              <button
                onClick={onDownloadAnyway}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
              >
                <Download size={14} /> Download now
              </button>
            )}
            <button
              onClick={onExit}
              className="w-full px-3 py-2 rounded-xl text-[12px] hover:opacity-80 transition-opacity"
              style={{ color: "var(--czar-text-faint)" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper hook: shows the acknowledgment popup the first time the caller signals
 * that an image is about to be generated. Returns the modal element + a trigger.
 */
export function useImageAck() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // no-op
  }, []);
  const trigger = () => {
    if (!hasAckedImageNotice()) setOpen(true);
  };
  const modal = (
    <ImageAckModal
      open={open}
      onAcknowledge={() => { ackImageNotice(); setOpen(false); }}
    />
  );
  return { trigger, modal };
}
