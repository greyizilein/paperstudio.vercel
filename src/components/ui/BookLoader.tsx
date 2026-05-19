import { cn } from "@/lib/utils";

interface BookLoaderProps {
  size?: number;
  label?: string | null;
  className?: string;
  fullScreen?: boolean;
  /** 0–100. When provided, renders a determinate ring + percentage. */
  progress?: number;
}

/**
 * PaperStudio loader: an academic page with a glowing scan beam that passes
 * over text lines, lighting each one up as it goes — representing AI reading
 * and generating your paper. Themed via design tokens so it fits everywhere.
 *
 * Pass `progress` (0–100) for a determinate progress ring + percent label.
 */
export function BookLoader({
  size = 84,
  label = "Loading…",
  className,
  fullScreen = false,
  progress,
}: BookLoaderProps) {
  const hasProgress = typeof progress === "number" && Number.isFinite(progress);
  const pct = hasProgress ? Math.max(0, Math.min(100, progress!)) : 0;

  const ringSize = size + 16;
  const stroke = 3;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  // Viewbox is 64×82. Page sits at (4,2)→(60,76), lines inside.
  const svg = (
    <svg
      width={size}
      height={size * (82 / 64)}
      viewBox="0 0 64 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
      className="select-none"
    >
      {/* Gradient for scan beam */}
      <defs>
        <linearGradient id="ps-beam-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0" />
          <stop offset="40%"  stopColor="hsl(var(--primary))" stopOpacity="0.32" />
          <stop offset="60%"  stopColor="hsl(var(--primary))" stopOpacity="0.32" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
        <clipPath id="ps-page-clip">
          <rect x="4" y="2" width="56" height="72" rx="4" />
        </clipPath>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="32" cy="78" rx="20" ry="2.5" fill="hsl(var(--foreground))" opacity="0.07" />

      {/* Page group — floats */}
      <g className="ps-loader-page">
        {/* Page body */}
        <rect x="4" y="2" width="56" height="72" rx="4"
          fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="1.2" />

        {/* Dog-ear fold (top-right) */}
        <path d="M46 2 L60 16" stroke="hsl(var(--border))" strokeWidth="1.2" />
        <path d="M46 2 L46 16 L60 16 Z" fill="hsl(var(--muted))" opacity="0.55" />

        {/* Text lines — light up as scan beam passes */}
        <rect className="ps-tl-1" x="12" y="24" width="34" height="3.5" rx="1.75"
          fill="hsl(var(--primary))" />
        <rect className="ps-tl-2" x="12" y="33" width="38" height="3.5" rx="1.75"
          fill="hsl(var(--primary))" />
        <rect className="ps-tl-3" x="12" y="42" width="30" height="3.5" rx="1.75"
          fill="hsl(var(--primary))" />
        <rect className="ps-tl-4" x="12" y="51" width="22" height="3.5" rx="1.75"
          fill="hsl(var(--accent))" />

        {/* Scan beam — clipped to page bounds */}
        <g clipPath="url(#ps-page-clip)">
          <rect className="ps-scan-beam" x="4" y="19" width="56" height="10"
            fill="url(#ps-beam-grad)" />
        </g>

        {/* Spark dot at leading edge of beam */}
        <circle className="ps-scan-spark" cx="52" cy="24" r="1.8"
          fill="hsl(var(--primary))" opacity="0.9" />
      </g>
    </svg>
  );

  const wrapper = (
    <div className={cn("flex flex-col items-center justify-center gap-2.5", className)}>
      {hasProgress ? (
        <div className="relative inline-flex items-center justify-center"
          style={{ width: ringSize, height: ringSize }}>
          <svg
            className="absolute inset-0 -rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
              stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" opacity="0.5" />
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
              stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
              fill="none" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.4s ease-out" }} />
          </svg>
          <div className="relative flex flex-col items-center justify-center">
            <div style={{ transform: "scale(0.78)" }}>{svg}</div>
          </div>
        </div>
      ) : (
        svg
      )}

      {hasProgress && (
        <span className="text-[12px] font-bold tabular-nums text-primary">{Math.round(pct)}%</span>
      )}

      {label !== null && (
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        {wrapper}
      </div>
    );
  }
  return wrapper;
}

export default BookLoader;
