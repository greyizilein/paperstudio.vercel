import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function TermsPage() {
  return (
    <div>
      <PageHero title={<>Terms of Service</>} subtitle="The rules that govern your use of PAPERSTUDIO." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Acceptance">By creating an account and using PAPERSTUDIO, you agree to these terms.</ContentSection>
        <ContentSection title="Permitted use">PAPERSTUDIO is a writing assistance tool. You may use it to draft dissertation chapters, structure your research, and generate export-ready documents. You are responsible for reviewing all AI-generated content.</ContentSection>
        <ContentSection title="Academic integrity">You must not submit PAPERSTUDIO-generated content as your own original work without review, revision, and disclosure as required by your institution.</ContentSection>
        <ContentSection title="Citations">PAPERSTUDIO generates citations based on real academic works in the relevant field. You must verify every citation before submission, as occasional inaccuracies may occur.</ContentSection>
        <ContentSection title="Payments and refunds">Payments are one-time per project and processed by Stripe. A full refund is available within 24 hours of purchase if fewer than 3 chapters have been generated.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
