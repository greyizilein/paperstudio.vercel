import { X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, reason }: Props) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap size={16} className="text-primary" />
            </div>
            <h2 className="text-[15px] font-bold text-foreground">Out of words</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
          {reason || "You've used all your CZAR words this period."} Top up to keep writing.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Later
          </button>
          <button
            onClick={() => { navigate("/settings?tab=billing"); onClose(); }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Get more words
          </button>
        </div>
      </div>
    </div>
  );
}
