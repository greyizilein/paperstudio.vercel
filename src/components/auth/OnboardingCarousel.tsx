import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  {
    title: "Just type your topic",
    desc: "Tell us what you're researching. PaperStudio handles the structure, citations, and academic language automatically.",
    illustration: <IllustrationTopic />,
  },
  {
    title: "AI drafts every chapter",
    desc: "Each chapter is written to your degree level, citation style, and word count — streamed live as you watch.",
    illustration: <IllustrationDraft />,
  },
  {
    title: "Edit, export, submit",
    desc: "Highlight any sentence to rewrite, simplify, or fix it. Export to Word or PDF when you're ready.",
    illustration: <IllustrationExport />,
  },
];

const INTERVAL = 4000;

export function OnboardingCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="flex flex-col flex-1 justify-between select-none">
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-6 pt-8 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-[300px]"
          >
            {slide.illustration}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text */}
      <div className="px-8 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <h2 className="text-xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-sm text-white/60 leading-relaxed">{slide.desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 px-8 pb-8 pt-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="transition-all duration-300"
          >
            <div className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Illustration 1: Topic entry ─── */
function IllustrationTopic() {
  return (
    <svg viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Background card */}
      <rect x="20" y="20" width="260" height="180" rx="16" fill="white" fillOpacity="0.06" />
      <rect x="20" y="20" width="260" height="180" rx="16" stroke="white" strokeOpacity="0.12" strokeWidth="1" />

      {/* Input field */}
      <rect x="40" y="50" width="220" height="44" rx="10" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      {/* Pencil icon */}
      <g opacity="0.6">
        <path d="M56 76 L56 68 L64 60 L72 68 L64 76 Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M56 76 L54 78 L58 78 Z" stroke="white" strokeWidth="1" strokeLinejoin="round" fill="white" fillOpacity="0.5" />
        <path d="M60 64 L68 72" stroke="white" strokeWidth="1" strokeLinecap="round" />
      </g>
      {/* Typed text */}
      <text x="82" y="77" fontFamily="monospace" fontSize="11" fill="white" fillOpacity="0.85">Employee engagement in</text>
      {/* Cursor blink */}
      <rect x="236" y="63" width="1.5" height="14" rx="1" fill="white" fillOpacity="0.9">
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
      </rect>

      {/* Floating chips */}
      <rect x="40" y="108" width="78" height="22" rx="11" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="55" y="123" fontSize="9.5" fill="white" fillOpacity="0.7" fontFamily="sans-serif">📚 Masters</text>

      <rect x="128" y="108" width="64" height="22" rx="11" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="143" y="123" fontSize="9.5" fill="white" fillOpacity="0.7" fontFamily="sans-serif">📝 APA 7</text>

      <rect x="202" y="108" width="58" height="22" rx="11" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="215" y="123" fontSize="9.5" fill="white" fillOpacity="0.7" fontFamily="sans-serif">🎓 80k</text>

      {/* Chapter list preview */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="40" y={145 + i * 9} width={160 - i * 20} height="5" rx="2.5" fill="white" fillOpacity={0.15 - i * 0.025} />
        </g>
      ))}
    </svg>
  );
}

/* ─── Illustration 2: Drafting chapters ─── */
function IllustrationDraft() {
  return (
    <svg viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Pages fanning behind */}
      <rect x="60" y="30" width="180" height="160" rx="12" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.08" strokeWidth="1" transform="rotate(-4 60 30)" />
      <rect x="55" y="28" width="180" height="160" rx="12" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.1" strokeWidth="1" transform="rotate(-2 55 28)" />

      {/* Main page */}
      <rect x="50" y="25" width="200" height="170" rx="12" fill="white" fillOpacity="0.09" stroke="white" strokeOpacity="0.18" strokeWidth="1" />

      {/* Chapter heading */}
      <rect x="70" y="45" width="120" height="8" rx="4" fill="white" fillOpacity="0.5" />

      {/* Text lines streaming in */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x="70" y={63 + i * 13} width={150 - (i === 7 ? 60 : 0)} height="5" rx="2.5" fill="white" fillOpacity={0.2 - i * 0.01}>
          {i === 7 && (
            <animate attributeName="width" from="0" to="90" dur="1.5s" repeatCount="indefinite" />
          )}
        </rect>
      ))}

      {/* Blinking cursor at end of last line */}
      <rect x="165" y="154" width="2" height="9" rx="1" fill="white" fillOpacity="0.9">
        <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="x" from="70" to="160" dur="1.5s" repeatCount="indefinite" />
      </rect>

      {/* Word count pill */}
      <rect x="155" y="178" width="90" height="18" rx="9" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="168" y="191" fontSize="9" fill="white" fillOpacity="0.7" fontFamily="monospace">2,450 / 3,000w</text>
    </svg>
  );
}

/* ─── Illustration 3: Export ─── */
function IllustrationExport() {
  return (
    <svg viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Main document */}
      <rect x="80" y="15" width="140" height="170" rx="12" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.18" strokeWidth="1" />

      {/* Green checkmark circle overlay */}
      <circle cx="220" cy="40" r="22" fill="#1a1a1a" />
      <circle cx="220" cy="40" r="22" fill="#4DB68A" fillOpacity="0.2" stroke="#4DB68A" strokeWidth="1.5" />
      <path d="M211 40 L217 46 L229 34" stroke="#4DB68A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Highlight on a line (inline-edit demo) */}
      <rect x="98" y="50" width="104" height="7" rx="3.5" fill="#4DB68A" fillOpacity="0.25" />
      <rect x="98" y="50" width="104" height="7" rx="3.5" stroke="#4DB68A" strokeOpacity="0.4" strokeWidth="0.5" />

      {/* Text lines */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x="98" y={67 + i * 12} width={104 - (i % 3 === 2 ? 30 : 0)} height="5" rx="2.5" fill="white" fillOpacity="0.18" />
      ))}

      {/* Export arrows */}
      {/* Word */}
      <rect x="38" y="150" width="52" height="38" rx="10" fill="white" fillOpacity="0.07" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="64" y="163" fontSize="14" textAnchor="middle" fill="white" fillOpacity="0.7">W</text>
      <text x="64" y="178" fontSize="7.5" textAnchor="middle" fill="white" fillOpacity="0.45" fontFamily="sans-serif">Word</text>

      {/* PDF */}
      <rect x="210" y="150" width="52" height="38" rx="10" fill="white" fillOpacity="0.07" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <text x="236" y="163" fontSize="11" textAnchor="middle" fill="white" fillOpacity="0.7">PDF</text>
      <text x="236" y="178" fontSize="7.5" textAnchor="middle" fill="white" fillOpacity="0.45" fontFamily="sans-serif">Export</text>

      {/* Arrows from document to boxes */}
      <path d="M96 168 L96 164" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M80 168 L90 168" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M204 168 L214 168" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
    </svg>
  );
}
