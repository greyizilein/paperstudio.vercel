// Hand-drawn lightbulb-in-thought-cloud mark for CZAR's "Think" toggle.
// Pure vector, monochrome (uses currentColor), sized like Lucide icons.

interface Props {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function ThinkIcon({ size = 16, className, strokeWidth = 1.6 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Thought cloud — soft, slightly irregular outline */}
      <path d="M7.5 17c-1.9 0-3.3-1.3-3.3-3 0-1.2.8-2.2 1.9-2.7-.1-.3-.2-.6-.2-1 0-1.6 1.4-2.9 3.1-2.9.5 0 1 .1 1.4.3.6-1.4 2.1-2.4 3.8-2.4 2 0 3.7 1.4 4 3.2 1.5.2 2.7 1.4 2.7 2.9 0 1.6-1.4 2.9-3.1 2.9" />
      {/* Bulb glass */}
      <path d="M10 14.2c0-2 1.3-3.2 2.7-3.2s2.7 1.2 2.7 3.2c0 1.1-.6 1.8-1.1 2.3-.3.3-.5.6-.5 1v.3h-2.2v-.3c0-.4-.2-.7-.5-1-.5-.5-1.1-1.2-1.1-2.3z" />
      {/* Filament squiggle */}
      <path d="M11.6 13.4l1.1 1 1.1-1" />
      {/* Bulb base ridges */}
      <path d="M11.4 18.4h2.6" />
      <path d="M11.7 19.4h2" />
      {/* Little drop sparks under the cloud */}
      <circle cx="6.5" cy="19.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="21" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default ThinkIcon;
