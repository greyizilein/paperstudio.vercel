import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <Link to="/" className={cn("flex items-center", className)}>
    <span className="text-[22px] font-heading font-black text-primary tracking-tight">
      PAPERSTUDIO
    </span>
  </Link>
);
