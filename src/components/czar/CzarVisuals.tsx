import React, { useState, useEffect, useMemo } from "react";

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

// ─── Welcome aurora — time-based live background ─────────────────────────

export function WelcomeAurora() {
  const palette = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return {
      a: "hsl(32 85% 58%)",  b: "hsl(42 72% 60%)",  c: "hsl(18 72% 54%)",
    };
    if (h >= 12 && h < 17) return {
      a: "hsl(160 45% 48%)", b: "hsl(140 38% 48%)", c: "hsl(195 50% 52%)",
    };
    if (h >= 17 && h < 21) return {
      a: "hsl(265 50% 58%)", b: "hsl(320 45% 55%)", c: "hsl(280 40% 52%)",
    };
    return {
      a: "hsl(235 50% 48%)", b: "hsl(255 40% 45%)", c: "hsl(220 45% 40%)",
    };
  }, []);

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
        background: `radial-gradient(circle, ${palette.a} 0%, transparent 62%)`,
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
        background: `radial-gradient(circle, ${palette.b} 0%, transparent 62%)`,
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
        background: `radial-gradient(circle, ${palette.c} 0%, transparent 62%)`,
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

// ─── New illustration scenes ──────────────────────────────────────────────────

const SCENE2_CSS = `
  @keyframes czar2-blink  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes czar2-float-a {
    0%,100%{transform:translateY(0px) rotate(-2deg)}
    50%{transform:translateY(-14px) rotate(2deg)}
  }
  @keyframes czar2-float-b {
    0%,100%{transform:translateY(0px) rotate(14deg)}
    50%{transform:translateY(-10px) rotate(10deg)}
  }
  @keyframes czar2-steam {
    0%  {transform:translateY(0)   scaleX(1);   opacity:0.55}
    100%{transform:translateY(-20px) scaleX(1.6); opacity:0}
  }
  @keyframes czar2-spin {
    0%,100%{transform:rotate(0deg)   scale(1)}
    50%    {transform:rotate(180deg) scale(1.25)}
  }
  @keyframes czar2-pen-bob {
    0%,100%{transform:translateY(0)}
    50%    {transform:translateY(-3px)}
  }
  @keyframes czar2-check-pop {
    0%,55%{opacity:0;transform:scale(0.4)}
    70%,100%{opacity:1;transform:scale(1)}
  }
  .dark .czar2-svg [fill="white"]     { fill:   hsl(var(--background)); }
  .dark .czar2-svg [stroke="white"]   { stroke: hsl(var(--background)); }
  .dark .czar2-svg [fill="#1a1a1a"]   { fill:   hsl(var(--foreground)); }
  .dark .czar2-svg [stroke="#1a1a1a"] { stroke: hsl(var(--foreground)); }
  @keyframes czar-obj-write {
    0%, 2%       { stroke-dashoffset: 220; opacity: 0; }
    8%           { opacity: 0.5; }
    48%, 88%     { stroke-dashoffset: 0;   opacity: 0.5; }
    96%, 100%    { stroke-dashoffset: 220; opacity: 0; }
  }
  @keyframes czar-tour-p1 {
    0%, 3%    { opacity: 0.12; }
    9%, 30%   { opacity: 1; }
    37%, 100% { opacity: 0.12; }
  }
  @keyframes czar-tour-p2 {
    0%, 34%   { opacity: 0.12; }
    41%, 62%  { opacity: 1; }
    69%, 100% { opacity: 0.12; }
  }
  @keyframes czar-tour-p3 {
    0%, 66%   { opacity: 0.12; }
    73%, 93%  { opacity: 1; }
    100%      { opacity: 0.12; }
  }
  @keyframes czar-tour-ring {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes czar-tour-bar {
    from { stroke-dashoffset: 372; }
    to   { stroke-dashoffset: 20; }
  }
  @keyframes czar-tour-check {
    0%, 60%  { opacity: 0; transform: scale(0.3); }
    80%, 100% { opacity: 1; transform: scale(1); }
  }
`;

export function CzarTypingScene() {
  return (
    <div className="w-full max-w-[500px] mx-auto select-none" aria-hidden>
      <style>{SCENE2_CSS}</style>
      <svg viewBox="0 0 500 278" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="czar2-svg w-full h-auto" strokeLinejoin="round" strokeLinecap="round">

        {/* ── DESK ── */}
        <rect x="15" y="246" width="470" height="5" rx="2.5" fill="#1a1a1a"/>
        <rect x="34"  y="251" width="7" height="28" rx="3.5" fill="#1a1a1a" opacity="0.55"/>
        <rect x="459" y="251" width="7" height="28" rx="3.5" fill="#1a1a1a" opacity="0.55"/>

        {/* ── CHAIR ── */}
        <rect x="57"  y="145" width="84" height="66" rx="13" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="50"  y="204" width="98" height="19" rx="9.5" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="63"  y1="223" x2="52"  y2="246" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
        <line x1="135" y1="223" x2="146" y2="246" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>

        {/* ── PERSON ── */}
        {/* Body */}
        <path d="M 77 122 L 90 126 L 90 188 L 108 188 L 108 126 L 121 122" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Collar crease */}
        <path d="M 82 140 Q 99 145 116 140" fill="none" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.5"/>
        {/* Neck */}
        <rect x="93" y="108" width="12" height="16" rx="6" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Head */}
        <circle cx="99" cy="80" r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Hair cap */}
        <path d="M 71 68 Q 71 44 99 42 Q 127 44 127 68 L 127 80 Q 113 82 99 82 Q 85 82 71 80 Z" fill="#1a1a1a"/>
        {/* Bun */}
        <circle cx="99" cy="35" r="13" fill="#1a1a1a"/>
        <path d="M 91 43 Q 99 49 107 43" fill="none" stroke="white" strokeWidth="1.5" opacity="0.35"/>
        {/* Eyes */}
        <circle cx="88"  cy="77" r="3.8" fill="#1a1a1a"/>
        <circle cx="110" cy="77" r="3.8" fill="#1a1a1a"/>
        <circle cx="89.4"  cy="75.4" r="1.4" fill="white"/>
        <circle cx="111.4" cy="75.4" r="1.4" fill="white"/>
        {/* Eyebrows */}
        <path d="M 81 68 Q 88 65 95 68"  fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.7"/>
        <path d="M 103 68 Q 110 65 117 68" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.7"/>
        {/* Nose */}
        <line x1="99" y1="82" x2="99" y2="91" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.38"/>
        {/* Smile */}
        <path d="M 86 101 Q 99 111 112 101" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Cheeks */}
        <ellipse cx="81"  cy="93" rx="5" ry="3" fill="#1a1a1a" opacity="0.07"/>
        <ellipse cx="117" cy="93" rx="5" ry="3" fill="#1a1a1a" opacity="0.07"/>
        {/* Left arm */}
        <path d="M 90 134 L 66 168 L 72 234" stroke="#1a1a1a" strokeWidth="3.2"/>
        <circle cx="72" cy="237" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        {/* Right arm — reaching to keyboard */}
        <g style={{ animation: "czar-typing 1.4s ease-in-out infinite", transformOrigin: "108px 140px" }}>
          <path d="M 108 134 L 166 210" stroke="#1a1a1a" strokeWidth="3.2"/>
          <circle cx="169" cy="213" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        </g>

        {/* ── LAPTOP ── */}
        {/* Screen */}
        <rect x="178" y="110" width="224" height="138" rx="8" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="187" y="118" width="206" height="120" rx="4" fill="#f6f6f6" stroke="#1a1a1a" strokeWidth="1.4"/>
        {/* Text lines */}
        <line x1="198" y1="133" x2="336" y2="133" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="146" x2="366" y2="146" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="159" x2="350" y2="159" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="172" x2="358" y2="172" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="185" x2="342" y2="185" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="198" x2="312" y2="198" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="198" y1="211" x2="296" y2="211" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" opacity="0.45"/>
        {/* Blinking cursor */}
        <line x1="298" y1="205" x2="298" y2="219"
          stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"
          style={{ animation: "czar2-blink 1s step-end infinite" }}
        />
        {/* Hinge shadow */}
        <rect x="178" y="244" width="224" height="5" rx="2.5" fill="#1a1a1a" opacity="0.14"/>
        {/* Keyboard base */}
        <rect x="174" y="247" width="232" height="15" rx="6" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="190" y1="252" x2="392" y2="252" stroke="#1a1a1a" strokeWidth="1" opacity="0.28"/>
        <line x1="190" y1="257" x2="392" y2="257" stroke="#1a1a1a" strokeWidth="1" opacity="0.28"/>
        <rect x="264" y="250" width="62" height="9" rx="3" stroke="#1a1a1a" strokeWidth="1" opacity="0.32"/>

        {/* ── BOOKS (right) ── */}
        <rect x="413" y="213" width="58" height="33" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="422" y1="213" x2="422" y2="246" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="417" y="188" width="50" height="25" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="426" y1="188" x2="426" y2="213" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="419" y="169" width="46" height="19" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="428" y1="169" x2="428" y2="188" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* ── COFFEE CUP (left) ── */}
        <rect x="34" y="216" width="40" height="30" rx="7" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <ellipse cx="54" cy="246" rx="24" ry="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        <path d="M 74 222 Q 84 225 84 231 Q 84 238 74 241" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
        {/* Steam */}
        <path d="M 43 213 Q 48 204 43 195" stroke="#1a1a1a" strokeWidth="1.6" fill="none"
          style={{ animation: "czar2-steam 2.2s ease-in-out infinite", transformOrigin: "43px 213px" }}/>
        <path d="M 55 213 Q 60 203 55 194" stroke="#1a1a1a" strokeWidth="1.6" fill="none"
          style={{ animation: "czar2-steam 2.2s 0.65s ease-in-out infinite", transformOrigin: "55px 213px" }}/>

        {/* ── FLOATING PAPER 1 ── */}
        <g style={{ animation: "czar2-float-a 4.8s ease-in-out infinite", transformOrigin: "396px 72px" }}>
          <rect x="370" y="46" width="52" height="64" rx="4" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          <line x1="380" y1="60" x2="413" y2="60" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="380" y1="70" x2="413" y2="70" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="380" y1="80" x2="408" y2="80" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="380" y1="90" x2="413" y2="90" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="380" y1="100" x2="405" y2="100" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        </g>

        {/* ── FLOATING PAPER 2 ── */}
        <g style={{ animation: "czar2-float-b 5.6s 1.3s ease-in-out infinite", transformOrigin: "454px 105px" }}>
          <g transform="rotate(14,454,105)">
            <rect x="432" y="80" width="44" height="52" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
            <line x1="440" y1="93"  x2="467" y2="93"  stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="440" y1="103" x2="467" y2="103" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="440" y1="113" x2="462" y2="113" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
            {/* Checkmark on this paper */}
            <path d="M 440 124 L 445 129 L 456 118" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          </g>
        </g>

        {/* ── SPARKLE STAR ── */}
        <g style={{ animation: "czar2-spin 3.2s ease-in-out infinite", transformOrigin: "162px 48px" }}>
          <path d="M 162 38 L 162 58 M 152 48 L 172 48 M 154 40 L 170 56 M 170 40 L 154 56"
            stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round"/>
        </g>
        {/* Small dot sparkle */}
        <g style={{ animation: "czar2-spin 2.6s 0.9s ease-in-out infinite", transformOrigin: "355px 38px" }}>
          <path d="M 355 32 L 355 44 M 349 38 L 361 38"
            stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        </g>

      </svg>
    </div>
  );
}

export function CzarReviewScene() {
  return (
    <div className="w-full max-w-[440px] mx-auto select-none" aria-hidden>
      <style>{SCENE2_CSS}</style>
      <svg viewBox="0 0 440 278" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="czar2-svg w-full h-auto" strokeLinejoin="round" strokeLinecap="round">

        {/* ── DESK ── */}
        <rect x="15" y="246" width="410" height="5" rx="2.5" fill="#1a1a1a"/>
        <rect x="32"  y="251" width="7" height="28" rx="3.5" fill="#1a1a1a" opacity="0.55"/>
        <rect x="401" y="251" width="7" height="28" rx="3.5" fill="#1a1a1a" opacity="0.55"/>

        {/* ── CHAIR ── */}
        <rect x="50" y="148" width="78" height="62" rx="12" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="44" y="203" width="90" height="18" rx="9"  fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="56"  y1="221" x2="46"  y2="246" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
        <line x1="122" y1="221" x2="132" y2="246" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>

        {/* ── PERSON (glasses, academic) ── */}
        {/* Body */}
        <path d="M 71 118 L 83 122 L 83 188 L 101 188 L 101 122 L 113 118" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <path d="M 76 136 Q 92 140 108 136" fill="none" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.5"/>
        {/* Neck */}
        <rect x="86" y="104" width="12" height="16" rx="6" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Head */}
        <circle cx="92" cy="76" r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Hair cap */}
        <path d="M 64 64 Q 64 40 92 38 Q 120 40 120 64 L 120 76 Q 106 78 92 78 Q 78 78 64 76 Z" fill="#1a1a1a"/>
        {/* Bun */}
        <circle cx="92" cy="31" r="13" fill="#1a1a1a"/>
        <path d="M 84 39 Q 92 45 100 39" fill="none" stroke="white" strokeWidth="1.5" opacity="0.35"/>
        {/* Glasses */}
        <circle cx="80" cy="74" r="11" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <circle cx="104" cy="74" r="11" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="91"  y1="74" x2="93"  y2="74" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="68"  y1="71" x2="62"  y2="69" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="116" y1="71" x2="122" y2="69" stroke="#1a1a1a" strokeWidth="2"/>
        {/* Eyes inside glasses */}
        <circle cx="80"  cy="74" r="3.8" fill="#1a1a1a"/>
        <circle cx="104" cy="74" r="3.8" fill="#1a1a1a"/>
        <circle cx="81.4"  cy="72.4" r="1.4" fill="white"/>
        <circle cx="105.4" cy="72.4" r="1.4" fill="white"/>
        {/* Eyebrows */}
        <path d="M 72 63 Q 80 60 88 63"  fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.7"/>
        <path d="M 96 63 Q 104 60 112 63" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.7"/>
        {/* Nose */}
        <line x1="92" y1="80" x2="92" y2="89" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.38"/>
        {/* Focused small smile */}
        <path d="M 80 99 Q 92 107 104 99" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        {/* Cheeks */}
        <ellipse cx="74"  cy="91" rx="5" ry="3" fill="#1a1a1a" opacity="0.07"/>
        <ellipse cx="110" cy="91" rx="5" ry="3" fill="#1a1a1a" opacity="0.07"/>
        {/* Left arm (resting on desk toward doc) */}
        <path d="M 83 128 L 62 176 L 72 246" stroke="#1a1a1a" strokeWidth="3.2"/>
        <circle cx="72" cy="246" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        {/* Right arm — pen, animated bob */}
        <g style={{ animation: "czar2-pen-bob 2.4s ease-in-out infinite", transformOrigin: "101px 140px" }}>
          <path d="M 101 128 L 155 188 L 196 228" stroke="#1a1a1a" strokeWidth="3.2"/>
          <circle cx="198" cy="230" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          {/* Pen */}
          <line x1="194" y1="226" x2="224" y2="200" stroke="#1a1a1a" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="224" y1="200" x2="234" y2="190" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M 231 192 L 237 186 L 238 193 Z" fill="#1a1a1a"/>
        </g>

        {/* ── DOCUMENT ── */}
        <rect x="180" y="88" width="228" height="158" rx="6" fill="white" stroke="#1a1a1a" strokeWidth="2.5"/>
        {/* Margin rule */}
        <line x1="202" y1="88" x2="202" y2="246" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.35"/>
        {/* Text lines */}
        <line x1="212" y1="106" x2="380" y2="106" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="118" x2="362" y2="118" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        {/* Strikethrough line */}
        <line x1="212" y1="130" x2="374" y2="130" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round" opacity="0.35"/>
        <line x1="212" y1="130" x2="374" y2="130" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>
        <line x1="212" y1="127" x2="374" y2="133" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        {/* More lines */}
        <line x1="212" y1="142" x2="368" y2="142" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="154" x2="356" y2="154" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="166" x2="375" y2="166" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="178" x2="352" y2="178" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="190" x2="370" y2="190" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="202" x2="348" y2="202" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="214" x2="330" y2="214" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="212" y1="226" x2="295" y2="226" stroke="#1a1a1a" strokeWidth="2"   strokeLinecap="round" opacity="0.45"/>

        {/* Margin check 1 */}
        <path d="M 184 103 L 188 107 L 196 99" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"
          style={{ animation: "czar2-check-pop 3s ease-in-out infinite" }}/>
        {/* Margin check 2 */}
        <path d="M 184 139 L 188 143 L 196 135" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"
          style={{ animation: "czar2-check-pop 3s 1.2s ease-in-out infinite" }}/>
        {/* Margin check 3 */}
        <path d="M 184 163 L 188 167 L 196 159" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"
          style={{ animation: "czar2-check-pop 3s 2.4s ease-in-out infinite" }}/>

        {/* Insertion caret */}
        <path d="M 246 195 L 252 189 L 258 195" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7"/>
        <line x1="252" y1="189" x2="252" y2="184" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>

        {/* ── SPARKLE ── */}
        <g style={{ animation: "czar2-spin 3.4s ease-in-out infinite", transformOrigin: "156px 56px" }}>
          <path d="M 156 46 L 156 66 M 146 56 L 166 56 M 148 48 L 164 64 M 164 48 L 148 64"
            stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round"/>
        </g>

      </svg>
    </div>
  );
}

// ─── CzarObjectScene — 3-phase animated tour (how to use CZAR) ───────────

export function CzarObjectScene() {
  const CR = "#C4384A"; // crimson — type
  const GO = "#B8903A"; // gold — process
  const SA = "#4A7A5A"; // sage — output

  return (
    <div className="w-full select-none" aria-hidden>
      <style>{SCENE2_CSS}</style>
      <svg viewBox="0 0 420 446" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto" strokeLinecap="round" strokeLinejoin="round">

        {/* ═══════════════════════════════════════════════════════
            CARD 1 — Type Your Request   (y 8–132)   CRIMSON
        ═══════════════════════════════════════════════════════ */}
        <g style={{ animation: "czar-tour-p1 15s ease-in-out infinite" }}>
          {/* Card shell */}
          <rect x="10" y="8" width="400" height="124" rx="14"
            fill={CR} fillOpacity="0.05" stroke={CR} strokeWidth="1.5"/>

          {/* Step tag */}
          <rect x="22" y="20" width="96" height="14" rx="5" fill={CR} fillOpacity="0.12"/>
          <rect x="26" y="24" width="20" height="5" rx="2.5" fill={CR} fillOpacity="0.7"/>
          <rect x="50" y="24" width="62" height="5" rx="2.5" fill={CR} fillOpacity="0.5"/>

          {/* Mode pills */}
          <rect x="22" y="40" width="36" height="13" rx="6" fill={CR} fillOpacity="0.18" stroke={CR} strokeWidth="1"/>
          <rect x="62" y="40" width="36" height="13" rx="6" fill={CR} fillOpacity="0.04"/>
          <rect x="102" y="40" width="48" height="13" rx="6" fill={CR} fillOpacity="0.04"/>
          <rect x="154" y="40" width="42" height="13" rx="6" fill={CR} fillOpacity="0.04"/>
          <rect x="200" y="40" width="32" height="13" rx="6" fill={CR} fillOpacity="0.04"/>

          {/* Input field */}
          <rect x="22" y="60" width="332" height="52" rx="10"
            fill="white" fillOpacity="0.7" stroke={CR} strokeWidth="1.4"/>

          {/* Simulated typed text — two lines */}
          <rect x="34" y="75" width="196" height="4" rx="2" fill={CR} fillOpacity="0.4"/>
          <rect x="34" y="86" width="148" height="3.5" rx="1.75" fill={CR} fillOpacity="0.25"/>

          {/* Blinking cursor */}
          <rect x="186" y="72" width="1.8" height="20" rx="0.9" fill={CR}
            style={{ animation: "czar2-blink 1s step-end infinite" }}/>

          {/* Send button */}
          <circle cx="342" cy="86" r="16" fill={CR}/>
          <path d="M 336 86 L 342 80 L 348 86 M 342 80 L 342 93"
            stroke="white" strokeWidth="2" fill="none"/>

          {/* Attach + voice hints */}
          <rect x="26" y="119" width="18" height="13" rx="4" fill={CR} fillOpacity="0.14"/>
          <rect x="49" y="119" width="54" height="13" rx="6" fill={CR} fillOpacity="0.07"/>
          <rect x="108" y="119" width="36" height="13" rx="6" fill={CR} fillOpacity="0.07"/>
        </g>

        {/* Connector dots 1→2 */}
        <g opacity="0.22">
          <circle cx="202" cy="142" r="2.8" fill="#1a1a1a"/>
          <circle cx="212" cy="142" r="2.8" fill="#1a1a1a"/>
          <circle cx="222" cy="142" r="2.8" fill="#1a1a1a"/>
        </g>

        {/* ═══════════════════════════════════════════════════════
            CARD 2 — CZAR Works          (y 152–294)   GOLD
        ═══════════════════════════════════════════════════════ */}
        <g style={{ animation: "czar-tour-p2 15s ease-in-out infinite" }}>
          <rect x="10" y="152" width="400" height="142" rx="14"
            fill={GO} fillOpacity="0.05" stroke={GO} strokeWidth="1.5"/>

          {/* Step tag */}
          <rect x="22" y="164" width="96" height="14" rx="5" fill={GO} fillOpacity="0.14"/>
          <rect x="26" y="168" width="20" height="5" rx="2.5" fill={GO} fillOpacity="0.7"/>
          <rect x="50" y="168" width="55" height="5" rx="2.5" fill={GO} fillOpacity="0.5"/>

          {/* Agent row 1 — Researcher */}
          <rect x="22" y="184" width="376" height="26" rx="7" fill={GO} fillOpacity="0.07"/>
          <circle cx="37" cy="197" r="7" fill={GO} fillOpacity="0.25"/>
          <rect x="50" y="193" width="56" height="4" rx="2" fill={GO} fillOpacity="0.6"/>
          <rect x="50" y="201" width="100" height="3" rx="1.5" fill={GO} fillOpacity="0.3"/>
          <g style={{ animation: "czar-tour-ring 1.5s linear infinite", transformOrigin: "383px 197px" }}>
            <circle cx="383" cy="197" r="8" fill="none" stroke={GO} strokeWidth="1.8" strokeDasharray="16 8"/>
          </g>

          {/* Agent row 2 — Writer */}
          <rect x="22" y="214" width="376" height="26" rx="7" fill={GO} fillOpacity="0.05"/>
          <circle cx="37" cy="227" r="7" fill={GO} fillOpacity="0.25"/>
          <rect x="50" y="223" width="40" height="4" rx="2" fill={GO} fillOpacity="0.6"/>
          <rect x="50" y="231" width="118" height="3" rx="1.5" fill={GO} fillOpacity="0.3"/>
          <g style={{ animation: "czar-tour-ring 1.9s linear infinite 0.4s", transformOrigin: "383px 227px" }}>
            <circle cx="383" cy="227" r="8" fill="none" stroke={GO} strokeWidth="1.8" strokeDasharray="16 8"/>
          </g>

          {/* Agent row 3 — Editor */}
          <rect x="22" y="244" width="376" height="26" rx="7" fill={GO} fillOpacity="0.07"/>
          <circle cx="37" cy="257" r="7" fill={GO} fillOpacity="0.25"/>
          <rect x="50" y="253" width="36" height="4" rx="2" fill={GO} fillOpacity="0.6"/>
          <rect x="50" y="261" width="88" height="3" rx="1.5" fill={GO} fillOpacity="0.3"/>
          <g style={{ animation: "czar-tour-ring 2.3s linear infinite 0.8s", transformOrigin: "383px 257px" }}>
            <circle cx="383" cy="257" r="8" fill="none" stroke={GO} strokeWidth="1.8" strokeDasharray="8 16"/>
          </g>

          {/* Progress bar */}
          <rect x="22" y="278" width="376" height="7" rx="3.5" fill={GO} fillOpacity="0.1"/>
          <line x1="22" y1="281.5" x2="398" y2="281.5"
            stroke={GO} strokeWidth="7" strokeLinecap="round"
            strokeDasharray="376"
            style={{ animation: "czar-tour-bar 5s ease-in-out infinite alternate" }}/>
        </g>

        {/* Connector dots 2→3 */}
        <g opacity="0.22">
          <circle cx="202" cy="304" r="2.8" fill="#1a1a1a"/>
          <circle cx="212" cy="304" r="2.8" fill="#1a1a1a"/>
          <circle cx="222" cy="304" r="2.8" fill="#1a1a1a"/>
        </g>

        {/* ═══════════════════════════════════════════════════════
            CARD 3 — Download            (y 314–436)   SAGE
        ═══════════════════════════════════════════════════════ */}
        <g style={{ animation: "czar-tour-p3 15s ease-in-out infinite" }}>
          <rect x="10" y="314" width="400" height="124" rx="14"
            fill={SA} fillOpacity="0.05" stroke={SA} strokeWidth="1.5"/>

          {/* Step tag */}
          <rect x="22" y="326" width="96" height="14" rx="5" fill={SA} fillOpacity="0.14"/>
          <rect x="26" y="330" width="20" height="5" rx="2.5" fill={SA} fillOpacity="0.7"/>
          <rect x="50" y="330" width="62" height="5" rx="2.5" fill={SA} fillOpacity="0.5"/>

          {/* Document panel — left */}
          <rect x="22" y="346" width="180" height="82" rx="7"
            fill={SA} fillOpacity="0.06" stroke={SA} strokeWidth="1.2"/>
          <rect x="32" y="358" width="68" height="5" rx="2.5" fill={SA} fillOpacity="0.5"/>
          <rect x="32" y="370" width="158" height="3" rx="1.5" fill={SA} fillOpacity="0.28"/>
          <rect x="32" y="379" width="148" height="3" rx="1.5" fill={SA} fillOpacity="0.22"/>
          <rect x="32" y="388" width="154" height="3" rx="1.5" fill={SA} fillOpacity="0.28"/>
          <rect x="32" y="397" width="140" height="3" rx="1.5" fill={SA} fillOpacity="0.2"/>
          <rect x="32" y="406" width="128" height="3" rx="1.5" fill={SA} fillOpacity="0.16"/>
          <rect x="32" y="415" width="112" height="3" rx="1.5" fill={SA} fillOpacity="0.12"/>

          {/* Stats + download panel — right */}
          <rect x="214" y="346" width="196" height="82" rx="7"
            fill={SA} fillOpacity="0.08" stroke={SA} strokeWidth="1.2"/>

          {/* Word count row */}
          <rect x="224" y="358" width="76" height="5" rx="2.5" fill={SA} fillOpacity="0.5"/>
          <rect x="304" y="359" width="46" height="4" rx="2" fill={SA} fillOpacity="0.25"/>

          {/* Citations row */}
          <rect x="224" y="371" width="60" height="4" rx="2" fill={SA} fillOpacity="0.4"/>
          <rect x="288" y="372" width="52" height="3" rx="1.5" fill={SA} fillOpacity="0.2"/>

          {/* Harvard refs row */}
          <rect x="224" y="383" width="72" height="4" rx="2" fill={SA} fillOpacity="0.35"/>
          <rect x="300" y="384" width="40" height="3" rx="1.5" fill={SA} fillOpacity="0.18"/>

          {/* Download .docx button */}
          <rect x="224" y="396" width="176" height="30" rx="8" fill={SA} fillOpacity="0.85"/>
          <rect x="234" y="404" width="80" height="4" rx="2" fill="white" fillOpacity="0.9"/>
          <rect x="234" y="412" width="56" height="3" rx="1.5" fill="white" fillOpacity="0.55"/>
          {/* Download arrow */}
          <path d="M 381 405 L 381 420 M 376 415 L 381 420 L 386 415"
            stroke="white" strokeWidth="1.8" fill="none"/>

          {/* Checkmark badge */}
          <g style={{
            animation: "czar-tour-check 15s ease-in-out infinite",
            transformOrigin: "202px 346px",
            transformBox: "fill-box" as React.CSSProperties["transformBox"],
          }}>
            <circle cx="202" cy="346" r="20" fill={SA}/>
            <path d="M 192 346 L 199 353 L 213 338"
              stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
          </g>
        </g>

      </svg>
    </div>
  );
}
