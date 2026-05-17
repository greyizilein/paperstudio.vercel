import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

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
        title={<>Everything you need<br /><em className="not-italic text-aqua">For your dissertation.</em></>}
        subtitle="From research framework selection to publication-ready export — every feature designed for academic excellence."
      />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border-[1.5px] border-border p-8 bg-white hover:border-primary-light hover:shadow-[0_12px_36px_rgba(74,21,75,0.1)] hover:-translate-y-0.5 transition-all">
              <div className="text-[32px] mb-4">{f.emoji}</div>
              <h3 className="font-heading text-xl font-extrabold text-primary mb-2.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-[1.7]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <CTABand title="Ready to experience every feature?" />
    </div>
  );
}
