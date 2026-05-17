import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

const quant = [
  { method: 'Descriptive Statistics', when: 'Always — baseline for all quantitative studies', output: 'Mean, SD, range, frequency tables', chart: 'Bar chart, histogram' },
  { method: 'Independent t-test', when: 'Comparing two unrelated groups', output: 't, df, p, Cohen\'s d, 95% CI', chart: 'Box plot or grouped bar' },
  { method: 'One-Way ANOVA', when: 'Comparing 3+ groups', output: 'F, df, p, partial η², Tukey post-hoc', chart: 'Grouped bar with error bars' },
  { method: 'Multiple Linear Regression', when: 'Predicting from several predictors', output: 'R², adjusted R², F, coefficient table, VIF', chart: 'Coefficient plot (lollipop)' },
  { method: 'Binary Logistic Regression', when: 'Binary outcome prediction', output: 'Nagelkerke R², OR, 95% CI, Wald', chart: 'Forest plot, ROC curve' },
  { method: 'Chi-Square Test', when: 'Two categorical variables', output: 'χ², df, p, Cramér\'s V, cross-tabulation', chart: 'Clustered bar or mosaic' },
  { method: 'Meta-Analysis', when: 'Synthesising effect sizes across studies', output: 'Pooled ES, I², τ², Cochrane Q', chart: 'Forest plot, funnel plot' },
];

const qual = [
  { method: 'Thematic Analysis (Braun & Clarke)', when: 'Most qualitative studies', output: '6-phase description, 3–5 themes with definitions, supporting quotes' },
  { method: 'Framework Analysis', when: 'Applied policy/health research', output: 'Matrix populated with participant responses against framework categories' },
  { method: 'Grounded Theory', when: 'Theory-building from data', output: 'Open → axial → selective codes, core category' },
  { method: 'IPA', when: 'Lived experience, small samples (6–15)', output: 'Superordinate + subordinate themes, rich textual description' },
];

export default function AnalysisPage() {
  return (
    <div>
      <PageHero title={<>29 Analysis Methods.<br /><em className="not-italic text-aqua">All writing included.</em></>} subtitle="Select your analysis type and PAPERSTUDIO writes the full findings chapter." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <h2 className="font-heading text-[32px] font-black text-foreground mb-6 tracking-tight">Quantitative Methods</h2>
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-primary text-white"><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Method</th><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">When to use</th><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Outputs</th><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Chart</th></tr></thead>
            <tbody>{quant.map((q, i) => <tr key={q.method} className={`border-b border-border hover:bg-primary-pale ${i % 2 === 1 ? 'bg-surface-light' : ''}`}><td className="px-4 py-3 font-bold">{q.method}</td><td className="px-4 py-3">{q.when}</td><td className="px-4 py-3">{q.output}</td><td className="px-4 py-3">{q.chart}</td></tr>)}</tbody>
          </table>
        </div>
        <h2 className="font-heading text-[32px] font-black text-foreground mb-6 tracking-tight">Qualitative Methods</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-primary text-white"><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Method</th><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">When to use</th><th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Outputs</th></tr></thead>
            <tbody>{qual.map((q, i) => <tr key={q.method} className={`border-b border-border hover:bg-primary-pale ${i % 2 === 1 ? 'bg-surface-light' : ''}`}><td className="px-4 py-3 font-bold">{q.method}</td><td className="px-4 py-3">{q.when}</td><td className="px-4 py-3">{q.output}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <CTABand />
    </div>
  );
}
