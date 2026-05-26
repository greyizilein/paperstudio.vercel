import React from "react";
import { Check, X } from "lucide-react";

interface AtomicEditorProps {
  original: string;
  suggested: string;
  onAccept: () => void;
  onReject: () => void;
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({ original, suggested, onAccept, onReject }) => {
  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded text-sm text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800">
          <h4 className="font-bold mb-2 text-xs uppercase tracking-wide opacity-70">Original</h4>
          <p className="whitespace-pre-wrap">{original}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded text-sm text-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
          <h4 className="font-bold mb-2 text-xs uppercase tracking-wide opacity-70">Suggested</h4>
          <p className="whitespace-pre-wrap">{suggested}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-destructive transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Reject
        </button>
        <button
          onClick={onAccept}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Accept
        </button>
      </div>
    </div>
  );
};
