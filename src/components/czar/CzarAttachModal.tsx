import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export interface AttachSelection {
  cover: boolean;
  references: boolean;
  images: boolean;
  appendix: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (sel: AttachSelection) => void;
  // Pre-detected from message body — drives default-checked state.
  hasCitations: boolean;
  hasImages: boolean;
  initial?: Partial<AttachSelection>;
}

const ITEMS: { key: keyof AttachSelection; label: string }[] = [
  { key: "cover",      label: "Cover page" },
  { key: "references", label: "Reference list" },
  { key: "images",     label: "Image figures" },
  { key: "appendix",   label: "Appendix" },
];

export function CzarAttachModal({ open, onClose, onConfirm, hasCitations, hasImages, initial }: Props) {
  const [sel, setSel] = useState<AttachSelection>({
    cover: false,
    references: hasCitations,
    images: hasImages,
    appendix: false,
    ...initial,
  });

  // Re-seed defaults when re-opened against a different message.
  useEffect(() => {
    if (open) {
      setSel((prev) => ({
        cover: initial?.cover ?? prev.cover ?? false,
        references: initial?.references ?? hasCitations,
        images: initial?.images ?? hasImages,
        appendix: initial?.appendix ?? prev.appendix ?? false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)", color: "var(--czar-text)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold">Attach to your download</h3>
          <button onClick={onClose} aria-label="Close" className="opacity-70 hover:opacity-100" style={{ color: "var(--czar-text-dim)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          {ITEMS.map((it) => {
            const checked = sel[it.key];
            return (
              <button
                key={it.key}
                onClick={() => setSel((s) => ({ ...s, [it.key]: !s[it.key] }))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                style={{
                  background: checked ? "color-mix(in srgb, var(--czar-accent) 14%, transparent)" : "var(--czar-bg)",
                  border: `1px solid ${checked ? "var(--czar-accent)" : "var(--czar-border)"}`,
                }}
              >
                <span
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: checked ? "var(--czar-accent)" : "transparent",
                    border: `1.5px solid ${checked ? "var(--czar-accent)" : "var(--czar-border)"}`,
                    color: "var(--czar-accent-fg)",
                  }}
                >
                  {checked && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-medium" style={{ color: "var(--czar-text)" }}>{it.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80"
            style={{ background: "var(--czar-bg)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(sel)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:opacity-90"
            style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
