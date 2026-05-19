import { useState } from "react";
import { MessageSquare, PlusCircle, Trash2, StickyNote, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface FeedbackItem {
  id: string;
  type: "comment" | "insertion" | "deletion" | "note";
  comment: string;
  target_excerpt?: string;
  suggested_replacement?: string;
  author?: string;
  selected?: boolean;
  override?: string;
  scope?: "local" | "chapter";
}

interface Props {
  items: FeedbackItem[];
  applying?: boolean;
  onApply: (selected: FeedbackItem[]) => void;
}

const TYPE_META: Record<string, { label: string; Icon: any; color: string }> = {
  comment:   { label: "COMMENT",   Icon: MessageSquare, color: "bg-blue-100 text-blue-700" },
  insertion: { label: "INSERT",    Icon: PlusCircle,    color: "bg-emerald-100 text-emerald-700" },
  deletion:  { label: "DELETE",    Icon: Trash2,        color: "bg-red-100 text-red-700" },
  note:      { label: "NOTE",      Icon: StickyNote,    color: "bg-amber-100 text-amber-700" },
};

function confidence(item: FeedbackItem): { label: string; cls: string } {
  if (item.target_excerpt && item.target_excerpt.length > 20) return { label: "Clear", cls: "text-emerald-600" };
  if (item.comment.length > 40 || item.suggested_replacement) return { label: "Interpreted", cls: "text-amber-600" };
  return { label: "Inferred", cls: "text-orange-500" };
}

export function FeedbackCard({ items: initialItems, applying = false, onApply }: Props) {
  const [items, setItems] = useState<FeedbackItem[]>(
    () => initialItems.map((i) => ({ ...i, selected: true }))
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selected = items.filter((i) => i.selected);
  const counts = { comment: 0, insertion: 0, deletion: 0, note: 0 } as Record<string, number>;
  for (const it of items) counts[it.type] = (counts[it.type] || 0) + 1;

  return (
    <div
      className="rounded-xl border overflow-hidden my-2"
      style={{ background: "var(--czar-surface)", borderColor: "var(--czar-border)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-start justify-between gap-2" style={{ borderColor: "var(--czar-border)" }}>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--czar-text)" }}>
            Found {items.length} feedback item{items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--czar-text-dim)" }}>
            {Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}${n !== 1 ? "s" : ""}`).join(" · ")}
          </p>
        </div>
        <button
          onClick={() => setItems((prev) => {
            const allSelected = prev.every((i) => i.selected);
            return prev.map((i) => ({ ...i, selected: !allSelected }));
          })}
          className="text-[11px] px-2 py-1 rounded hover:opacity-80 transition-opacity"
          style={{ color: "var(--czar-text-dim)", border: "1px solid var(--czar-border)" }}
        >
          {items.every((i) => i.selected) ? "Deselect all" : "Select all"}
        </button>
      </div>

      {/* Items */}
      <div className="divide-y" style={{ borderColor: "var(--czar-border)" }}>
        {items.map((item) => {
          const meta = TYPE_META[item.type] || TYPE_META.note;
          const { Icon } = meta;
          const conf = confidence(item);
          const isExpanded = expanded.has(item.id);
          const hasDetail = !!(item.target_excerpt || item.suggested_replacement);

          return (
            <div
              key={item.id}
              className={cn("px-4 py-3 transition-colors", item.selected ? "" : "opacity-50")}
              style={{ background: item.selected ? undefined : "transparent" }}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.selected ?? true}
                  onCheckedChange={() => toggle(item.id)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded", meta.color)}>
                      <Icon size={9} />
                      {meta.label}
                    </span>
                    <span className={cn("text-[10px] font-medium", conf.cls)}>{conf.label}</span>
                    {item.author && (
                      <span className="text-[10px]" style={{ color: "var(--czar-text-faint)" }}>{item.author}</span>
                    )}
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--czar-text)" }}>
                    {item.comment}
                  </p>
                  {hasDetail && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] hover:opacity-80"
                      style={{ color: "var(--czar-text-dim)" }}
                    >
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {isExpanded ? "Hide" : "Show"} excerpt
                    </button>
                  )}
                  {isExpanded && hasDetail && (
                    <div className="mt-2 space-y-1.5">
                      {item.target_excerpt && (
                        <div className="rounded p-2 text-[11px] font-mono" style={{ background: "var(--czar-bg)", color: "var(--czar-text-dim)", border: "1px solid var(--czar-border)" }}>
                          <span className="text-[10px] font-sans font-semibold block mb-1" style={{ color: "var(--czar-text-faint)" }}>Original excerpt</span>
                          "{item.target_excerpt}"
                        </div>
                      )}
                      {item.suggested_replacement && (
                        <div className="rounded p-2 text-[11px] font-mono" style={{ background: "rgba(16,185,129,0.06)", color: "var(--czar-text-dim)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <span className="text-[10px] font-sans font-semibold block mb-1 text-emerald-600">Suggested replacement</span>
                          "{item.suggested_replacement}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--czar-border)" }}>
        <span className="text-[11px]" style={{ color: "var(--czar-text-dim)" }}>
          {selected.length} of {items.length} selected
        </span>
        <button
          onClick={() => onApply(selected)}
          disabled={applying || selected.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
        >
          {applying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {applying ? "Applying…" : `Apply ${selected.length} correction${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
