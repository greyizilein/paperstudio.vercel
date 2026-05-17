import { createPortal } from "react-dom";
import { FileEdit, MessageSquare } from "lucide-react";

interface Props {
  filename: string;
  onEditInDoc: () => void;
  onContinueAsChat: () => void;
}

export function CzarDocCorrectModal({ filename, onEditInDoc, onContinueAsChat }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onContinueAsChat}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--czar-bg-elev)", border: "1px solid var(--czar-border)" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
        >
          <FileEdit size={18} style={{ color: "var(--czar-accent)" }} />
        </div>

        <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--czar-text)" }}>
          Make corrections inside the document?
        </h2>
        <p className="text-[12px] leading-relaxed mb-5" style={{ color: "var(--czar-text-dim)" }}>
          CZAR can apply targeted, colour-coded corrections directly inside{" "}
          <strong style={{ color: "var(--czar-text)" }}>{filename}</strong>, preserving the original
          layout and giving you a clean, downloadable file with highlights.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onEditInDoc}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
          >
            <FileEdit size={14} />
            Edit in document
          </button>
          <button
            onClick={onContinueAsChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
          >
            <MessageSquare size={14} />
            Continue as chat
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
