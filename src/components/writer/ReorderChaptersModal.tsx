import { useState } from "react";
import {
  GripVertical, X, Plus, Trash2, RotateCcw, Check, PenLine,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chapter } from "@/types/project";
import { cn } from "@/lib/utils";

const CHAPTER_TYPES = [
  { value: "abstract",          label: "Abstract" },
  { value: "introduction",      label: "Introduction" },
  { value: "literature_review", label: "Literature Review" },
  { value: "methodology",       label: "Methodology" },
  { value: "findings",          label: "Findings / Results" },
  { value: "discussion",        label: "Discussion" },
  { value: "conclusion",        label: "Conclusion" },
  { value: "custom",            label: "Custom / Other" },
];

interface RowState extends Chapter {
  isNew?: boolean;
  isDeleted?: boolean;
  editingTitle?: boolean;
  editingWc?: boolean;
  draftTitle?: string;
  draftWc?: string;
}

interface Props {
  chapters: Chapter[];
  projectId: string;
  userId: string;
  onSave: (result: { chapters: Chapter[]; deletedIds: string[] }) => void;
  onClose: () => void;
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  row,
  displayIdx,
  onChange,
  onDelete,
  onRestore,
}: {
  row: RowState;
  displayIdx: number;
  onChange: (patch: Partial<RowState>) => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id, disabled: !!row.isDeleted });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (row.isDeleted) {
    return (
      <div ref={setNodeRef} style={style}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed border-border bg-secondary/20 opacity-50">
        <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <Trash2 size={12} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-muted-foreground line-through truncate">{row.title}</p>
          <p className="text-[11px] text-muted-foreground/50">will be deleted</p>
        </div>
        <button onClick={onRestore} title="Undo delete"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary">
          <RotateCcw size={11} /> Restore
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-background transition-all",
        isDragging ? "shadow-xl border-primary/40 opacity-90 z-50" : "border-border",
        row.isNew && "border-emerald-500/30 bg-emerald-500/5"
      )}>
      {/* Drag handle */}
      <button {...attributes} {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5">
        <GripVertical size={15} />
      </button>

      {/* Badge */}
      <div className={cn(
        "w-7 h-7 rounded-full text-[11px] font-extrabold flex items-center justify-center flex-shrink-0",
        row.status === "completed" ? "bg-green/15 text-green" : "bg-secondary text-muted-foreground"
      )}>
        {row.status === "completed" ? "✓" : row.type === "abstract" ? "A" : displayIdx}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        {row.editingTitle ? (
          <input autoFocus
            value={row.draftTitle ?? row.title}
            onChange={e => onChange({ draftTitle: e.target.value })}
            onBlur={() => {
              const t = (row.draftTitle ?? row.title).trim();
              onChange({ title: t || row.title, draftTitle: undefined, editingTitle: false });
            }}
            onKeyDown={e => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") onChange({ draftTitle: undefined, editingTitle: false });
            }}
            className="w-full text-[13px] font-semibold bg-secondary/50 border border-primary/40 rounded-md px-2 py-0.5 outline-none text-foreground"
          />
        ) : (
          <button onClick={() => onChange({ editingTitle: true, draftTitle: row.title })}
            title="Click to rename" className="flex items-center gap-1 group text-left w-full">
            <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{row.title}</p>
            <PenLine size={10} className="flex-shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
          </button>
        )}

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <select value={row.type} onChange={e => onChange({ type: e.target.value })}
            className="text-[10px] text-muted-foreground bg-transparent border-none outline-none cursor-pointer hover:text-foreground transition-colors appearance-none">
            {CHAPTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          {row.editingWc ? (
            <input autoFocus type="number"
              value={row.draftWc ?? String(row.word_count_target || 0)}
              onChange={e => onChange({ draftWc: e.target.value })}
              onBlur={() => {
                const wc = parseInt(row.draftWc || "0", 10);
                onChange({ word_count_target: isNaN(wc) ? row.word_count_target : wc, draftWc: undefined, editingWc: false });
              }}
              onKeyDown={e => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") onChange({ draftWc: undefined, editingWc: false });
              }}
              className="w-16 text-[10px] bg-secondary/50 border border-primary/40 rounded px-1 py-0.5 outline-none text-foreground"
            />
          ) : (
            <button onClick={() => onChange({ editingWc: true, draftWc: String(row.word_count_target || 0) })}
              title="Click to edit word count"
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {(row.word_count_target || 0).toLocaleString()}w
            </button>
          )}
          {row.isNew && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">NEW</span>
          )}
        </div>
      </div>

      {row.status === "completed" && !row.isNew && (
        <span className="text-[10px] font-bold text-green bg-green/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Done</span>
      )}

      <button onClick={onDelete}
        title={row.status === "completed" ? "Delete (content will be lost)" : "Delete chapter"}
        className="flex-shrink-0 w-7 h-7 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Add chapter form ──────────────────────────────────────────────────────────

function AddChapterForm({ onAdd }: { onAdd: (ch: RowState) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("custom");
  const [wc, setWc] = useState("3000");

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      order_index: 0,
      title: title.trim(),
      type,
      content: "",
      status: "pending",
      word_count_target: parseInt(wc, 10) || 3000,
      word_count_actual: 0,
      isNew: true,
    } as RowState);
    setTitle(""); setType("custom"); setWc("3000");
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-[13px] font-semibold">
        <Plus size={15} /> Add chapter
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">New chapter</span>
        <button onClick={() => setOpen(false)}><X size={14} className="text-muted-foreground hover:text-foreground" /></button>
      </div>
      <input autoFocus
        placeholder="Chapter title (e.g. Chapter 5: Analysis of Findings)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        className="w-full text-[13px] bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
      />
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)}
          className="flex-1 text-[12px] bg-background border border-border rounded-lg px-2.5 py-2 outline-none focus:border-primary text-foreground">
          {CHAPTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="number" value={wc} onChange={e => setWc(e.target.value)}
          placeholder="Words"
          className="w-24 text-[12px] bg-background border border-border rounded-lg px-2.5 py-2 outline-none focus:border-primary text-foreground" />
        <button onClick={submit} disabled={!title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[12px] font-bold hover:opacity-80 disabled:opacity-40 transition-opacity">
          <Check size={12} /> Add
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        The AI will generate this chapter using your project's research objectives, title, and methodology — including any heading structure you set later.
      </p>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ReorderChaptersModal({ chapters, projectId, userId, onSave, onClose }: Props) {
  const [rows, setRows] = useState<RowState[]>(() =>
    [...chapters].sort((a, b) => a.order_index - b.order_index).map(ch => ({ ...ch }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows(prev => {
        const ai = prev.findIndex(r => r.id === active.id);
        const oi = prev.findIndex(r => r.id === over.id);
        return arrayMove(prev, ai, oi);
      });
    }
  };

  const updateRow = (id: string, patch: Partial<RowState>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const handleSave = () => {
    const deletedIds = rows.filter(r => r.isDeleted && !r.isNew).map(r => r.id);
    const surviving = rows
      .filter(r => !r.isDeleted)
      .map(({ isNew, isDeleted, editingTitle, editingWc, draftTitle, draftWc, ...ch }) => ch as Chapter);
    onSave({ chapters: surviving, deletedIds });
  };

  const activeRows = rows.filter(r => !r.isDeleted);
  const deletedRows = rows.filter(r => r.isDeleted);
  const nonAbstract = activeRows.filter(r => r.type !== "abstract");

  const hasChanges =
    rows.some(r => r.isNew || r.isDeleted) ||
    rows.some((r, i) => chapters.sort((a,b)=>a.order_index-b.order_index)[i]?.id !== r.id) ||
    rows.some(r => {
      const orig = chapters.find(c => c.id === r.id);
      return orig && (orig.title !== r.title || orig.type !== r.type || orig.word_count_target !== r.word_count_target);
    });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Manage Chapters</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Drag to reorder · click title or type to edit · + to add new
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map(row => {
                const displayIdx = row.type === "abstract" ? -1 : nonAbstract.findIndex(r => r.id === row.id) + 1;
                return (
                  <SortableRow
                    key={row.id}
                    row={row}
                    displayIdx={displayIdx}
                    onChange={patch => updateRow(row.id, patch)}
                    onDelete={() => {
                      if (row.isNew) {
                        setRows(prev => prev.filter(r => r.id !== row.id));
                      } else {
                        updateRow(row.id, { isDeleted: true });
                      }
                    }}
                    onRestore={() => updateRow(row.id, { isDeleted: false })}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          <AddChapterForm onAdd={ch => setRows(prev => [...prev, ch])} />

          {deletedRows.length > 0 && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-[11px] text-red-600 dark:text-red-400">
              ⚠ {deletedRows.length} chapter{deletedRows.length > 1 ? "s" : ""} will be permanently deleted.
              {deletedRows.some(r => r.status === "completed") && " Completed chapters will lose their content."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <div className="flex items-center gap-3">
            {hasChanges && <span className="text-[11px] text-muted-foreground italic">Unsaved changes</span>}
            <button onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-foreground text-background text-[13px] font-bold hover:opacity-80 transition-opacity">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
