import React, { useState, useEffect } from "react";

// ─── CSS animations injected once ─────────────────────────────────────────────

const SCENE_CSS = `
  @keyframes czar-typing {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-4px); }
  }
  @keyframes czar-cursor {
    0%, 44%  { opacity: 1; }
    50%, 94% { opacity: 0; }
    100%     { opacity: 1; }
  }
  @keyframes czar-steam {
    0%   { transform: translateY(0)  scaleX(1);   opacity: 0.45; }
    100% { transform: translateY(-20px) scaleX(1.4); opacity: 0; }
  }
  @keyframes czar-bubble {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes czar-sparkle {
    0%   { transform: rotate(0deg)   scale(1); }
    50%  { transform: rotate(180deg) scale(1.25); }
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
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%      { transform: translateY(-8px)  rotate(-4deg); }
    66%      { transform: translateY(5px)   rotate(3deg); }
  }
  @keyframes czar-glow-drift {
    0%, 100% { transform: translate(0,  0)    scale(1); }
    33%      { transform: translate(3%, -4%)  scale(1.04); }
    66%      { transform: translate(-2%, 3%)  scale(0.97); }
  }
`;

// ─── Team Scene — main welcome illustration ───────────────────────────────────

export function TeamScene({ mode = "chat" }: { mode?: string }) {
  const isWrite    = mode === "write";
  const isResearch = mode === "research";
  const isPlan     = mode === "plan";

  return (
    <div className="w-full max-w-[500px] mx-auto select-none" aria-hidden>
      <style>{SCENE_CSS}</style>
      <svg
        viewBox="0 0 500 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* ── TABLE ─────────────────────────────────────────────────── */}
        <rect x="0" y="184" width="500" height="20" rx="4" fill="#1a1a1a" opacity="0.86"/>

        {/* ── COFFEE MUG (far left) ───────────────────────────────── */}
        <g>
          <rect x="8" y="156" width="24" height="30" rx="5" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          <ellipse cx="20" cy="156" rx="12" ry="4.5" fill="#1a1a1a" opacity="0.22"/>
          <path d="M33 165 Q41 168 33 175" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          {/* Steam */}
          <path d="M14 150 Q11 142 14 134"
                stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"
                style={{ animation: "czar-steam 2.6s ease-out infinite", opacity: 0.4 }}/>
          <path d="M21 147 Q18 139 21 131"
                stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"
                style={{ animation: "czar-steam 2.6s ease-out 0.9s infinite", opacity: 0.4 }}/>
        </g>

        {/* ── RESEARCHER (left, anchor x=85) ──────────────────────── */}
        <g>
          {/* Short hair + side volume */}
          <path d="M58 74 C56 50 60 32 85 32 C110 32 114 50 112 74 C112 62 108 46 85 46 C62 46 58 62 58 74Z" fill="#1a1a1a"/>
          <ellipse cx="58" cy="68" rx="6" ry="9" fill="#1a1a1a"/>
          <ellipse cx="112" cy="68" rx="6" ry="9" fill="#1a1a1a"/>
          {/* Face */}
          <ellipse cx="85" cy="78" rx="23" ry="26" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          {/* Eyebrows */}
          <path d="M72 68 Q77 65 82 68" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M88 68 Q93 65 98 68" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Round glasses */}
          <circle cx="76" cy="75" r="9.5" stroke="#1a1a1a" strokeWidth="2.4" fill="none"/>
          <circle cx="94" cy="75" r="9.5" stroke="#1a1a1a" strokeWidth="2.4" fill="none"/>
          <path d="M66 75 L62 73"  stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M103.5 75 L107 73" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M85.5 75 L84.5 75" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>
          {/* Eyes */}
          <circle cx="76" cy="75" r="3.2" fill="#1a1a1a"/>
          <circle cx="94" cy="75" r="3.2" fill="#1a1a1a"/>
          <circle cx="77.3" cy="73.8" r="1.1" fill="white"/>
          <circle cx="95.3" cy="73.8" r="1.1" fill="white"/>
          {/* Smile */}
          <path d="M76 86 Q85 93 94 86" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          {/* Neck */}
          <rect x="80" y="103" width="10" height="15" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          {/* Body — dark shirt */}
          <path d="M50 184 C50 144 62 132 85 130 C108 132 120 144 120 184Z" fill="#1a1a1a"/>
          {/* Collar V */}
          <path d="M77 130 L85 143 L93 130" stroke="white" strokeWidth="2" fill="none"/>
          {/* Left arm — holding phone */}
          <path d="M53 157 C47 166 40 174 35 182"
                stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
          {/* Phone */}
          <rect x="23" y="172" width="20" height="33" rx="5" fill="#1a1a1a"/>
          <rect x="26" y="176" width="14" height="22" rx="2.5" fill="#333"/>
          <rect x="28" y="179" width="9"  height="2"  rx="1" fill="white" opacity="0.5"/>
          <rect x="28" y="183" width="7"  height="2"  rx="1" fill="white" opacity="0.38"/>
          <rect x="28" y="187" width="8"  height="2"  rx="1" fill="white" opacity="0.38"/>
          {/* Right arm — resting */}
          <path d="M118 156 C124 166 128 175 130 182"
                stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
        </g>

        {/* ── WRITER (center, anchor x=250, slightly larger) ──────── */}
        <g>
          {/* Long flowing hair */}
          <path d="M221 55 C219 25 225 8 250 8 C275 8 281 25 279 55 C284 75 282 116 275 126 C264 108 236 108 225 126 C218 116 216 75 221 55Z" fill="#1a1a1a"/>
          {/* Hair sheen */}
          <path d="M234 17 Q242 13 250 13 Q258 13 266 17" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.18"/>
          {/* Face */}
          <ellipse cx="250" cy="59" rx="25" ry="29" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          {/* Eyebrows */}
          <path d="M237 49 Q242 46 247 49" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M253 49 Q258 46 263 49" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Eyes */}
          <ellipse cx="242" cy="57" rx="4" ry="3.8" fill="#1a1a1a"/>
          <ellipse cx="258" cy="57" rx="4" ry="3.8" fill="#1a1a1a"/>
          <circle cx="243.7" cy="55.5" r="1.4" fill="white"/>
          <circle cx="259.7" cy="55.5" r="1.4" fill="white"/>
          {/* Nose */}
          <path d="M248 63 L250 67 L252 63" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* Warm smile */}
          <path d="M242 74 Q250 83 258 74" stroke="#1a1a1a" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
          {/* Cheeks */}
          <circle cx="235" cy="65" r="4.5" fill="#1a1a1a" opacity="0.07"/>
          <circle cx="265" cy="65" r="4.5" fill="#1a1a1a" opacity="0.07"/>
          {/* Neck */}
          <rect x="245" y="87" width="10" height="15" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          {/* Body — white/light shirt for contrast against dark neighbours */}
          <path d="M216 184 C216 142 228 130 250 128 C272 130 284 142 284 184Z" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          <path d="M242 128 L250 141 L258 128" stroke="#1a1a1a" strokeWidth="2" fill="none"/>
          {/* Arms — typing bounce animation */}
          <g style={{ animation: "czar-typing 1.2s ease-in-out infinite", transformOrigin: "250px 155px" }}>
            <path d="M218 154 C221 167 224 176 231 182"
                  stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
            <path d="M282 154 C279 167 276 176 269 182"
                  stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
          </g>
        </g>

        {/* ── LAPTOP (center, on table) ──────────────────────────── */}
        <g>
          {/* Screen panel */}
          <rect x="205" y="136" width="90" height="52" rx="4" fill="#1a1a1a"/>
          {/* Screen face */}
          <rect x="209" y="140" width="82" height="44" fill="#222"/>
          {/* Text content lines */}
          <rect x="214" y="146" width="52" height="3"   rx="1.5" fill="white" opacity="0.45"/>
          <rect x="214" y="152" width="40" height="3"   rx="1.5" fill="white" opacity="0.32"/>
          <rect x="214" y="158" width="48" height="3"   rx="1.5" fill="white" opacity="0.32"/>
          <rect x="214" y="164" width="35" height="3"   rx="1.5" fill="white" opacity="0.28"/>
          {/* Blinking cursor */}
          <rect x="268" y="146" width="3" height="9" rx="1.5" fill="white"
                style={{ animation: "czar-cursor 1.1s step-end infinite" }}/>
          {/* Keyboard base */}
          <rect x="188" y="186" width="124" height="9" rx="3" fill="#1a1a1a"/>
          <rect x="200" y="188" width="100" height="2.5" rx="1.2" fill="white" opacity="0.1"/>
          {/* Mode-specific extra: magnifier for research */}
          {isResearch && (
            <g opacity="0.85">
              <circle cx="280" cy="110" r="14" stroke="#1a1a1a" strokeWidth="3" fill="white"/>
              <circle cx="280" cy="110" r="8" stroke="#1a1a1a" strokeWidth="1.5" fill="none" opacity="0.4"/>
              <line  x1="290" y1="120" x2="300" y2="132" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round"/>
            </g>
          )}
          {/* Plan mode: sticky notes */}
          {isPlan && (
            <g>
              <rect x="152" y="100" width="36" height="32" rx="3" fill="#FDE68A" stroke="#1a1a1a" strokeWidth="1.5"/>
              <line x1="158" y1="108" x2="180" y2="108" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.5"/>
              <line x1="158" y1="114" x2="178" y2="114" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.5"/>
              <rect x="164" y="118" width="28" height="24" rx="3" fill="#D1FAE5" stroke="#1a1a1a" strokeWidth="1.5"/>
              <line x1="169" y1="125" x2="185" y2="125" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.5"/>
            </g>
          )}
        </g>

        {/* ── EDITOR (right, anchor x=405) ────────────────────────── */}
        <g>
          {/* Wavy medium hair */}
          <path d="M378 70 C376 44 380 26 405 26 C430 26 434 44 432 70 C435 88 432 118 426 126 C416 110 394 110 384 126 C378 118 375 88 378 70Z" fill="#1a1a1a"/>
          {/* Wave texture */}
          <path d="M387 44 Q393 40 399 44 Q405 48 411 44 Q417 40 423 44"
                stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.2"/>
          {/* Face */}
          <ellipse cx="405" cy="76" rx="23" ry="26" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
          {/* Eyebrows — arched */}
          <path d="M393 66 Q398 63 403 66" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M407 66 Q412 63 417 66" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Eyes */}
          <ellipse cx="397" cy="73" rx="3.8" ry="3.5" fill="#1a1a1a"/>
          <ellipse cx="413" cy="73" rx="3.8" ry="3.5" fill="#1a1a1a"/>
          <circle cx="398.5" cy="71.8" r="1.3" fill="white"/>
          <circle cx="414.5" cy="71.8" r="1.3" fill="white"/>
          {/* Nose */}
          <path d="M403 79 L405 82 L407 79" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* Smile */}
          <path d="M397 87 Q405 95 413 87" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          {/* Neck */}
          <rect x="400" y="101" width="10" height="15" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          {/* Body — dark shirt */}
          <path d="M372 184 C372 142 384 130 405 128 C426 130 438 142 438 184Z" fill="#1a1a1a"/>
          {/* Collar */}
          <path d="M397 128 L405 141 L413 128" stroke="white" strokeWidth="2" fill="none"/>
          {/* Right arm — writing with pen */}
          <path d="M436 152 C443 163 448 172 451 180"
                stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
          {/* Hand + pen */}
          <ellipse cx="452" cy="182" rx="8" ry="6" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          <line  x1="450" y1="178" x2="466" y2="162" stroke="#1a1a1a" strokeWidth="3.2" strokeLinecap="round"/>
          <polygon points="466,159 470,152 475,159" fill="#1a1a1a"/>
          {/* Left arm — supporting */}
          <path d="M374 152 C369 163 366 172 364 180"
                stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" fill="none"/>
        </g>

        {/* ── PAPERS (right edge) ────────────────────────────────── */}
        <g>
          <rect x="456" y="162" width="38" height="26" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          <rect x="451" y="156" width="38" height="26" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="1.8"/>
          <line x1="456" y1="163" x2="482" y2="163" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.35"/>
          <line x1="456" y1="168" x2="480" y2="168" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.35"/>
          <line x1="456" y1="173" x2="477" y2="173" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.35"/>
        </g>

        {/* ── FLOATING SPEECH BUBBLE ─────────────────────────────── */}
        <g style={{ animation: "czar-bubble 3.2s ease-in-out infinite" }}>
          <rect x="132" y="36" width="88" height="38" rx="13" fill="#1a1a1a"/>
          <path d="M152 74 L146 86 L168 74Z" fill="#1a1a1a"/>
          <rect x="141" y="45" width="56" height="3.5" rx="1.8" fill="white" opacity="0.65"/>
          <rect x="141" y="52" width="44" height="3.5" rx="1.8" fill="white" opacity="0.5"/>
          <circle cx="149" cy="63" r="2.8" fill="white" opacity="0.48"/>
          <circle cx="158" cy="63" r="2.8" fill="white" opacity="0.48"/>
          <circle cx="167" cy="63" r="2.8" fill="white" opacity="0.48"/>
        </g>

        {/* ── SPARKLES ───────────────────────────────────────────── */}
        <g style={{ animation: "czar-sparkle 4s linear infinite", transformOrigin: "138px 30px" }} opacity="0.72">
          <path d="M138 30 L139.6 24 L141.2 30 L147 31.5 L141.2 33 L139.6 39 L138 33 L132 31.5 Z" fill="#1a1a1a"/>
        </g>
        <g style={{ animation: "czar-sparkle 5.5s linear infinite reverse", transformOrigin: "350px 18px" }} opacity="0.72">
          <path d="M350 18 L351.8 11.5 L353.6 18 L360 19.5 L353.6 21 L351.8 27.5 L350 21 L343.5 19.5 Z" fill="#1a1a1a"/>
        </g>
        <g opacity="0.48">
          <path d="M468 126 L469.5 121 L471 126 L476 127.5 L471 129 L469.5 134 L468 129 L463 127.5 Z" fill="#1a1a1a"/>
        </g>

      </svg>
    </div>
  );
}

// ─── Greeting line ────────────────────────────────────────────────────────────

export function GreetingLine({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  const first = userName?.split(" ")[0];
  return (
    <p
      className="text-[13px] text-muted-foreground italic transition-all duration-700 mb-4"
      style={{ opacity: show ? 1 : 0, transform: show ? "none" : "translateY(8px)" }}
    >
      {first ? `Hey ${first} — your team is ready` : "Your AI writing team is ready"}
    </p>
  );
}

// ─── Agent Activity Dock — fixed right edge during streaming ─────────────────

// Small face SVGs kept as compact inline SVG for the dock only
function MiniWriter()     { return <svg viewBox="0 0 80 88" fill="none" width="40" height="44"><path d="M12 40 C10 18 15 4 40 4 C65 4 70 18 68 40 C72 56 70 82 64 88 L40 76 L16 88 C10 82 8 56 12 40Z" fill="#1a1a1a"/><ellipse cx="40" cy="44" rx="20" ry="23" fill="white"/><circle cx="33" cy="40" r="3.2" fill="#1a1a1a"/><circle cx="47" cy="40" r="3.2" fill="#1a1a1a"/><circle cx="34.3" cy="38.8" r="1.1" fill="white"/><circle cx="48.3" cy="38.8" r="1.1" fill="white"/><path d="M33 52 Q40 59 47 52" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>; }
function MiniResearcher() { return <svg viewBox="0 0 80 80" fill="none" width="40" height="40"><path d="M16 40 C14 20 18 6 40 6 C62 6 66 20 64 40 C64 28 60 16 40 16 C20 16 16 28 16 40Z" fill="#1a1a1a"/><ellipse cx="16" cy="36" rx="5" ry="7" fill="#1a1a1a"/><ellipse cx="64" cy="36" rx="5" ry="7" fill="#1a1a1a"/><ellipse cx="40" cy="48" rx="20" ry="22" fill="white"/><circle cx="33" cy="43" r="8" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/><circle cx="47" cy="43" r="8" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/><circle cx="33" cy="43" r="2.8" fill="#1a1a1a"/><circle cx="47" cy="43" r="2.8" fill="#1a1a1a"/><circle cx="34" cy="41.8" r="0.9" fill="white"/><circle cx="48" cy="41.8" r="0.9" fill="white"/><path d="M34 57 Q40 63 46 57" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>; }
function MiniPlanner()    { return <svg viewBox="0 0 80 80" fill="none" width="40" height="40"><path d="M16 42 C14 20 18 6 40 6 C62 6 66 20 64 42 L62 54 C54 48 26 48 18 54Z" fill="#1a1a1a"/><ellipse cx="40" cy="49" rx="20" ry="22" fill="white"/><ellipse cx="33.5" cy="44" rx="3.5" ry="3.2" fill="#1a1a1a"/><ellipse cx="46.5" cy="44" rx="3.5" ry="3.2" fill="#1a1a1a"/><circle cx="34.7" cy="42.8" r="1.1" fill="white"/><circle cx="47.7" cy="42.8" r="1.1" fill="white"/><path d="M33 57 Q40 64 47 57" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>; }
function MiniEditor()     { return <svg viewBox="0 0 80 84" fill="none" width="40" height="42"><path d="M12 40 C10 16 16 3 40 3 C64 3 70 16 68 40 C70 54 68 75 62 82 C52 66 28 66 18 82 C12 75 10 54 12 40Z" fill="#1a1a1a"/><ellipse cx="40" cy="44" rx="20" ry="23" fill="white"/><ellipse cx="33.5" cy="41" rx="3.3" ry="3" fill="#1a1a1a"/><ellipse cx="46.5" cy="41" rx="3.3" ry="3" fill="#1a1a1a"/><circle cx="34.8" cy="39.8" r="1.1" fill="white"/><circle cx="47.8" cy="39.8" r="1.1" fill="white"/><path d="M33 55 Q40 62 47 55" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>; }
function MiniCritic()     { return <svg viewBox="0 0 80 80" fill="none" width="40" height="40"><circle cx="40" cy="14" r="9" fill="#1a1a1a"/><circle cx="22" cy="22" r="8" fill="#1a1a1a"/><circle cx="58" cy="22" r="8" fill="#1a1a1a"/><circle cx="14" cy="36" r="7" fill="#1a1a1a"/><circle cx="66" cy="36" r="7" fill="#1a1a1a"/><ellipse cx="40" cy="52" rx="20" ry="22" fill="white"/><ellipse cx="33.5" cy="45" rx="3.3" ry="3" fill="#1a1a1a"/><ellipse cx="46.5" cy="45" rx="3.3" ry="3" fill="#1a1a1a"/><circle cx="34.8" cy="43.8" r="1.1" fill="white"/><circle cx="47.8" cy="43.8" r="1.1" fill="white"/><path d="M33 58 Q40 65 46 58" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>; }

const MINI_FACES: Record<string, React.FC> = {
  writer:     MiniWriter,
  editor:     MiniEditor,
  researcher: MiniResearcher,
  planner:    MiniPlanner,
  critic:     MiniCritic,
  revision:   MiniEditor,
  architect:  MiniPlanner,
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
        const done    = agent.status === "done";
        const error   = agent.status === "error";
        return (
          <div key={agent.id} className="flex items-center gap-2 justify-end">
            {working && agent.action && (
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl px-2.5 py-1.5 text-[10.5px] text-muted-foreground max-w-[130px] text-right leading-snug shadow-sm">
                {agent.action}
              </div>
            )}
            <div className="relative flex-shrink-0">
              {working && (
                <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
              )}
              <div className={[
                "w-10 h-10 rounded-full bg-white overflow-hidden border-2 shadow-md",
                "flex items-center justify-center transition-all duration-300",
                working ? "border-primary shadow-primary/20 scale-105"
                : done   ? "border-emerald-500/60"
                : error  ? "border-destructive/60"
                : "border-border/50 opacity-60",
              ].join(" ")}>
                {Face && <Face />}
              </div>
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

// ─── Floating background elements — welcome screen ────────────────────────────

function TextLines({ width }: { width: number }) {
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} fill="none">
      <rect x="0" y="0" width={width}              height="3" rx="1.5" fill="currentColor"/>
      <rect x="0" y="7" width={Math.round(width*.72)} height="3" rx="1.5" fill="currentColor"/>
    </svg>
  );
}
function SmallPen() {
  return (
    <svg width="24" height="32" viewBox="0 0 28 36" fill="none">
      <path d="M14 0 L28 18 L20 18 L20 36 L8 36 L8 18 L0 18Z" fill="currentColor"/>
      <path d="M11 18 L14 30 L17 18" fill="white" opacity="0.5"/>
    </svg>
  );
}
function SmallBook() {
  return (
    <svg width="34" height="26" viewBox="0 0 40 30" fill="none">
      <path d="M20 7 C16 4 9 3 2 5 L2 27 C9 25 16 26 20 29 C24 26 31 25 38 27 L38 5 C31 3 24 4 20 7Z" fill="currentColor"/>
      <line x1="20" y1="7" x2="20" y2="29" stroke="white" strokeWidth="1.5" opacity="0.55"/>
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
function Dots() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      {[0,10,20].flatMap(x => [0,10,20].map(y => (
        <circle key={`${x}-${y}`} cx={x+3} cy={y+3} r="2.5" fill="currentColor"/>
      )))}
    </svg>
  );
}

const BG_ELEMENTS = [
  { id:"l1", x:"4%",  y:"10%", anim:"czar-float-a", dur:"8s",  delay:"0s",   op:"0.048", el:<TextLines width={68}/> },
  { id:"l2", x:"84%", y:"16%", anim:"czar-float-b", dur:"9.5s",delay:"1.4s", op:"0.044", el:<TextLines width={54}/> },
  { id:"l3", x:"5%",  y:"60%", anim:"czar-float-a", dur:"7s",  delay:"2.6s", op:"0.048", el:<TextLines width={60}/> },
  { id:"l4", x:"83%", y:"56%", anim:"czar-float-c", dur:"10s", delay:"0.6s", op:"0.042", el:<TextLines width={56}/> },
  { id:"l5", x:"6%",  y:"80%", anim:"czar-float-b", dur:"8.5s",delay:"3.4s", op:"0.038", el:<TextLines width={48}/> },
  { id:"l6", x:"82%", y:"78%", anim:"czar-float-a", dur:"11s", delay:"2s",   op:"0.038", el:<TextLines width={64}/> },
  { id:"pen", x:"87%",y:"38%", anim:"czar-float-b", dur:"12s", delay:"0s",   op:"0.058", el:<SmallPen/> },
  { id:"book",x:"3%", y:"42%", anim:"czar-float-b", dur:"10s", delay:"4s",   op:"0.052", el:<SmallBook/> },
  { id:"s1",  x:"90%",y:"7%",  anim:"czar-float-a", dur:"6s",  delay:"0s",   op:"0.075", el:<Sparkle size={18}/> },
  { id:"s2",  x:"2%", y:"28%", anim:"czar-float-c", dur:"8s",  delay:"3s",   op:"0.065", el:<Sparkle size={14}/> },
  { id:"s3",  x:"89%",y:"48%", anim:"czar-float-a", dur:"7s",  delay:"1.4s", op:"0.055", el:<Sparkle size={12}/> },
  { id:"d1",  x:"85%",y:"70%", anim:"czar-float-a", dur:"9s",  delay:"1s",   op:"0.058", el:<Dots/> },
  { id:"d2",  x:"3%", y:"70%", anim:"czar-float-c", dur:"11s", delay:"5s",   op:"0.048", el:<Dots/> },
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
            left: item.x, top: item.y,
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

// ─── Writing glow — thread area background during active session ──────────────

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
          top: "5%", right: "-10%",
          background: "radial-gradient(circle, hsl(18 50% 53%) 0%, transparent 70%)",
          animation: "czar-glow-drift 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[40vw] h-[40vw] rounded-full opacity-[0.025]"
        style={{
          bottom: "10%", left: "-8%",
          background: "radial-gradient(circle, hsl(153 16% 42%) 0%, transparent 70%)",
          animation: "czar-glow-drift 18s ease-in-out 5s infinite",
        }}
      />
    </div>
  );
}
