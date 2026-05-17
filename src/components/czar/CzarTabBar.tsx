import { FileText, Plus, X } from "lucide-react";

interface TabItem {
  id: string;
  title: string;
}

interface Props {
  tabs: TabItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function CzarTabBar({ tabs, activeId, onSelect, onClose, onNew }: Props) {
  if (tabs.length === 0) {
    return (
      <div
        className="hidden lg:flex items-center gap-1 px-3 h-9 shrink-0"
        style={{
          background: "var(--czar-bg-elev)",
          borderBottom: "1px solid var(--czar-border)",
        }}
      >
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] hover:bg-black/5 transition-colors"
          style={{ color: "var(--czar-text-dim)" }}
          title="New chat"
        >
          <Plus size={12} /> New chat
        </button>
      </div>
    );
  }

  return (
    <div
      className="hidden lg:flex items-stretch gap-0.5 px-2 h-9 shrink-0 overflow-x-auto no-scrollbar"
      style={{
        background: "var(--czar-bg-elev)",
        borderBottom: "1px solid var(--czar-border)",
      }}
    >
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            onMouseDown={(e) => {
              // middle-click closes
              if (e.button === 1) {
                e.preventDefault();
                onClose(t.id);
              }
            }}
            className="group flex items-center gap-1.5 pl-2.5 pr-1 max-w-[200px] cursor-pointer transition-colors relative"
            style={{
              background: active ? "var(--czar-bg)" : "transparent",
              color: active ? "var(--czar-text)" : "var(--czar-text-dim)",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderTop: active ? "1px solid var(--czar-border)" : "1px solid transparent",
              borderLeft: active ? "1px solid var(--czar-border)" : "1px solid transparent",
              borderRight: active ? "1px solid var(--czar-border)" : "1px solid transparent",
              borderBottom: active ? "1px solid var(--czar-bg)" : "none",
              marginBottom: active ? -1 : 0,
              fontWeight: active ? 500 : 400,
            }}
            title={t.title}
          >
            <FileText size={12} className="shrink-0 opacity-70" />
            <span className="truncate text-[12px] flex-1">{t.title || "Untitled"}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.id);
              }}
              className="p-0.5 rounded hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              aria-label="Close tab"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNew}
        className="flex items-center justify-center w-7 h-7 self-center rounded-md hover:bg-black/5 transition-colors ml-1"
        style={{ color: "var(--czar-text-dim)" }}
        title="New chat"
        aria-label="New chat"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
