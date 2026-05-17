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
 * BookLoader — vector loading indicator: a row of stacked books with a
 * single book "tipping" over in a continuous loop. Themed via design tokens
 * (primary terracotta + sage accent + cream surface) so it fits everywhere.
 *
 * Pass `progress` (0–100) to display a determinate progress ring + percent label.
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

  // Progress ring math
  const ringSize = size + 16;
  const stroke = 3;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const svg = (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 120 94"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
      className="select-none"
    >
      <ellipse cx="60" cy="86" rx="46" ry="3" fill="hsl(var(--foreground))" opacity="0.08" />

      <g className="ps-book ps-book-1" style={{ transformOrigin: "22px 80px" }}>
        <rect x="14" y="28" width="16" height="52" rx="2" fill="hsl(var(--primary))" />
        <rect x="17" y="34" width="10" height="2" rx="1" fill="hsl(var(--primary-foreground))" opacity="0.85" />
        <rect x="17" y="40" width="10" height="2" rx="1" fill="hsl(var(--primary-foreground))" opacity="0.55" />
      </g>

      <g className="ps-book ps-book-2" style={{ transformOrigin: "40px 80px" }}>
        <rect x="32" y="22" width="16" height="58" rx="2" fill="hsl(var(--accent))" />
        <rect x="35" y="30" width="10" height="2" rx="1" fill="hsl(var(--accent-foreground))" opacity="0.85" />
        <rect x="35" y="36" width="10" height="2" rx="1" fill="hsl(var(--accent-foreground))" opacity="0.55" />
      </g>

      <g className="ps-book ps-book-3" style={{ transformOrigin: "58px 80px" }}>
        <rect x="50" y="18" width="16" height="62" rx="2" fill="hsl(var(--primary-dark))" />
        <rect x="53" y="26" width="10" height="2" rx="1" fill="hsl(var(--primary-foreground))" opacity="0.85" />
        <rect x="53" y="32" width="10" height="2" rx="1" fill="hsl(var(--primary-foreground))" opacity="0.55" />
      </g>

      <g className="ps-book ps-book-tip" style={{ transformOrigin: "76px 80px" }}>
        <rect x="68" y="24" width="16" height="56" rx="2" fill="hsl(var(--yellow))" />
        <rect x="71" y="32" width="10" height="2" rx="1" fill="hsl(var(--foreground))" opacity="0.7" />
        <rect x="71" y="38" width="10" height="2" rx="1" fill="hsl(var(--foreground))" opacity="0.45" />
      </g>

      <g className="ps-book-open">
        <path
          d="M88 64 C 92 60, 100 60, 104 64 L 104 80 C 100 76, 92 76, 88 80 Z"
          fill="hsl(var(--surface))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <path d="M96 64 L 96 80" stroke="hsl(var(--border))" strokeWidth="1" />
      </g>

      <line x1="10" y1="80" x2="110" y2="80" stroke="hsl(var(--foreground))" strokeOpacity="0.18" strokeWidth="1.2" />
    </svg>
  );

  const wrapper = (
    <div className={cn("flex flex-col items-center justify-center gap-2.5", className)}>
      {hasProgress ? (
        <div className="relative inline-flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
          {/* Ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="hsl(var(--border))"
              strokeWidth={stroke}
              fill="none"
              opacity="0.5"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
            />
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
