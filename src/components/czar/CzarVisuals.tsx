import React, { useState, useEffect } from "react";

// ─── CSS keyframes (shared across all scene components) ────────────────────

const SCENE_CSS = `
  @keyframes czar-typing {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }
  @keyframes czar-cursor {
    0%, 44%  { opacity: 1; }
    50%, 94% { opacity: 0; }
    100%     { opacity: 1; }
  }
  @keyframes czar-steam {
    0%   { transform: translateY(0)     scaleX(1);   opacity: 0.45; }
    100% { transform: translateY(-22px) scaleX(1.5); opacity: 0; }
  }
  @keyframes czar-bubble {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes czar-sparkle {
    0%   { transform: rotate(0deg)   scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes czar-float-a {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-14px); }
  }
  @keyframes czar-float-b {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%      { transform: translateY(-10px) rotate(5deg); }
  }
  @keyframes czar-float-c {
    0%, 100% { transform: translateY(0px)  rotate(0deg); }
    33%      { transform: translateY(-8px)  rotate(-4deg); }
    66%      { transform: translateY(5px)   rotate(3deg); }
  }
  @keyframes czar-glow-drift {
    0%, 100% { transform: translate(0,0)    scale(1); }
    33%      { transform: translate(3%,-4%) scale(1.04); }
    66%      { transform: translate(-2%,3%) scale(0.97); }
  }
  @keyframes czar-aurora-a {
    0%, 100% { transform: translate(0,0)     scale(1);    opacity: 0.22; }
    25%      { transform: translate(6%,-10%) scale(1.12); opacity: 0.30; }
    60%      { transform: translate(-4%,6%)  scale(0.94); opacity: 0.18; }
  }
  @keyframes czar-aurora-b {
    0%, 100% { transform: translate(0,0)     scale(1);    opacity: 0.16; }
    40%      { transform: translate(-8%,12%) scale(1.08); opacity: 0.24; }
    70%      { transform: translate(5%,-5%)  scale(1.15); opacity: 0.12; }
  }
  @keyframes czar-aurora-c {
    0%, 100% { transform: translate(0,0)    scale(1);    opacity: 0.12; }
    30%      { transform: translate(10%,4%) scale(0.90); opacity: 0.18; }
    70%      { transform: translate(-6%,-8%) scale(1.1); opacity: 0.08; }
  }

  /* ── Dark-mode colour overrides for all czar-svg elements ── */
  .dark .czar-svg [fill="white"]   { fill:   hsl(var(--background)); }
  .dark .czar-svg [fill="#1a1a1a"] { fill:   hsl(var(--foreground)); }
  .dark .czar-svg [stroke="#1a1a1a"] { stroke: hsl(var(--foreground)); }
  .dark .czar-svg [stroke="white"]   { stroke: hsl(var(--background)); }
`;

// ─── TeamScene — uses purchased illustration ───────────────────────────────

export function TeamScene() {
  return (
    <div className="w-full max-w-[560px] mx-auto select-none" aria-hidden>
      <style>{SCENE_CSS}</style>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-white/5 shadow-sm">
        <img
          src="/characters/team-scene.svg"
          alt=""
          className="w-full h-auto block"
          draggable={false}
        />
      </div>
    </div>
  );
}

// ─── GreetingLine ─────────────────────────────────────────────────────────

export function GreetingLine({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  const first = userName?.split(" ")[0];
  return (
    <div
      className="text-center transition-all duration-700 mt-6"
      style={{ opacity: show ? 1 : 0, transform: show ? "none" : "translateY(12px)" }}
    >
      <h1 className="text-3xl sm:text-4xl font-bold font-heading text-foreground leading-tight">
        {first ? `Ready for you, ${first}` : "Ready when you are"}
      </h1>
      <p className="mt-2 text-sm sm:text-base text-muted-foreground">
        Your AI writing team is standing by
      </p>
    </div>
  );
}

// ─── Mini faces for agent dock ────────────────────────────────────────────

function MiniWriter() {
  return (
    <svg viewBox="0 0 60 60" fill="none" width="40" height="40" className="czar-svg">
      <circle cx="30" cy="18" r="13" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M18 10 Q18 5 30 4 Q42 5 42 10 L42 18 Q42 20 40 20 L20 20 Q18 20 18 18 Z" fill="#1a1a1a"/>
      <circle cx="26" cy="17" r="2" fill="#1a1a1a"/>
      <circle cx="34" cy="17" r="2" fill="#1a1a1a"/>
      <path d="M22 25 Q30 30 38 25" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
      <rect x="24" y="28" width="12" height="18" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M24 32 L36 32" stroke="#1a1a1a" strokeWidth="1" opacity="0.4"/>
    </svg>
  );
}

function MiniResearcher() {
  return (
    <svg viewBox="0 0 60 60" fill="none" width="40" height="40" className="czar-svg">
      <circle cx="30" cy="18" r="13" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M18 10 Q18 5 30 4 Q42 5 42 10 L42 18 Q42 20 40 20 L20 20 Q18 20 18 18 Z" fill="#1a1a1a"/>
      <circle cx="25" cy="16" r="2.5" fill="#1a1a1a"/>
      <circle cx="35" cy="16" r="2.5" fill="#1a1a1a"/>
      <circle cx="25" cy="16" r="3" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
      <circle cx="35" cy="16" r="3" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
      <path d="M22 26 Q30 31 38 26" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
      <rect x="24" y="28" width="12" height="18" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
    </svg>
  );
}

function MiniPlanner() {
  return (
    <svg viewBox="0 0 60 60" fill="none" width="40" height="40" className="czar-svg">
      <circle cx="30" cy="18" r="13" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M18 10 Q18 5 30 4 Q42 5 42 10 L42 18 Q42 20 40 20 L20 20 Q18 20 18 18 Z" fill="#1a1a1a"/>
      <circle cx="26" cy="17" r="2" fill="#1a1a1a"/>
      <circle cx="34" cy="17" r="2" fill="#1a1a1a"/>
      <path d="M22 26 Q30 31 38 26" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
      <rect x="22" y="28" width="16" height="16" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="26" y1="28" x2="26" y2="44" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5"/>
      <line x1="30" y1="28" x2="30" y2="44" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5"/>
      <line x1="34" y1="28" x2="34" y2="44" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5"/>
    </svg>
  );
}

function MiniEditor() {
  return (
    <svg viewBox="0 0 60 60" fill="none" width="40" height="40" className="czar-svg">
      <circle cx="30" cy="18" r="13" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M16 12 Q16 4 30 3 Q44 4 44 12 L44 20 Q44 35 38 42 L22 42 Q16 35 16 20 Z" fill="#1a1a1a"/>
      <circle cx="26" cy="16" r="2" fill="#1a1a1a"/>
      <circle cx="34" cy="16" r="2" fill="#1a1a1a"/>
      <path d="M22 26 Q30 31 38 26" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
      <rect x="24" y="28" width="12" height="18" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
    </svg>
  );
}

function MiniCritic() {
  return (
    <svg viewBox="0 0 60 60" fill="none" width="40" height="40" className="czar-svg">
      <circle cx="30" cy="18" r="13" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
      <path d="M18 10 Q18 5 30 4 Q42 5 42 10 L42 18 Q42 20 40 20 L20 20 Q18 20 18 18 Z" fill="#1a1a1a"/>
      <circle cx="26" cy="17" r="2" fill="#1a1a1a"/>
      <circle cx="34" cy="17" r="2" fill="#1a1a1a"/>
      <path d="M22 25 Q30 30 38 25" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
      <rect x="24" y="28" width="12" height="18" fill="white" stroke="#1a1a1a" strokeWidth="1.5"/>
    </svg>
  );
}

const MINI_FACES: Record<string, React.FC> = {
  writer: MiniWriter,
  editor: MiniEditor,
  researcher: MiniResearcher,
  planner: MiniPlanner,
  critic: MiniCritic,
  revision: MiniEditor,
  architect: MiniPlanner,
  illustrator: MiniWriter,
};

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
          : "opacity-0 translate-x-12 pointer-events-none",
      ].join(" ")}
    >
      {named.map(agent => {
        const Face = MINI_FACES[agent.id.toLowerCase()];
        const working = agent.status === "working";
        const done = agent.status === "done";
        const error = agent.status === "error";
        return (
          <div key={agent.id} className="flex items-center gap-2 justify-end">
            {working && agent.action && (
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl px-2.5 py-1.5 text-[10.5px] text-muted-foreground max-w-[130px] text-right leading-snug shadow-sm">
                {agent.action}
              </div>
            )}
            <div className="relative flex-shrink-0">
              {working && (
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin" />
              )}
              {Face && <Face />}
              {done && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
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

// ─── Floating background elements ─────────────────────────────────────────

function TextLines({ width }: { width: number }) {
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} fill="none">
      <rect x="0" y="0" width={width} height="3" rx="1.5" fill="currentColor" />
      <rect x="0" y="7" width={Math.round(width * 0.72)} height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function SmallPen() {
  return (
    <svg width="22" height="30" viewBox="0 0 28 36" fill="none">
      <path d="M14 0 L28 18 L20 18 L20 36 L8 36 L8 18 L0 18Z" fill="currentColor" />
      <path d="M11 18 L14 30 L17 18" fill="white" opacity="0.5" />
    </svg>
  );
}

function SmallBook() {
  return (
    <svg width="32" height="24" viewBox="0 0 40 30" fill="none">
      <path d="M20 7 C16 4 9 3 2 5 L2 27 C9 25 16 26 20 29 C24 26 31 25 38 27 L38 5 C31 3 24 4 20 7Z"
            fill="currentColor" />
      <line x1="20" y1="7" x2="20" y2="29" stroke="white" strokeWidth="1.5" opacity="0.55" />
    </svg>
  );
}

function FloatSparkle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z" fill="currentColor" />
    </svg>
  );
}

function Dots() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      {[0, 10, 20].flatMap(x => [0, 10, 20].map(y => (
        <circle key={`${x}-${y}`} cx={x + 3} cy={y + 3} r="2.5" fill="currentColor" />
      )))}
    </svg>
  );
}

const BG_ELEMENTS = [
  { id: "l1", x: "4%", y: "10%", anim: "czar-float-a", dur: "8s", delay: "0s", op: "0.048", el: <TextLines width={68} /> },
  { id: "l2", x: "84%", y: "16%", anim: "czar-float-b", dur: "9.5s", delay: "1.4s", op: "0.044", el: <TextLines width={54} /> },
  { id: "l3", x: "5%", y: "60%", anim: "czar-float-a", dur: "7s", delay: "2.6s", op: "0.048", el: <TextLines width={60} /> },
  { id: "l4", x: "83%", y: "56%", anim: "czar-float-c", dur: "10s", delay: "0.6s", op: "0.042", el: <TextLines width={56} /> },
  { id: "l5", x: "6%", y: "80%", anim: "czar-float-b", dur: "8.5s", delay: "3.4s", op: "0.038", el: <TextLines width={48} /> },
  { id: "l6", x: "82%", y: "78%", anim: "czar-float-a", dur: "11s", delay: "2s", op: "0.038", el: <TextLines width={64} /> },
  { id: "pen", x: "87%", y: "38%", anim: "czar-float-b", dur: "12s", delay: "0s", op: "0.058", el: <SmallPen /> },
  { id: "book", x: "3%", y: "42%", anim: "czar-float-b", dur: "10s", delay: "4s", op: "0.052", el: <SmallBook /> },
  { id: "s1", x: "90%", y: "7%", anim: "czar-float-a", dur: "6s", delay: "0s", op: "0.075", el: <FloatSparkle size={18} /> },
  { id: "s2", x: "2%", y: "28%", anim: "czar-float-c", dur: "8s", delay: "3s", op: "0.065", el: <FloatSparkle size={14} /> },
  { id: "s3", x: "89%", y: "48%", anim: "czar-float-a", dur: "7s", delay: "1.4s", op: "0.055", el: <FloatSparkle size={12} /> },
  { id: "d1", x: "85%", y: "70%", anim: "czar-float-a", dur: "9s", delay: "1s", op: "0.058", el: <Dots /> },
  { id: "d2", x: "3%", y: "70%", anim: "czar-float-c", dur: "11s", delay: "5s", op: "0.048", el: <Dots /> },
];

export function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none text-foreground" aria-hidden>
      <style>{SCENE_CSS}</style>
      {BG_ELEMENTS.map(item => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: item.x,
            top: item.y,
            opacity: item.op,
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

// ─── Welcome aurora — always-on live background ───────────────────────────

export function WelcomeAurora() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden>
      <style>{SCENE_CSS}</style>
      <div style={{
        position: "absolute",
        bottom: "-25%",
        left: "-15%",
        width: "75vw",
        maxWidth: 560,
        height: "75vw",
        maxHeight: 560,
        borderRadius: "50%",
        background: "radial-gradient(circle, hsl(18 65% 58%) 0%, transparent 62%)",
        animation: "czar-aurora-a 20s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        top: "-20%",
        right: "-15%",
        width: "60vw",
        maxWidth: 480,
        height: "60vw",
        maxHeight: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, hsl(153 28% 48%) 0%, transparent 62%)",
        animation: "czar-aurora-b 26s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        top: "-5%",
        left: "25%",
        width: "50vw",
        maxWidth: 380,
        height: "50vw",
        maxHeight: 380,
        borderRadius: "50%",
        background: "radial-gradient(circle, hsl(37 56% 52%) 0%, transparent 62%)",
        animation: "czar-aurora-c 30s ease-in-out 6s infinite",
      }} />
    </div>
  );
}

// ─── Writing glow — active session background ─────────────────────────────

export function WritingGlow({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    >
      <style>{SCENE_CSS}</style>
      <div
        className="absolute w-[50vw] h-[50vw] rounded-full opacity-[0.032]"
        style={{
          top: "5%",
          right: "-10%",
          background: "radial-gradient(circle, hsl(18 50% 53%) 0%, transparent 70%)",
          animation: "czar-glow-drift 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[40vw] h-[40vw] rounded-full opacity-[0.025]"
        style={{
          bottom: "10%",
          left: "-8%",
          background: "radial-gradient(circle, hsl(153 16% 42%) 0%, transparent 70%)",
          animation: "czar-glow-drift 18s ease-in-out 5s infinite",
        }}
      />
    </div>
  );
}
