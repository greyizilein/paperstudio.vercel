import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const problems = [
  { icon: XCircle, title: "Generic AI prose", description: "Most tools spit out flat, detectable filler that misses dissertation depth and supervisor expectations." },
  { icon: AlertTriangle, title: "Chapters don't connect", description: "Findings ignore your literature review. Discussion forgets your gap. The narrative breaks." },
  { icon: XCircle, title: "Instructions ignored", description: "You ask for a specific voice or section and it's acknowledged — then quietly dropped." },
];

const solutions = [
  { icon: CheckCircle2, title: "Human narrative flow", description: "Each chapter is planned to argue, not just list — voice, transitions, and judgment in every paragraph." },
  { icon: CheckCircle2, title: "Real cross-chapter context", description: "Chapter 4 cites Chapter 2's themes by name. Chapter 5 restates the gap from Chapter 1 verbatim." },
  { icon: CheckCircle2, title: "Your instructions win", description: "Pasted overrides sit at the top of every prompt and beat every default. No ghost edits." },
];

export const ProblemSolution = () => (
  <section className="py-24 md:py-32" style={{ background: "#1a1714" }}>
    <div className="max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">The problem with AI writing tools</h2>
        <p className="mt-4 text-white/35 max-w-xl mx-auto">
          Current tools produce surface-level work that breaks under a supervisor's eye. PAPERSTUDIO was built to do it properly.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 md:gap-16">
        <div className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-4">The problem</p>
          {problems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-4 p-5 rounded-xl border border-red-500/10 bg-red-500/[0.04]"
            >
              <item.icon size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                <p className="mt-1 text-sm text-white/35 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "hsl(153, 16%, 55%)" }}>PAPERSTUDIO's approach</p>
          {solutions.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-4 p-5 rounded-xl"
              style={{ border: "1px solid hsl(153, 16%, 42%, 0.1)", background: "hsl(153, 16%, 42%, 0.04)" }}
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: "hsl(153, 16%, 55%)" }} />
              <div>
                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                <p className="mt-1 text-sm text-white/35 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProblemSolution;
