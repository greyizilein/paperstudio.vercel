import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FULL_TEXT =
  "The contemporary landscape of small business financing has undergone significant transformation (Johnson et al., 2023; Beck, 2021) in the wake of digital banking, shifting credit assessment models, and evolving regulatory frameworks (Berger, 2022). This chapter critically examines microfinance access among Nigerian SMEs through the lens of resource dependency theory (Pfeffer & Salancik, 2021), evaluating both the structural barriers and institutional enablers shaping owner-manager outcomes (Ayyagari, 2023; CBN, 2022). Drawing on the pecking order hypothesis, signalling theory, and emerging fintech perspectives (North, 2020), the analysis argues that while formal credit channels are widening, sustained access remains uneven across regions (Christensen & Raynor, 2022).";

const TYPING_SPEED = 22;
const PAUSE_AFTER = 3500;

const executionRows = [
  { title: "Chapter 1 — Introduction", words: 3000, framework: "—", status: "✓" },
  { title: "Chapter 2 — Literature Review", words: 6500, framework: "Resource Dependency", status: "✓" },
  { title: "Chapter 3 — Methodology", words: 4500, framework: "Mixed Methods", status: "✓" },
  { title: "Chapter 4 — Findings & Discussion", words: 8000, framework: "Thematic + Regression", status: "✓" },
  { title: "Chapter 5 — Conclusion", words: 3000, framework: "—", status: "✓" },
];

const ProductMock = () => {
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isTyping && charIndex < FULL_TEXT.length) {
      timerRef.current = setTimeout(() => setCharIndex((c) => c + 1), TYPING_SPEED);
    } else if (charIndex >= FULL_TEXT.length) {
      setIsTyping(false);
      timerRef.current = setTimeout(() => {
        setCharIndex(0);
        setIsTyping(true);
      }, PAUSE_AFTER);
    }
    return () => clearTimeout(timerRef.current);
  }, [charIndex, isTyping]);

  const displayedText = FULL_TEXT.slice(0, charIndex);
  const wordCount = displayedText.split(/\s+/).filter(Boolean).length;
  const progress = Math.round((charIndex / FULL_TEXT.length) * 3000);

  const [visibleRows, setVisibleRows] = useState(0);
  const [planReady, setPlanReady] = useState(false);
  const execTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const revealNext = () => {
      setVisibleRows((v) => {
        if (v < executionRows.length) {
          execTimerRef.current = setTimeout(revealNext, 1400);
          return v + 1;
        }
        setTimeout(() => setPlanReady(true), 600);
        setTimeout(() => {
          setVisibleRows(0);
          setPlanReady(false);
          execTimerRef.current = setTimeout(revealNext, 800);
        }, 4500);
        return v;
      });
    };
    execTimerRef.current = setTimeout(revealNext, 1200);
    return () => clearTimeout(execTimerRef.current);
  }, []);

  return (
    <section className="py-20 md:py-28" style={{ background: "var(--ma-bg)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            See PAPERSTUDIO in action
          </h2>
          <p className="mt-3 text-sm text-white/40 max-w-md mx-auto">
            A real workspace view — PAPERSTUDIO writes, critiques, and refines each chapter.
          </p>
        </motion.div>

        {/* Card 1: Writing workspace */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2a2520] border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 mx-8">
              <div className="bg-white/5 rounded-md px-3 py-1 text-[10px] text-white/30 text-center font-mono">
                app.paperstudio.io/writer
              </div>
            </div>
          </div>

          <div className="bg-[#1e1b17] flex min-h-[360px] md:min-h-[420px]">
            {/* Sidebar */}
            <div className="w-52 border-r border-white/5 p-3 hidden md:block">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-white/20 mb-3">Chapters</div>
              {[
                { title: "1. Introduction", status: "writing", words: `${progress}/3000` },
                { title: "2. Literature Review", status: "pending", words: "0/6500" },
                { title: "3. Methodology", status: "pending", words: "0/4500" },
                { title: "4. Findings & Discussion", status: "pending", words: "0/8000" },
                { title: "5. Conclusion", status: "pending", words: "0/3000" },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] mb-0.5 ${
                    i === 0 ? "bg-[#C4704B]/15 text-white/90" : "text-white/40"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    s.status === "writing" ? "bg-[#C4704B] animate-pulse" : "bg-white/15"
                  }`} />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-[9px] font-mono text-white/20">{s.words}</span>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-white/20 mb-2">Quality</div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-white/30"><span>Citations</span><span>{Math.floor(wordCount / 8)}</span></div>
                  <div className="flex justify-between text-white/30"><span>AI score</span><span className="text-[#5B7F6E]">7%</span></div>
                  <div className="flex justify-between text-white/30"><span>Readability</span><span className="text-[#C4704B] font-semibold">A+</span></div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                {isTyping ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-[#C4704B] animate-pulse" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#C4704B]">Writing</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-[#5B7F6E] flex items-center justify-center">
                      <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Complete</span>
                  </>
                )}
              </div>
              <h3 className="text-sm font-bold text-white/90 mb-1">1.1 Background to the Study</h3>
              <p className="text-[10px] text-white/25 mb-4">Harvard style  •  <span className="tabular-nums">{progress}</span> / 3000 words</p>
              <div className="text-[11px] leading-relaxed text-white/50 min-h-[120px] text-justify">
                <p>{displayedText}<span className="inline-block w-[2px] h-[13px] bg-[#C4704B] ml-[1px] align-middle animate-blink-cursor" /></p>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-md bg-[#5B7F6E] text-white text-[10px] font-semibold flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Accept
                </div>
                <div className="px-3 py-1.5 rounded-md border border-white/10 text-white/50 text-[10px] font-medium">
                  Request Revision
                </div>
                <div className="px-3 py-1.5 rounded-md text-white/30 text-[10px]">
                  Humanise
                </div>
              </div>
            </div>

            {/* Suggestions panel */}
            <div className="w-56 border-l border-white/5 p-4 hidden lg:block">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-white/20 mb-3">PAPERSTUDIO suggests</div>
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-[#C4704B]/10 border border-[#C4704B]/15">
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Strengthen §1.2 with the latest CBN microfinance circular (2024) for currency.
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C4704B]/20 text-[#C4704B] font-medium cursor-pointer">Apply</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded text-white/30 cursor-pointer">Skip</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#3D6B9E]/10 border border-[#3D6B9E]/15">
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Add 2 empirical sources from 2022–2024 to balance the seminal citations.
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3D6B9E]/20 text-[#3D6B9E] font-medium cursor-pointer">Apply</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded text-white/30 cursor-pointer">Skip</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Execution Table */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2a2520] border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 mx-8">
              <div className="bg-white/5 rounded-md px-3 py-1 text-[10px] text-white/30 text-center font-mono">
                app.paperstudio.io/outline
              </div>
            </div>
          </div>

          <div className="bg-[#1e1b17] p-5 md:p-6 min-h-[260px]">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full flex items-center justify-center ${visibleRows >= executionRows.length && planReady ? "bg-[#5B7F6E]" : "bg-[#C4704B] animate-pulse"}`}>
                {visibleRows >= executionRows.length && planReady && (
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">
                {visibleRows >= executionRows.length && planReady ? "Outline ready" : "Generating outline…"}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white/90 mb-4">Dissertation Plan</h3>

            <div className="grid grid-cols-[1fr_80px_140px_60px] gap-2 text-[9px] font-semibold uppercase tracking-wider text-white/20 border-b border-white/5 pb-2 mb-1">
              <span>Chapter</span>
              <span>Words</span>
              <span className="hidden sm:block">Framework</span>
              <span>Status</span>
            </div>

            <div className="space-y-0.5">
              {executionRows.map((row, i) => (
                <div key={i} className="relative">
                  {i < visibleRows ? (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="grid grid-cols-[1fr_80px_140px_60px] gap-2 py-2 text-[11px]"
                    >
                      <span className="text-white/60">{row.title}</span>
                      <span className="text-white/40 font-mono tabular-nums">{row.words.toLocaleString()}</span>
                      <span className="text-white/30 hidden sm:block">{row.framework}</span>
                      <span className="text-[#5B7F6E]">{row.status}</span>
                    </motion.div>
                  ) : i === visibleRows ? (
                    <div className="grid grid-cols-[1fr_80px_140px_60px] gap-2 py-2">
                      <div className="h-3 rounded bg-white/5 animate-pulse" />
                      <div className="h-3 w-10 rounded bg-white/5 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-white/5 animate-pulse hidden sm:block" />
                      <div className="h-3 w-6 rounded bg-white/5 animate-pulse" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {visibleRows >= executionRows.length && planReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="border-t border-white/5 mt-2 pt-2 grid grid-cols-[1fr_80px_140px_60px] gap-2 text-[11px] font-semibold"
              >
                <span className="text-white/50">Total</span>
                <span className="text-white/60 font-mono tabular-nums">25,000</span>
                <span className="hidden sm:block" />
                <span className="text-[#5B7F6E]">✓</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductMock;
