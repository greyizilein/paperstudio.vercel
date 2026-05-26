import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AtomicEditorProps {
  original: string;
  suggested: string;
  onAccept: () => void;
  onReject: () => void;
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({ original, suggested, onAccept, onReject }) => (
  <div className="border border-border rounded-xl p-4 bg-background shadow-sm space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive border border-destructive/20">
        <h4 className="font-semibold mb-2">Original:</h4>
        <p className="opacity-90">{original}</p>
      </div>
      <div className="bg-emerald-500/10 p-3 rounded-md text-sm text-emerald-900 border border-emerald-500/20">
        <h4 className="font-semibold mb-2">Suggested:</h4>
        <p>{suggested}</p>
      </div>
    </div>
    <div className="flex gap-2 justify-end border-t pt-3">
      <Button variant="ghost" size="sm" onClick={onReject}>
        <X className="w-4 h-4 mr-1" /> Reject
      </Button>
      <Button size="sm" onClick={onAccept} className="bg-emerald-600">
        <Check className="w-4 h-4 mr-1" /> Accept
      </Button>
    </div>
  </div>
);
