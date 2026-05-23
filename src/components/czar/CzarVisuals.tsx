import React, { useState, useEffect } from "react";

// ─── CSS keyframes (shared across all scene components) ────────────────────

const SCENE_CSS = `
  @keyframes czar-typing {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-5px); }
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
`;

// Helper: arm drawn as double-stroke (white fill with dark outline) to match illustration style
function Arm({ d, w = 15 }: { d: string; w?: number }) {
  return (
    <>
      <path d={d} stroke="#1a1a1a" strokeWidth={w + 3} strokeLinecap="round" fill="none"/>
      <path d={d} stroke="white"   strokeWidth={w - 1} strokeLinecap="round" fill="none"/>
    </>
  );
}

// ─── TeamScene — main welcome illustration ─────────────────────────────────

export function TeamScene({ mode = "chat" }: { mode?: string }) {
  const isResearch = mode === "research";
  const isPlan     = mode === "plan";

  return (
    <div className="w-full max-w-[500px] mx-auto select-none" aria-hidden>
      <style>{SCENE_CSS}</style>
      <svg viewBox="0 0 500 255" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">

        {/* ── TABLE ─────────────────────────────────────────────── */}
        <rect x="0" y="210" width="500" height="22" rx="5" fill="#1a1a1a" opacity="0.88"/>

        {/* ── COFFEE MUG (far left on table) ────────────────────── */}
        <rect x="8" y="162" width="24" height="28" rx="5" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <ellipse cx="20" cy="162" rx="12" ry="4" fill="#1a1a1a" opacity="0.2"/>
        <path d="M33 170 Q41 173 33 180" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M14 156 Q11 148 14 140" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"
              style={{ animation: "czar-steam 2.6s ease-out infinite", opacity: 0.4 }}/>
        <path d="M21 153 Q18 145 21 137" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"
              style={{ animation: "czar-steam 2.6s ease-out 0.9s infinite", opacity: 0.4 }}/>

        {/* ══════════════════════════════════════════════════════════
            LEFT CHARACTER — Researcher
            Big bubble afro · Round glasses · White shirt · Holds cube
        ══════════════════════════════════════════════════════════ */}
        {/* Afro: clustered circles */}
        <circle cx="82"  cy="55"  r="15" fill="#1a1a1a"/>
        <circle cx="63"  cy="66"  r="14" fill="#1a1a1a"/>
        <circle cx="101" cy="66"  r="14" fill="#1a1a1a"/>
        <circle cx="56"  cy="85"  r="12" fill="#1a1a1a"/>
        <circle cx="108" cy="85"  r="12" fill="#1a1a1a"/>
        <circle cx="69"  cy="51"  r="13" fill="#1a1a1a"/>
        <circle cx="95"  cy="51"  r="13" fill="#1a1a1a"/>
        <circle cx="50"  cy="100" r="9"  fill="#1a1a1a"/>
        <circle cx="114" cy="100" r="9"  fill="#1a1a1a"/>

        {/* Face */}
        <circle cx="82" cy="103" r="31" fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>

        {/* Eyebrows */}
        <path d="M64 90 Q72 85 80 90"  stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
        <path d="M84 90 Q92 85 100 90" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Big round glasses */}
        <circle cx="71" cy="99" r="13" stroke="#1a1a1a" strokeWidth="2.8" fill="none"/>
        <circle cx="93" cy="99" r="13" stroke="#1a1a1a" strokeWidth="2.8" fill="none"/>
        <line x1="58" y1="99" x2="53"  y2="97" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round"/>
        <line x1="106" y1="99" x2="111" y2="97" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round"/>
        <line x1="84" y1="99" x2="80"  y2="99" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>

        {/* Eyes (behind lenses) */}
        <circle cx="71" cy="99" r="6"   fill="#1a1a1a"/>
        <circle cx="93" cy="99" r="6"   fill="#1a1a1a"/>
        <circle cx="73" cy="97" r="2.3" fill="white"/>
        <circle cx="95" cy="97" r="2.3" fill="white"/>

        {/* Nose (two soft dots) */}
        <circle cx="78"  cy="110" r="2.2" fill="#1a1a1a" opacity="0.22"/>
        <circle cx="86"  cy="110" r="2.2" fill="#1a1a1a" opacity="0.22"/>

        {/* Wide smile */}
        <path d="M68 118 Q82 128 96 118" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Cheek blush */}
        <circle cx="59"  cy="113" r="7"  fill="#1a1a1a" opacity="0.09"/>
        <circle cx="105" cy="113" r="7"  fill="#1a1a1a" opacity="0.09"/>

        {/* Neck */}
        <rect x="77" y="131" width="10" height="26" fill="white"/>

        {/* White shirt (body) */}
        <path d="M44 210 C44 166 58 153 82 151 C106 153 120 166 120 210Z"
              fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>
        <path d="M74 151 L82 164 L90 151" stroke="#1a1a1a" strokeWidth="2.4" fill="none"/>

        {/* Left arm — holding a small cube */}
        <Arm d="M46 176 C38 188 30 199 24 208" w={15}/>

        {/* Small cube/eraser held in left hand */}
        <rect x="9" y="198" width="22" height="20" rx="4" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="9"  y1="205" x2="31" y2="205" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.45"/>
        <line x1="20" y1="198" x2="20" y2="218" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.45"/>

        {/* Right arm — resting on table */}
        <Arm d="M118 176 C126 188 130 199 132 208" w={15}/>


        {/* ══════════════════════════════════════════════════════════
            CENTER CHARACTER — Writer
            Short neat cap hair · No glasses · Bright big eyes · Typing
        ══════════════════════════════════════════════════════════ */}
        {/* Short hair cap */}
        <path d="M225 83 C223 57 229 40 250 40 C271 40 277 57 275 83 C275 68 271 54 250 54 C229 54 225 68 225 83Z"
              fill="#1a1a1a"/>
        <ellipse cx="225" cy="77" rx="5.5" ry="8" fill="#1a1a1a"/>
        <ellipse cx="275" cy="77" rx="5.5" ry="8" fill="#1a1a1a"/>

        {/* Face */}
        <circle cx="250" cy="90" r="31" fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>

        {/* Eyebrows — friendly raised arch */}
        <path d="M236 78 Q244 73 252 78" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
        <path d="M248 78 Q256 73 264 78" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Big eyes — no glasses, very expressive */}
        <circle cx="241" cy="89" r="7.5" fill="#1a1a1a"/>
        <circle cx="259" cy="89" r="7.5" fill="#1a1a1a"/>
        <circle cx="243" cy="86.5" r="2.8" fill="white"/>
        <circle cx="261" cy="86.5" r="2.8" fill="white"/>
        {/* Eyelid line (makes eyes look more human) */}
        <path d="M233 83 Q241 78 249 83" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4"/>
        <path d="M251 83 Q259 78 267 83" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4"/>

        {/* Nose */}
        <circle cx="246" cy="100" r="2.2" fill="#1a1a1a" opacity="0.22"/>
        <circle cx="254" cy="100" r="2.2" fill="#1a1a1a" opacity="0.22"/>

        {/* Wide bright smile */}
        <path d="M238 107 Q250 118 262 107" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Cheeks */}
        <circle cx="232" cy="101" r="7"  fill="#1a1a1a" opacity="0.09"/>
        <circle cx="268" cy="101" r="7"  fill="#1a1a1a" opacity="0.09"/>

        {/* Energy burst marks — shows focus/excitement */}
        <line x1="216" y1="67" x2="206" y2="57" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="208" y1="77" x2="196" y2="77" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="284" y1="67" x2="294" y2="57" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="292" y1="77" x2="304" y2="77" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>

        {/* Neck */}
        <rect x="245" y="119" width="10" height="32" fill="white"/>

        {/* White shirt */}
        <path d="M214 210 C214 163 228 149 250 147 C272 149 286 163 286 210Z"
              fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>
        <path d="M242 147 L250 161 L258 147" stroke="#1a1a1a" strokeWidth="2.4" fill="none"/>

        {/* Typing arms — animated */}
        <g style={{ animation: "czar-typing 1.3s ease-in-out infinite", transformOrigin: "250px 162px" }}>
          <Arm d="M216 164 C219 179 223 193 230 207" w={15}/>
          <Arm d="M284 164 C281 179 277 193 270 207" w={15}/>
        </g>


        {/* ══════════════════════════════════════════════════════════
            RIGHT CHARACTER — Editor
            Long straight hair (clearly different from both others)
            Oval/rounder glasses · White shirt · Pen in hand
        ══════════════════════════════════════════════════════════ */}
        {/* Long straight hair — flows well past shoulders */}
        <path d="M380 93 C378 62 382 40 408 40 C434 40 438 62 436 93
                 C438 114 436 160 430 170
                 C418 152 398 152 386 170
                 C380 160 378 114 380 93Z"
              fill="#1a1a1a"/>
        {/* Inner wave / sheen on hair */}
        <path d="M390 56 Q396 52 402 52 Q408 52 414 56"
              stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.2"/>

        {/* Face */}
        <circle cx="408" cy="98" r="29" fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>

        {/* Eyebrows — gentle arched */}
        <path d="M394 86 Q402 81 410 86" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
        <path d="M406 86 Q414 81 422 86" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Oval glasses (different shape from left's round ones) */}
        <ellipse cx="399" cy="96" rx="12" ry="10" stroke="#1a1a1a" strokeWidth="2.6" fill="none"/>
        <ellipse cx="417" cy="96" rx="12" ry="10" stroke="#1a1a1a" strokeWidth="2.6" fill="none"/>
        <line x1="387" y1="96" x2="383" y2="94" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round"/>
        <line x1="429" y1="96" x2="433" y2="94" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round"/>
        <line x1="411" y1="96" x2="409" y2="96" stroke="#1a1a1a" strokeWidth="2.8" strokeLinecap="round"/>

        {/* Eyes */}
        <circle cx="399" cy="96" r="5.5" fill="#1a1a1a"/>
        <circle cx="417" cy="96" r="5.5" fill="#1a1a1a"/>
        <circle cx="400.8" cy="93.8" r="2"  fill="white"/>
        <circle cx="418.8" cy="93.8" r="2"  fill="white"/>

        {/* Nose */}
        <circle cx="404" cy="107" r="2.2" fill="#1a1a1a" opacity="0.22"/>
        <circle cx="412" cy="107" r="2.2" fill="#1a1a1a" opacity="0.22"/>

        {/* Smile — soft */}
        <path d="M396 114 Q408 124 420 114" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

        {/* Cheeks */}
        <circle cx="389" cy="108" r="6.5" fill="#1a1a1a" opacity="0.09"/>
        <circle cx="427" cy="108" r="6.5" fill="#1a1a1a" opacity="0.09"/>

        {/* Neck */}
        <rect x="403" y="125" width="10" height="30" fill="white"/>

        {/* White shirt */}
        <path d="M372 210 C372 163 386 150 408 148 C430 150 444 163 444 210Z"
              fill="white" stroke="#1a1a1a" strokeWidth="2.8"/>
        <path d="M400 148 L408 162 L416 148" stroke="#1a1a1a" strokeWidth="2.4" fill="none"/>

        {/* Right arm — holds pen */}
        <Arm d="M442 174 C450 186 456 197 459 207" w={14}/>

        {/* Hand + pen */}
        <ellipse cx="461" cy="209" rx="8" ry="6"   fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="459" y1="205" x2="477" y2="189" stroke="#1a1a1a" strokeWidth="3.4" strokeLinecap="round"/>
        <polygon points="477,186 482,178 487,184" fill="#1a1a1a"/>

        {/* Left arm — resting on table */}
        <Arm d="M374 174 C367 186 363 197 361 208" w={14}/>


        {/* ── LAPTOP (center on table) ──────────────────────────── */}
        <rect x="208" y="148" width="84" height="64" rx="4" fill="#1a1a1a"/>
        <rect x="212" y="152" width="76" height="56" fill="#242424"/>
        <rect x="217" y="158" width="50" height="3"   rx="1.5" fill="white" opacity="0.45"/>
        <rect x="217" y="164" width="38" height="3"   rx="1.5" fill="white" opacity="0.32"/>
        <rect x="217" y="170" width="46" height="3"   rx="1.5" fill="white" opacity="0.32"/>
        <rect x="217" y="176" width="34" height="3"   rx="1.5" fill="white" opacity="0.28"/>
        {/* Blinking cursor */}
        <rect x="269" y="158" width="3" height="9" rx="1.5" fill="white"
              style={{ animation: "czar-cursor 1.1s step-end infinite" }}/>
        {/* Keyboard base */}
        <rect x="190" y="210" width="120" height="9" rx="3" fill="#1a1a1a"/>
        <rect x="202" y="212" width="96" height="2.5" rx="1.2" fill="white" opacity="0.1"/>

        {/* Mode-specific extras */}
        {isResearch && (
          <g opacity="0.84">
            <circle cx="306" cy="118" r="17" stroke="#1a1a1a" strokeWidth="3.2" fill="white"/>
            <circle cx="306" cy="118" r="9"  stroke="#1a1a1a" strokeWidth="1.6" fill="none" opacity="0.35"/>
            <line x1="319" y1="131" x2="332" y2="146" stroke="#1a1a1a" strokeWidth="4.5" strokeLinecap="round"/>
          </g>
        )}
        {isPlan && (
          <g>
            <rect x="148" y="108" width="40" height="34" rx="4" fill="#FDE68A" stroke="#1a1a1a" strokeWidth="2.2"/>
            <line x1="154" y1="117" x2="180" y2="117" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.5"/>
            <line x1="154" y1="123" x2="178" y2="123" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.5"/>
            <rect x="160" y="120" width="32" height="26" rx="4" fill="#D1FAE5" stroke="#1a1a1a" strokeWidth="2.2"/>
            <line x1="165" y1="130" x2="184" y2="130" stroke="#1a1a1a" strokeWidth="1.4" opacity="0.5"/>
          </g>
        )}

        {/* ── PAPERS (right edge) ───────────────────────────────── */}
        <rect x="460" y="174" width="34" height="24" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        <rect x="455" y="168" width="34" height="24" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="459" y1="175" x2="483" y2="175" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.38"/>
        <line x1="459" y1="181" x2="481" y2="181" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.38"/>

        {/* ── FLOATING SPEECH BUBBLE ───────────────────────────── */}
        <g style={{ animation: "czar-bubble 3.2s ease-in-out infinite" }}>
          <rect x="130" y="34" width="92" height="40" rx="14" fill="#1a1a1a"/>
          <path d="M150 74 L143 88 L167 74Z" fill="#1a1a1a"/>
          <rect x="140" y="43" width="60" height="3.5" rx="1.8" fill="white" opacity="0.65"/>
          <rect x="140" y="50" width="48" height="3.5" rx="1.8" fill="white" opacity="0.5"/>
          <circle cx="149" cy="61" r="2.8" fill="white" opacity="0.5"/>
          <circle cx="158" cy="61" r="2.8" fill="white" opacity="0.5"/>
          <circle cx="167" cy="61" r="2.8" fill="white" opacity="0.5"/>
        </g>

        {/* ── SPARKLES ─────────────────────────────────────────── */}
        <g style={{ animation: "czar-sparkle 4s linear infinite", transformOrigin: "136px 27px" }} opacity="0.74">
          <path d="M136 27 L137.7 21 L139.4 27 L145 28.5 L139.4 30 L137.7 36 L136 30 L130 28.5 Z" fill="#1a1a1a"/>
        </g>
        <g style={{ animation: "czar-sparkle 5.5s linear infinite reverse", transformOrigin: "351px 17px" }} opacity="0.74">
          <path d="M351 17 L352.8 11 L354.6 17 L361 18.5 L354.6 20 L352.8 26 L351 20 L344.5 18.5 Z" fill="#1a1a1a"/>
        </g>
        <circle cx="470" cy="130" r="4" fill="#1a1a1a" opacity="0.3"/>
        <circle cx="477" cy="123" r="2.5" fill="#1a1a1a" opacity="0.2"/>

      </svg>
    </div>
  );
}

// ─── Greeting line ────────────────────────────────────────────────────────

export function GreetingLine({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  const first = userName?.split(" ")[0];
  return (
    <p
      className="text-[13px] text-muted-foreground italic transition-all duration-700 mb-3"
      style={{ opacity: show ? 1 : 0, transform: show ? "none" : "translateY(8px)" }}
    >
      {first ? `Hey ${first} — your team is ready` : "Your AI writing team is ready"}
    </p>
  );
}

// ─── Agent Activity Dock — fixed right edge during streaming ─────────────

// Compact mini-face SVGs for the dock (same style: white fill + dark outline)
function MiniWriter() {
  return (
    <svg viewBox="0 0 80 82" fill="none" width="40" height="41">
      <path d="M14 40 C12 20 17 5 40 5 C63 5 68 20 66 40 C70 56 68 78 62 82 L40 70 L18 82 C12 78 10 56 14 40Z" fill="#1a1a1a"/>
      <circle cx="40" cy="44" r="22" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
      <circle cx="32" cy="41" r="4.5" fill="#1a1a1a"/>
      <circle cx="48" cy="41" r="4.5" fill="#1a1a1a"/>
      <circle cx="33.5" cy="39.2" r="1.6" fill="white"/>
      <circle cx="49.5" cy="39.2" r="1.6" fill="white"/>
      <path d="M32 52 Q40 59 48 52" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="27" cy="48" r="4" fill="#1a1a1a" opacity="0.09"/>
      <circle cx="53" cy="48" r="4" fill="#1a1a1a" opacity="0.09"/>
    </svg>
  );
}
function MiniResearcher() {
  return (
    <svg viewBox="0 0 80 80" fill="none" width="40" height="40">
      <circle cx="40" cy="28" r="12" fill="#1a1a1a"/>
      <circle cx="25" cy="36" r="11" fill="#1a1a1a"/>
      <circle cx="55" cy="36" r="11" fill="#1a1a1a"/>
      <circle cx="18" cy="50" r="9"  fill="#1a1a1a"/>
      <circle cx="62" cy="50" r="9"  fill="#1a1a1a"/>
      <circle cx="40" cy="52" r="22" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
      <circle cx="31" cy="49" r="9" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
      <circle cx="49" cy="49" r="9" stroke="#1a1a1a" strokeWidth="2.2" fill="none"/>
      <circle cx="31" cy="49" r="4" fill="#1a1a1a"/>
      <circle cx="49" cy="49" r="4" fill="#1a1a1a"/>
      <circle cx="32.5" cy="47.2" r="1.4" fill="white"/>
      <circle cx="50.5" cy="47.2" r="1.4" fill="white"/>
      <path d="M31 61 Q40 68 49 61" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function MiniPlanner() {
  return (
    <svg viewBox="0 0 80 80" fill="none" width="40" height="40">
      <path d="M18 44 C16 22 20 6 40 6 C60 6 64 22 62 44 L60 55 C52 49 28 49 20 55Z" fill="#1a1a1a"/>
      <circle cx="40" cy="50" r="22" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
      <circle cx="32" cy="47" r="4.5" fill="#1a1a1a"/>
      <circle cx="48" cy="47" r="4.5" fill="#1a1a1a"/>
      <circle cx="33.5" cy="45.2" r="1.6" fill="white"/>
      <circle cx="49.5" cy="45.2" r="1.6" fill="white"/>
      <path d="M31 59 Q40 67 49 59" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function MiniEditor() {
  return (
    <svg viewBox="0 0 80 80" fill="none" width="40" height="40">
      <path d="M16 44 C14 20 18 4 40 4 C62 4 66 20 64 44 C66 58 64 76 58 80 L40 68 L22 80 C16 76 14 58 16 44Z" fill="#1a1a1a"/>
      <circle cx="40" cy="46" r="22" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
      <ellipse cx="31" cy="43" rx="10" ry="9" stroke="#1a1a1a" strokeWidth="2" fill="none"/>
      <ellipse cx="49" cy="43" rx="10" ry="9" stroke="#1a1a1a" strokeWidth="2" fill="none"/>
      <circle cx="31" cy="43" r="4"   fill="#1a1a1a"/>
      <circle cx="49" cy="43" r="4"   fill="#1a1a1a"/>
      <circle cx="32.5" cy="41.2" r="1.4" fill="white"/>
      <circle cx="50.5" cy="41.2" r="1.4" fill="white"/>
      <path d="M31 55 Q40 62 49 55" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function MiniCritic() {
  return (
    <svg viewBox="0 0 80 80" fill="none" width="40" height="40">
      <circle cx="40" cy="16" r="10" fill="#1a1a1a"/>
      <circle cx="22" cy="24" r="9"  fill="#1a1a1a"/>
      <circle cx="58" cy="24" r="9"  fill="#1a1a1a"/>
      <circle cx="14" cy="38" r="8"  fill="#1a1a1a"/>
      <circle cx="66" cy="38" r="8"  fill="#1a1a1a"/>
      <circle cx="40" cy="52" r="22" fill="white" stroke="#1a1a1a" strokeWidth="2.2"/>
      <circle cx="32" cy="49" r="4.5" fill="#1a1a1a"/>
      <circle cx="48" cy="49" r="4.5" fill="#1a1a1a"/>
      <circle cx="33.5" cy="47.2" r="1.6" fill="white"/>
      <circle cx="49.5" cy="47.2" r="1.6" fill="white"/>
      <path d="M32 61 Q40 68 48 61" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

const MINI_FACES: Record<string, React.FC> = {
  writer:      MiniWriter,
  editor:      MiniEditor,
  researcher:  MiniResearcher,
  planner:     MiniPlanner,
  critic:      MiniCritic,
  revision:    MiniEditor,
  architect:   MiniPlanner,
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
                <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30"/>
              )}
              <div className={[
                "w-10 h-10 rounded-full bg-white overflow-hidden border-2 shadow-md",
                "flex items-center justify-center transition-all duration-300",
                working ? "border-primary shadow-primary/20 scale-105"
                : done   ? "border-emerald-500/60"
                : error  ? "border-destructive/60"
                : "border-border/50 opacity-60",
              ].join(" ")}>
                {Face && <Face/>}
              </div>
              {working && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse"/>
              )}
              {done && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                    <path d="M1 3L2.5 4.5L5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              {error && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-background"/>
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
      <rect x="0" y="0" width={width}                   height="3" rx="1.5" fill="currentColor"/>
      <rect x="0" y="7" width={Math.round(width * .72)} height="3" rx="1.5" fill="currentColor"/>
    </svg>
  );
}
function SmallPen() {
  return (
    <svg width="22" height="30" viewBox="0 0 28 36" fill="none">
      <path d="M14 0 L28 18 L20 18 L20 36 L8 36 L8 18 L0 18Z" fill="currentColor"/>
      <path d="M11 18 L14 30 L17 18" fill="white" opacity="0.5"/>
    </svg>
  );
}
function SmallBook() {
  return (
    <svg width="32" height="24" viewBox="0 0 40 30" fill="none">
      <path d="M20 7 C16 4 9 3 2 5 L2 27 C9 25 16 26 20 29 C24 26 31 25 38 27 L38 5 C31 3 24 4 20 7Z"
            fill="currentColor"/>
      <line x1="20" y1="7" x2="20" y2="29" stroke="white" strokeWidth="1.5" opacity="0.55"/>
    </svg>
  );
}
function FloatSparkle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z" fill="currentColor"/>
    </svg>
  );
}
function Dots() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      {[0, 10, 20].flatMap(x => [0, 10, 20].map(y => (
        <circle key={`${x}-${y}`} cx={x + 3} cy={y + 3} r="2.5" fill="currentColor"/>
      )))}
    </svg>
  );
}

const BG_ELEMENTS = [
  { id:"l1",   x:"4%",  y:"10%", anim:"czar-float-a", dur:"8s",   delay:"0s",   op:"0.048", el:<TextLines width={68}/> },
  { id:"l2",   x:"84%", y:"16%", anim:"czar-float-b", dur:"9.5s", delay:"1.4s", op:"0.044", el:<TextLines width={54}/> },
  { id:"l3",   x:"5%",  y:"60%", anim:"czar-float-a", dur:"7s",   delay:"2.6s", op:"0.048", el:<TextLines width={60}/> },
  { id:"l4",   x:"83%", y:"56%", anim:"czar-float-c", dur:"10s",  delay:"0.6s", op:"0.042", el:<TextLines width={56}/> },
  { id:"l5",   x:"6%",  y:"80%", anim:"czar-float-b", dur:"8.5s", delay:"3.4s", op:"0.038", el:<TextLines width={48}/> },
  { id:"l6",   x:"82%", y:"78%", anim:"czar-float-a", dur:"11s",  delay:"2s",   op:"0.038", el:<TextLines width={64}/> },
  { id:"pen",  x:"87%", y:"38%", anim:"czar-float-b", dur:"12s",  delay:"0s",   op:"0.058", el:<SmallPen/> },
  { id:"book", x:"3%",  y:"42%", anim:"czar-float-b", dur:"10s",  delay:"4s",   op:"0.052", el:<SmallBook/> },
  { id:"s1",   x:"90%", y:"7%",  anim:"czar-float-a", dur:"6s",   delay:"0s",   op:"0.075", el:<FloatSparkle size={18}/> },
  { id:"s2",   x:"2%",  y:"28%", anim:"czar-float-c", dur:"8s",   delay:"3s",   op:"0.065", el:<FloatSparkle size={14}/> },
  { id:"s3",   x:"89%", y:"48%", anim:"czar-float-a", dur:"7s",   delay:"1.4s", op:"0.055", el:<FloatSparkle size={12}/> },
  { id:"d1",   x:"85%", y:"70%", anim:"czar-float-a", dur:"9s",   delay:"1s",   op:"0.058", el:<Dots/> },
  { id:"d2",   x:"3%",  y:"70%", anim:"czar-float-c", dur:"11s",  delay:"5s",   op:"0.048", el:<Dots/> },
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
