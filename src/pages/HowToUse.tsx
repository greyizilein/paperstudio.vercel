import { PageHero } from "@/components/firstdraft/PageHero";
import { CTABand } from "@/components/firstdraft/CTABand";
import { ContentSection } from "@/components/firstdraft/ContentSection";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const cardStyle: React.CSSProperties = {
  borderRadius: "12px",
  border: "1px solid var(--ma-border)",
  padding: "16px",
  background: "var(--ma-surface)",
  marginBottom: "12px",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontWeight: 700,
  fontSize: "14px",
  color: "var(--ma-text)",
  marginBottom: "4px",
};

const cardBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: "14px",
  color: "var(--ma-text-muted)",
  lineHeight: 1.8,
};

const listStyle: React.CSSProperties = {
  marginBottom: "48px",
  fontFamily: FONTS.body,
  fontSize: "14px",
  color: "var(--ma-text-muted)",
  lineHeight: 1.8,
};

export default function HowToUse() {
  return (
    <div>
      <PageHero
        title={<>Your complete guide to<br /><em style={{ fontStyle: "italic", color: "var(--ma-accent)" }}>using PAPERSTUDIO.</em></>}
        subtitle="Every feature, setting, and workflow explained in detail."
      />
      <section style={{ padding: "80px 24px", maxWidth: "800px", margin: "0 auto" }}>

        <ContentSection title="1. Getting Started">
          To begin using PAPERSTUDIO, create an account using your university email or Google sign-in. Once registered, you'll land on your Dashboard — the central hub for managing your dissertation projects. Every new account starts on the Free tier, which lets you generate Chapter 1 (up to 3,000 words) at no cost. This gives you a full preview of PAPERSTUDIO's writing quality before upgrading. To unlock all chapters, export formats, and editing tools, choose a paid tier (Undergraduate, Masters, or PhD) from the Pricing page.
        </ContentSection>

        <ContentSection title="2. Creating a Project">
          Click "New Project" from your Dashboard. The five-step wizard collects everything the AI needs to write your dissertation accurately:
        </ContentSection>
        <div style={{ marginBottom: "48px" }}>
          {[
            {
              title: "Step 1: Basics",
              content: (
                <p style={cardBodyStyle}>
                  <strong>Dissertation Title</strong> — Be specific and descriptive. Your title shapes every chapter the AI generates.<br />
                  <strong>University</strong> (optional) — Helps the AI adapt to institutional conventions.<br />
                  <strong>Degree Level</strong> — BSc/BA, MSc, MA/MBA, or PhD/DPhil. Determines chapter depth, word count defaults, and analytical complexity.<br />
                  <strong>Field of Study</strong> — E.g. "Business Management", "Public Health". The AI uses this to select discipline-specific terminology.<br />
                  <strong>Total Word Count</strong> — Your full dissertation target. PAPERSTUDIO distributes this across chapters using academic weighting conventions.<br />
                  <strong>Citation Style</strong> — Harvard, APA 7th, APA 6th, MLA 9th, Chicago, Vancouver, IEEE, OSCOLA, AGLC 4, AMA, or Turabian.<br />
                  <strong>Language Style</strong> — English (UK), English (US), English (Nigeria/West Africa), English (Australia), English (Canada), or beta support for French, Spanish, and Portuguese.
                </p>
              ),
            },
            {
              title: "Step 2: Strategy",
              content: (
                <p style={cardBodyStyle}>
                  <strong>Research Methodology</strong> — Quantitative, Qualitative, or Mixed Methods.<br />
                  <strong>Research Framework</strong> — PICO, PEO, SPIDER, FINER, SMART, etc. The framework shapes how your research questions and objectives are structured.<br />
                  <strong>Writing Style settings</strong> — Formality level, methodology depth, voice person, and hedging intensity. Adjustable per-chapter later.
                </p>
              ),
            },
            { title: "Step 3: Chapters", content: <p style={cardBodyStyle}>Review the auto-generated chapter distribution. You can adjust word counts for individual chapters — the total is recalibrated automatically. The Abstract is always drafted last, after all other chapters are complete.</p> },
            { title: "Step 4: Objectives", content: <p style={cardBodyStyle}>Enter your research objectives and questions, or click "Auto-generate" to let the AI create them based on your title and framework. You can edit them freely. If your methodology supports it, you can also add hypotheses.</p> },
            { title: "Step 5: Review", content: <p style={cardBodyStyle}>Preview everything before creating the project. Once created, you'll be taken to the Writer interface.</p> },
          ].map(step => (
            <div key={step.title} style={cardStyle}>
              <div style={cardTitleStyle}>{step.title}</div>
              {step.content}
            </div>
          ))}
        </div>

        <ContentSection title="3. The Writer Interface">
          The Writer is where all generation happens. It has three main areas: the chapter sidebar (left), the content editor (centre), and the Personalise panel (right slide-out). The top bar shows your project title, degree, and citation style. From here you can Copy content, Export chapters, use Grammar/Editing tools, or access the Final Export.
        </ContentSection>

        <ContentSection title="4. Personalise Settings">
          Click the "Personalise" button on any chapter to open the settings panel. Every setting here affects how that chapter is generated. Key settings include:
        </ContentSection>
        <div style={{ ...listStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            ["AI Model", "Choose which AI model writes your chapter. Models available depend on your subscription tier. Gemini 2.5 Flash is available to all tiers and is the default. Premium models are reserved for PhD tier."],
            ["Formality level", "Conversational academic, Standard journal (default), or Highly formal/theoretical."],
            ["Paragraph length", "Short (2–4 sentences), Medium (4–7), or Long (7–12). Academic convention typically uses Medium."],
            ["Hedging intensity", "Controls how cautious the language is. \"Low\" gives confident assertions; \"High\" adds extensive qualifiers."],
            ["Voice person", "\"Third person only\" (standard) or \"Allow first person\" (common in qualitative/reflexive writing)."],
            ["Source settings", "Total sources, date range, source type distribution (journals vs. books vs. reports), DOI inclusion, and empirical level."],
            ["Theorists", "Select from AI-suggested theorists relevant to your field, or add custom ones. Selected theorists are woven into the literature review naturally."],
            ["Analysis methods", "For Chapters 3–4. Select quantitative methods (t-tests, ANOVA, regression, etc.) and/or qualitative methods (thematic analysis, IPA, grounded theory, etc.)."],
            ["Visualisations", "Choose which charts and tables to include in findings chapters."],
            ["Notes", "Free-text instructions injected directly into the AI prompt. Use for specific requirements like \"Focus on sub-Saharan African literature\"."],
          ].map(([title, desc]) => (
            <p key={title as string} style={{ margin: 0 }}><strong style={{ color: "var(--ma-text)" }}>{title}</strong> — {desc}</p>
          ))}
        </div>

        <ContentSection title="5. Chapter Outline & Custom Headings">
          Before generating any chapter, you'll see the Chapter Outline Modal. This shows the default section headings and word count allocations for that chapter type. You can: edit any heading text, adjust word counts per section, uncheck sections you don't want, drag sections to reorder them, and add entirely new custom sections. The AI will follow your customised outline exactly.
        </ContentSection>

        <ContentSection title="6. Drafting Chapters">
          Chapters must be written sequentially — Chapter 2 won't unlock until Chapter 1 is complete. This ensures coherence, as each chapter builds on what came before. When you click "Draft", the AI generates the chapter in real-time with streaming text. If the output is shorter than your target word count, PAPERSTUDIO automatically continues writing (up to 3 passes) until the target is met. After generation, you can: Accept the chapter (marks it complete and unlocks the next), Draft again (completely regenerate), Revise (provide specific feedback and regenerate), or Continue Writing (if below target).
        </ContentSection>

        <ContentSection title="7. Methodology Settings (Chapters 3 & 4)">
          When you select Chapter 3 or 4, a yellow banner appears reminding you to configure methodology-specific settings in Personalise. These settings include: Research philosophy (ontology/epistemology), Data collection instruments, Sampling strategy details, Analysis software preferences, and Chart/table formatting options. Configuring these before drafting ensures the AI writes a methodology chapter that matches your actual research design.
        </ContentSection>

        <ContentSection title="8. Grammar & Humaniser Tools">
          Access from the "Edit" button in the top bar. Tools are organised into three categories:
        </ContentSection>
        <div style={{ ...listStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            ["Corrections", "Fix grammar (spelling, punctuation) and Fix citations (formatting consistency)."],
            ["Style", "Strengthen (make arguments more compelling), Simplify (reduce complexity), Academic tone (enforce formal register)."],
            ["Content", "Paraphrase (rewrite differently, preserve citations), Expand (add depth), Shorten (reduce by 20–30%)."],
            ["Humaniser", "Three levels: Light (minimal changes), Standard (balanced), Deep (maximum rewrite). Reduces AI detection scores while preserving academic meaning, citations, and formal tone. Deep mode requires Masters or PhD tier."],
            ["Revision limits", "Free: 0 (no editing tools), Undergraduate: 3 per chapter, Masters: 8 per chapter, PhD: unlimited. Each grammar or humaniser action counts as one revision."],
            ["AI Detection Score", "Estimates how likely AI detectors (Turnitin AI, GPTZero, ZeroGPT) will flag your chapter. Check before and after humanising."],
          ].map(([title, desc]) => (
            <p key={title as string} style={{ margin: 0 }}><strong style={{ color: "var(--ma-text)" }}>{title}</strong> — {desc}</p>
          ))}
        </div>

        <ContentSection title="9. Export Options">
          PAPERSTUDIO supports multiple export formats, gated by tier:
        </ContentSection>
        <div style={{ ...listStyle, display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            [".txt", "Plain text. Available to all tiers including Free."],
            [".docx", "Microsoft Word with full formatting, tables, headers. Undergraduate and above."],
            [".pdf", "Print-ready PDF via browser print dialog. Undergraduate and above."],
            [".md", "Markdown with YAML frontmatter. Masters and above."],
            [".tex", "LaTeX with .bib bibliography file. PhD only."],
            ["Final Export", "Complete dissertation document with title page, table of contents, and all chapters. Fill in your name, student ID, supervisor, institution, and choose a font."],
            ["Images (ZIP)", "Generates professional figures and charts as images, downloaded as a ZIP file."],
            ["References", "Downloads a compiled reference list from all chapters as a .txt file."],
          ].map(([title, desc]) => (
            <p key={title as string} style={{ margin: 0 }}><strong style={{ color: "var(--ma-text)" }}>{title}</strong> — {desc}</p>
          ))}
        </div>

        <ContentSection title="10. Word Count & Billing">
          PAPERSTUDIO tracks word usage against your subscription tier's word limit. Key rules:
        </ContentSection>
        <div style={{ ...listStyle, display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            "Only the first draft of each chapter counts against your word limit. Redrafts and revisions are free.",
            "Words in the References section are excluded from word counts and billing.",
            "Your word count is cumulative — it tracks total generation across your account's lifetime.",
            "Deleting projects does not restore used word counts.",
            "When your word limit is reached, your subscription status changes to \"expired\" and you cannot generate new chapters until you upgrade.",
            "Tier limits: Free = 3,000 words (1 project), Undergraduate = 50,000 words, Masters = 80,000 words, PhD = 120,000 words.",
            "You can check your current usage in the top-right user profile popover or on the Dashboard.",
          ].map((line, i) => (
            <p key={i} style={{ margin: 0 }}>• {line}</p>
          ))}
        </div>

      </section>
      <CTABand title="Ready to start writing?" />
    </div>
  );
}
