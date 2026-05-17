import { motion } from "framer-motion";
import { Brain, BookOpen, BarChart3, Target, Shield, Search, Layers, GraduationCap } from "lucide-react";

const features = [
  { icon: Brain, title: "Chapter-aware engine", description: "Plans before it writes. Tracks your gap, framework, and findings across every chapter — no broken thread.", color: "hsl(18, 50%, 53%)" },
  { icon: BookOpen, title: "Real, verified citations", description: "Harvard, APA 7th, MLA, Chicago, Vancouver, OSCOLA. Sources are pulled from real academic indexes — not fabricated.", color: "hsl(153, 16%, 42%)" },
  { icon: BarChart3, title: "Charts & figures inline", description: "Bar, line, scatter, SWOT, process flows. AI-generated diagrams embedded with captions and numbering.", color: "hsl(37, 56%, 50%)" },
  { icon: Target, title: "Word-count discipline", description: "Per-section targets, ±1% tolerance. PAPERSTUDIO budgets across headings instead of cutting your conclusion short.", color: "hsl(212, 38%, 43%)" },
  { icon: Shield, title: "AI Humaniser pipeline", description: "Three-layer rewrite that disrupts AI fingerprints while keeping your argument and citations intact.", color: "hsl(263, 28%, 51%)" },
  { icon: Search, title: "Inline edit & re-fix", description: "Highlight any paragraph, ask for a rewrite, tighten, expand, or fix grammar. Streams the replacement in place.", color: "hsl(351, 40%, 56%)" },
  { icon: Layers, title: "Standard headings, study-specific subsections", description: "Background, Statement of the Problem, Empirical Review — locked. Subsections and visuals vary by your study.", color: "hsl(18, 50%, 53%)" },
  { icon: GraduationCap, title: "UG · Masters · PhD voices", description: "Language sophistication scales 1–7. Methodology defaults follow your degree level.", color: "hsl(153, 16%, 42%)" },
];

export const MarketingFeatures = () => (
  <section id="features" className="py-24 md:py-32" style={{ background: "#1a1714" }}>
    <div className="max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Every detail, handled</h2>
        <p className="mt-4 text-white/35 max-w-xl mx-auto">PAPERSTUDIO doesn't just write — it plans, structures, cites, critiques, and polishes.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="group p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${feature.color}15` }}>
              <feature.icon size={18} style={{ color: feature.color }} />
            </div>
            <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
            <p className="mt-2 text-xs text-white/35 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default MarketingFeatures;
