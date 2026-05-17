import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

const frameworks = [
  { name: 'PICO', disc: 'Medicine, Nursing, Public Health', comp: 'Population · Intervention · Comparison · Outcome', best: 'Clinical trials, systematic reviews' },
  { name: 'PICOS', disc: 'Medicine, EBP', comp: 'P · I · C · O · Study design', best: 'Reviews filtering by study type' },
  { name: 'PICOT', disc: 'Nursing, Pharmacy', comp: 'P · I · C · O · Time', best: 'Studies with a defined time horizon' },
  { name: 'PEO', disc: 'Public Health, Occupational Health', comp: 'Population · Exposure · Outcome', best: 'Observational and qualitative health research' },
  { name: 'SPIDER', disc: 'Qualitative Health Research', comp: 'Sample · Phenomenon · Design · Evaluation · Research type', best: 'Mixed and qualitative systematic reviews' },
  { name: 'FINER', disc: 'All disciplines', comp: 'Feasible · Interesting · Novel · Ethical · Relevant', best: 'Evaluating research question quality' },
  { name: 'SMART', disc: 'Business, Management, Education', comp: 'Specific · Measurable · Achievable · Relevant · Time-bound', best: 'Research objective setting' },
  { name: 'ECLIPSE', disc: 'Health Policy, Health Services', comp: 'Expectation · Client group · Location · Impact · Professionals · SErvice', best: 'Health service evaluation' },
  { name: 'SPICE', disc: 'Social Science, Information Science', comp: 'Setting · Perspective · Intervention · Comparison · Evaluation', best: 'Client perspective research' },
  { name: 'CIMO', disc: 'Management, Organisational Research', comp: 'Context · Intervention · Mechanism · Outcome', best: 'Realist synthesis, causal mechanisms' },
  { name: 'Custom', disc: 'Any discipline', comp: 'User-defined components', best: 'Interdisciplinary or novel research designs' },
];

export default function ResearchTools() {
  return (
    <div>
      <PageHero title={<>15 Research Frameworks.<br /><em className="not-italic text-aqua">All built in.</em></>} subtitle="Choose the framework that fits your study. PAPERSTUDIO shapes your entire dissertation around it." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Framework</th>
                <th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Discipline</th>
                <th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Components</th>
                <th className="px-4 py-3 text-left font-heading font-extrabold text-[13px]">Best for</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((f, i) => (
                <tr key={f.name} className={`border-b border-border hover:bg-primary-pale transition-colors ${i % 2 === 1 ? 'bg-surface-light' : ''}`}>
                  <td className="px-4 py-3 font-bold text-foreground">{f.name}</td>
                  <td className="px-4 py-3 text-foreground">{f.disc}</td>
                  <td className="px-4 py-3 text-foreground">{f.comp}</td>
                  <td className="px-4 py-3 text-foreground">{f.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-primary-pale rounded-2xl p-10 border border-primary-light">
          <h3 className="font-heading text-[26px] font-black text-primary mb-3">How framework selection shapes your dissertation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            {[
              { ico: '❓', title: 'Research Questions', desc: 'Each component generates a question sub-component. Editable before the project locks in.' },
              { ico: '📋', title: 'Inclusion/Exclusion Criteria', desc: 'Auto-populates a criteria table in the Methodology chapter with framework-specific rows.' },
              { ico: '📊', title: 'Analysis Pre-selection', desc: 'PICO suggests meta-analysis. SPIDER suggests thematic analysis. CIMO suggests realist synthesis. Always overrideable.' },
            ].map(i => (
              <div key={i.title}>
                <div className="text-[22px] mb-2">{i.ico}</div>
                <div className="font-heading font-extrabold text-foreground mb-1.5">{i.title}</div>
                <p className="text-sm text-muted-foreground leading-[1.65]">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTABand title="Ready to pick your framework?" subtitle="Start with Chapter 1 — completely free." />
    </div>
  );
}
