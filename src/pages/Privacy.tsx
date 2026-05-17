import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function PrivacyPage() {
  return (
    <div>
      <PageHero title={<>Privacy Policy</>} subtitle="How we collect, use, and protect your data." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Data we collect">We collect your name, email address, and dissertation project data. We do not collect payment card details — all payments are processed by Stripe. We do not sell your data.</ContentSection>
        <ContentSection title="How we use your data">Your data is used to provide the PAPERSTUDIO service: generating chapters, storing your project progress, and sending account-related emails. We do not use your dissertation content to train AI models.</ContentSection>
        <ContentSection title="Data storage">All data is stored securely and encrypted at rest and in transit. We retain your data for as long as your account is active. You can delete your account and all data at any time from Settings.</ContentSection>
        <ContentSection title="Cookies">We use essential cookies only: session authentication cookies. We do not use third-party advertising cookies or tracking pixels.</ContentSection>
        <ContentSection title="Your rights">Under GDPR, you have the right to access, correct, export, and delete your personal data. Contact privacy@paperstudio.ai. We respond within 30 days.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
