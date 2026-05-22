import { useEffect, useState, useRef } from "react";
import { Plus, Search, MessageSquare, Pencil, Trash2, X, Check, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CzarConversation } from "@/lib/czarStream";

interface Props {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ConvSidebar({ currentId, onSelect, onNew }: Props) {
  const [convs, setConvs] = useState<CzarConversation[]>([]);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [currentId]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("czar_conversations" as any)
      .select("id, title, mode, created_at, last_message, updated_at")
      .eq("user_id", u.user.id)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (data) setConvs(data as CzarConversation[]);
  };

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const startRename = (c: CzarConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameVal(c.title || "");
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const val = renameVal.trim();
    if (val) {
      await supabase.from("czar_conversations" as any).update({ title: val }).eq("id", renamingId);
      setConvs(prev => prev.map(c => c.id === renamingId ? { ...c, title: val } : c));
    }
    setRenamingId(null);
  };

  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("czar_conversations" as any).delete().eq("id", id);
    setConvs(prev => prev.filter(c => c.id !== id));
    if (currentId === id) onNew();
  };

  const filtered = convs.filter(c =>
    !search || (c.title || c.last_message || "").toLowerCase().includes(search.toLowerCase())
  );

  const modeColour: Record<string, string> = {
    write: "bg-blue-500/15 text-blue-500",
    correct: "bg-amber-500/15 text-amber-600",
    research: "bg-purple-500/15 text-purple-500",
    plan: "bg-emerald-500/15 text-emerald-600",
    chat: "bg-secondary text-muted-foreground",
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Conversations</span>
        <button
          onClick={onNew}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
          title="New conversation"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-7 pr-3 py-1.5 text-[12px] rounded-lg bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-px">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare size={20} className="text-muted-foreground/30 mb-2" />
            <p className="text-[11px] text-muted-foreground">
              {search ? "No results" : "No conversations yet"}
            </p>
          </div>
        )}
        {filtered.map(c => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
              currentId === c.id
                ? "bg-sidebar-accent text-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground"
            }`}
          >
            <MessageSquare size={13} className="mt-0.5 flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              {renamingId === c.id ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    ref={renameRef}
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={commitRename}
                    className="flex-1 text-[12px] bg-background border border-primary/40 rounded px-1.5 py-0.5 focus:outline-none text-foreground"
                  />
                  <button onClick={commitRename} className="text-primary"><Check size={11} /></button>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-medium truncate leading-tight">
                    {c.title || "New conversation"}
                  </p>
                  {c.last_message && (
                    <p className="text-[10.5px] text-muted-foreground truncate mt-0.5 leading-tight">
                      {c.last_message}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.mode && c.mode !== "chat" && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${modeColour[c.mode] || modeColour.chat}`}>
                        {c.mode}
                      </span>
                    )}
                    <span className="text-[9.5px] text-muted-foreground/50">
                      {timeLabel(c.created_at)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons — show on hover */}
            {renamingId !== c.id && (
              <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-sidebar-accent rounded-md p-0.5">
                <button
                  onClick={e => startRename(c, e)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  title="Rename"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={e => deleteConv(c.id, e)}
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
