import { useState } from "react";
import { Globe, Search, ShieldCheck, ChevronDown, Loader2, ExternalLink, AlertCircle, Check, ImageIcon } from "lucide-react";
import type { CzarToolEvent } from "@/lib/czarStream";

export interface CzarToolCallState {
  id: string;
  name: string;
  phase: "running" | "done" | "error";
  input?: any;
  result?: any;
  error?: string;
}

function iconFor(name: string) {
  if (name === "web_search") return Globe;
  if (name === "cite_check") return ShieldCheck;
  if (name === "generate_image") return ImageIcon;
  return Search;
}

function labelFor(name: string, phase: CzarToolCallState["phase"]) {
  const base =
    name === "web_search" ? (phase === "running" ? "Searching the web" : "Searched the web")
    : name === "cite_check" ? (phase === "running" ? "Fact-checking" : "Fact-checked")
    : name === "generate_image" ? (phase === "running" ? "Generating image" : "Generated image")
    : name;
  return base;
}

function summaryOfInput(name: string, input: any): string {
  if (!input) return "";
  if (name === "web_search") return String(input.query || "").slice(0, 80);
  if (name === "cite_check") return String(input.claim || "").slice(0, 80);
  if (name === "generate_image") return String(input.prompt || "").slice(0, 80);
  try { return JSON.stringify(input).slice(0, 80); } catch { return ""; }
}

/**
 * Compact, uniform-sized tool card — matches the Lovable task-card aesthetic.
 * One row per call: small icon → label · subtle subtitle → status icon (spinner / check / alert).
 * Click to expand the result body.
 */
export function CzarToolCard({ call }: { call: CzarToolCallState }) {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(call.name);
  const sources: { title: string; url: string }[] = call.result?.sources || [];
  const answer: string = call.result?.answer || call.result?.verdict_reasoning || "";
  const imageUrl: string | undefined = call.result?.image_url;
  const subtitle = summaryOfInput(call.name, call.input);

  return (
    <div
      className="my-1.5 rounded-lg overflow-hidden text-[12px]"
      style={{
        background: "var(--czar-surface)",
        border: "1px solid var(--czar-border)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:opacity-90 transition-opacity"
        style={{ color: "var(--czar-text)" }}
      >
        {/* Tool icon — fixed size for uniform rows */}
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0"
          style={{
            background: "var(--czar-bg)",
            color: "var(--czar-text-dim)",
            border: "1px solid var(--czar-border)",
          }}
        >
          <Icon size={11} />
        </span>

        {/* Label + subtitle */}
        <span className="flex-1 text-left min-w-0 inline-flex items-center gap-1.5">
          <span className="font-medium truncate">{labelFor(call.name, call.phase)}</span>
          {subtitle && (
            <span className="truncate text-[11px]" style={{ color: "var(--czar-text-faint)" }}>
              · {subtitle}
            </span>
          )}
        </span>

        {/* Status pill — Lovable-style tick when done */}
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
          style={{
            background:
              call.phase === "error" ? "rgba(239,68,68,0.12)"
              : call.phase === "done" ? "color-mix(in srgb, var(--czar-accent) 18%, transparent)"
              : "transparent",
            color:
              call.phase === "error" ? "#ef4444"
              : call.phase === "done" ? "var(--czar-accent)"
              : "var(--czar-text-faint)",
          }}
        >
          {call.phase === "running" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : call.phase === "error" ? (
            <AlertCircle size={11} />
          ) : (
            <Check size={11} strokeWidth={3} />
          )}
        </span>

        <ChevronDown
          size={11}
          style={{
            color: "var(--czar-text-faint)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.18s",
          }}
        />
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 pt-1.5 border-t" style={{ borderColor: "var(--czar-border)" }}>
          {call.phase === "error" && (
            <p className="text-[11px]" style={{ color: "#ef4444" }}>{call.error || "Tool error"}</p>
          )}
          {imageUrl && (
            <div className="mb-2">
              <img
                src={imageUrl}
                alt={String(call.input?.prompt || "Generated image")}
                className="rounded-md max-w-full"
                style={{ border: "1px solid var(--czar-border)" }}
              />
            </div>
          )}
          {answer && (
            <p className="text-[11px] leading-relaxed mb-1.5 whitespace-pre-wrap" style={{ color: "var(--czar-text-dim)" }}>
              {answer}
            </p>
          )}
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:opacity-90 transition-opacity"
                  style={{
                    background: "var(--czar-bg)",
                    color: "var(--czar-text)",
                    border: "1px solid var(--czar-border)",
                  }}
                  title={s.url}
                >
                  <span className="truncate max-w-[160px]">{s.title}</span>
                  <ExternalLink size={9} style={{ color: "var(--czar-text-faint)" }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function toolEventToState(prev: CzarToolCallState[], ev: CzarToolEvent): CzarToolCallState[] {
  const idx = prev.findIndex((c) => c.id === ev.id);
  if (ev.phase === "start") {
    if (idx >= 0) return prev;
    return [...prev, { id: ev.id, name: ev.name, phase: "running", input: ev.input }];
  }
  const updated: CzarToolCallState = {
    id: ev.id,
    name: ev.name,
    phase: ev.phase === "error" ? "error" : "done",
    input: ev.input ?? (idx >= 0 ? prev[idx].input : undefined),
    result: ev.result,
    error: ev.error,
  };
  if (idx < 0) return [...prev, updated];
  const copy = prev.slice();
  copy[idx] = updated;
  return copy;
}
