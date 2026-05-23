import React, { useState, useEffect } from "react";

// ─── SVG Agent Face Illustrations ────────────────────────────────────────────
// Mono-vector black-on-white style, matching the illustration references.
// All faces live on a white card so they look great in both light and dark mode.

export function WriterFace({ size = 72 }: { size?: number }) {
  const h = Math.round(size * 1.1);
  return (
    <svg width={size} height={h} viewBox="0 0 80 88" fill="none" aria-hidden>
      {/* Long flowing hair */}
      <path d="M12 40 C10 18 15 4 40 4 C65 4 70 18 68 40 C72 56 70 82 64 88 L40 76 L16 88 C10 82 8 56 12 40Z" fill="#1a1a1a"/>
      {/* Hair volume highlight */}
      <path d="M22 11 Q31 7 40 7 Q49 7 58 11" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.18"/>
      {/* Face */}
      <ellipse cx="40" cy="44" rx="20" ry="23" fill="white"/>
      {/* Eyebrows — gentle arch */}
      <path d="M29 34 Q33 31 37 34" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M43 34 Q47 31 51 34" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Eyes */}
      <circle cx="33.5" cy="40" r="3.5" fill="#1a1a1a"/>
      <circle cx="46.5" cy="40" r="3.5" fill="#1a1a1a"/>
      {/* Eye shine */}
      <circle cx="34.8" cy="38.8" r="1.2" fill="white"/>
      <circle cx="47.8" cy="38.8" r="1.2" fill="white"/>
      {/* Nose */}
      <path d="M38 45 L40 48 L42 45" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Warm smile */}
      <path d="M33 53 Q40 61 47 53" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Cheek blush */}
      <circle cx="29" cy="47" r="3.5" fill="#1a1a1a" opacity="0.07"/>
      <circle cx="51" cy="47" r="3.5" fill="#1a1a1a" opacity="0.07"/>
    </svg>
  );
}

export function ResearcherFace({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
      {/* Short hair top + side volume */}
      <path d="M16 40 C14 20 18 6 40 6 C62 6 66 20 64 40 C64 28 60 16 40 16 C20 16 16 28 16 40Z" fill="#1a1a1a"/>
      <circle cx="16" cy="36" r="5" fill="#1a1a1a"/>
      <circle cx="64" cy="36" r="5" fill="#1a1a1a"/>
      {/* Face */}
      <ellipse cx="40" cy="48" rx="20" ry="22" fill="white"/>
      {/* Eyebrows */}
      <path d="M25 37 Q30 34 35 37" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M45 37 Q50 34 55 37" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Round glasses */}
      <circle cx="33" cy="43" r="8.5" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
      <circle cx="47" cy="43" r="8.5" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
      <path d="M41.5 43 L45 43" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24.5 43 L21 41" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M55.5 43 L59 41" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      {/* Eyes behind glasses */}
      <circle cx="33" cy="43" r="3" fill="#1a1a1a"/>
      <circle cx="47" cy="43" r="3" fill="#1a1a1a"/>
      <circle cx="34.2" cy="41.8" r="1" fill="white"/>
      <circle cx="48.2" cy="41.8" r="1" fill="white"/>
      {/* Curious smile */}
      <path d="M34 57 Q40 63 46 57" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function PlannerFace({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
      {/* Neat bob cut */}
      <path d="M16 42 C14 20 18 6 40 6 C62 6 66 20 64 42 L62 54 C54 48 26 48 18 54 Z" fill="#1a1a1a"/>
      {/* Face */}
      <ellipse cx="40" cy="49" rx="20" ry="22" fill="white"/>
      {/* Focused eyebrows */}
      <path d="M27 37 Q32 33 37 37" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M43 37 Q48 33 53 37" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Attentive eyes */}
      <ellipse cx="33.5" cy="44" rx="3.8" ry="3.5" fill="#1a1a1a"/>
      <ellipse cx="46.5" cy="44" rx="3.8" ry="3.5" fill="#1a1a1a"/>
      <circle cx="34.8" cy="42.5" r="1.3" fill="white"/>
      <circle cx="47.8" cy="42.5" r="1.3" fill="white"/>
      {/* Determined smile */}
      <path d="M33 57 Q40 64 47 57" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Ponytail */}
      <path d="M18 52 C11 58 11 70 18 74" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function EditorFace({ size = 72 }: { size?: number }) {
  const h = Math.round(size * 1.05);
  return (
    <svg width={size} height={h} viewBox="0 0 80 84" fill="none" aria-hidden>
      {/* Wavy hair */}
      <path d="M12 40 C10 16 16 3 40 3 C64 3 70 16 68 40 C70 54 68 75 62 82 C52 66 28 66 18 82 C12 75 10 54 12 40Z" fill="#1a1a1a"/>
      {/* Wave texture */}
      <path d="M20 17 Q26 13 32 17 Q38 21 44 17 Q50 13 56 17" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.18"/>
      {/* Face */}
      <ellipse cx="40" cy="44" rx="20" ry="23" fill="white"/>
      {/* Arched brows */}
      <path d="M27 34 Q33 30 39 34" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M41 34 Q47 30 53 34" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Eyes */}
      <ellipse cx="33.5" cy="41" rx="3.5" ry="3.2" fill="#1a1a1a"/>
      <ellipse cx="46.5" cy="41" rx="3.5" ry="3.2" fill="#1a1a1a"/>
      <circle cx="34.8" cy="39.8" r="1.2" fill="white"/>
      <circle cx="47.8" cy="39.8" r="1.2" fill="white"/>
      {/* Nose */}
      <path d="M38 46 L40 49 L42 46" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      {/* Sophisticated smile */}
      <path d="M33 55 Q40 63 47 55" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function CriticFace({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
      {/* Curly/afro hair built from circles */}
      <circle cx="40" cy="14" r="10" fill="#1a1a1a"/>
      <circle cx="22" cy="22" r="9" fill="#1a1a1a"/>
      <circle cx="58" cy="22" r="9" fill="#1a1a1a"/>
      <circle cx="14" cy="36" r="8" fill="#1a1a1a"/>
      <circle cx="66" cy="36" r="8" fill="#1a1a1a"/>
      <circle cx="26" cy="14" r="7" fill="#1a1a1a"/>
      <circle cx="54" cy="14" r="7" fill="#1a1a1a"/>
      {/* Face */}
      <ellipse cx="40" cy="52" rx="20" ry="22" fill="white"/>
      {/* One raised brow (confident) */}
      <path d="M26 39 Q32 34 38 38" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M42 38 Q48 35 54 38" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Eyes */}
      <ellipse cx="33.5" cy="45" rx="3.5" ry="3" fill="#1a1a1a"/>
      <ellipse cx="46.5" cy="45" rx="3.5" ry="3" fill="#1a1a1a"/>
      <circle cx="34.8" cy="43.8" r="1.1" fill="white"/>
      <circle cx="47.8" cy="43.8" r="1.1" fill="white"/>
      {/* Confident smirk */}
      <path d="M33 58 Q40 65 46 58" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M38 50 L40 53 L42 50" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Agent → Face mapping ─────────────────────────────────────────────────────

export const AGENT_FACES: Record<string, React.ComponentType<{ size?: number }>> = {
  writer: WriterFace,
  editor: EditorFace,
  researcher: ResearcherFace,
  planner: PlannerFace,
  critic: CriticFace,
  revision: EditorFace,
  architect: PlannerFace,
  illustrator: WriterFace,
};

// ─── Greeting Agents — welcome screen ─────────────────────────────────────────

const GREETING_CONFIG = [
  { id: "researcher", name: "Researcher", blurb: "Finds the sources",    Face: ResearcherFace },
  { id: "writer",     name: "Writer",     blurb: "Crafts every word",    Face: WriterFace },
  { id: "editor",     name: "Editor",     blurb: "Polishes your draft",  Face: EditorFace },
];

export function GreetingAgents({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  const first = userName?.split(" ")[0];

  return (
    <div className="flex flex-col items-center gap-6 mb-6">
      {/* Greeting line */}
      <p
        className="text-[12.5px] text-muted-foreground italic transition-all duration-700"
        style={{ opacity: show ? 1 : 0, transform: show ? "none" : "translateY(8px)" }}
      >
        {first ? `Hey ${first} — your team is ready` : "Your AI writing team is ready"}
      </p>

      {/* Agent trio */}
      <div className="flex items-end gap-5 sm:gap-7">
        {GREETING_CONFIG.map((agent, i) => {
          const center = i === 1;
          return (
            <div
              key={agent.id}
              className="flex flex-col items-center gap-2.5 transition-all duration-500"
              style={{
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${i * 100 + 120}ms`,
              }}
            >
              {/* Speech bubble */}
              <div className="relative mb-1">
                <div className="bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-[10px] text-muted-foreground whitespace-nowrap leading-snug">
                  {agent.blurb}
                </div>
                {/* Bubble tail */}
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-secondary border-r border-b border-border rotate-45" />
              </div>

              {/* Avatar card — always white so mono art reads perfectly */}
              <div
                className={[
                  "rounded-2xl bg-white overflow-hidden flex items-center justify-center",
                  "shadow-sm border transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg cursor-default",
                  center
                    ? "w-[78px] h-[78px] border-primary/40 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
                    : "w-[62px] h-[62px] border-border/60",
                ].join(" ")}
              >
                <agent.Face size={center ? 66 : 54} />
              </div>

              {/* Label */}
              <span className={`font-semibold text-foreground tracking-tight ${center ? "text-[12px]" : "text-[11px]"}`}>
                {agent.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agent Activity Dock — shown during streaming ─────────────────────────────

interface LiveAgent {
  id: string;
  name: string;
  status: "idle" | "starting" | "working" | "done" | "error";
  action?: string;
}

export function AgentActivityDock({ agents, visible }: { agents: LiveAgent[]; visible: boolean }) {
  const named = agents.filter(a => a.name);

  return (
    <div
      className={[
        "fixed bottom-28 right-4 z-[150] flex flex-col gap-2.5 transition-all duration-500",
        visible && named.length > 0
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-10 pointer-events-none",
      ].join(" ")}
    >
      {named.map(agent => {
        const Face = AGENT_FACES[agent.id.toLowerCase()];
        const working = agent.status === "working";
        const done    = agent.status === "done";
        const error   = agent.status === "error";

        return (
          <div key={agent.id} className="flex items-center gap-2.5 justify-end">
            {/* Status text bubble */}
            {working && agent.action && (
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl px-2.5 py-1.5 text-[10.5px] text-muted-foreground max-w-[130px] text-right leading-snug shadow-sm">
                {agent.action}
              </div>
            )}

            {/* Face bubble */}
            <div className="relative flex-shrink-0">
              {/* Pulse ring for working state */}
              {working && (
                <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
              )}

              <div
                className={[
                  "w-10 h-10 rounded-full bg-white overflow-hidden border-2 shadow-md",
                  "transition-all duration-300 flex items-center justify-center",
                  working ? "border-primary shadow-primary/20 scale-105"
                  : done   ? "border-emerald-500/60"
                  : error  ? "border-destructive/60"
                  : "border-border/50 opacity-60",
                ].join(" ")}
              >
                {Face && <Face size={40} />}
              </div>

              {/* Status dot */}
              {working && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
              )}
              {done && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                    <path d="M1 3L2.5 4.5L5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              {error && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-background" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Floating Background Elements — welcome screen ────────────────────────────

const FLOAT_CSS = `
  @keyframes czar-float-a {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-14px); }
  }
  @keyframes czar-float-b {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }
  @keyframes czar-float-c {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-8px) rotate(-4deg); }
    66% { transform: translateY(5px) rotate(3deg); }
  }
`;

function TextLines({ width }: { width: number }) {
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} fill="none">
      <rect x="0" y="0" width={width} height="3" rx="1.5" fill="currentColor"/>
      <rect x="0" y="7" width={Math.round(width * 0.72)} height="3" rx="1.5" fill="currentColor"/>
    </svg>
  );
}

function PenNib({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.3)} viewBox="0 0 28 36" fill="none">
      <path d="M14 0 L28 18 L20 18 L20 36 L8 36 L8 18 L0 18 Z" fill="currentColor"/>
      <path d="M11 18 L14 30 L17 18" fill="white" opacity="0.5"/>
    </svg>
  );
}

function OpenBook({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.75)} viewBox="0 0 40 30" fill="none">
      <path d="M20 7 C16 4 9 3 2 5 L2 27 C9 25 16 26 20 29 C24 26 31 25 38 27 L38 5 C31 3 24 4 20 7Z" fill="currentColor"/>
      <line x1="20" y1="7" x2="20" y2="29" stroke="white" strokeWidth="1.5" opacity="0.6"/>
      <path d="M5 12 C9 11 13 11.5 18 13" stroke="white" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
      <path d="M5 18 C9 17 13 17.5 18 19" stroke="white" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
      <path d="M22 13 C27 11.5 31 11 35 12" stroke="white" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
      <path d="M22 19 C27 17.5 31 17 35 18" stroke="white" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>
    </svg>
  );
}

function Sparkle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z" fill="currentColor"/>
    </svg>
  );
}

function DotGrid() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {[0, 10, 20].flatMap(x => [0, 10, 20].map(y => (
        <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r="2.5" fill="currentColor"/>
      )))}
    </svg>
  );
}

interface FloatEl {
  id: string;
  x: string;
  y: string;
  anim: string;
  dur: string;
  delay: string;
  opacity: string;
  el: React.ReactNode;
}

const FLOAT_ELS: FloatEl[] = [
  { id:"tl-lines-1", x:"4%",  y:"12%", anim:"czar-float-a", dur:"8s",  delay:"0s",   opacity:"0.05", el:<TextLines width={72}/> },
  { id:"tr-lines-1", x:"84%", y:"18%", anim:"czar-float-b", dur:"9.5s",delay:"1.5s", opacity:"0.045",el:<TextLines width={58}/> },
  { id:"bl-lines-1", x:"5%",  y:"62%", anim:"czar-float-a", dur:"7s",  delay:"2.5s", opacity:"0.05", el:<TextLines width={65}/> },
  { id:"br-lines-1", x:"83%", y:"58%", anim:"czar-float-c", dur:"10s", delay:"0.7s", opacity:"0.045",el:<TextLines width={60}/> },
  { id:"tl-lines-2", x:"6%",  y:"82%", anim:"czar-float-b", dur:"8.5s",delay:"3.5s", opacity:"0.04", el:<TextLines width={50}/> },
  { id:"br-lines-2", x:"82%", y:"80%", anim:"czar-float-a", dur:"11s", delay:"2s",   opacity:"0.04", el:<TextLines width={68}/> },
  { id:"pen",        x:"88%", y:"38%", anim:"czar-float-b", dur:"12s", delay:"0s",   opacity:"0.06", el:<PenNib size={26}/> },
  { id:"book",       x:"3%",  y:"44%", anim:"czar-float-b", dur:"10s", delay:"4s",   opacity:"0.055",el:<OpenBook size={38}/> },
  { id:"spark-tr",   x:"91%", y:"8%",  anim:"czar-float-a", dur:"6s",  delay:"0s",   opacity:"0.08", el:<Sparkle size={18}/> },
  { id:"spark-bl",   x:"2%",  y:"30%", anim:"czar-float-c", dur:"8s",  delay:"3s",   opacity:"0.07", el:<Sparkle size={14}/> },
  { id:"spark-mid",  x:"90%", y:"50%", anim:"czar-float-a", dur:"7s",  delay:"1.5s", opacity:"0.06", el:<Sparkle size={12}/> },
  { id:"dots-br",    x:"86%", y:"72%", anim:"czar-float-a", dur:"9s",  delay:"1s",   opacity:"0.06", el:<DotGrid/> },
  { id:"dots-tl",    x:"3%",  y:"72%", anim:"czar-float-c", dur:"11s", delay:"5s",   opacity:"0.05", el:<DotGrid/> },
];

export function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none text-foreground" aria-hidden>
      <style>{FLOAT_CSS}</style>
      {FLOAT_ELS.map(item => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: item.x,
            top: item.y,
            opacity: item.opacity,
            animationName: item.anim,
            animationDuration: item.dur,
            animationDelay: item.delay,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        >
          {item.el}
        </div>
      ))}
    </div>
  );
}

// ─── Writing-state background glow ───────────────────────────────────────────
// Soft animated gradient that appears in the thread area during streaming.

export function WritingGlow({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    >
      <style>{`
        @keyframes czar-glow-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(3%, -4%) scale(1.04); }
          66%       { transform: translate(-2%, 3%) scale(0.97); }
        }
      `}</style>
      {/* Terracotta warm glow — top-right */}
      <div
        className="absolute w-[50vw] h-[50vw] rounded-full opacity-[0.035]"
        style={{
          top: "5%", right: "-10%",
          background: "radial-gradient(circle, hsl(18 50% 53%) 0%, transparent 70%)",
          animationName: "czar-glow-drift",
          animationDuration: "14s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      {/* Sage glow — bottom-left */}
      <div
        className="absolute w-[40vw] h-[40vw] rounded-full opacity-[0.028]"
        style={{
          bottom: "10%", left: "-8%",
          background: "radial-gradient(circle, hsl(153 16% 42%) 0%, transparent 70%)",
          animationName: "czar-glow-drift",
          animationDuration: "18s",
          animationDelay: "5s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
    </div>
  );
}
