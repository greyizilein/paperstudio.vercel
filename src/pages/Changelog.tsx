import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function ChangelogPage() {
  return (
    <div>
      <PageHero title={<>What's new.</>} subtitle="Every update, improvement, and fix — logged here." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="March 2026 — Gemini 3.1 Pro for PhD tier">PhD projects now run on Gemini 3.1 Pro. Noticeably better at long-range argument coherence, complex theoretical frameworks, and nuanced literature synthesis.</ContentSection>
        <ContentSection title="February 2026 — LaTeX export launched">Masters and PhD tier users can now export as a compilable LaTeX .zip file including main.tex, references.bib, and all chart images.</ContentSection>
        <ContentSection title="January 2026 — 15 research frameworks added">Framework selector expanded from 4 to 15 options including ECLIPSE, SPICE, CIMO, BeHEMoTh.</ContentSection>
        <ContentSection title="December 2025 — Grammar pipeline expanded to 7 stages">Two new stages added: AI-pattern scoring and citation density compliance checking.</ContentSection>
        <ContentSection title="November 2025 — Launch">PAPERSTUDIO launched publicly. Harvard, APA, Vancouver, IEEE, and MLA citation styles. 8 quantitative analysis methods.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
