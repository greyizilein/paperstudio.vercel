import { Sparkles } from "lucide-react";

interface Props {
  suggestions: string[];
  onPick: (s: string) => void;
}

export function CzarFollowups({ suggestions, onPick }: Props) {
  if (!suggestions?.length) return null;
  return (
    <div className="mt-4 pt-3 border-t flex flex-col gap-1.5" style={{ borderColor: "var(--czar-border)" }}>
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--czar-text-faint)" }}>
        <Sparkles size={10} /> Suggested
      </span>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            className="text-left text-[12px] px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "var(--czar-surface)",
              border: "1px solid var(--czar-border)",
              color: "var(--czar-text)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
