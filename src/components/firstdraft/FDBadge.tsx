import React from "react";
import { cn } from "@/lib/utils";

const colors = {
  default: "bg-secondary text-muted-foreground border-border",
  brand: "bg-primary/10 text-primary border-primary/20",
  green: "bg-green/10 text-green border-green/20",
  blue: "bg-aqua/10 text-aqua border-aqua/20",
  orange: "bg-yellow/10 text-yellow border-yellow/20",
  pink: "bg-pink/10 text-pink border-pink/20",
};

export const FDBadge = ({ children, color = "default" }: { children: React.ReactNode; color?: keyof typeof colors }) => (
  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", colors[color])}>
    {children}
  </span>
);
