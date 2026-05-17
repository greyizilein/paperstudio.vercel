import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("h-2 bg-secondary rounded-full overflow-hidden", className)}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="h-full bg-primary"
    />
  </div>
);
