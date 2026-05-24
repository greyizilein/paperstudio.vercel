// CzarWorld — Illustrated characters, ambient animations, and living background for CZAR
// Mono-vector illustration style: black outlines, expressive faces, clean geometry

import React, { useState, useEffect, useMemo, useRef } from "react";

// ── SVG Agent Face Illustrations ────────────────────────────────────────────
// Each face uses currentColor so it adapts to light/dark theme

export function ArchitectFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      {/* Hard hat brim */}
      <rect x="12" y="23" width="56" height="6" rx="3" fill="currentColor" />
      {/* Hard hat dome */}
      <path d="M 16 23 Q 16 6 40 6 Q 64 6 64 23 Z" fill="currentColor" />
      {/* Strap detail on hat */}
      <line x1="30" y1="14" x2="40" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Face */}
      <ellipse cx="40" cy="52" rx="23" ry="25" fill="white" stroke="currentColor" strokeWidth="3" />
      {/* Eyebrows — confident, straight */}
      <line x1="26" y1="42" x2="36" y2="41" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="41" x2="54" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="31" cy="48" r="5" fill="currentColor" />
      <circle cx="49" cy="48" r="5" fill="currentColor" />
      <circle cx="33" cy="46" r="2" fill="white" />
      <circle cx="51" cy="46" r="2" fill="white" />
      <circle cx="34.5" cy="45" r="0.8" fill="white" />
      {/* Nose */}
      <path d="M 38 54 Q 38 57 40 58 Q 42 57 42 54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Confident smile */}
      <path d="M 28 63 Q 40 73 52 63" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Cheek blush */}
      <ellipse cx="22" cy="59" rx="4.5" ry="3" fill="currentColor" opacity="0.1" />
      <ellipse cx="58" cy="59" rx="4.5" ry="3" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

export function ResearcherFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      {/* Messy hair body */}
      <path d="M 17 46 Q 14 22 40 16 Q 66 22 63 46" fill="currentColor" />
      {/* Hair tufts */}
      <path d="M 20 30 Q 13 16 24 13" fill="currentColor" />
      <path d="M 60 30 Q 67 16 56 13" fill="currentColor" />
      <path d="M 36 16 Q 34 8 40 7 Q 46 8 44 16" fill="currentColor" />
      {/* Face */}
      <ellipse cx="40" cy="52" rx="23" ry="25" fill="white" stroke="currentColor" strokeWidth="3" />
      {/* Glasses — circular */}
      <circle cx="30" cy="48" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="50" cy="48" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <line x1="38" y1="48" x2="42" y2="48" stroke="currentColor" strokeWidth="2.5" />
      <line x1="15" y1="45" x2="22" y2="46" stroke="currentColor" strokeWidth="2" />
      <line x1="58" y1="46" x2="65" y2="45" stroke="currentColor" strokeWidth="2" />
      {/* Eyes inside glasses */}
      <circle cx="30" cy="48" r="3.5" fill="currentColor" />
      <circle cx="50" cy="48" r="3.5" fill="currentColor" />
      <circle cx="31.5" cy="46.5" r="1.3" fill="white" />
      <circle cx="51.5" cy="46.5" r="1.3" fill="white" />
      {/* Eyebrows — raised/curious */}
      <path d="M 23 37 Q 30 33 37 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 43 37 Q 50 33 57 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Slight curious smile */}
      <path d="M 32 64 Q 40 70 48 64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function WriterFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      {/* Long flowing hair - left side */}
      <path d="M 17 46 Q 12 62 16 78 L 20 74 Q 17 60 19 46Z" fill="currentColor" />
      {/* Long flowing hair - right side */}
      <path d="M 63 46 Q 68 62 64 78 L 60 74 Q 63 60 61 46Z" fill="currentColor" />
      {/* Hair body */}
      <path d="M 17 46 Q 15 20 40 14 Q 65 20 63 46" fill="currentColor" />
      {/* Face */}
      <ellipse cx="40" cy="50" rx="22" ry="26" fill="white" stroke="currentColor" strokeWidth="3" />
      {/* Eyebrows — gentle arches */}
      <path d="M 26 39 Q 32 36 38 39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 42 39 Q 48 36 54 39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Dreamy half-closed eyes */}
      <path d="M 26 46 Q 32 42 38 46" fill="currentColor" />
      <path d="M 42 46 Q 48 42 54 46" fill="currentColor" />
      <path d="M 26 46 Q 32 50 38 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 42 46 Q 48 50 54 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="33" cy="45" r="1" fill="white" />
      <circle cx="49" cy="45" r="1" fill="white" />
      {/* Nose */}
      <path d="M 39 52 Q 38 56 40 57 Q 42 56 41 52" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Gentle contemplative smile */}
      <path d="M 31 62 Q 40 70 49 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cheeks */}
      <ellipse cx="23" cy="56" rx="4" ry="3" fill="currentColor" opacity="0.1" />
      <ellipse cx="57" cy="56" rx="4" ry="3" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

export function CriticFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      {/* Neat side-parted hair */}
      <path d="M 15 44 Q 14 18 40 14 Q 60 13 66 24 L 66 40 Q 60 28 50 29 Q 43 22 28 27 Z" fill="currentColor" />
      {/* Face */}
      <ellipse cx="40" cy="52" rx="23" ry="25" fill="white" stroke="currentColor" strokeWidth="3" />
      {/* Rectangular reading glasses */}
      <rect x="22" y="43" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="43" y="43" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="2.5" />
      <line x1="37" y1="48" x2="43" y2="48" stroke="currentColor" strokeWidth="2.5" />
      <line x1="13" y1="45" x2="22" y2="46" stroke="currentColor" strokeWidth="2" />
      <line x1="58" y1="46" x2="67" y2="45" stroke="currentColor" strokeWidth="2" />
      {/* Eyes */}
      <circle cx="29.5" cy="48" r="3" fill="currentColor" />
      <circle cx="50.5" cy="48" r="3" fill="currentColor" />
      <circle cx="31" cy="47" r="1.1" fill="white" />
      <circle cx="52" cy="47" r="1.1" fill="white" />
      {/* Eyebrows — slightly knitted, thoughtful */}
      <path d="M 22 40 L 34 39" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M 46 39 L 58 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Small wrinkle between brows */}
      <line x1="39" y1="38" x2="41" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Slight thoughtful smile */}
      <path d="M 31 64 Q 40 70 49 64" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IllustratorFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      {/* Hair */}
      <path d="M 17 46 Q 15 20 40 16 Q 65 20 63 46" fill="currentColor" />
      {/* Bun */}
      <circle cx="40" cy="9" r="11" fill="currentColor" />
      {/* Bun tie lines */}
      <line x1="34" y1="17" x2="40" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="46" y1="17" x2="40" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Face */}
      <ellipse cx="40" cy="52" rx="23" ry="25" fill="white" stroke="currentColor" strokeWidth="3" />
      {/* Eyebrows — high-arched, expressive */}
      <path d="M 24 38 Q 31 33 38 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 42 38 Q 49 33 56 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Big wide eyes */}
      <circle cx="31" cy="47" r="6" fill="currentColor" />
      <circle cx="49" cy="47" r="6" fill="currentColor" />
      <circle cx="33" cy="45" r="2.3" fill="white" />
      <circle cx="51" cy="45" r="2.3" fill="white" />
      <circle cx="34.5" cy="44" r="1" fill="white" />
      <circle cx="52.5" cy="44" r="1" fill="white" />
      {/* Nose */}
      <path d="M 39 53 Q 38 57 40 58 Q 42 57 41 53" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Big bright smile */}
      <path d="M 27 63 Q 40 75 53 63" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Cheeks — prominent */}
      <ellipse cx="20" cy="57" rx="5.5" ry="3.5" fill="currentColor" opacity="0.13" />
      <ellipse cx="60" cy="57" rx="5.5" ry="3.5" fill="currentColor" opacity="0.13" />
    </svg>
  );
}

// ── Agent Showcase Data ──────────────────────────────────────────────────────

export const CZAR_AGENTS_SHOWCASE = [
  {
    id: "architect",
    name: "Architect",
    role: "Plans every move",
    face: ArchitectFace,
    accent: "from-zinc-900/10 to-zinc-900/5 dark:from-white/10 dark:to-white/5",
    ring: "ring-zinc-900/20 dark:ring-white/20",
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Finds real sources",
    face: ResearcherFace,
    accent: "from-purple-500/15 to-purple-500/5",
    ring: "ring-purple-400/30 dark:ring-purple-500/40",
  },
  {
    id: "writer",
    name: "Writer",
    role: "Drafts every word",
    face: WriterFace,
    accent: "from-blue-500/15 to-blue-500/5",
    ring: "ring-blue-400/30 dark:ring-blue-500/40",
  },
  {
    id: "critic",
    name: "Critic",
    role: "Reviews the work",
    face: CriticFace,
    accent: "from-amber-500/15 to-amber-500/5",
    ring: "ring-amber-400/30 dark:ring-amber-500/40",
  },
  {
    id: "illustrator",
    name: "Illustrator",
    role: "Creates visuals",
    face: IllustratorFace,
    accent: "from-emerald-500/15 to-emerald-500/5",
    ring: "ring-emerald-400/30 dark:ring-emerald-500/40",
  },
] as const;

// ── Floating Canvas — ambient particles during writing ───────────────────────

interface Particle {
  id: number;
  x: number;
  size: number;
  opacity: number;
  shape: number;
  duration: number;
  delay: number;
  drift: number;
}

const SHAPES_SVG = [
  // Open book
  `<path d="M2 1 L2 13 L8 11 L14 13 L14 1 Q8 3 2 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="8" y1="3" x2="8" y2="11" stroke="currentColor" stroke-width="1.5"/>`,
  // Star
  `<path d="M8 1 L9.8 6 L15 6 L11 9 L12.5 14 L8 11 L3.5 14 L5 9 L1 6 L6.2 6 Z" fill="currentColor"/>`,
  // Pen nib
  `<path d="M8 1 L13 7 L8 15 L3 7 Z" fill="currentColor"/><path d="M8 15 L8 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  // Sparkle
  `<path d="M8 2 L8 5 M8 11 L8 14 M2 8 L5 8 M11 8 L14 8 M3.5 3.5 L5.5 5.5 M10.5 10.5 L12.5 12.5 M12.5 3.5 L10.5 5.5 M5.5 10.5 L3.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="2" fill="currentColor"/>`,
  // Circle ring
  `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none"/>`,
  // Checkmark
  `<path d="M2 8 L6 12 L14 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  // Lightning
  `<path d="M10 1 L4 9 L8 9 L5 15 L13 7 L9 7 Z" fill="currentColor"/>`,
  // Quote marks
  `<path d="M2 4 Q2 2 4 2 L5 2 Q7 2 7 4 L7 8 Q7 10 4 10 L3 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9 4 Q9 2 11 2 L12 2 Q14 2 14 4 L14 8 Q14 10 11 10 L10 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Dot cluster
  `<circle cx="4" cy="4" r="2.5" fill="currentColor"/><circle cx="11" cy="4" r="2.5" fill="currentColor"/><circle cx="7.5" cy="11" r="2.5" fill="currentColor"/>`,
  // Wavy line (text lines)
  `<path d="M1 5 Q4 2 7 5 Q10 8 13 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M1 11 Q4 8 7 11 Q10 14 13 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
];

function FloatingParticle({ p }: { p: Particle }) {
  const shape = SHAPES_SVG[p.shape % SHAPES_SVG.length];
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${p.x}%`,
        bottom: `-${p.size + 10}px`,
        width: p.size,
        height: p.size,
        opacity: p.opacity,
        animation: `czarParticleFloat ${p.duration}s ${p.delay}s infinite linear`,
        ["--drift" as string]: `${p.drift}px`,
        willChange: "transform",
      }}
    >
      <svg
        viewBox="0 0 16 16"
        width={p.size}
        height={p.size}
        className="text-foreground"
        dangerouslySetInnerHTML={{ __html: shape }}
      />
    </div>
  );
}

export function CzarFloatingCanvas({ active }: { active: boolean }) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: (i / 14) * 100 + (Math.random() * 7 - 3.5),
      size: 11 + (i % 3) * 5,
      opacity: 0.035 + (i % 4) * 0.015,
      shape: i % SHAPES_SVG.length,
      duration: 12 + (i % 5) * 4,
      delay: -(i * 2.1),
      drift: ((i % 2 === 0 ? 1 : -1) * (12 + (i % 4) * 8)),
    }));
  }, []);

  return (
    <>
      <div
        className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${active ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        {particles.map(p => <FloatingParticle key={p.id} p={p} />)}
      </div>
      <style>{`
        @keyframes czarParticleFloat {
          0%   { transform: translateY(0)      translateX(0)                     rotate(0deg);   }
          25%  { transform: translateY(-25vh)  translateX(var(--drift))           rotate(90deg);  }
          50%  { transform: translateY(-55vh)  translateX(0)                     rotate(180deg); }
          75%  { transform: translateY(-80vh)  translateX(calc(var(--drift) * -1)) rotate(270deg); }
          100% { transform: translateY(-110vh) translateX(0)                     rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ── Dot Grid Background ──────────────────────────────────────────────────────

export function CzarDotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        opacity: 0.04,
      }}
      aria-hidden="true"
    />
  );
}

// ── Welcome Agent Characters ─────────────────────────────────────────────────

const GREETINGS = [
  "Ready. What are we building today?",
  "The blank page ends here.",
  "Five agents. One brief. Let's go.",
  "All agents standing by.",
  "What does the world need to read?",
];

interface AgentCardProps {
  agent: typeof CZAR_AGENTS_SHOWCASE[number];
  index: number;
  visible: boolean;
  isMain?: boolean;
}

function AgentCard({ agent, index, visible, isMain }: AgentCardProps) {
  const FaceComponent = agent.face;
  return (
    <div
      className="flex flex-col items-center gap-2 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.88)",
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Avatar circle */}
      <div
        className={[
          "relative rounded-full ring-2 overflow-hidden transition-all duration-300",
          `bg-gradient-to-b ${agent.accent}`,
          agent.ring,
          isMain ? "w-20 h-20 shadow-lg" : "w-14 h-14",
        ].join(" ")}
        style={{ animation: visible ? `czarBob ${3 + index * 0.5}s ${index * 0.3}s ease-in-out infinite alternate` : "none" }}
      >
        <FaceComponent className="w-full h-full text-foreground p-1.5" />
        {/* Working pulse ring (shown when agent is active) */}
        {isMain && (
          <div className="absolute inset-0 rounded-full ring-2 ring-primary/0 animate-ping" style={{ animationDuration: "2s" }} />
        )}
      </div>
      {/* Label */}
      <div className="text-center">
        <div className={`font-bold text-foreground leading-tight ${isMain ? "text-[13px]" : "text-[11px]"}`}>
          {agent.name}
        </div>
        <div className={`text-muted-foreground/60 leading-tight ${isMain ? "text-[11px]" : "text-[10px]"}`}>
          {agent.role}
        </div>
      </div>
    </div>
  );
}

interface CzarWelcomeProps {
  userName: string;
  mode: string;
  onExample: (text: string) => void;
  onOpenCorrectionModal?: () => void;
}

export function CzarWelcome({ userName, mode, onExample, onOpenCorrectionModal }: CzarWelcomeProps) {
  const [visible, setVisible] = useState(false);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [typedGreeting, setTypedGreeting] = useState("");
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Typewriter effect for greeting
  useEffect(() => {
    if (!visible) return;
    setTypedGreeting("");
    let i = 0;
    const tick = () => {
      i++;
      setTypedGreeting(greeting.slice(0, i));
      if (i < greeting.length) typingRef.current = setTimeout(tick, 28);
    };
    const start = setTimeout(tick, 600);
    return () => { clearTimeout(start); if (typingRef.current) clearTimeout(typingRef.current); };
  }, [visible, greeting]);

  // Mode-specific examples
  const examples: Record<string, { text: string; label: string }[]> = {
    chat: [
      { label: "Explain a concept", text: "Explain the difference between qualitative and quantitative research methods." },
      { label: "Quick question", text: "What's the Harvard referencing format for a journal article?" },
      { label: "Brainstorm", text: "What are some angles I could take for an essay on climate change policy?" },
    ],
    write: [
      { label: "Academic essay", text: "Write a 2,000-word Level 7 essay on transformational leadership in NHS trusts, Harvard references." },
      { label: "Literature review", text: "Write a systematic literature review on the effectiveness of mindfulness in the workplace." },
      { label: "Legal memo", text: "Write a legal memo applying IRAC to whether an employer can monitor employee emails under UK law." },
    ],
    research: [
      { label: "Academic synthesis", text: "Research and synthesise current academic literature on AI bias in hiring algorithms." },
      { label: "Topic overview", text: "Find and summarise key academic sources on the digital divide in higher education." },
    ],
    plan: [
      { label: "Essay structure", text: "Plan a 3,000-word dissertation chapter on postcolonial theory in African literature." },
      { label: "Research outline", text: "Create a detailed outline for a literature review on mental health interventions for university students." },
    ],
    correct: [],
  };

  const items = (examples[mode] ?? examples.chat).filter(Boolean);

  if (mode === "correct") {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[64vh] text-center px-4 py-10 overflow-hidden">
        <CzarDotGrid />
        {/* Single Critic character */}
        <div
          className="mb-6 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)" }}
        >
          <div className="w-24 h-24 mx-auto rounded-full ring-2 ring-amber-400/30 bg-gradient-to-b from-amber-500/15 to-amber-500/5 overflow-hidden shadow-lg">
            <CriticFace className="w-full h-full text-foreground p-2" />
          </div>
        </div>
        <div
          className="transition-all duration-700 delay-200"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}
        >
          <h2 className="text-2xl font-black text-foreground mb-1">Correct &amp; Improve</h2>
          <p className="text-sm text-muted-foreground mb-3 max-w-sm leading-relaxed">
            Upload or paste your document. CZAR finds every correction — grammar, style, argument, register — as tracked changes. Accept or reject each one individually.
          </p>
          <div className="flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground/50 mb-8">
            <span>Grammar · Style · Structure · Argument · Register</span>
            <span>Color-coded · Accept/Reject per change · Clean download</span>
          </div>
          <button
            onClick={onOpenCorrectionModal}
            className="px-8 py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-80 transition-opacity shadow-md"
          >
            Open Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[64vh] text-center px-4 py-10 overflow-hidden">
      <CzarDotGrid />

      {/* ── Agent row ── */}
      <div className="flex items-end justify-center gap-3 sm:gap-5 mb-10">
        {/* Side agents (smaller) */}
        <AgentCard agent={CZAR_AGENTS_SHOWCASE[1]} index={1} visible={visible} />
        <AgentCard agent={CZAR_AGENTS_SHOWCASE[4]} index={4} visible={visible} />

        {/* Central Architect (largest) */}
        <div className="relative mx-1">
          <AgentCard agent={CZAR_AGENTS_SHOWCASE[0]} index={0} visible={visible} isMain />
          {/* Speech bubble */}
          <div
            className="absolute -top-14 left-1/2 transition-all duration-700"
            style={{
              opacity: typedGreeting.length > 0 ? 1 : 0,
              transform: `translateX(-50%) translateY(${typedGreeting.length > 0 ? 0 : 6}px)`,
              transitionDelay: "400ms",
            }}
          >
            <div className="bg-foreground text-background text-[11px] font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg relative">
              {typedGreeting}
              {typedGreeting.length < greeting.length && (
                <span className="inline-block w-0.5 h-3 bg-background/70 ml-0.5 align-middle animate-pulse" />
              )}
              {/* Bubble tail */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-foreground rotate-45 rounded-sm" />
            </div>
          </div>
        </div>

        <AgentCard agent={CZAR_AGENTS_SHOWCASE[2]} index={2} visible={visible} />
        <AgentCard agent={CZAR_AGENTS_SHOWCASE[3]} index={3} visible={visible} />
      </div>

      {/* ── Tagline ── */}
      <div
        className="transition-all duration-700 delay-500 mb-8"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
      >
        <p className="text-[13px] text-muted-foreground/70 max-w-xs leading-relaxed">
          A five-agent writing workstation — plans, researches, drafts, critiques, and illustrates.
        </p>
      </div>

      {/* ── Example prompts ── */}
      {items.length > 0 && (
        <div
          className="w-full max-w-lg space-y-2 transition-all duration-700 delay-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        >
          {items.map((ex) => (
            <button
              key={ex.text}
              onClick={() => onExample(ex.text)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-background/60 hover:bg-secondary hover:border-primary/20 transition-all text-sm text-foreground group"
            >
              <span className="font-semibold text-foreground/70 text-[11.5px] block mb-0.5 group-hover:text-foreground/90 transition-colors">
                {ex.label}
              </span>
              <span className="text-muted-foreground text-[11.5px] leading-snug line-clamp-2 group-hover:text-foreground/60 transition-colors">
                {ex.text}
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes czarBob {
          from { transform: translateY(0px); }
          to   { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

// ── Compact face for use in agent step items ─────────────────────────────────

export function AgentFaceCompact({ agentId, size = 20 }: { agentId: string; size?: number }) {
  const entry = CZAR_AGENTS_SHOWCASE.find(a => a.id === agentId.toLowerCase());
  if (!entry) return null;
  const FaceComp = entry.face;
  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ring-1 bg-gradient-to-b ${entry.accent} ${entry.ring}`}
      style={{ width: size, height: size }}
    >
      <FaceComp className="w-full h-full text-foreground" />
    </div>
  );
}
