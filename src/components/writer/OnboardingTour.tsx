import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  onDone: () => void;
}

const SLIDES = [
  {
    title: "Welcome to your Studio",
    desc: "This is where your dissertation comes to life. Each chapter is written, reviewed, and exported — all from this screen.",
    Illustration: IllustrationWelcome,
  },
  {
    title: "Navigate your chapters",
    desc: "The row of dots represents every chapter. Tap any dot to jump to it. Completed chapters show a ✓; the abstract shows A.",
    Illustration: IllustrationChapters,
  },
  {
    title: "Configure before you draft",
    desc: "Hit the Settings gear (bottom-left) to set your degree level, word count, citation style, and writing tone before generating.",
    Illustration: IllustrationSettings,
  },
  {
    title: "AI drafts your chapter",
    desc: "Click 'Draft chapter' and watch your content stream in live — structured, cited, and written to your exact degree level.",
    Illustration: IllustrationDraft,
  },
  {
    title: "Edit, refine & export",
    desc: "Highlight any sentence to instantly rewrite, simplify, or expand it. Export your full dissertation to Word or PDF any time.",
    Illustration: IllustrationExport,
  },
];

export function OnboardingTour({ onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[995] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-sm bg-[#181818] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Skip / close */}
        <button
          onClick={onDone}
          aria-label="Skip tour"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>

        {/* Illustration area */}
        <div className="h-52 bg-[#111] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="w-full px-6"
            >
              <slide.Illustration />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text + nav */}
        <div className="px-6 pt-5 pb-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, delay: 0.05 }}
            >
              <h2 className="text-white font-bold text-base mb-1.5 leading-snug">{slide.title}</h2>
              <p className="text-white/55 text-sm leading-relaxed">{slide.desc}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-5">
            {/* Left: back arrow or skip */}
            {idx > 0 ? (
              <button
                onClick={() => setIdx(i => i - 1)}
                className="text-xs font-semibold text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 flex items-center gap-1"
              >
                ← Back
              </button>
            ) : (
              <button
                onClick={onDone}
                className="text-xs text-white/35 hover:text-white/60 transition-colors px-1"
              >
                Skip
              </button>
            )}

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className="transition-all duration-300"
                >
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/25"}`} />
                </button>
              ))}
            </div>

            <button
              onClick={() => isLast ? onDone() : setIdx(i => i + 1)}
              className="text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors px-3.5 py-1.5 rounded-full"
            >
              {isLast ? "Get started" : "Next →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Slide 1: Studio overview ─── */
function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* App window */}
      <rect x="4" y="4" width="272" height="152" rx="10" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.1" strokeWidth="1" />

      {/* Top nav bar */}
      <rect x="4" y="4" width="272" height="22" rx="10" fill="white" fillOpacity="0.08" />
      <rect x="4" y="22" width="272" height="2" fill="white" fillOpacity="0.08" />
      {/* Back arrow */}
      <path d="M20 15 L15 15 M15 15 L18 12 M15 15 L18 18" stroke="white" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" />
      {/* Title */}
      <rect x="28" y="11" width="70" height="8" rx="4" fill="white" fillOpacity="0.3" />
      {/* Saved pill */}
      <rect x="170" y="12" width="36" height="6" rx="3" fill="white" fillOpacity="0.12" />
      {/* Avatar */}
      <circle cx="264" cy="15" r="6" fill="white" fillOpacity="0.15" />

      {/* Chapter dot row */}
      <rect x="4" y="26" width="272" height="18" fill="white" fillOpacity="0.03" />
      {[0,1,2,3,4,5].map((i) => (
        <g key={i}>
          <circle cx={28 + i * 22} cy={35} r={5.5} fill={i === 1 ? "white" : "none"} fillOpacity={i === 1 ? 0.9 : 0} stroke="white" strokeOpacity={i === 1 ? 0.9 : 0.3} strokeWidth="1" />
          <text x={28 + i * 22} y={38} textAnchor="middle" fontSize="5.5" fill="white" fillOpacity={i === 1 ? 0.1 : 0.4} fontFamily="monospace">{i === 5 ? "A" : i + 1}</text>
        </g>
      ))}

      {/* Left sidebar */}
      <rect x="4" y="44" width="50" height="112" fill="white" fillOpacity="0.03" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
      {[0,1,2,3].map((i) => (
        <rect key={i} x="12" y={52 + i * 15} width="34" height="7" rx="3.5" fill="white" fillOpacity={i === 0 ? 0.22 : 0.09} />
      ))}

      {/* Main area */}
      <rect x="58" y="44" width="218" height="112" rx="5" fill="white" fillOpacity="0.03" />
      {/* Chapter heading */}
      <rect x="70" y="56" width="90" height="8" rx="4" fill="white" fillOpacity="0.45" />
      {/* Text lines */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect key={i} x="70" y={72 + i * 9} width={170 - (i % 3 === 2 ? 40 : 0) - (i === 7 ? 90 : 0)} height="5" rx="2.5" fill="white" fillOpacity={0.18 - i * 0.01} />
      ))}
      {/* Bottom action bar */}
      <rect x="58" y="142" width="218" height="14" fill="white" fillOpacity="0.06" />
      <rect x="70" y="146" width="32" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
    </svg>
  );
}

/* ─── Slide 2: Chapter navigation ─── */
function IllustrationChapters() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Chapter strip background */}
      <rect x="20" y="30" width="240" height="40" rx="12" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.1" strokeWidth="1" />

      {/* Chapter dots */}
      {[
        { label: "1", done: true, active: false },
        { label: "2", done: false, active: true },
        { label: "3", done: false, active: false },
        { label: "4", done: false, active: false },
        { label: "5", done: false, active: false },
        { label: "A", done: false, active: false },
      ].map((ch, i) => (
        <g key={i}>
          <circle
            cx={52 + i * 36}
            cy={50}
            r={13}
            fill={ch.active ? "white" : ch.done ? "#4DB68A" : "none"}
            fillOpacity={ch.active ? 0.15 : ch.done ? 0.25 : 0}
            stroke={ch.active ? "white" : ch.done ? "#4DB68A" : "white"}
            strokeOpacity={ch.active ? 0.9 : ch.done ? 0.7 : 0.25}
            strokeWidth={ch.active ? 1.5 : 1}
          />
          {ch.done ? (
            <path d={`M${52 + i * 36 - 5} 50 L${52 + i * 36 - 1} 54 L${52 + i * 36 + 6} 46`} stroke="#4DB68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <text x={52 + i * 36} y={54} textAnchor="middle" fontSize="9" fill="white" fillOpacity={ch.active ? 1 : 0.4} fontFamily="monospace" fontWeight={ch.active ? "bold" : "normal"}>{ch.label}</text>
          )}
        </g>
      ))}

      {/* Tap indicator on active dot */}
      <circle cx={88} cy={50} r={18} stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 2">
        <animateTransform attributeName="transform" type="scale" from="0.85 0.85" to="1.15 1.15" additive="sum" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.4s" repeatCount="indefinite" />
      </circle>

      {/* Tooltip for active chapter */}
      <rect x="60" y="8" width="110" height="16" rx="8" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
      <text x="115" y="19.5" textAnchor="middle" fontSize="7.5" fill="white" fillOpacity="0.75" fontFamily="sans-serif">Chapter 2 · Literature Review</text>

      {/* Content preview below dots */}
      <rect x="20" y="84" width="240" height="64" rx="8" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="0.5" />
      <rect x="34" y="95" width="80" height="7" rx="3.5" fill="white" fillOpacity="0.4" />
      {[0,1,2,3].map((i) => (
        <rect key={i} x="34" y={108 + i * 9} width={200 - (i === 3 ? 90 : i % 2 === 1 ? 30 : 0)} height="5" rx="2.5" fill="white" fillOpacity="0.15" />
      ))}
    </svg>
  );
}

/* ─── Slide 3: Settings panel ─── */
function IllustrationSettings() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Background app hint */}
      <rect x="4" y="4" width="100" height="152" rx="6" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
      {[0,1,2,3,4].map((i) => (
        <rect key={i} x="14" y={16 + i * 14} width="70" height="7" rx="3.5" fill="white" fillOpacity="0.1" />
      ))}

      {/* Settings modal */}
      <rect x="110" y="10" width="162" height="140" rx="12" fill="#222" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      {/* Modal header */}
      <rect x="110" y="10" width="162" height="28" rx="12" fill="white" fillOpacity="0.08" />
      <rect x="110" y="30" width="162" height="8" rx="0" fill="white" fillOpacity="0.08" />
      {/* Gear icon */}
      <circle cx="126" cy="24" r="6" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="126" cy="24" r="2.5" fill="white" fillOpacity="0.6" />
      <text x="137" y="28" fontSize="9" fill="white" fillOpacity="0.8" fontFamily="sans-serif" fontWeight="bold">Settings</text>

      {/* Fields */}
      {[
        { label: "Degree level", value: "Masters", highlight: true },
        { label: "Citation style", value: "APA 7th" },
        { label: "Word count", value: "12,000" },
        { label: "Writing tone", value: "Academic" },
      ].map((f, i) => (
        <g key={i}>
          <text x="122" y={50 + i * 28} fontSize="7" fill="white" fillOpacity="0.45" fontFamily="sans-serif">{f.label}</text>
          <rect x="122" y={54 + i * 28} width="136" height="16" rx="6" fill={f.highlight ? "white" : "white"} fillOpacity={f.highlight ? 0.1 : 0.06} stroke="white" strokeOpacity={f.highlight ? 0.3 : 0.1} strokeWidth="0.8" />
          <text x="130" y={65 + i * 28} fontSize="8" fill="white" fillOpacity={f.highlight ? 0.9 : 0.5} fontFamily="sans-serif">{f.value}</text>
          {f.highlight && (
            <path d={`M248 62 l4 4 l4 -4`} stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>
      ))}

      {/* Save button */}
      <rect x="122" y="138" width="136" height="0" rx="8" fill="white" fillOpacity="0.9" />

      {/* Gear hint at bottom-left corner */}
      <rect x="4" y="138" width="100" height="18" rx="0" fill="white" fillOpacity="0.06" />
      <circle cx="20" cy="147" r="6" stroke="white" strokeOpacity="0.5" strokeWidth="1.4" />
      <circle cx="20" cy="147" r="2.2" fill="white" fillOpacity="0.5" />
      <rect x="34" y="143" width="20" height="7" rx="3.5" fill="white" fillOpacity="0.2" />
    </svg>
  );
}

/* ─── Slide 4: AI drafting ─── */
function IllustrationDraft() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Page background */}
      <rect x="4" y="4" width="272" height="152" rx="10" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="1" />

      {/* Empty-state hint (pre-draft) */}
      <rect x="50" y="18" width="180" height="60" rx="8" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.1" strokeDasharray="4 3" strokeWidth="1" />
      <text x="140" y="42" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.3" fontFamily="sans-serif">Your chapter will appear here</text>

      {/* Draft button */}
      <rect x="94" y="88" width="92" height="28" rx="14" fill="white" fillOpacity="0.9" />
      <text x="140" y="105.5" textAnchor="middle" fontSize="10" fill="#1a1a1a" fontFamily="sans-serif" fontWeight="bold">Draft chapter</text>

      {/* Streaming text lines (animated) */}
      {[0,1,2].map((i) => (
        <rect key={i} x="20" y={124 + i * 9} width={i === 2 ? 0 : 230} height="5" rx="2.5" fill="white" fillOpacity="0.18">
          {i === 2 && (
            <animate attributeName="width" from="0" to="140" dur="2s" repeatCount="indefinite" />
          )}
        </rect>
      ))}

      {/* Cursor at end of last streaming line */}
      <rect x="160" y="141" width="1.5" height="8" rx="1" fill="white" fillOpacity="0.8">
        <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="x" from="20" to="160" dur="2s" repeatCount="indefinite" />
      </rect>

      {/* Sparkle / AI badge */}
      <rect x="116" y="74" width="48" height="12" rx="6" fill="#4DB68A" fillOpacity="0.2" stroke="#4DB68A" strokeOpacity="0.4" strokeWidth="0.8" />
      <text x="140" y="83.5" textAnchor="middle" fontSize="7" fill="#4DB68A" fontFamily="sans-serif">✦ AI writing</text>
    </svg>
  );
}

/* ─── Slide 5: Edit & export ─── */
function IllustrationExport() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Document */}
      <rect x="20" y="8" width="160" height="120" rx="10" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.12" strokeWidth="1" />

      {/* Chapter title */}
      <rect x="34" y="22" width="90" height="8" rx="4" fill="white" fillOpacity="0.45" />

      {/* Text lines — one highlighted */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <g key={i}>
          {i === 2 && (
            <rect x="34" y={38 + i * 10} width="130" height="8" rx="2" fill="#4DB68A" fillOpacity="0.25" />
          )}
          <rect x="34" y={40 + i * 10} width={130 - (i % 3 === 2 ? 40 : 0)} height="5" rx="2.5" fill="white" fillOpacity={i === 2 ? 0.7 : 0.16} />
        </g>
      ))}

      {/* Inline-edit toolbar above highlighted text */}
      <rect x="26" y="50" width="160" height="20" rx="10" fill="#222" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />
      {["Rewrite", "Simplify", "Expand", "Cite"].map((label, i) => (
        <g key={label}>
          <rect x={34 + i * 38} y="55" width="32" height="10" rx="5" fill="white" fillOpacity={i === 0 ? 0.15 : 0.06} />
          <text x={50 + i * 38} y="62.5" textAnchor="middle" fontSize="6" fill="white" fillOpacity={i === 0 ? 0.9 : 0.5} fontFamily="sans-serif">{label}</text>
        </g>
      ))}

      {/* Export panel on the right */}
      <rect x="196" y="24" width="72" height="104" rx="10" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
      <text x="232" y="42" textAnchor="middle" fontSize="7.5" fill="white" fillOpacity="0.45" fontFamily="sans-serif">Export as</text>

      {/* Word button */}
      <rect x="208" y="48" width="48" height="34" rx="8" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
      <text x="232" y="63" textAnchor="middle" fontSize="13" fill="white" fillOpacity="0.8">W</text>
      <text x="232" y="74" textAnchor="middle" fontSize="6.5" fill="white" fillOpacity="0.4" fontFamily="sans-serif">Word</text>

      {/* PDF button */}
      <rect x="208" y="90" width="48" height="34" rx="8" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
      <text x="232" y="105" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.8" fontFamily="monospace">PDF</text>
      <text x="232" y="116" textAnchor="middle" fontSize="6.5" fill="white" fillOpacity="0.4" fontFamily="sans-serif">Export</text>

      {/* Green checkmark on document */}
      <circle cx="168" cy="20" r="12" fill="#1a1a1a" />
      <circle cx="168" cy="20" r="12" fill="#4DB68A" fillOpacity="0.2" stroke="#4DB68A" strokeWidth="1.2" />
      <path d="M162 20 l4 4 l8 -8" stroke="#4DB68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
