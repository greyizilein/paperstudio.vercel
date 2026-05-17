import { motion } from "framer-motion";

const frameworks = [
  // Quantitative
  "Multiple Regression", "Logistic Regression", "ANOVA / MANOVA", "Structural Equation Modelling",
  "Factor Analysis", "Cluster Analysis", "Time-Series Analysis", "Survival Analysis",
  "Meta-Analysis", "Chi-Square Tests",
  // Qualitative
  "Thematic Analysis", "Grounded Theory", "Phenomenology", "Narrative Inquiry",
  "Discourse Analysis", "Content Analysis", "Case Study Method", "Ethnography",
  "IPA",
  // Theoretical / Business
  "Resource-Based View", "Dynamic Capabilities", "Stakeholder Theory", "Institutional Theory",
  "Agency Theory", "PESTLE", "Porter's Five Forces", "SWOT", "Value Chain",
  "Balanced Scorecard", "TAM", "UTAUT", "Diffusion of Innovations",
  // Education / Health
  "Bloom's Taxonomy", "Gibbs' Reflective Cycle", "Kolb's Learning Cycle",
  "PRISMA Systematic Review", "PICO Framework", "CASP Appraisal",
];

const colors = [
  "hsl(18, 50%, 53%)", "hsl(153, 16%, 42%)", "hsl(212, 38%, 43%)",
  "hsl(263, 28%, 51%)", "hsl(37, 56%, 50%)", "hsl(351, 40%, 56%)",
];

const FrameworkLibrary = () => {
  return (
    <section id="frameworks" className="py-24 md:py-32" style={{ background: "hsl(37, 45%, 93%)", color: "hsl(24, 10%, 10%)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Every research framework you'll cite
          </h2>
          <p className="mt-4 max-w-xl" style={{ color: "hsl(24, 10%, 35%)" }}>
            Quantitative, qualitative, theoretical, and reflective — applied contextually to your study, methodology, and degree level.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {frameworks.map((fw, i) => (
            <motion.span
              key={fw}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border cursor-default hover:scale-110 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              style={{
                color: colors[i % colors.length],
                borderColor: `${colors[i % colors.length]}20`,
                background: `${colors[i % colors.length]}08`,
              }}
            >
              {fw}
            </motion.span>
          ))}
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ color: "hsl(24, 10%, 45%)", borderColor: "hsl(24, 10%, 85%)", background: "hsl(40, 25%, 96%)" }}>
            +60 more…
          </span>
        </div>
      </div>
    </section>
  );
};

export default FrameworkLibrary;
