import { useEffect, useState } from "react";
import { UserRoundCheck, Check, Loader2 } from "lucide-react";

interface Props {
  /** True while the agent turn is streaming. */
  active: boolean;
  /** Word count produced so far (live). */
  words?: number;
  /** Number of attached source files. */
  files?: number;
  /** Number of in-flight image jobs. */
  imageJobs?: number;
  /** Set true once the auto-download has fired. */
  downloaded?: boolean;
  /** Re-trigger download (shown after run completes). */
  onRedownload?: () => void;
}

/**
 * Docked status card shown above the thread during an Agent run.
 * Compact, single small box, ticks each phase off as it happens.
 */
export function CzarAgentRunCard({
  active,
  words = 0,
  files = 0,
  imageJobs = 0,
  downloaded = false,
  onRedownload,
}: Props) {
  const [phase, setPhase] = useState<"reading" | "planning" | "writing" | "figures" | "packaging" | "done">("reading");

  useEffect(() => {
    if (!active && downloaded) { setPhase("done"); return; }
    if (!active) return;
    if (words > 50) setPhase("writing");
    else if (words > 0) setPhase("planning");
    else setPhase("reading");
    if (imageJobs > 0) setPhase("figures");
  }, [active, words, imageJobs, downloaded]);

  const Step = ({ k, label }: { k: typeof phase; label: string }) => {
    const order: Record<typeof phase, number> = { reading: 0, planning: 1, writing: 2, figures: 3, packaging: 4, done: 5 };
    const isDone = order[k] < order[phase] || phase === "done";
    const isCurrent = order[k] === order[phase] && phase !== "done";
    return (
      <div className="flex items-center gap-2 text-[11.5px]" style={{ color: isDone || isCurrent ? "var(--czar-text)" : "var(--czar-text-faint)" }}>
        {isDone ? (
          <Check size={11} style={{ color: "var(--czar-accent)" }} />
        ) : isCurrent ? (
          <Loader2 size={11} className="animate-spin" style={{ color: "var(--czar-accent)" }} />
        ) : (
          <span className="w-[11px] h-[11px] inline-block rounded-full" style={{ border: "1px solid var(--czar-border)" }} />
        )}
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div
      className="mx-auto max-w-3xl my-2 rounded-2xl px-3.5 py-2.5"
      style={{
        background: "var(--czar-surface)",
        border: "1px solid var(--czar-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <UserRoundCheck size={13} style={{ color: "var(--czar-accent)" }} />
        <span className="text-[12px] font-semibold" style={{ color: "var(--czar-text)" }}>
          Agent run
        </span>
        <span className="ml-auto text-[10.5px]" style={{ color: "var(--czar-text-faint)" }}>
          {phase === "done" ? "Complete" : "Running…"}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Step k="reading" label={`Read brief${files > 0 ? ` · ${files} file${files === 1 ? "" : "s"}` : ""}`} />
        <Step k="planning" label="Plan locked" />
        <Step k="writing" label={`Writing${words > 0 ? ` · ${words.toLocaleString()} words` : ""}`} />
        {imageJobs > 0 && <Step k="figures" label={`Generating ${imageJobs} figure${imageJobs === 1 ? "" : "s"}`} />}
        <Step k="packaging" label="Packaging .docx" />
      </div>
      {phase === "done" && onRedownload && (
        <button
          onClick={onRedownload}
          className="mt-2 text-[11px] underline opacity-80 hover:opacity-100"
          style={{ color: "var(--czar-accent)" }}
        >
          Download again
        </button>
      )}
    </div>
  );
}
