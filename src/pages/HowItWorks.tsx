import { Link } from "react-router-dom";
import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";

export default function HowItWorks() {
  return (
    <div>
      <PageHero
        title={<>From blank page to<br /><em className="not-italic text-aqua">submitted dissertation.</em></>}
        subtitle="Three steps, one platform. Here's exactly how PAPERSTUDIO works."
      />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto space-y-20">
        {/* Step 1 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-16 items-start">
          <div>
            <div className="w-14 h-14 rounded-[14px] bg-primary flex items-center justify-center font-heading text-[26px] font-black text-white mb-5">1</div>
            <h2 className="font-heading text-[32px] font-black text-foreground mb-3.5 tracking-tight">Set up your project</h2>
            <p className="text-base text-muted-foreground leading-[1.75]">A three-step wizard collects everything PAPERSTUDIO needs to write your dissertation accurately.</p>
          </div>
          <div className="bg-surface-light rounded-2xl p-8 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-muted-foreground block mb-1.5">Dissertation Title</label><div className="bg-white border-[1.5px] border-primary rounded-lg px-3.5 py-2.5 text-sm text-foreground">The impact of socioeconomic factors on vaccine hesitancy in sub-Saharan Africa</div></div>
              <div><label className="text-xs font-bold text-muted-foreground block mb-1.5">Degree Level</label><div className="bg-white border-[1.5px] border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground">MSc Public Health ▾</div></div>
              <div><label className="text-xs font-bold text-muted-foreground block mb-1.5">Research Framework</label><div className="flex flex-wrap gap-1.5"><span className="px-3 py-1 rounded-full bg-primary-pale border-[1.5px] border-primary text-primary text-xs font-bold">PICO ✓</span><span className="px-3 py-1 rounded-full border-[1.5px] border-border text-muted-foreground text-xs font-bold">PEO</span><span className="px-3 py-1 rounded-full border-[1.5px] border-border text-muted-foreground text-xs font-bold">SPIDER</span></div></div>
              <div><label className="text-xs font-bold text-muted-foreground block mb-1.5">Word Count Target</label><div className="bg-white border-[1.5px] border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground">12,000 words</div></div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-16 items-start">
          <div className="bg-foreground rounded-2xl overflow-hidden">
            <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-2.5">
              <div className="flex gap-1.5"><span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57] block" /><span className="w-[11px] h-[11px] rounded-full bg-[#FFBD2E] block" /><span className="w-[11px] h-[11px] rounded-full bg-[#28CA41] block" /></div>
              <span className="font-mono text-[11px] text-white/35 flex-1 text-center">Chapter 2: Literature Review — WRITING</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-green/15 text-green">3,247 / 3,800w</span>
            </div>
            <div className="p-6 text-[13px] leading-[1.9] text-white/70">
              <span className="text-white font-bold block mb-2">2.1 Theoretical Framework</span>
              The relationship between vaccination hesitancy and socioeconomic determinants has been extensively documented. <span className="text-aqua">Smith and Johnson (2021)</span> argue that structural barriers function as primary mediators of vaccine uptake behaviour. This position is corroborated by findings from a multi-country longitudinal study conducted by the WHO <span className="text-aqua">(WHO, 2022)</span>.<span className="cursor-blink" />
            </div>
          </div>
          <div>
            <div className="w-14 h-14 rounded-[14px] bg-primary flex items-center justify-center font-heading text-[26px] font-black text-white mb-5">2</div>
            <h2 className="font-heading text-[32px] font-black text-foreground mb-3.5 tracking-tight">Generate each chapter</h2>
            <p className="text-base text-muted-foreground leading-[1.75]">Click generate on any chapter. PAPERSTUDIO writes to your exact word count with proper section headings, in-text citations, and consistent academic voice.</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-16 items-start">
          <div>
            <div className="w-14 h-14 rounded-[14px] bg-primary flex items-center justify-center font-heading text-[26px] font-black text-white mb-5">3</div>
            <h2 className="font-heading text-[32px] font-black text-foreground mb-3.5 tracking-tight">Review, revise and export</h2>
            <p className="text-base text-muted-foreground leading-[1.75]">Accept chapters or request revisions with specific feedback. When all chapters are accepted, export your full dissertation in any format.</p>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { ico: '✓', title: 'Accept chapter', desc: 'Mark complete and move to next chapter', highlight: false },
              { ico: '✎', title: 'Request revision', desc: 'Give specific feedback — full rewrite', highlight: false },
              { ico: '📄', title: 'Export any format', desc: 'Word, PDF, LaTeX, Markdown, .txt', highlight: false },
              { ico: '🎓', title: 'Submission ready', desc: 'Title page, ToC, references included', highlight: true },
            ].map(i => (
              <div key={i.title} className={`rounded-xl p-5 border ${i.highlight ? 'bg-primary-pale border-[1.5px] border-primary-light' : 'bg-surface-light border-border'}`}>
                <div className="text-2xl mb-2">{i.ico}</div>
                <div className={`text-sm font-heading font-extrabold mb-1 ${i.highlight ? 'text-primary' : 'text-foreground'}`}>{i.title}</div>
                <div className={`text-xs ${i.highlight ? 'text-primary-mid' : 'text-muted-foreground'}`}>{i.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="text-center py-12">
        <Link to="/how-to-use" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
          📖 Read the full "How to Use" guide →
        </Link>
      </div>
      <CTABand title="Ready to start writing?" />
    </div>
  );
}
