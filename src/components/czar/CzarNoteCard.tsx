import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

interface Props {
  /** Body text — usually a short interpretive note or status string. */
  text: string;
  /** Optional header label. Defaults to "Note". */
  label?: string;
  /** When true, header pulses and card stays expanded. Auto-docks on transition to false. */
  streaming?: boolean;
}

/**
 * CZAR Format-A "dockable micro-card".
 *
 * Same shape as the reasoning panel but in a distinct warm/parchment colour
 * so the user can tell tool-status / interpretive notes apart from the
 * model's chain-of-thought reasoning. Auto-collapses (docks) the moment
 * its `streaming` prop flips to false — exactly like ThinkingPanel.
 */
export function CzarNoteCard({ text, label = "Note", streaming }: Props) {
  const [expanded, setExpanded] = useState(true);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (streaming) wasStreamingRef.current = true;
    if (!streaming && wasStreamingRef.current) setExpanded(false);
  }, [streaming]);
  if (!text) return null;
  return (
    <div
      className="czar-card-in rounded-xl mb-2 overflow-hidden"
      style={{
        border: "1px solid color-mix(in srgb, var(--czar-accent) 22%, transparent)",
        background: "color-mix(in srgb, var(--czar-accent) 6%, var(--czar-surface))",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80"
        style={{ color: "var(--czar-text-dim)" }}
      >
        <Sparkles
          size={12}
          style={{
            color: "var(--czar-accent)",
            opacity: streaming ? 1 : 0.85,
          }}
          className={streaming ? "animate-pulse" : ""}
        />
        <span className="text-[11px] font-medium tracking-wide flex-1">
          {streaming ? `${label}…` : label}
        </span>
        <ChevronDown
          size={11}
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {expanded && (
        <div
          className="px-3 pb-2.5 text-[11px] leading-relaxed whitespace-pre-wrap font-mono overflow-auto"
          style={{
            color: "var(--czar-text)",
            borderTop: "1px solid color-mix(in srgb, var(--czar-accent) 18%, transparent)",
            paddingTop: "0.5rem",
            maxHeight: "14rem",
            opacity: 0.92,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/**
 * Extracts ALL `[CZAR_NOTE]…[/CZAR_NOTE]` blocks from message content.
 * Each block may carry an optional label prefix:  `[CZAR_NOTE label="Checking sources"]…[/CZAR_NOTE]`
 * Returns the cleaned `rest` plus a list of notes in document order.
 */
export function extractNotes(content: string): {
  notes: { label?: string; text: string }[];
  rest: string;
} {
  if (!content) return { notes: [], rest: content };
  const notes: { label?: string; text: string }[] = [];
  const rest = content.replace(
    /\[CZAR_NOTE(?:\s+label="([^"]*)")?\]([\s\S]*?)\[\/CZAR_NOTE\]/g,
    (_m, label, body) => {
      notes.push({ label: label || undefined, text: String(body || "").trim() });
      return "";
    },
  );
  return { notes, rest: rest.trim() };
}
