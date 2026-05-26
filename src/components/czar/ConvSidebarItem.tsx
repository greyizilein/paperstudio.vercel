import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConvSidebarItemProps {
  item: { id: string; title: string };
  onDelete: () => void;
  onRename: (id: string) => void;
}

export const ConvSidebarItem = ({ item, onDelete, onRename }: ConvSidebarItemProps) => (
  <motion.div
    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent group cursor-pointer"
    drag="x"
    dragConstraints={{ left: -100, right: 100 }}
    onDragEnd={(_, info) => {
      if (info.offset.x > 50) onDelete();
      if (info.offset.x < -50) onRename(item.id);
    }}
  >
    <span className="flex-1 text-sm truncate">{item.title}</span>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity">
          <Trash2 className="w-4 h-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onDelete} className="bg-destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </motion.div>
);
