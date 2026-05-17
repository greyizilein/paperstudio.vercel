import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const features = [
  { emoji: '✍️', title: 'Chapters Crafted by PAPERSTUDIO', desc: 'Each chapter generated on demand with PAPERSTUDIO. Structured for your exact degree, methodology, framework, and citation style with word count precision within ±3%.' },
  { emoji: '🔬', title: '15 Research Frameworks', desc: 'PICO, PEO, SPIDER, PICOS, FINER, SMART, CIMO, SPICE, ECLIPSE, BeHEMoTh, and more. Shapes your objectives, questions, methodology criteria, and analysis pre-selection.' },
  { emoji: '📊', title: '29 Analysis Methods', desc: '20 quantitative (ANOVA, regression, SEM, meta-analysis) and 9 qualitative (thematic, IPA, grounded theory). Auto-generates tables, statistical notation, and the right chart type.' },
  { emoji: '🛡️', title: '7-Stage Grammar Pipeline', desc: 'Every chapter checked for banned phrases, sentence variety, passive voice ratio (max 35%), word count precision, grammar, citation density, and AI-pattern score before you see it.' },
  { emoji: '🌍', title: '9 Language Variants', desc: 'UK English, US English, Nigerian English, Australian, Canadian, French, Spanish, Brazilian Portuguese. Spelling, idiom, and citation convention all adjust automatically.' },
  { emoji: '📄', title: '5 Export Formats', desc: 'Word (.docx), PDF (print-ready, PDF/A), LaTeX (.tex + .bib), Markdown (GFM), and plain text. Every format includes title page, ToC, List of Figures, and reference list.' },
  { emoji: '🎨', title: '17 Chart Types + Custom Colours', desc: 'Bar, scatter, box plot, heatmap, forest plot, Kaplan-Meier, ROC curve, SEM path diagram, and more. Choose your colour scheme and complexity from minimal to publication-ready SVG.' },
  { emoji: '🔁', title: 'Revision System', desc: 'Request revisions with specific feedback. The full chapter is rewritten — not patched. Version history tracks every iteration. Masters gets 8 rounds; PhD gets unlimited.' },
  { emoji: '🤖', title: 'Model Selection', desc: 'Gemini 2.5 Flash (Free), Gemini 2.5 Pro (UG/Masters), Gemini 3.1 Pro (PhD). Temperature, top-P, and context window parameters tuned per chapter type.' },
];

export default function FeaturesPage() {
  return (
    <div>
      <PageHero
        title={<>Everything you need<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>for your dissertation.</em></>}
        subtitle="From research framework selection to publication-ready export — every feature designed for academic excellence."
      />
      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {features.map(f => (
            <div
              key={f.title}
              style={{
                borderRadius: "16px",
                border: "1px solid var(--ma-border)",
                padding: "32px",
                background: "var(--ma-surface)",
                transition: "border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--ma-border-bright)";
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--ma-border)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.emoji}</div>
              <h3
                style={{
                  fontFamily: FONTS.headline,
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "1.2rem",
                  color: "var(--ma-accent)",
                  marginBottom: "10px",
                  lineHeight: 1.25,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: "0.875rem",
                  color: "var(--ma-text-muted)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
      <CTABand title="Ready to experience every feature?" />
    </div>
  );
}
