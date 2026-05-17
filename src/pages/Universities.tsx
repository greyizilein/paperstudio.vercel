import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function UniversitiesPage() {
  return (
    <div>
      <PageHero title={<>PAPERSTUDIO for Universities.</>} subtitle="Institutional licensing for your entire student body. One flat fee, unlimited students." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Why universities choose PAPERSTUDIO">Students who struggle with dissertation writing drop out, perform poorly, or resort to contract cheating platforms. PAPERSTUDIO gives them a legitimate, supervised AI writing tool.</ContentSection>
        <ContentSection title="Institutional licensing">A single flat-rate licence covers all enrolled students. Students access through SSO. No per-student fees.</ContentSection>
        <ContentSection title="White-labelling and customisation">Your institution's branding. Your preferred citation styles pre-set. Custom chapter structures for specific programmes.</ContentSection>
        <ContentSection title="Academic integrity">PAPERSTUDIO is a writing assistance tool, not a contract cheating service. All exports include a citation disclaimer and academic integrity declaration.</ContentSection>
        <ContentSection title="Get in touch">Contact us at xeros.opinion@gmail.com. We'll arrange a demo and provide a custom quote within 48 hours.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
