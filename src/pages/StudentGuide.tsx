import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function StudentGuidePage() {
  return (
    <div>
      <PageHero title={<>Student Guide</>} subtitle="How to get the best results from PAPERSTUDIO — a practical guide for students." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Set up your project precisely">The more specific your setup inputs, the better your output. Don't just write 'Public Health' — write 'The impact of socioeconomic deprivation on childhood vaccination uptake in peri-urban Nigeria'.</ContentSection>
        <ContentSection title="Use the writing notes field">Before generating each chapter, use the writing notes field to add chapter-specific instructions. Examples: 'Focus the theoretical framework section on Social Cognitive Theory'.</ContentSection>
        <ContentSection title="Review before accepting">Read every chapter carefully before clicking Accept. Check that research objectives and questions are addressed. Check that citations are plausible.</ContentSection>
        <ContentSection title="Revision strategy">When requesting revisions, be specific. Instead of 'make it better', write 'The literature review doesn't sufficiently cover cognitive behavioural approaches'.</ContentSection>
        <ContentSection title="Verify your references">Every citation should be checked against a real source. Use the Citation Check button, Google Scholar, or your university library database.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
