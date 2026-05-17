import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

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

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  fontFamily: FONTS.body,
};

export default function ResearchTools() {
  return (
    <div>
      <PageHero
        title={<>15 Research Frameworks.<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>All built in.</em></>}
        subtitle="Choose the framework that fits your study. PAPERSTUDIO shapes your entire dissertation around it."
      />
      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ overflowX: "auto", marginBottom: "48px" }}>
          <table style={TABLE_STYLE}>
            <thead>
              <tr style={{ background: "var(--ma-accent)" }}>
                {['Framework', 'Discipline', 'Components', 'Best for'].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: FONTS.body, fontWeight: 700, fontSize: "13px", color: "#FFFFFF", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frameworks.map((f, i) => (
                <tr
                  key={f.name}
                  style={{
                    borderBottom: "1px solid var(--ma-border)",
                    background: i % 2 === 1 ? "var(--ma-surface)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(196,56,74,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 1 ? "var(--ma-surface)" : "transparent"; }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ma-text)" }}>{f.name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--ma-text-muted)" }}>{f.disc}</td>
                  <td style={{ padding: "12px 16px", color: "var(--ma-text-muted)" }}>{f.comp}</td>
                  <td style={{ padding: "12px 16px", color: "var(--ma-text-muted)" }}>{f.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info box */}
        <div
          style={{
            background: "rgba(196,56,74,0.06)",
            borderRadius: "16px",
            padding: "40px",
            border: "1px solid rgba(196,56,74,0.2)",
          }}
        >
          <h3
            style={{
              fontFamily: FONTS.headline,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "1.625rem",
              color: "var(--ma-accent)",
              marginBottom: "12px",
              lineHeight: 1.2,
            }}
          >
            How framework selection shapes your dissertation
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "24px",
              marginTop: "8px",
            }}
          >
            {[
              { ico: '❓', title: 'Research Questions', desc: 'Each component generates a question sub-component. Editable before the project locks in.' },
              { ico: '📋', title: 'Inclusion/Exclusion Criteria', desc: 'Auto-populates a criteria table in the Methodology chapter with framework-specific rows.' },
              { ico: '📊', title: 'Analysis Pre-selection', desc: 'PICO suggests meta-analysis. SPIDER suggests thematic analysis. CIMO suggests realist synthesis. Always overrideable.' },
            ].map(item => (
              <div key={item.title}>
                <div style={{ fontSize: "22px", marginBottom: "8px" }}>{item.ico}</div>
                <div style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 600, fontSize: "1.05rem", color: "var(--ma-text)", marginBottom: "6px" }}>
                  {item.title}
                </div>
                <p style={{ fontFamily: FONTS.body, fontSize: "14px", color: "var(--ma-text-muted)", lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTABand title="Ready to pick your framework?" subtitle="Start with Chapter 1 — completely free." />
    </div>
  );
}
