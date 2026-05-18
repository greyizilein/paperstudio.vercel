import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Props {
  rect: DOMRect;
  isLoading: boolean;
  activeAction: string | null;
  onAction: (action: string) => void;
}

const ACTIONS = [
  { id: "rewrite",  label: "Rewrite",  icon: "↺" },
  { id: "simplify", label: "Simplify", icon: "↔" },
  { id: "expand",   label: "Expand",   icon: "+"  },
  { id: "explain",  label: "Explain",  icon: "?"  },
  { id: "fix",      label: "Fix",      icon: "✓" },
  { id: "cite",     label: "Cite",     icon: "‟"  },
];

export function ContextualToolbar({ rect, isLoading, activeAction, onAction }: Props) {
  const toolbarWidth = Math.min(340, window.innerWidth - 16);

  // Prefer below so browser's native copy/paste menu (above) doesn't collide
  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - toolbarWidth / 2;

  if (top + 44 > window.innerHeight - 8) top = rect.top - 52;
  if (left < 8) left = 8;
  if (left + toolbarWidth > window.innerWidth - 8) left = window.innerWidth - toolbarWidth - 8;

  return (
    <div
      id="contextual-toolbar"
      className="fixed z-[200] flex items-center gap-0.5 bg-foreground text-background rounded-2xl px-1.5 py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-x-auto scrollbar-hide"
      style={{ top, left, maxWidth: toolbarWidth }}
      // preventDefault on pointerdown stops the browser from clearing the text selection
      // when the user moves their pointer/finger to the toolbar.
      onPointerDown={(e) => e.preventDefault()}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          // Use pointerDown so the action fires while the selection is still live.
          onPointerDown={(e) => {
            e.preventDefault();
            if (!isLoading) onAction(a.id);
          }}
          disabled={isLoading}
          title={a.label}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all select-none flex-shrink-0",
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
          <span className="hidden min-[360px]:inline">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
