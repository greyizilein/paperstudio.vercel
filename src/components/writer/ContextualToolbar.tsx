import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  rect: DOMRect;
  isLoading: boolean;
  activeAction: string | null;
  onAction: (action: string) => void;
}

const ACTIONS = [
  { id: "rewrite", label: "Rewrite", icon: "↺" },
  { id: "simplify", label: "Simplify", icon: "↔" },
  { id: "expand", label: "Expand", icon: "+" },
  { id: "explain", label: "Explain", icon: "?" },
  { id: "fix", label: "Fix", icon: "✓" },
];

export function ContextualToolbar({ rect, isLoading, activeAction, onAction }: Props) {
  const toolbarHeight = 40;
  const toolbarWidth = 280; // approximate

  // Position above the selection, centered horizontally
  let top = rect.top - toolbarHeight - 6;
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;

  // Keep within viewport bounds
  if (top < 8) top = rect.bottom + 6; // flip below if no room above
  if (left < 8) left = 8;
  if (left + toolbarWidth > window.innerWidth - 8) left = window.innerWidth - toolbarWidth - 8;

  return (
    <div
      className="fixed z-[200] flex items-center gap-0.5 bg-foreground text-background rounded-2xl px-1.5 py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          onClick={() => onAction(a.id)}
          disabled={isLoading}
          title={a.label}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all select-none",
            activeAction === a.id
              ? "bg-background/25 text-background"
              : "hover:bg-background/15 text-background/80 hover:text-background",
            isLoading && activeAction !== a.id && "opacity-40 cursor-not-allowed"
          )}
        >
          {isLoading && activeAction === a.id ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <span className="text-[12px] leading-none">{a.icon}</span>
          )}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
