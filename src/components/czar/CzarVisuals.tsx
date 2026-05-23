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

// ─── TeamScene — main welcome illustration (natural proportions) ─────────────

export function TeamScene() {
  return (
    <div className="w-full max-w-[560px] mx-auto select-none" aria-hidden>
      <style>{SCENE_CSS}</style>
      <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="czar-svg w-full h-auto" strokeLinejoin="round" strokeLinecap="round">

        {/* ── DESK ──────────────────────────────────────────────── */}
        <rect x="10" y="240" width="500" height="2" fill="#1a1a1a"/>
        <rect x="20" y="240" width="8" height="35" rx="3" fill="#1a1a1a" opacity="0.6"/>
        <rect x="492" y="240" width="8" height="35" rx="3" fill="#1a1a1a" opacity="0.6"/>

        {/* ══════════════════════════════════════════════════════════
            LEFT CHARACTER — Glasses wearer, compact build
        ══════════════════════════════════════════════════════════ */}

        {/* Head outline */}
        <circle cx="90" cy="85" r="28" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Hair (short, neat) */}
        <path d="M62 75 Q62 50 90 48 Q118 50 118 75 L118 85 Q118 88 115 88 Q112 82 90 82 Q68 82 65 88 Q62 88 62 85 Z" fill="#1a1a1a"/>

        {/* Glasses */}
        <circle cx="78" cy="82" r="11" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <circle cx="102" cy="82" r="11" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="89" y1="82" x2="91" y2="82" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="66" y1="80" x2="60" y2="78" stroke="#1a1a1a" strokeWidth="2"/>

        {/* Eyes (small, natural) */}
        <circle cx="78" cy="82" r="3.5" fill="#1a1a1a"/>
        <circle cx="102" cy="82" r="3.5" fill="#1a1a1a"/>
        <circle cx="79" cy="80" r="1.2" fill="white"/>
        <circle cx="103" cy="80" r="1.2" fill="white"/>

        {/* Nose (simple line) */}
        <line x1="90" y1="88" x2="90" y2="98" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.5"/>

        {/* Smile */}
        <path d="M75 105 Q90 115 105 105" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Neck */}
        <rect x="85" y="110" width="10" height="15" fill="white"/>

        {/* Body — simple line art style */}
        <path d="M65 125 L75 130 L75 170 L105 170 L105 130 L115 125" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Left arm */}
        <path d="M75 135 L50 160" stroke="#1a1a1a" strokeWidth="3.2"/>
        <circle cx="48" cy="162" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>

        {/* Right arm — resting */}
        <path d="M105 135 L130 155" stroke="#1a1a1a" strokeWidth="3.2"/>
        <circle cx="132" cy="157" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>


        {/* ══════════════════════════════════════════════════════════
            CENTER CHARACTER — Friendly, engaged, at laptop
        ══════════════════════════════════════════════════════════ */}

        {/* Head */}
        <circle cx="260" cy="80" r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Hair (dark, natural) */}
        <path d="M230 65 Q230 40 260 38 Q290 40 290 65 L290 80 Q290 85 285 85 L235 85 Q230 85 230 80 Z" fill="#1a1a1a"/>

        {/* Eyes (normal, warm) */}
        <circle cx="248" cy="78" r="4" fill="#1a1a1a"/>
        <circle cx="272" cy="78" r="4" fill="#1a1a1a"/>
        <circle cx="249.5" cy="76" r="1.4" fill="white"/>
        <circle cx="273.5" cy="76" r="1.4" fill="white"/>

        {/* Eyebrows */}
        <path d="M240 72 Q248 68 256 72" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.6"/>
        <path d="M264 72 Q272 68 280 72" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.6"/>

        {/* Nose */}
        <line x1="260" y1="82" x2="260" y2="92" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.4"/>

        {/* Smile (happy, engaged) */}
        <path d="M242 100 Q260 110 278 100" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Neck */}
        <rect x="255" y="108" width="10" height="12" fill="white"/>

        {/* Body — sitting at desk */}
        <path d="M238 120 L252 125 L252 180 L268 180 L268 125 L282 120" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Arms — typing motion */}
        <g style={{ animation: "czar-typing 1.2s ease-in-out infinite", transformOrigin: "260px 130px" }}>
          <path d="M252 130 L240 155" stroke="#1a1a1a" strokeWidth="3"/>
          <circle cx="238" cy="157" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          <path d="M268 130 L280 155" stroke="#1a1a1a" strokeWidth="3"/>
          <circle cx="282" cy="157" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        </g>

        {/* Laptop in front (simplified) */}
        <rect x="230" y="160" width="60" height="35" rx="3" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1.5"/>
        <rect x="235" y="165" width="50" height="26" fill="#2a2a2a"/>
        <line x1="240" y1="172" x2="280" y2="172" stroke="white" strokeWidth="2" opacity="0.5"/>
        <line x1="240" y1="178" x2="275" y2="178" stroke="white" strokeWidth="1.5" opacity="0.4"/>


        {/* ══════════════════════════════════════════════════════════
            RIGHT CHARACTER — Long hair, elegant pose
        ══════════════════════════════════════════════════════════ */}

        {/* Head */}
        <circle cx="420" cy="88" r="28" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Hair (long, flowing) */}
        <path d="M392 70 Q390 45 420 43 Q450 45 448 70
                 L448 90 Q448 115 442 145
                 L398 145 Q392 115 392 90 Z" fill="#1a1a1a"/>
        <path d="M398 65 Q405 60 420 60 Q435 60 442 65" fill="none" stroke="white" strokeWidth="1.2" opacity="0.2"/>

        {/* Eyes (expressive, smart) */}
        <circle cx="408" cy="85" r="4" fill="#1a1a1a"/>
        <circle cx="432" cy="85" r="4" fill="#1a1a1a"/>
        <circle cx="409.5" cy="83" r="1.4" fill="white"/>
        <circle cx="433.5" cy="83" r="1.4" fill="white"/>

        {/* Eyebrows */}
        <path d="M400 78 Q408 74 416 78" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.6"/>
        <path d="M424 78 Q432 74 440 78" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.6"/>

        {/* Nose */}
        <line x1="420" y1="90" x2="420" y2="99" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.4"/>

        {/* Smile (subtle, confident) */}
        <path d="M405 107 Q420 115 435 107" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Neck */}
        <rect x="415" y="114" width="10" height="12" fill="white"/>

        {/* Body — confident posture */}
        <path d="M398 126 L412 131 L412 180 L428 180 L428 131 L442 126" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* Left arm — resting */}
        <path d="M412 138 L390 165" stroke="#1a1a1a" strokeWidth="3"/>
        <circle cx="388" cy="167" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>

        {/* Right arm — pen/writing */}
        <path d="M428 138 L450 165" stroke="#1a1a1a" strokeWidth="3"/>
        <circle cx="452" cy="167" r="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="448" y1="163" x2="465" y2="150" stroke="#1a1a1a" strokeWidth="3.5"/>

      </svg>
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

// ─── CzarObjectScene — objects only, live laptop interface ────────────────

export function CzarObjectScene() {
  return (
    <div className="w-full max-w-[540px] mx-auto select-none" aria-hidden>
      <style>{SCENE2_CSS}</style>
      <svg viewBox="0 0 540 290" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="czar2-svg w-full h-auto" strokeLinejoin="round" strokeLinecap="round">

        {/* ── DESK ── */}
        <rect x="10" y="259" width="520" height="4" rx="2" fill="#1a1a1a"/>
        <rect x="28"  y="263" width="8" height="28" rx="4" fill="#1a1a1a" opacity="0.5"/>
        <rect x="504" y="263" width="8" height="28" rx="4" fill="#1a1a1a" opacity="0.5"/>

        {/* ── COFFEE CUP ── */}
        <rect x="28" y="218" width="46" height="41" rx="9" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <ellipse cx="51" cy="259" rx="28" ry="6" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        <path d="M 74 224 Q 86 228 86 236 Q 86 244 74 247" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
        <path d="M 38 215 Q 44 204 38 193" stroke="#1a1a1a" strokeWidth="1.8" fill="none"
          style={{ animation: "czar2-steam 2.4s ease-in-out infinite", transformOrigin: "38px 215px" }}/>
        <path d="M 54 215 Q 60 202 54 191" stroke="#1a1a1a" strokeWidth="1.8" fill="none"
          style={{ animation: "czar2-steam 2.4s 0.72s ease-in-out infinite", transformOrigin: "54px 215px" }}/>

        {/* ── LAPTOP SCREEN BEZEL ── */}
        <rect x="146" y="56" width="248" height="205" rx="12" fill="white" stroke="#1a1a1a" strokeWidth="2.5"/>
        {/* Screen glass */}
        <rect x="156" y="66" width="228" height="185" rx="6" fill="#f7f8fa" stroke="#1a1a1a" strokeWidth="1.5"/>
        {/* Toolbar strip */}
        <rect x="156" y="66" width="228" height="24" rx="6" fill="#ebebeb" stroke="none"/>
        <line x1="156" y1="90" x2="384" y2="90" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.25"/>
        <circle cx="168" cy="78" r="4" fill="#1a1a1a" opacity="0.18"/>
        <circle cx="182" cy="78" r="4" fill="#1a1a1a" opacity="0.18"/>
        <circle cx="196" cy="78" r="4" fill="#1a1a1a" opacity="0.18"/>
        <rect x="212" y="71" width="118" height="14" rx="5" fill="white" opacity="0.7"/>

        {/* Document content on screen */}
        {/* Title line */}
        <line x1="166" y1="108" x2="294" y2="108" stroke="#1a1a1a" strokeWidth="3.2" strokeLinecap="round" opacity="0.8"/>
        {/* Subhead */}
        <line x1="166" y1="121" x2="254" y2="121" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
        {/* Body lines — static */}
        <line x1="166" y1="136" x2="374" y2="136" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        <line x1="166" y1="148" x2="368" y2="148" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        <line x1="166" y1="160" x2="376" y2="160" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        <line x1="166" y1="172" x2="362" y2="172" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        <line x1="166" y1="184" x2="370" y2="184" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        <line x1="166" y1="196" x2="355" y2="196" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        {/* Active line being written */}
        <line x1="166" y1="208" x2="324" y2="208" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray="220" style={{ animation: "czar-obj-write 7s ease-in-out 0.4s infinite" }}/>
        {/* Second active line */}
        <line x1="166" y1="220" x2="282" y2="220" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray="220" style={{ animation: "czar-obj-write 7s ease-in-out 3.6s infinite" }}/>
        {/* Blinking cursor */}
        <line x1="284" y1="213" x2="284" y2="227"
          stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"
          style={{ animation: "czar2-blink 1s step-end infinite" }}/>

        {/* Keyboard hinge + base */}
        <rect x="146" y="259" width="248" height="5" rx="2.5" fill="#1a1a1a" opacity="0.16"/>
        <rect x="138" y="262" width="264" height="18" rx="9" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="156" y1="268" x2="384" y2="268" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.2"/>
        <line x1="156" y1="273" x2="384" y2="273" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.2"/>
        <rect x="228" y="265" width="84" height="12" rx="4" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.25"/>

        {/* ── BOOKS ── */}
        <rect x="434" y="216" width="66" height="43" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="444" y1="216" x2="444" y2="259" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="438" y="188" width="58" height="30" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="448" y1="188" x2="448" y2="218" stroke="#1a1a1a" strokeWidth="2.2"/>
        <rect x="441" y="165" width="52" height="25" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="451" y1="165" x2="451" y2="190" stroke="#1a1a1a" strokeWidth="2.2"/>

        {/* ── FLOATING PAPER 1 (upper left) ── */}
        <g style={{ animation: "czar2-float-a 4.8s ease-in-out infinite", transformOrigin: "96px 90px" }}>
          <rect x="68" y="60" width="54" height="66" rx="4" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          <line x1="78" y1="76" x2="114" y2="76"  stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="78" y1="87" x2="114" y2="87"  stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="78" y1="98" x2="110" y2="98"  stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="78" y1="109" x2="114" y2="109" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="78" y1="120" x2="108" y2="120" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
        </g>

        {/* ── FLOATING PAPER 2 (upper right) ── */}
        <g style={{ animation: "czar2-float-b 5.6s 1.3s ease-in-out infinite", transformOrigin: "462px 76px" }}>
          <g transform="rotate(-14,462,76)">
            <rect x="440" y="50" width="44" height="54" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="1.6"/>
            <line x1="448" y1="64" x2="476" y2="64"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="448" y1="74" x2="476" y2="74"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="448" y1="84" x2="473" y2="84"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="448" y1="94" x2="476" y2="94"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round"/>
          </g>
        </g>

        {/* ── SPARKLE 1 ── */}
        <g style={{ animation: "czar2-spin 3.2s ease-in-out infinite", transformOrigin: "122px 36px" }}>
          <path d="M 122 26 L 122 46 M 112 36 L 132 36 M 114 28 L 130 44 M 130 28 L 114 44"
            stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        {/* ── SPARKLE 2 ── */}
        <g style={{ animation: "czar2-spin 2.4s 1.2s ease-in-out infinite", transformOrigin: "416px 30px" }}>
          <path d="M 416 23 L 416 37 M 409 30 L 423 30"
            stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
        </g>

      </svg>
    </div>
  );
}
