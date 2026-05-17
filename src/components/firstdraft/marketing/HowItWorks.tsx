import { motion } from "framer-motion";
import { Settings, Table2, PenLine, FileCheck } from "lucide-react";

const steps = [
  { icon: Settings, step: "01", title: "Set up your project", description: "Title, field, methodology, objectives, framework — answered once. PAPERSTUDIO uses these to plan every chapter.", color: "hsl(18, 50%, 53%)" },
  { icon: Table2, step: "02", title: "Confirm the outline", description: "Standard dissertation headings appear locked; optional sections vary by your study. Edit any word target before writing.", color: "hsl(153, 16%, 42%)" },
  { icon: PenLine, step: "03", title: "Generate chapter by chapter", description: "Each chapter streams in with real citations, narrative flow, and references back to earlier chapters by name.", color: "hsl(212, 38%, 43%)" },
  { icon: FileCheck, step: "04", title: "Edit inline & export", description: "Highlight any paragraph, ask for a rewrite or fix. When ready, export a polished .docx with your title page and references.", color: "hsl(263, 28%, 51%)" },
];

export const MarketingHowItWorks = () => (
  <section id="how-it-works" className="py-24 md:py-32" style={{ background: "hsl(37, 45%, 93%)", color: "hsl(24, 10%, 10%)" }}>
    <div className="max-w-5xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Four steps to a finished dissertation</h2>
        <p className="mt-4 text-black/55 max-w-lg mx-auto">From a blank project to a submission-ready document — without losing your voice.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}>
              <item.icon size={24} style={{ color: item.color }} />
            </div>
            <p className="text-[11px] font-mono font-semibold tracking-wider uppercase mb-2" style={{ color: item.color }}>Step {item.step}</p>
            <h3 className="text-base font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-black/55 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default MarketingHowItWorks;
