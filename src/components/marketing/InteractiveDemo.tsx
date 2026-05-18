import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const INTERVAL = 6000;

const SLIDES = [
  {
    accent: "#0ea5e9",
    tag: "Step 1",
    title: "Stop staring at a blank page.",
    sub: "Type your topic. We'll handle the terrifying part.",
    Illustration: SlideTopicEntry,
  },
  {
    accent: "#8b5cf6",
    tag: "Step 2",
    title: "Six chapters. One click.",
    sub: "Navigate between chapters like tabs — no scrolling through 80,000 words of regret.",
    Illustration: SlideChapterNav,
  },
  {
    accent: "#f59e0b",
    tag: "Step 3",
    title: "Settings that actually make sense.",
    sub: "Degree level, citation style, word count. Set it once. The AI adapts everything else.",
    Illustration: SlideSettings,
  },
  {
    accent: "#10b981",
    tag: "Step 4",
    title: "Watch it write. (Your supervisor never has to know how fast that was.)",
    sub: "Every sentence is structured, every citation real. Streams live so you can see it happen.",
    Illustration: SlideDrafting,
  },
  {
    accent: "#ef4444",
    tag: "Step 5",
    title: "Fix anything. Without breaking anything.",
    sub: "Highlight a sentence. Pick Rewrite, Simplify, or Cite. Done in three seconds.",
    Illustration: SlideInlineEdit,
  },
  {
    accent: "#f97316",
    tag: "Step 6",
    title: "Got corrections? Upload them. Go for a walk.",
    sub: "Drop in your supervisor's annotated file. AI reads the red ink so you don't have to cry over it.",
    Illustration: SlideCorrections,
  },
  {
    accent: "#06b6d4",
    tag: "Step 7",
    title: "Share with your supervisor. Brace for feedback.",
    sub: "One link. Read-only. They can comment paragraph by paragraph. You can ignore selectively.",
    Illustration: SlideShare,
  },
  {
    accent: "#22c55e",
    tag: "Done",
    title: "All chapters ✓. Download ALL.",
    sub: "Word, PDF, or LaTeX. With cover page, references, and your dignity fully intact.",
    Illustration: SlideExport,
  },
];

export function InteractiveDemo() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slide = SLIDES[idx];

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % SLIDES.length);
    }, INTERVAL);
  };

  useEffect(() => {
    if (!paused) startTimer();
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % SLIDES.length);
      if (e.key === "ArrowLeft")  setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Swipe support
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) setIdx(i => dx < 0 ? (i + 1) % SLIDES.length : (i - 1 + SLIDES.length) % SLIDES.length);
  };

  return (
    <div
      id="demo"
      className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#111]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10 relative overflow-hidden">
        {!paused && (
          <motion.div
            key={idx}
            className="absolute left-0 top-0 h-full"
            style={{ background: slide.accent }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: INTERVAL / 1000, ease: "linear" }}
          />
        )}
      </div>

      {/* Slide content */}
      <div className="grid md:grid-cols-2 min-h-[440px]">
        {/* Left — illustration */}
        <div className="flex items-center justify-center p-8 bg-[#0d0d0d]">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.96, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-[320px]"
            >
              <slide.Illustration accent={slide.accent} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right — text + nav */}
        <div className="flex flex-col justify-between p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              <span
                className="inline-block text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full mb-4"
                style={{ background: `${slide.accent}25`, color: slide.accent }}
              >
                {slide.tag}
              </span>
              <h3 className="text-xl font-bold text-white leading-snug mb-3">{slide.title}</h3>
              <p className="text-white/55 text-[13px] leading-relaxed">{slide.sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8">
            {/* Dots */}
            <div className="flex items-center gap-2 mb-6">
              {SLIDES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setIdx(i); setPaused(true); setTimeout(() => setPaused(false), 8000); }}
                  className="transition-all duration-300"
                  aria-label={`Slide ${i + 1}`}
                >
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === idx ? "20px" : "6px",
                      background: i === idx ? slide.accent : "rgba(255,255,255,0.2)",
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Prev / Next */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length)}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white bg-white/8 hover:bg-white/15 transition-all"
              >
                ← Prev
              </button>
              {idx < SLIDES.length - 1 ? (
                <button
                  onClick={() => setIdx(i => i + 1)}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold text-black transition-all"
                  style={{ background: slide.accent }}
                >
                  Next →
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="px-5 py-2 rounded-xl text-[12px] font-bold text-black transition-all"
                  style={{ background: slide.accent }}
                >
                  Start writing free →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared illustration props ─── */
interface IllProps { accent: string }

/* ─── Slide 1: Topic entry ─── */
function SlideTopicEntry({ accent }: IllProps) {
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="10" y="20" width="280" height="160" rx="14" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
      {/* Input field */}
      <rect x="28" y="44" width="244" height="42" rx="10" fill="white" fillOpacity="0.08" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" />
      <text x="42" y="69" fontFamily="monospace" fontSize="11" fill="white" fillOpacity="0.85">The impact of remote work on</text>
      <rect x="238" y="56" width="1.5" height="18" rx="1" fill={accent} fillOpacity="0.9">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>
      {/* Chips */}
      {[["📚 Masters", 28], ["🎓 APA 7", 118], ["📝 15,000w", 195]].map(([label, x], i) => (
        <g key={i}>
          <rect x={x as number} y="102" width={label === "📝 15,000w" ? 75 : 72} height="22" rx="11" fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.3" strokeWidth="1" />
          <text x={(x as number) + 10} y="117" fontSize="9.5" fill="white" fillOpacity="0.8" fontFamily="sans-serif">{label as string}</text>
        </g>
      ))}
      {/* Chapter list preview */}
      {["Introduction", "Literature Review", "Methodology", "Findings", "Conclusion"].map((t, i) => (
        <rect key={i} x="28" y={136 + i * 6} width={200 - i * 15} height="3.5" rx="2" fill="white" fillOpacity={0.14 - i * 0.02} />
      ))}
    </svg>
  );
}

/* ─── Slide 2: Chapter navigation ─── */
function SlideChapterNav({ accent }: IllProps) {
  const chapters = [
    { label: "1", done: true },
    { label: "2", done: true },
    { label: "3", active: true },
    { label: "4", done: false },
    { label: "5", done: false },
    { label: "A", done: false },
  ];
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="10" y="10" width="280" height="180" rx="12" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      {/* Nav bar */}
      <rect x="10" y="10" width="280" height="24" rx="12" fill="white" fillOpacity="0.07" />
      <rect x="10" y="30" width="280" height="3" fill="white" fillOpacity="0.07" />
      {/* Chapter dots */}
      <rect x="10" y="33" width="280" height="26" fill="white" fillOpacity="0.03" />
      {chapters.map((ch, i) => (
        <g key={i}>
          <circle cx={34 + i * 38} cy={46} r={10}
            fill={ch.active ? accent : ch.done ? "#22c55e" : "none"}
            fillOpacity={ch.active ? 0.2 : ch.done ? 0.2 : 0}
            stroke={ch.active ? accent : ch.done ? "#22c55e" : "white"}
            strokeOpacity={ch.active ? 1 : ch.done ? 0.7 : 0.25}
            strokeWidth={ch.active ? 1.8 : 1}
          />
          <text x={34 + i * 38} y={50} textAnchor="middle" fontSize="8" fill={ch.active ? accent : ch.done ? "#22c55e" : "white"} fillOpacity={ch.active ? 1 : ch.done ? 0.9 : 0.4} fontFamily="monospace" fontWeight="bold">
            {ch.done ? "✓" : ch.label}
          </text>
        </g>
      ))}
      {/* Active chapter tooltip */}
      <rect x="70" y="18" width="100" height="14" rx="7" fill={accent} fillOpacity="0.2" stroke={accent} strokeOpacity="0.4" strokeWidth="0.5" />
      <text x="120" y="28" textAnchor="middle" fontSize="7" fill={accent} fontFamily="sans-serif">Chapter 3 · Methodology</text>
      {/* Content lines */}
      <rect x="28" y="68" width="110" height="8" rx="4" fill="white" fillOpacity="0.45" />
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x="28" y={84+i*11} width={240-(i%3===2?60:0)} height="5" rx="2.5" fill="white" fillOpacity="0.12" />
      ))}
    </svg>
  );
}

/* ─── Slide 3: Settings panel ─── */
function SlideSettings({ accent }: IllProps) {
  const fields = [
    { label: "Degree", value: "Masters" },
    { label: "Citation", value: "APA 7th" },
    { label: "Word count", value: "15,000" },
    { label: "Tone", value: "Academic" },
    { label: "Field", value: "Business" },
  ];
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Card */}
      <rect x="40" y="10" width="220" height="180" rx="14" fill="#1a1a1a" stroke={accent} strokeOpacity="0.3" strokeWidth="1" />
      {/* Header */}
      <rect x="40" y="10" width="220" height="30" rx="14" fill={accent} fillOpacity="0.12" />
      <rect x="40" y="32" width="220" height="8" rx="0" fill={accent} fillOpacity="0.12" />
      {/* Gear icon circles */}
      <circle cx="60" cy="25" r="7" stroke={accent} strokeOpacity="0.7" strokeWidth="1.5" fill="none" />
      <circle cx="60" cy="25" r="2.5" fill={accent} fillOpacity="0.7" />
      <text x="75" y="29" fontSize="9" fill="white" fillOpacity="0.85" fontFamily="sans-serif" fontWeight="bold">Settings</text>
      {/* Fields */}
      {fields.map((f, i) => (
        <g key={i}>
          <text x="55" y={55+i*26} fontSize="7" fill="white" fillOpacity="0.4" fontFamily="sans-serif">{f.label}</text>
          <rect x="55" y={58+i*26} width="150" height="15" rx="6" fill="white" fillOpacity={i === 0 ? 0.1 : 0.05} stroke={i === 0 ? accent : "white"} strokeOpacity={i === 0 ? 0.4 : 0.1} strokeWidth="0.8" />
          <text x="63" y={69+i*26} fontSize="8" fill="white" fillOpacity={i === 0 ? 0.9 : 0.5} fontFamily="sans-serif">{f.value}</text>
          {i === 0 && <path d={`M193 66 l4 3 l4-3`} stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
    </svg>
  );
}

/* ─── Slide 4: AI drafting ─── */
function SlideDrafting({ accent }: IllProps) {
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="10" y="10" width="280" height="180" rx="12" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      <rect x="28" y="24" width="110" height="8" rx="4" fill="white" fillOpacity="0.45" />
      {/* Streaming lines */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i} x="28" y={40+i*11} width={240-(i%3===2?50:0)} height="5" rx="2.5" fill="white" fillOpacity={0.18-i*0.01}>
          {i === 9 && <animate attributeName="width" from="0" to="160" dur="2s" repeatCount="indefinite" />}
        </rect>
      ))}
      {/* Cursor */}
      <rect x="168" y="139" width="1.5" height="9" rx="1" fill={accent} fillOpacity="0.9">
        <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="x" from="28" to="168" dur="2s" repeatCount="indefinite" />
      </rect>
      {/* Word count pill */}
      <rect x="160" y="165" width="112" height="18" rx="9" fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.3" strokeWidth="1" />
      <text x="216" y="177.5" textAnchor="middle" fontSize="9" fill={accent} fontFamily="monospace">3,450 / 5,000 words</text>
    </svg>
  );
}

/* ─── Slide 5: Inline edit toolbar ─── */
function SlideInlineEdit({ accent }: IllProps) {
  const actions = ["Rewrite", "Simplify", "Expand", "Cite"];
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect x="10" y="10" width="280" height="180" rx="12" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      {/* Text lines */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <g key={i}>
          {i === 3 && <rect x="28" y={34+i*16} width="244" height="12" rx="2" fill={accent} fillOpacity="0.2" />}
          <rect x="28" y={36+i*16} width={244-(i%3===2?60:0)} height="6" rx="3" fill="white" fillOpacity={i === 3 ? 0.7 : 0.14} />
        </g>
      ))}
      {/* Toolbar */}
      <rect x="28" y="150" width="244" height="30" rx="15" fill="#1e1e1e" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      {actions.map((a, i) => (
        <g key={a}>
          <rect x={36+i*58} y="156" width="50" height="18" rx="9" fill={i === 0 ? accent : "white"} fillOpacity={i === 0 ? 0.2 : 0.06} />
          <text x={61+i*58} y="168.5" textAnchor="middle" fontSize="8" fill={i === 0 ? accent : "white"} fillOpacity={i === 0 ? 1 : 0.5} fontFamily="sans-serif" fontWeight={i === 0 ? "bold" : "normal"}>{a}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Slide 6: Corrections upload ─── */
function SlideCorrections({ accent }: IllProps) {
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Upload box */}
      <rect x="30" y="14" width="240" height="80" rx="14" fill={accent} fillOpacity="0.06" stroke={accent} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="5 3" />
      <path d="M150 50 L150 34 M150 34 L143 41 M150 34 L157 41" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="150" y="62" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.5" fontFamily="sans-serif">Drop annotated .docx or .pdf</text>
      {/* Diff preview */}
      {[
        { color: "#fef08a", label: "Modified paragraph" },
        { color: "#bbf7d0", label: "Added section" },
        { color: "#fecaca", label: "Removed sentence" },
      ].map((r, i) => (
        <g key={i}>
          <rect x="30" y={106+i*26} width="6" height="18" rx="3" fill={r.color} />
          <rect x="42" y={109+i*26} width={200-(i*20)} height="12" rx="4" fill={r.color} fillOpacity="0.2" />
          <text x="50" y={119+i*26} fontSize="8" fill="white" fillOpacity="0.6" fontFamily="sans-serif">{r.label}</text>
        </g>
      ))}
      {/* Accept button */}
      <rect x="30" y="182" width="110" height="14" rx="7" fill={accent} fillOpacity="0.9" />
      <text x="85" y="192" textAnchor="middle" fontSize="8" fill="#000" fontFamily="sans-serif" fontWeight="bold">Accept all corrections</text>
    </svg>
  );
}

/* ─── Slide 7: Supervisor share ─── */
function SlideShare({ accent }: IllProps) {
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Browser chrome */}
      <rect x="10" y="10" width="280" height="180" rx="12" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
      <rect x="10" y="10" width="280" height="22" rx="12" fill="white" fillOpacity="0.07" />
      {/* Lock icon */}
      <circle cx="30" cy="21" r="5" fill={accent} fillOpacity="0.3" stroke={accent} strokeOpacity="0.5" strokeWidth="0.8" />
      {/* URL bar */}
      <rect x="42" y="15" width="180" height="12" rx="6" fill="white" fillOpacity="0.08" />
      <text x="132" y="24" textAnchor="middle" fontSize="7" fill="white" fillOpacity="0.45" fontFamily="monospace">paperstudio.app/share/abc123</text>
      {/* Read-only badge */}
      <rect x="230" y="15" width="50" height="12" rx="6" fill={accent} fillOpacity="0.2" stroke={accent} strokeOpacity="0.4" strokeWidth="0.5" />
      <text x="255" y="24" textAnchor="middle" fontSize="7" fill={accent} fontFamily="sans-serif">Read-only</text>
      {/* Text lines */}
      <rect x="28" y="42" width="110" height="8" rx="4" fill="white" fillOpacity="0.45" />
      {[0,1,2,3,4].map(i => <rect key={i} x="28" y={58+i*11} width={240-(i%3===2?60:0)} height="5" rx="2.5" fill="white" fillOpacity="0.13" />)}
      {/* Comment bubble on line 2 */}
      <rect x="210" y="65" width="68" height="24" rx="8" fill={accent} fillOpacity="0.2" stroke={accent} strokeOpacity="0.4" strokeWidth="0.8" />
      <path d="M216 88 L210 92 L222 88" fill={accent} fillOpacity="0.2" />
      <text x="244" y="79" textAnchor="middle" fontSize="7" fill={accent} fontFamily="sans-serif">Can you expand</text>
      <text x="244" y="88" textAnchor="middle" fontSize="7" fill={accent} fontFamily="sans-serif">this section?</text>
      {/* More lines */}
      {[5,6,7].map(i => <rect key={i} x="28" y={58+i*11} width={240-(i%3===2?60:0)} height="5" rx="2.5" fill="white" fillOpacity="0.10" />)}
    </svg>
  );
}

/* ─── Slide 8: Export all ─── */
function SlideExport({ accent }: IllProps) {
  const chapters = ["Introduction", "Literature Review", "Methodology", "Findings", "Conclusion", "A"];
  return (
    <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Chapter dots — all green */}
      <rect x="10" y="10" width="280" height="36" rx="10" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
      {chapters.map((_, i) => (
        <g key={i}>
          <circle cx={28+i*38} cy={28} r={12} fill={accent} fillOpacity="0.2" stroke={accent} strokeOpacity="0.7" strokeWidth="1.2" />
          <text x={28+i*38} y={32} textAnchor="middle" fontSize="10" fill={accent} fontFamily="sans-serif">✓</text>
        </g>
      ))}
      {/* Big download button */}
      <rect x="30" y="58" width="240" height="38" rx="12" fill={accent} fillOpacity="0.9" />
      <text x="150" y="81" textAnchor="middle" fontSize="13" fill="#000" fontFamily="sans-serif" fontWeight="bold">⬇ Download ALL</text>
      {/* Format buttons */}
      {[["W", "Word"], ["PDF", "PDF"], ["TEX", "LaTeX"]].map(([icon, label], i) => (
        <g key={i}>
          <rect x={30+i*84} y="110" width="72" height="50" rx="12" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
          <text x={66+i*84} y="134" textAnchor="middle" fontSize={icon === "W" ? "16" : "11"} fill="white" fillOpacity="0.7" fontFamily="monospace">{icon}</text>
          <text x={66+i*84} y="150" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  );
}
