import { motion } from "framer-motion";
import { Check } from "lucide-react";

const features = [
  "Set citation density per chapter",
  "Control date range (e.g. 2018–2026)",
  "Toggle seminal/classic source inclusion",
  "Real verifiable DOI / URL sources only",
  "Harvard, APA 7, MLA, Chicago, OSCOLA & more",
];

const sectionCitations = [
  { name: "Ch 1 — Introduction", count: 18, recommended: "15–25" },
  { name: "Ch 2 — Literature Review", count: 60, recommended: "50–80" },
  { name: "Ch 3 — Methodology", count: 22, recommended: "20–30" },
  { name: "Ch 4 — Findings", count: 14, recommended: "10–20" },
  { name: "Ch 5 — Conclusion", count: 0, recommended: "—" },
];

const CitationControl = () => {
  return (
    <section className="py-20 md:py-28" style={{ background: "#FDFBF7", color: "hsl(24, 10%, 10%)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(212, 38%, 43%)" }}>Citation Engine</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              Full control over every citation
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "hsl(24, 10%, 35%)" }}>
              Set how many citations each chapter needs. PAPERSTUDIO checks density, surfaces missing seminal works, and pulls only real, verifiable sources — with optional Zotero sync.
            </p>

            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "hsl(24, 10%, 35%)" }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "hsl(212, 38%, 43%, 0.1)" }}>
                    <Check size={10} style={{ color: "hsl(212, 38%, 43%)" }} />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border bg-white shadow-lg shadow-black/5 overflow-hidden"
            style={{ borderColor: "hsl(24, 10%, 90%)" }}
          >
            <div className="px-4 py-3 border-b" style={{ background: "hsl(40, 25%, 96%)", borderColor: "hsl(24, 10%, 90%)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Citation Settings</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "hsl(24, 10%, 45%)" }}>Date range:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-medium" style={{ background: "hsl(212, 38%, 43%, 0.1)", color: "hsl(212, 38%, 43%)" }}>2018 – 2026</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px]" style={{ color: "hsl(24, 10%, 45%)" }}>Include seminal sources:</span>
                <div className="w-7 h-4 rounded-full relative" style={{ background: "hsl(153, 16%, 42%)" }}>
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm" />
                </div>
                <span className="text-[10px] font-medium" style={{ color: "hsl(153, 16%, 42%)" }}>On</span>
              </div>
            </div>

            <div>
              {sectionCitations.map((s, i) => (
                <div key={i} className="px-4 py-2.5 border-b last:border-0 flex items-center justify-between" style={{ borderColor: "hsl(24, 10%, 92%)" }}>
                  <span className="text-xs font-medium">{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px]" style={{ color: "hsl(24, 10%, 45%)" }}>Rec: {s.recommended}</span>
                    <div className="flex items-center gap-1">
                      <button className="w-5 h-5 rounded text-[10px] font-bold transition-colors" style={{ background: "hsl(40, 20%, 92%)", color: "hsl(24, 10%, 45%)" }}>−</button>
                      <span className="w-6 text-center text-xs font-mono font-semibold tabular-nums">{s.count}</span>
                      <button className="w-5 h-5 rounded text-[10px] font-bold transition-colors" style={{ background: "hsl(40, 20%, 92%)", color: "hsl(24, 10%, 45%)" }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-between" style={{ background: "hsl(40, 25%, 97%)", borderColor: "hsl(24, 10%, 92%)" }}>
              <span className="text-[10px]" style={{ color: "hsl(24, 10%, 45%)" }}>Total citations: <span className="font-semibold tabular-nums" style={{ color: "hsl(24, 10%, 10%)" }}>114</span></span>
              <span className="text-[10px] font-medium" style={{ color: "hsl(153, 16%, 42%)" }}>✓ Density looks appropriate</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CitationControl;
