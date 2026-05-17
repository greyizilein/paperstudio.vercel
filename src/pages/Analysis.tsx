import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

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

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  fontFamily: FONTS.body,
};

function DataTable({ rows, headers }: { rows: string[][]; headers: string[] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: "48px" }}>
      <table style={TABLE_STYLE}>
        <thead>
          <tr style={{ background: "var(--ma-accent)" }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", color: "#FFFFFF" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "1px solid var(--ma-border)",
                background: i % 2 === 1 ? "var(--ma-surface)" : "transparent",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(196,56,74,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 1 ? "var(--ma-surface)" : "transparent"; }}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "12px 16px", fontWeight: j === 0 ? 700 : 400, color: j === 0 ? "var(--ma-text)" : "var(--ma-text-muted)" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <div>
      <PageHero
        title={<>29 Analysis Methods.<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>All writing included.</em></>}
        subtitle="Select your analysis type and PAPERSTUDIO writes the full findings chapter."
      />
      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "2rem", color: "var(--ma-text)", marginBottom: "24px", letterSpacing: "-0.01em" }}>
          Quantitative Methods
        </h2>
        <DataTable
          headers={['Method', 'When to use', 'Outputs', 'Chart']}
          rows={quant.map(q => [q.method, q.when, q.output, q.chart])}
        />

        <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "2rem", color: "var(--ma-text)", marginBottom: "24px", letterSpacing: "-0.01em" }}>
          Qualitative Methods
        </h2>
        <DataTable
          headers={['Method', 'When to use', 'Outputs']}
          rows={qual.map(q => [q.method, q.when, q.output])}
        />
      </section>
      <CTABand />
    </div>
  );
}
