import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function IntegrityPage() {
  return (
    <div>
      <PageHero title={<>Academic Integrity Policy</>} subtitle="How PAPERSTUDIO approaches the ethics of AI-assisted academic writing." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Our position">PAPERSTUDIO is an AI-assisted writing tool — not a contract cheating service. There is a fundamental difference between using a tool to help you write and paying someone else to write for you.</ContentSection>
        <ContentSection title="What PAPERSTUDIO does not do">PAPERSTUDIO does not provide essay mills, pre-written dissertations, or ghostwriting services. Every project is tied to your specific research topic.</ContentSection>
        <ContentSection title="Your responsibilities">You are responsible for reviewing every chapter, verifying every citation, and ensuring the content accurately represents your research.</ContentSection>
        <ContentSection title="About citations in exports">PAPERSTUDIO generates citations based on real academic works in the relevant field. Always verify sources before submission, as occasional inaccuracies may occur.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
