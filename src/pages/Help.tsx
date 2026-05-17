import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function HelpPage() {
  return (
    <div>
      <PageHero title={<>Help Centre</>} subtitle="Everything you need to get the most out of PAPERSTUDIO." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Getting started">Create an account, start a new project, and fill in your dissertation details in the three-step wizard. Your first chapter is free — no payment required.</ContentSection>
        <ContentSection title="Choosing your research framework">If you're unsure which framework to use, check with your supervisor first. PICO for clinical/health studies; PEO for observational health research; SPIDER for qualitative health reviews; SMART for management and business objectives.</ContentSection>
        <ContentSection title="What chapters does PAPERSTUDIO support?">PAPERSTUDIO supports all dissertation chapters: Abstract, Introduction (Chapter 1), Literature Review (Chapter 2), Methodology (Chapter 3), Data Analysis & Findings (Chapter 4), and Conclusion (Chapter 5). Each chapter follows its own academic template.</ContentSection>
        <ContentSection title="Why does my word count not match exactly?">PAPERSTUDIO targets your specified word count as a guide. All required sections will be fully written — the AI will not cut sections short to meet an arbitrary limit.</ContentSection>
        <ContentSection title="Are citations real sources?">PAPERSTUDIO uses AI to generate citations based on real academic sources in the relevant field. Citations are intended to be real and verifiable — however, you should always verify them before submission, as occasional inaccuracies may occur.</ContentSection>
        <ContentSection title="Can I revise a chapter?">Yes — use the Revise button on any completed chapter. Describe what you want changed and PAPERSTUDIO will update only those sections, preserving the rest of the chapter.</ContentSection>
        <ContentSection title="How do I upgrade my tier?">Go to Account Settings {'>'} Subscription. One-time payments per project — not a monthly subscription.</ContentSection>
        <ContentSection title="Can I export part of my dissertation?">Yes — in the Export screen you can toggle individual chapters on or off before downloading.</ContentSection>
        <ContentSection title="How do I contact support?">Email us at xeros.opinion@gmail.com. Masters and PhD users receive priority responses within 12 hours.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
