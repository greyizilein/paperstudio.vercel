import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function CookiesPage() {
  return (
    <div>
      <PageHero title={<>Cookie Policy</>} subtitle="What cookies we use and why." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Essential cookies only">PAPERSTUDIO uses only essential cookies necessary for the service to function. We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</ContentSection>
        <ContentSection title="Authentication cookies">A session cookie keeps you signed in during your session and expires when you close your browser or after 30 days.</ContentSection>
        <ContentSection title="Preference cookies">We store your language preference, theme settings, and last-used project in your browser's localStorage. This data never leaves your device.</ContentSection>
        <ContentSection title="Managing cookies">You can clear cookies at any time through your browser settings. Clearing your authentication cookie will log you out.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
