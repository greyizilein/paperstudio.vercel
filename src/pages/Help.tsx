import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";
import { useSiteContent } from "@/hooks/useSiteContent";

const DEFAULT_FAQS = [
  { q: "How do I get started?", a: "Sign up for a free account and you'll receive 3,000 words to try CZAR immediately." },
  { q: "How do I export my work?", a: "Use the Export button in the editor toolbar. Your document downloads as a .docx file." },
  { q: "What is CZAR?", a: "CZAR is PaperStudio's AI writing engine. It has four modes: Chat, Plan, Build, and Agent." },
  { q: "Can I use my own sources?", a: "Yes — upload PDFs or paste text and CZAR will cite them correctly in your chosen style." },
  { q: "Choosing your research framework", a: "PICO for clinical/health studies; PEO for observational health research; SPIDER for qualitative health reviews; SMART for management." },
  { q: "What chapters does PAPERSTUDIO support?", a: "All dissertation chapters: Abstract, Introduction, Literature Review, Methodology, Data Analysis & Findings, and Conclusion." },
  { q: "Why does my word count not match exactly?", a: "PAPERSTUDIO targets your specified word count as a guide. All required sections will be fully written." },
  { q: "Are citations real sources?", a: "PAPERSTUDIO uses AI to generate citations based on real academic sources. Always verify before submission." },
  { q: "How do I contact support?", a: "Use the Messages panel in the sidebar to contact us directly." },
];

export default function HelpPage() {
  const heroContent = useSiteContent<{ text: string }>("help", "hero_headline", { text: "How can we help?" });
  const faqContent = useSiteContent<{ items: { q: string; a: string }[] }>(
    "help", "faq_items", { items: DEFAULT_FAQS }
  );

  const faqs = faqContent.items.length > 0 ? faqContent.items : DEFAULT_FAQS;

  return (
    <div>
      <PageHero title={<>{heroContent.text}</>} subtitle="Everything you need to get the most out of PAPERSTUDIO." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        {faqs.map((faq, i) => (
          <ContentSection key={i} title={faq.q}>{faq.a}</ContentSection>
        ))}
      </section>
      <CTABand />
    </div>
  );
}
