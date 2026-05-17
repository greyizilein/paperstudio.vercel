import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

export default function HowToUse() {
  return (
    <div>
      <PageHero
        title={<>Your complete guide to<br /><em className="not-italic text-aqua">using PAPERSTUDIO.</em></>}
        subtitle="Every feature, setting, and workflow explained in detail."
      />
      <section className="py-[80px] px-6 md:px-20 max-w-[800px] mx-auto">

        <ContentSection title="1. Getting Started">
          To begin using PAPERSTUDIO, create an account using your university email or Google sign-in. Once registered, you'll land on your Dashboard — the central hub for managing your dissertation projects. Every new account starts on the Free tier, which lets you generate Chapter 1 (up to 3,000 words) at no cost. This gives you a full preview of PAPERSTUDIO's writing quality before upgrading. To unlock all chapters, export formats, and editing tools, choose a paid tier (Undergraduate, Masters, or PhD) from the Pricing page.
        </ContentSection>

        <ContentSection title="2. Creating a Project">
          Click "New Project" from your Dashboard. The five-step wizard collects everything the AI needs to write your dissertation accurately:
        </ContentSection>
        <div className="mb-12 space-y-4 text-sm text-muted-foreground leading-[1.8]">
          <div className="rounded-xl border border-border p-4 bg-card">
            <h3 className="font-bold text-foreground mb-1">Step 1: Basics</h3>
            <p><strong>Dissertation Title</strong> — Be specific and descriptive. Your title shapes every chapter the AI generates. A vague title leads to generic writing.</p>
            <p><strong>University</strong> (optional) — Helps the AI adapt to institutional conventions.</p>
            <p><strong>Degree Level</strong> — BSc/BA, MSc, MA/MBA, or PhD/DPhil. This determines chapter depth, word count defaults, and analytical complexity.</p>
            <p><strong>Field of Study</strong> — E.g. "Business Management", "Public Health", "Computer Science". The AI uses this to select discipline-specific terminology and citation practices.</p>
            <p><strong>Total Word Count</strong> — Your full dissertation target (e.g. 12,000 or 80,000). PAPERSTUDIO automatically distributes this across chapters using academic weighting conventions.</p>
            <p><strong>Citation Style</strong> — Harvard, APA 7th, APA 6th, MLA 9th, Chicago, Vancouver, IEEE, OSCOLA, AGLC 4, AMA, or Turabian. The AI formats all in-text and reference list citations according to your selection.</p>
            <p><strong>Language Style</strong> — English (UK), English (US), English (Nigeria/West Africa), English (Australia), English (Canada), or beta support for French, Spanish, and Portuguese.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-card">
            <h3 className="font-bold text-foreground mb-1">Step 2: Strategy</h3>
            <p><strong>Research Methodology</strong> — Quantitative, Qualitative, or Mixed Methods. This determines your chapter structure (e.g. Quantitative uses "Findings & Analysis" while Qualitative uses "Findings & Discussion").</p>
            <p><strong>Research Framework</strong> — PICO, PEO, SPIDER, FINER, SMART, etc. The framework shapes how your research questions and objectives are structured. Choose "None" for open-form questions.</p>
            <p><strong>Writing Style settings</strong> — Formality level, methodology depth, voice person, and hedging intensity. These can also be adjusted per-chapter later in the Personalise panel.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-card">
            <h3 className="font-bold text-foreground mb-1">Step 3: Chapters</h3>
            <p>Review the auto-generated chapter distribution. You can adjust word counts for individual chapters — the total is recalibrated automatically. The Abstract is always drafted last, after all other chapters are complete.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-card">
            <h3 className="font-bold text-foreground mb-1">Step 4: Objectives</h3>
            <p>Enter your research objectives and questions, or click "Auto-generate" to let the AI create them based on your title and framework. You can edit them freely. If your methodology supports it, you can also add hypotheses.</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-card">
            <h3 className="font-bold text-foreground mb-1">Step 5: Review</h3>
            <p>Preview everything before creating the project. Once created, you'll be taken to the Writer interface.</p>
          </div>
        </div>

        <ContentSection title="3. The Writer Interface">
          The Writer is where all generation happens. It has three main areas: the chapter sidebar (left), the content editor (centre), and the Personalise panel (right slide-out). The top bar shows your project title, degree, and citation style. From here you can Copy content, Export chapters, use Grammar/Editing tools, or access the Final Export.
        </ContentSection>

        <ContentSection title="4. Personalise Settings">
          Click the "Personalise" button on any chapter to open the settings panel. Every setting here affects how that chapter is generated. Key settings include:
        </ContentSection>
        <div className="mb-12 space-y-3 text-sm text-muted-foreground leading-[1.8]">
          <p><strong>AI Model</strong> — Choose which AI model writes your chapter. Models available depend on your subscription tier. Gemini 2.5 Flash is available to all tiers and is the default. Premium models (GPT-5.2, Gemini 3.1 Pro) are reserved for PhD tier.</p>
          <p><strong>Formality level</strong> — Conversational academic, Standard journal (default), or Highly formal/theoretical.</p>
          <p><strong>Paragraph length</strong> — Short (2–4 sentences), Medium (4–7), or Long (7–12). Academic convention typically uses Medium.</p>
          <p><strong>Hedging intensity</strong> — Controls how cautious the language is. "Low" gives confident assertions; "High" adds extensive qualifiers ("may suggest", "it could be argued").</p>
          <p><strong>Voice person</strong> — "Third person only" (standard) or "Allow first person" (common in qualitative/reflexive writing).</p>
          <p><strong>Source settings</strong> — Total sources, date range, source type distribution (journals vs. books vs. reports), DOI inclusion, and empirical level. These control the reference list quality and recency.</p>
          <p><strong>Theorists</strong> — Select from AI-suggested theorists relevant to your field, or add custom ones. Selected theorists are woven into the literature review naturally.</p>
          <p><strong>Analysis methods</strong> — For Chapters 3–4. Select quantitative methods (t-tests, ANOVA, regression, etc.) and/or qualitative methods (thematic analysis, IPA, grounded theory, etc.).</p>
          <p><strong>Visualisations</strong> — Choose which charts and tables to include in findings chapters (bar charts, scatter plots, correlation matrices, etc.).</p>
          <p><strong>Notes</strong> — Free-text instructions that are injected directly into the AI prompt. Use this for specific requirements like "Focus on sub-Saharan African literature" or "Include the Technology Acceptance Model".</p>
        </div>

        <ContentSection title="5. Chapter Outline & Custom Headings">
          Before generating any chapter, you'll see the Chapter Outline Modal. This shows the default section headings and word count allocations for that chapter type. You can: edit any heading text, adjust word counts per section, uncheck sections you don't want, drag sections to reorder them, and add entirely new custom sections. The AI will follow your customised outline exactly.
        </ContentSection>

        <ContentSection title="6. Drafting Chapters">
          Chapters must be written sequentially — Chapter 2 won't unlock until Chapter 1 is complete. This ensures coherence, as each chapter builds on what came before. When you click "Draft", the AI generates the chapter in real-time with streaming text. If the output is shorter than your target word count, PAPERSTUDIO automatically continues writing (up to 3 passes) until the target is met. After generation, you can: Accept the chapter (marks it complete and unlocks the next), Draft again (completely regenerate), Revise (provide specific feedback and regenerate), or Continue Writing (if below target).
        </ContentSection>

        <ContentSection title="7. Methodology Settings (Chapters 3 & 4)">
          When you select Chapter 3 or 4, a yellow banner appears reminding you to configure methodology-specific settings in Personalise. These settings are only relevant for these chapters and include: Research philosophy (ontology/epistemology), Data collection instruments, Sampling strategy details, Analysis software preferences, and Chart/table formatting options. Configuring these before drafting ensures the AI writes a methodology chapter that matches your actual research design.
        </ContentSection>

        <ContentSection title="8. Grammar & Humaniser Tools">
          Access from the "Edit" button in the top bar. Tools are organised into three categories:
        </ContentSection>
        <div className="mb-12 space-y-3 text-sm text-muted-foreground leading-[1.8]">
          <p><strong>Corrections</strong> — Fix grammar (spelling, punctuation) and Fix citations (formatting consistency).</p>
          <p><strong>Style</strong> — Strengthen (make arguments more compelling), Simplify (reduce complexity), Academic tone (enforce formal register).</p>
          <p><strong>Content</strong> — Paraphrase (rewrite differently, preserve citations), Expand (add depth), Shorten (reduce by 20–30%).</p>
          <p><strong>Humaniser</strong> — Three levels: Light (minimal changes), Standard (balanced), Deep (maximum rewrite). The humaniser reduces AI detection scores while preserving academic meaning, citations, and formal tone. Deep mode requires Masters or PhD tier.</p>
          <p><strong>Revision limits</strong> — Free: 0 (no editing tools), Undergraduate: 3 per chapter, Masters: 8 per chapter, PhD: unlimited. Each grammar or humaniser action counts as one revision.</p>
          <p><strong>AI Detection Score</strong> — Estimates how likely AI detectors (Turnitin AI, GPTZero, ZeroGPT) will flag your chapter. Check before and after humanising.</p>
        </div>

        <ContentSection title="9. Export Options">
          PAPERSTUDIO supports multiple export formats, gated by tier:
        </ContentSection>
        <div className="mb-12 space-y-2 text-sm text-muted-foreground leading-[1.8]">
          <p><strong>.txt</strong> — Plain text. Available to all tiers including Free.</p>
          <p><strong>.docx</strong> — Microsoft Word with full formatting, tables, headers. Undergraduate and above.</p>
          <p><strong>.pdf</strong> — Print-ready PDF via browser print dialog. Undergraduate and above.</p>
          <p><strong>.md</strong> — Markdown with YAML frontmatter. Masters and above.</p>
          <p><strong>.tex</strong> — LaTeX with .bib bibliography file. PhD only.</p>
          <p><strong>Final Export</strong> — Generates a complete dissertation document with title page, table of contents, and all chapters. You can fill in your name, student ID, supervisor, institution, and choose a font. Available from the top bar.</p>
          <p><strong>Images (ZIP)</strong> — Generates professional figures and charts as images, downloaded as a ZIP file.</p>
          <p><strong>References</strong> — Downloads a compiled reference list from all chapters as a .txt file.</p>
        </div>

        <ContentSection title="10. Word Count & Billing">
          PAPERSTUDIO tracks word usage against your subscription tier's word limit. Key rules:
        </ContentSection>
        <div className="mb-12 space-y-2 text-sm text-muted-foreground leading-[1.8]">
          <p>• Only the <strong>first draft</strong> of each chapter counts against your word limit. Redrafts and revisions are free.</p>
          <p>• Words in the <strong>References section</strong> are excluded from word counts and billing.</p>
          <p>• Your word count is <strong>cumulative</strong> — it tracks total generation across your account's lifetime.</p>
          <p>• <strong>Deleting projects does not restore</strong> used word counts.</p>
          <p>• When your word limit is reached, your subscription status changes to "expired" and you cannot generate new chapters until you upgrade.</p>
          <p>• <strong>Tier limits:</strong> Free = 3,000 words (1 project), Undergraduate = 50,000 words, Masters = 80,000 words, PhD = 120,000 words.</p>
          <p>• You can check your current usage in the top-right user profile popover or on the Dashboard.</p>
        </div>

      </section>
      <CTABand title="Ready to start writing?" />
    </div>
  );
}
