import React from "react";
import { cn } from "@/lib/utils";

interface FDButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "brand-outline" | "aqua";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  title?: string;
}

const variants = {
  primary: "bg-foreground text-background hover:bg-foreground/85 border-none shadow-md font-bold",
  secondary: "bg-background text-foreground hover:bg-secondary border border-foreground/20 font-semibold",
  outline: "bg-transparent text-foreground border border-foreground/30 hover:bg-foreground/5",
  "brand-outline": "bg-transparent text-foreground border border-foreground/40 hover:bg-foreground hover:text-background",
  aqua: "bg-foreground text-background hover:bg-foreground/85 border-none shadow-md font-bold",
  ghost: "bg-transparent text-foreground/70 hover:text-foreground hover:bg-foreground/5",
  danger: "bg-transparent text-foreground border border-foreground/30 hover:bg-foreground hover:text-background",
};

const sizes = {
  sm: "px-4 py-2 text-xs font-medium",
  md: "px-6 py-3 text-sm font-medium",
  lg: "px-8 py-4 text-base font-semibold",
};

export const FDButton = ({
  children, onClick, disabled, variant = "primary", size = "md", className, type = "button", title
}: FDButtonProps) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    title={title}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
      className
    )}
  >
    {children}
  </button>
);
