import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chapter } from "@/types/project";
import { cn } from "@/lib/utils";

interface Props {
  chapters: Chapter[];
  onSave: (newOrder: Chapter[]) => void;
  onClose: () => void;
}

function SortableChapter({ chapter, index }: { chapter: Chapter; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background transition-shadow",
        isDragging && "shadow-lg opacity-80 z-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div
        className={cn(
          "w-7 h-7 rounded-full text-[11px] font-extrabold flex items-center justify-center flex-shrink-0",
          chapter.status === "completed"
            ? "bg-green/15 text-green"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {chapter.status === "completed" ? "✓" : chapter.type === "abstract" ? "A" : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">{chapter.title}</p>
        <p className="text-[11px] text-muted-foreground capitalize">{chapter.type.replace(/_/g, " ")} · {(chapter.word_count_target || 0).toLocaleString()} words</p>
      </div>
      {chapter.status === "completed" && (
        <span className="text-[10px] font-bold text-green bg-green/10 px-2 py-0.5 rounded-full flex-shrink-0">Done</span>
      )}
    </div>
  );
}

export function ReorderChaptersModal({ chapters, onSave, onClose }: Props) {
  const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);
  const [items, setItems] = useState<Chapter[]>(sorted);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(c => c.id === active.id);
        const newIdx = prev.findIndex(c => c.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const nonAbstract = items.filter(c => c.type !== "abstract");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
      <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Reorder Chapters</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Drag to rearrange · changes save when you click Save</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {items.map((ch) => {
                const displayIdx = ch.type === "abstract" ? -1 : nonAbstract.findIndex(c => c.id === ch.id) + 1;
                return <SortableChapter key={ch.id} chapter={ch} index={displayIdx} />;
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            onClick={() => onSave(items)}
            className="px-5 py-2 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-80 transition-opacity"
          >
            Save order
          </button>
        </div>
      </div>
    </div>
  );
}
