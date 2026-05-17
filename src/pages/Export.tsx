import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function ExportPage() {
  return (
    <div>
      <PageHero title={<>Five formats.<br /><em className="not-italic text-aqua">Submit anywhere.</em></>} subtitle="Every export includes your title page, table of contents, list of figures, list of tables, and reference list." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <ContentSection title="Microsoft Word (.docx)">Primary export format. Full formatting fidelity — all typography, spacing, margins, headers/footers, page numbering, and cross-references applied. Charts embedded as high-resolution PNG images.</ContentSection>
        <ContentSection title="PDF">Generated from the .docx via LibreOffice server-side conversion. Fonts embedded — renders identically on any device. PhD tier includes PDF/A-1b for thesis deposit.</ContentSection>
        <ContentSection title="LaTeX (.tex + .bib)">Complete compilable LaTeX document delivered as a .zip file. Includes main.tex, references.bib, and all chart PNG files. Available at Masters and PhD tier.</ContentSection>
        <ContentSection title="Markdown (.md)">GitHub Flavored Markdown with YAML frontmatter. Compatible with Pandoc, Obsidian, VS Code, Zettlr, and Notion import.</ContentSection>
        <ContentSection title="Plain Text (.txt)">Universal compatibility. All chapters in sequence with plain text headings. Encoding: UTF-8.</ContentSection>
      </section>
      <CTABand />
    </div>
  );
}
