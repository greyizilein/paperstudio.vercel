import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Pin, PinOff, Copy, Trash2, ExternalLink } from "lucide-react";

interface Props {
  pinned?: boolean;
  onRename: () => void;
  onPinToggle: () => void;
  onDuplicate: () => void;
  onOpenInNewTab: () => void;
  onDelete: () => void;
}

export function CzarChatRowMenu({
  pinned,
  onRename,
  onPinToggle,
  onDuplicate,
  onOpenInNewTab,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-md hover:bg-black/10 transition-opacity"
          style={{ color: "var(--czar-text-faint)" }}
          aria-label="More"
          title="More"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="w-48 text-[13px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={onOpenInNewTab}>
          <ExternalLink size={13} className="mr-2" /> Open in new tab
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Pencil size={13} className="mr-2" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPinToggle}>
          {pinned ? <PinOff size={13} className="mr-2" /> : <Pin size={13} className="mr-2" />}
          {pinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy size={13} className="mr-2" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 size={13} className="mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
