import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useAnimation, type PanInfo } from "framer-motion";
import {
  Plus, Search, FileText, Pencil, Trash2, X, Check, ChevronRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { CzarConversation } from "@/lib/czarStream";

interface Props {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onConvsChange?: (convs: CzarConversation[]) => void;
}

// ── Date grouping ──────────────────────────────────────────────────────────────

function groupConvs(convs: CzarConversation[]): { label: string; items: CzarConversation[] }[] {
  const now = new Date();
  const groups = [
    { label: "Today",     items: [] as CzarConversation[] },
    { label: "Yesterday", items: [] as CzarConversation[] },
    { label: "This week", items: [] as CzarConversation[] },
    { label: "Older",     items: [] as CzarConversation[] },
  ];
  for (const c of convs) {
    const d   = new Date(c.updated_at ?? c.created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if      (diff === 0) groups[0].items.push(c);
    else if (diff === 1) groups[1].items.push(c);
    else if (diff < 7)   groups[2].items.push(c);
    else                 groups[3].items.push(c);
  }
  return groups.filter(g => g.items.length > 0);
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, collapsed, onToggle }: {
  label: string; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 w-full px-2 py-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none"
    >
      <ChevronRight
        size={9}
        className={cn("transition-transform duration-150 flex-shrink-0", !collapsed && "rotate-90")}
      />
      {label}
    </button>
  );
}

// ── Conversation item ──────────────────────────────────────────────────────────

interface ConvItemProps {
  c: CzarConversation;
  isActive: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onRequestDelete: () => void;
  renamingId: string | null;
  renameVal: string;
  setRenameVal: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
}

function ConvItem({
  c, isActive, onSelect, onStartRename, onRequestDelete,
  renamingId, renameVal, setRenameVal, commitRename, cancelRename,
}: ConvItemProps) {
  const controls  = useAnimation();
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId === c.id) renameRef.current?.focus();
  }, [renamingId, c.id]);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x > threshold) {
      await controls.start({ x: 0, transition: { type: "spring", stiffness: 300 } });
      onRequestDelete();
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: 0, transition: { type: "spring", stiffness: 300 } });
      onStartRename();
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300 } });
    }
  }, [controls, onRequestDelete, onStartRename]);

  return (
    <motion.div
      animate={controls}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-1.5 px-2 py-[5px] rounded cursor-pointer transition-colors select-none",
        isActive
          ? "bg-sidebar-accent text-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
      style={{ touchAction: "pan-y" }}
    >
      <FileText size={11} className="flex-shrink-0 opacity-40 mt-px" />

      <div className="flex-1 min-w-0">
        {renamingId === c.id ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              ref={renameRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
              onBlur={commitRename}
              className="flex-1 text-[12px] bg-background border border-primary/40 rounded px-1.5 py-0.5 focus:outline-none text-foreground"
            />
            <button type="button" onClick={commitRename} className="text-primary flex-shrink-0">
              <Check size={11} />
            </button>
          </div>
        ) : (
          <p className="text-[12px] font-medium truncate leading-tight">
            {c.title || "New conversation"}
          </p>
        )}
      </div>

      {/* Hover action buttons — desktop */}
      {renamingId !== c.id && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-sidebar-accent rounded px-0.5 py-0.5">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onStartRename(); }}
            className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Rename"
          >
            <Pencil size={9} />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRequestDelete(); }}
            className="p-0.5 text-muted-foreground hover:text-destructive rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={9} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────────

export function ConvSidebar({ currentId, onSelect, onNew, onConvsChange }: Props) {
  const [convs, setConvs]               = useState<CzarConversation[]>([]);
  const [search, setSearch]             = useState("");
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameVal, setRenameVal]       = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed]       = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, [currentId]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("czar_conversations" as any)
      .select("id, title, mode, created_at, last_message, updated_at")
      .eq("user_id", u.user.id)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (data) {
      const list = data as CzarConversation[];
      setConvs(list);
      onConvsChange?.(list);
    }
  };

  const toggleSection = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const startRename = (c: CzarConversation) => {
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

  const cancelRename = () => setRenamingId(null);

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await supabase.from("czar_conversations" as any).delete().eq("id", confirmDeleteId);
    setConvs(prev => prev.filter(c => c.id !== confirmDeleteId));
    if (currentId === confirmDeleteId) onNew();
    setConfirmDeleteId(null);
  };

  const filtered = convs.filter(c =>
    !search || (c.title || c.last_message || "").toLowerCase().includes(search.toLowerCase())
  );

  const groups = search ? [{ label: "Results", items: filtered }] : groupConvs(filtered);

  return (
    <>
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground select-none">

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1.5 flex-shrink-0 border-b border-border/40">
          <span className="text-[11px] font-bold tracking-tight text-foreground/70">CZAR</span>
          <button
            type="button"
            onClick={onNew}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
            title="New conversation"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 flex-shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-6 pr-3 py-1 text-[12px] rounded bg-secondary/60 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Swipe hint — touch only */}
        <p className="px-3 pb-1 text-[9.5px] text-muted-foreground/30 flex-shrink-0 md:hidden">
          Swipe → delete · ← rename
        </p>

        {/* Conversation list — grouped */}
        <div className="flex-1 overflow-y-auto px-1 pb-2">
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 text-center px-4">
              <FileText size={18} className="text-muted-foreground/20 mb-2" />
              <p className="text-[11px] text-muted-foreground/50">
                {search ? "No results" : "No conversations yet"}
              </p>
            </div>
          )}

          {groups.map(({ label, items }) => (
            <div key={label}>
              <SectionHeader
                label={label}
                collapsed={!!collapsed[label]}
                onToggle={() => toggleSection(label)}
              />
              {!collapsed[label] && items.map(c => (
                <ConvItem
                  key={c.id}
                  c={c}
                  isActive={c.id === currentId}
                  onSelect={() => onSelect(c.id)}
                  onStartRename={() => startRename(c)}
                  onRequestDelete={() => setConfirmDeleteId(c.id)}
                  renamingId={renamingId}
                  renameVal={renameVal}
                  setRenameVal={setRenameVal}
                  commitRename={commitRename}
                  cancelRename={cancelRename}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6 pb-2">This cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
