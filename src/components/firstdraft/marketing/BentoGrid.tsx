import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const bentoItems = [
  {
    title: "Project Intake",
    subtitle: "Set the brief once",
    description: "Tell PAPERSTUDIO your topic, degree level, methodology, and citation style. It builds the canonical chapter outline and word distribution for you.",
    color: "hsl(18, 50%, 53%)",
    bgTint: "hsl(18, 50%, 53%)",
    wide: false,
    svg: (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-30">
        <rect x="8" y="5" width="50" height="50" rx="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M24 28 L42 28 M24 36 L38 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M56 20 L68 20 L68 55 L22 55" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    title: "Editable Outline",
    subtitle: "Standard headings, your study",
    description: "Background, Statement of the Problem, Literature Review, Methodology, Findings, Discussion — locked headings with study-specific subsections, word targets, and visuals.",
    color: "hsl(153, 16%, 42%)",
    bgTint: "hsl(153, 16%, 42%)",
    wide: true,
    svg: (
      <svg width="100" height="60" viewBox="0 0 100 60" fill="none" className="opacity-25">
        <rect x="4" y="4" width="92" height="52" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="18" x2="96" y2="18" stroke="currentColor" strokeWidth="1" />
        <line x1="35" y1="4" x2="35" y2="56" stroke="currentColor" strokeWidth="1" />
        <line x1="65" y1="4" x2="65" y2="56" stroke="currentColor" strokeWidth="1" />
        <rect x="10" y="8" width="18" height="4" rx="2" fill="currentColor" fillOpacity="0.3" />
        <rect x="41" y="8" width="14" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
        <rect x="71" y="8" width="18" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  {
    title: "Chapter Streaming",
    subtitle: "Live, in your voice",
    description: "Each chapter streams in real time with running coherence across earlier chapters, exact word counts, real verifiable citations, and zero generic filler.",
    color: "hsl(212, 38%, 43%)",
    bgTint: "hsl(212, 38%, 43%)",
    wide: false,
    svg: (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-25">
        <rect x="4" y="4" width="72" height="52" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="14" width="40" height="3" rx="1.5" fill="currentColor" fillOpacity="0.4" />
        <rect x="12" y="22" width="56" height="2" rx="1" fill="currentColor" fillOpacity="0.2" />
        <rect x="12" y="28" width="50" height="2" rx="1" fill="currentColor" fillOpacity="0.15" />
        <rect x="12" y="34" width="44" height="2" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="12" y="42" width="20" height="8" rx="4" fill="currentColor" fillOpacity="0.15" />
      </svg>
    ),
  },
  {
    title: "Inline Edit & Humanise",
    subtitle: "Fix anything, anywhere",
    description: "Select any sentence to rewrite, tighten, expand, or fix grammar. The 3-layer Humaniser brings AI scores below 10% without flattening your argument.",
    color: "hsl(263, 28%, 51%)",
    bgTint: "hsl(263, 28%, 51%)",
    wide: false,
    svg: (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-25">
        <circle cx="40" cy="30" r="22" stroke="currentColor" strokeWidth="1.5" />
        <path d="M30 30 L37 37 L52 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M62 10 L68 4 M68 10 L62 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    title: "Charts & Statistical Tables",
    subtitle: "17 chart types",
    description: "Regression tables, demographic breakdowns, SWOT matrices, thematic maps — generated to spec and embedded inline with proper captions.",
    color: "hsl(37, 56%, 50%)",
    bgTint: "hsl(37, 56%, 50%)",
    wide: false,
    svg: (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-25">
        <rect x="12" y="40" width="10" height="14" rx="2" fill="currentColor" fillOpacity="0.3" />
        <rect x="26" y="28" width="10" height="26" rx="2" fill="currentColor" fillOpacity="0.4" />
        <rect x="40" y="18" width="10" height="36" rx="2" fill="currentColor" fillOpacity="0.5" />
        <rect x="54" y="10" width="10" height="44" rx="2" fill="currentColor" fillOpacity="0.3" />
        <line x1="8" y1="54" x2="72" y2="54" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    title: "Submission-Ready Export",
    subtitle: ".docx · .pdf · .tex",
    description: "Title page, table of contents, hanging-indent reference list, figures, and appendices — formatted to your university's expectations and ready to upload.",
    color: "hsl(351, 40%, 56%)",
    bgTint: "hsl(351, 40%, 56%)",
    wide: true,
    svg: (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-25">
        <rect x="8" y="4" width="48" height="52" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 28 L32 42 M26 36 L32 42 L38 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="60" y="16" width="12" height="4" rx="2" fill="currentColor" fillOpacity="0.3" />
        <rect x="60" y="24" width="12" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
        <text x="62" y="19" fill="currentColor" fillOpacity="0.5" fontSize="5" fontFamily="monospace">.docx</text>
      </svg>
    ),
  },
];

const BentoGrid = () => {
  return (
    <section id="features" className="py-24 md:py-32" style={{ background: "hsl(40, 33%, 98%)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "hsl(24, 10%, 10%)" }}>
            Everything you need.
            <br />
            <span style={{ color: "hsl(24, 10%, 45%)" }}>Nothing you don't.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bentoItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative overflow-hidden rounded-xl p-6 border transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:scale-[1.01] active:scale-[0.99] cursor-default ${
                item.wide ? "md:col-span-2 lg:col-span-2" : ""
              }`}
              style={{
                background: `${item.bgTint}08`,
                borderColor: `${item.bgTint}15`,
              }}
            >
              <div
                className="absolute bottom-2 right-2 transition-transform duration-500 group-hover:scale-110"
                style={{ color: item.color }}
              >
                {item.svg}
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: item.color }}>
                {item.subtitle}
              </p>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "hsl(24, 10%, 10%)" }}>{item.title}</h3>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: "hsl(24, 10%, 35%)" }}>{item.description}</p>

              <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: item.color }}>
                Learn more <ArrowRight size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
