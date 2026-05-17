import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function CitationsPage() {
  return (
    <div>
      <PageHero title={<>12 Citation Styles.<br /><em className="not-italic text-aqua">All formats supported.</em></>} subtitle="Harvard, APA 7, Vancouver, IEEE, MLA, Chicago, OSCOLA and more." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Harvard (UK)">Author-date system. Smith (2021) in-text. Full reference: Smith, J. (2021) Title. City: Publisher. Default for most UK universities.</ContentSection>
        <ContentSection title="APA 7th Edition">American Psychological Association 7th edition. (Smith, 2021) in-text. DOI required for all journal articles. Default for Psychology, Education, and Social Sciences.</ContentSection>
        <ContentSection title="Vancouver">Numbered citation system. [1] in text, references in order of appearance. Used in Medicine and Biomedical Sciences.</ContentSection>
        <ContentSection title="IEEE">Numbered citation system used in Engineering and Computer Science. [1] in text.</ContentSection>
        <ContentSection title="OSCOLA">Oxford University Standard for the Citation of Legal Authorities. Footnote-based. Used in UK law dissertations.</ContentSection>
        <ContentSection title="MLA 9th, Chicago, AMA, Turabian">All remaining citation styles fully supported. MLA 9th for Humanities. Chicago Author-Date and Notes-Bibliography both available.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
