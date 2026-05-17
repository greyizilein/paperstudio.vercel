import { Plus, Search, Pin, ArrowLeft, Crown, X, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CzarChatRowMenu } from "./CzarChatRowMenu";

interface Props {
  conversations: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose?: () => void;
  subscription: any;
  onUpgrade: () => void;
  onChanged: () => void;
  onLocalRemove?: (id: string) => void;
  onLocalRestore?: (conv: any) => void;
  userName?: string;
  isAdmin?: boolean;
  /** Desktop: render as a narrow icon rail when true. */
  collapsed?: boolean;
  /** Desktop collapse/expand toggle. */
  onToggleCollapsed?: () => void;
  /** Open a chat in a new tab (does not switch active conversation). */
  onOpenInNewTab?: (id: string) => void;
}

function groupByDate(convos: any[]) {
  const today: any[] = [], yesterday: any[] = [], last7: any[] = [], older: any[] = [];
  const now = Date.now();
  for (const c of convos) {
    const ageDays = (now - new Date(c.updated_at).getTime()) / 86400000;
    if (ageDays < 1) today.push(c);
    else if (ageDays < 2) yesterday.push(c);
    else if (ageDays < 7) last7.push(c);
    else older.push(c);
  }
  return { today, yesterday, last7, older };
}

export function CzarSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onClose,
  subscription,
  onUpgrade,
  onChanged,
  onLocalRemove,
  onLocalRestore,
  userName,
  isAdmin = false,
  collapsed = false,
  onToggleCollapsed,
  onOpenInNewTab,
}: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return conversations;
    const s = q.toLowerCase();
    return conversations.filter((c) => c.title?.toLowerCase().includes(s));
  }, [q, conversations]);

  const pinnedItems = useMemo(() => filtered.filter((c) => c.pinned), [filtered]);
  const unpinned = useMemo(() => filtered.filter((c) => !c.pinned), [filtered]);
  const groups = groupByDate(unpinned);

  const startRename = (c: any) => {
    setRenamingId(c.id);
    setRenameVal(c.title);
  };

  const commitRename = async () => {
    const id = renamingId;
    const val = renameVal.trim();
    setRenamingId(null);
    if (!id || !val) return;
    const { error } = await supabase
      .from("czar_conversations")
      .update({ title: val, renamed: true } as any)
      .eq("id", id);
    if (error) toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    onChanged();
  };

  const togglePin = async (c: any) => {
    const next = !c.pinned;
    const { error } = await supabase
      .from("czar_conversations")
      .update({ pinned: next } as any)
      .eq("id", c.id);
    if (error) {
      toast({ title: "Pin failed", description: error.message, variant: "destructive" });
      return;
    }
    onChanged();
  };

  const duplicate = async (c: any) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("czar_conversations")
      .insert({ user_id: uid, title: `${c.title} (copy)`, renamed: true } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Chat duplicated", description: data?.title });
    onChanged();
  };

  const archive = async (c: any) => {
    let undone = false;
    onLocalRemove?.(c.id);
    const timer = window.setTimeout(async () => {
      if (undone) return;
      const { error } = await supabase
        .from("czar_conversations")
        .update({ archived: true })
        .eq("id", c.id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        onLocalRestore?.(c);
      }
      onChanged();
    }, 4500);
    toast({
      title: "Chat deleted",
      description: c.title,
      action: (
        <button
          onClick={() => {
            undone = true;
            window.clearTimeout(timer);
            onLocalRestore?.(c);
          }}
          className="text-[11px] underline"
        >
          Undo
        </button>
      ) as any,
    });
  };

  const renderRow = (c: any) => {
    const active = activeId === c.id;
    return (
      <div
        key={c.id}
        className="group relative w-full text-left flex items-center gap-1 pr-1 mx-1"
        style={{ width: "calc(100% - 0.5rem)" }}
      >
        {renamingId === c.id ? (
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenamingId(null);
            }}
            className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none"
            style={{
              background: "var(--czar-surface-hover)",
              color: "var(--czar-text)",
              border: "1px solid var(--czar-border)",
            }}
          />
        ) : (
          <>
            <button
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                  onOpenInNewTab?.(c.id);
                } else {
                  onSelect(c.id);
                }
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onOpenInNewTab?.(c.id);
                }
              }}
              className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors text-left"
              style={{
                background: active ? "var(--czar-surface-hover)" : "transparent",
                color: active ? "var(--czar-text)" : "var(--czar-text-dim)",
                fontWeight: active ? 500 : 400,
              }}
            >
              {c.pinned ? (
                <Pin size={12} className="shrink-0 opacity-70" />
              ) : (
                <FileText size={12} className="shrink-0 opacity-60" />
              )}
              <span className="truncate">{c.title || "Untitled"}</span>
            </button>

            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <CzarChatRowMenu
                pinned={!!c.pinned}
                onRename={() => startRename(c)}
                onPinToggle={() => togglePin(c)}
                onDuplicate={() => duplicate(c)}
                onOpenInNewTab={() => onOpenInNewTab?.(c.id)}
                onDelete={() => archive(c)}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const Section = ({ label, items }: { label: string; items: any[] }) => {
    if (!items.length) return null;
    return (
      <div className="mb-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5"
          style={{ color: "var(--czar-text-faint)" }}
        >
          {label}
        </div>
        {items.map(renderRow)}
      </div>
    );
  };

  const wordsLeft = (() => {
    if (isAdmin) return null;
    if (!subscription) return null;
    if (subscription.tier === "none" || !subscription.tier) {
      return Math.max((subscription.bonus_words ?? 0) - (subscription.bonus_used ?? 0), 0);
    }
    return Math.max((subscription.word_limit ?? 0) - (subscription.words_used ?? 0), 0);
  })();

  // ============ Collapsed icon-rail mode (desktop only) ============
  if (collapsed) {
    return (
      <aside
        className="w-[56px] h-[100dvh] flex flex-col items-center min-h-0 py-3 gap-2"
        style={{
          background: "var(--czar-bg-elev)",
          borderRight: "1px solid var(--czar-border)",
          color: "var(--czar-text)",
        }}
      >
        <button
          onClick={onToggleCollapsed}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
          style={{ color: "var(--czar-text-dim)" }}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          onClick={onNew}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: "color-mix(in srgb, var(--czar-accent) 14%, transparent)",
            color: "var(--czar-accent)",
            border: "1px solid color-mix(in srgb, var(--czar-accent) 22%, transparent)",
          }}
          title="New chat"
          aria-label="New chat"
        >
          <Plus size={14} strokeWidth={2.4} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => navigate("/dashboard")}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
          style={{ color: "var(--czar-text-dim)" }}
          title="Back to PaperStudio"
        >
          <ArrowLeft size={14} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="w-[268px] h-[100dvh] flex flex-col min-h-0 relative"
      style={{
        background: "var(--czar-bg-elev)",
        borderRight: "1px solid var(--czar-border)",
        color: "var(--czar-text)",
        backgroundImage:
          "radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--czar-accent) 9%, transparent) 0%, transparent 55%), linear-gradient(180deg, var(--czar-bg-elev) 0%, var(--czar-bg) 100%)",
        boxShadow: "inset -1px 0 0 color-mix(in srgb, var(--czar-accent) 8%, transparent)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="min-w-0">
          {userName ? (
            <>
              <p
                className="text-[10px] font-medium tracking-[0.18em] uppercase mb-0.5"
                style={{ color: "var(--czar-text-faint)" }}
              >
                Welcome back
              </p>
              <h2
                className="text-[19px] font-semibold leading-tight tracking-tight truncate"
                style={{ color: "var(--czar-text)", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                {userName}
              </h2>
            </>
          ) : (
            <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--czar-text)" }}>CZAR</h2>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 shrink-0">
          <button
            onClick={onNew}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              background: "color-mix(in srgb, var(--czar-accent) 14%, transparent)",
              color: "var(--czar-accent)",
              border: "1px solid color-mix(in srgb, var(--czar-accent) 22%, transparent)",
            }}
            title="New chat"
            aria-label="New chat"
          >
            <Plus size={14} strokeWidth={2.4} />
          </button>
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center hover:opacity-80"
              style={{ color: "var(--czar-text-dim)" }}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
              style={{ color: "var(--czar-text-dim)" }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Hairline divider with accent dot */}
      <div className="px-5 pb-3 flex items-center gap-2">
        <span className="block w-1 h-1 rounded-full shrink-0" style={{ background: "var(--czar-accent)" }} />
        <span
          className="flex-1 h-px"
          style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--czar-accent) 30%, transparent) 0%, transparent 100%)" }}
        />
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--czar-text-faint)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            className="w-full text-[12.5px] rounded-xl pl-8 pr-3 py-2 outline-none"
            style={{
              background: "color-mix(in srgb, var(--czar-bg) 70%, transparent)",
              color: "var(--czar-text)",
              border: "1px solid var(--czar-border)",
            }}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 px-1">
        <Section label="Pinned" items={pinnedItems} />
        <Section label="Today" items={groups.today} />
        <Section label="Yesterday" items={groups.yesterday} />
        <Section label="Last 7 days" items={groups.last7} />
        <Section label="Older" items={groups.older} />
        {!filtered.length && (
          <div className="text-center text-[12px] mt-10 px-6 leading-relaxed" style={{ color: "var(--czar-text-faint)" }}>
            {q ? "No matching chats." : "No conversations yet.\nStart with a question or a brief."}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 p-3 space-y-2"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--czar-accent) 10%, var(--czar-border))",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--czar-accent) 5%, transparent) 100%)",
        }}
      >
        <button
          onClick={isAdmin ? undefined : onUpgrade}
          disabled={isAdmin}
          className="w-full group relative overflow-hidden rounded-xl px-3.5 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, var(--czar-accent) 0%, color-mix(in srgb, var(--czar-accent) 70%, #000) 100%)",
            color: "var(--czar-accent-fg)",
            boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--czar-accent) 50%, transparent)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--czar-accent-fg) 18%, transparent)" }}
            >
              <Crown size={14} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight">{isAdmin ? "Admin CZAR" : "Upgrade CZAR"}</div>
              <div className="text-[10px] opacity-80 leading-tight mt-0.5">{isAdmin ? "Unlimited access active" : "Unlock unlimited words"}</div>
            </div>
          </div>
        </button>

        {isAdmin && (
          <div
            className="text-[10.5px] px-3 py-1.5 rounded-lg"
            style={{ color: "var(--czar-text-faint)", background: "color-mix(in srgb, var(--czar-bg) 60%, transparent)" }}
          >
            PhD · unlimited words
          </div>
        )}

        {wordsLeft !== null && (
          <div
            className="text-[10.5px] px-3 py-1.5 rounded-lg"
            style={{ color: "var(--czar-text-faint)", background: "color-mix(in srgb, var(--czar-bg) 60%, transparent)" }}
          >
            {subscription?.tier && subscription.tier !== "none"
              ? `${subscription.tier} · ${wordsLeft.toLocaleString()} words left`
              : `${wordsLeft.toLocaleString()} free words remaining`}
          </div>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] font-medium hover:opacity-100"
          style={{ color: "var(--czar-text-dim)", opacity: 0.85 }}
        >
          <ArrowLeft size={12} /> Back to PaperStudio
        </button>
      </div>
    </aside>
  );
}
