// Academic Citation Style Library — all 12 styles
// Single source of truth for AI generation prompts and DOCX formatting rules.
//
// Used by:
//   generate-chapter/index.ts  — getCitationStylePrompt()
//   export-docx/index.ts       — getCitationStyleDocx()
//   src/lib/citationStylesMeta.ts (frontend mirror of dropdown metadata)

export interface DocxStyleRules {
  lineSpacing: number;           // twips×240: 480=double, 360=1.5×, 240=single
  marginTop: number;             // twips (1440 = 1 inch)
  marginLeft: number;            // 1800 = 1.25 inch (binding)
  marginRight: number;
  marginBottom: number;
  pageNumberPosition: "top-right" | "bottom-center";
  runningHead: boolean;
  h1Alignment: "center" | "left";
  h1Bold: boolean;
  h2Italic: boolean;
  h3Italic: boolean;
  referenceListTitle: string;
  blockQuoteWordThreshold: number;
  blockQuoteIndentTwips: number;
  usesFootnotes: boolean;
  headingCase: "title" | "sentence";
  numberReferences: boolean;
}

interface CitationStyleDefinition {
  id: string;
  name: string;
  description: string;
  disciplines: string[];
  aiPrompt: string;
  docx: DocxStyleRules;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CITATION INTEGRITY RULES — appended to every style prompt
// ─────────────────────────────────────────────────────────────────────────────
const CITATION_INTEGRITY = `
### Citation Integrity Rules (mandatory for all styles):
1. Every in-text citation MUST have a matching reference list / bibliography entry.
2. Every reference entry MUST be cited in-text.
3. NEVER fabricate DOI numbers — only include https://doi.org/xxxxx if the DOI is verifiable.
4. For websites: use the SPECIFIC PAGE URL, not the homepage.
5. Add the access date for all online sources in the format your style requires.
6. FINAL SELF-CHECK: (a) citation↔reference parity, (b) format matches declared style exactly, (c) online sources have specific URLs + access date.
`;

// ─────────────────────────────────────────────────────────────────────────────
// THE LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
export const CITATION_STYLE_LIBRARY: Record<string, CitationStyleDefinition> = {

  "Harvard": {
    id: "Harvard",
    name: "Harvard",
    description: "Author-date style standard in UK/Australian Business, Humanities, and Social Sciences.",
    disciplines: ["business", "management", "marketing", "economics", "sociology", "social science", "education", "health", "nursing", "psychology", "humanities"],
    docx: {
      lineSpacing: 360,
      marginTop: 1440, marginLeft: 1800, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: true,
      referenceListTitle: "Reference List",
      blockQuoteWordThreshold: 30, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "sentence",
      numberReferences: false,
    },
    aiPrompt: `## HARVARD REFERENCING — follow these rules precisely

### Heading style:
- All headings use SENTENCE CASE (only first word and proper nouns capitalised).

### In-text citation format:
- PARENTHETICAL (author not named in sentence): (Smith & Jones, 2021)
  ✅ CORRECT: "…this has been shown to be effective (Smith & Jones, 2021)."
  ❌ WRONG: "…this has been shown to be effective (Smith and Jones, 2021)." ← use "&" in brackets
- NARRATIVE (author named in sentence): Smith and Jones (2021) argue that…
  ✅ CORRECT: "Smith and Jones (2021) argue that X is Y."
  ❌ WRONG: "Smith & Jones (2021) argue that X is Y." ← use "and" outside brackets
- 1 author: (Smith, 2021) or Smith (2021)
- 2 authors: (Smith & Jones, 2021) or Smith and Jones (2021)
- 3+ authors: (Smith et al., 2021) or Smith et al. (2021)
- Multiple citations in one bracket: (Jones, 2019; Smith, 2021; Brown, 2023) — chronological, semicolons
- Direct quotes: (Smith, 2021, p. 45) or Smith (2021, p. 45) states "…"

### Block quotes:
- Any direct quotation of 30+ words must be formatted as an indented block quote (no quotation marks).

### Reference List (title: "Reference List"):
- Alphabetical by first author surname. Do NOT number entries.
- Year immediately after author name in brackets: Author, A.B. (Year)
- Journal article: Author, A.B. (Year) 'Title of article', *Journal Name*, Volume(Issue), pp. XX–XX.
- Book: Author, A.B. (Year) *Title of Book*. Edition. Place: Publisher.
- Website: Author, A.B. (Year) *Title of page*. Available at: https://specific-url [Accessed: {DATE}].
- Do NOT use "Retrieved from" — use "Available at:"
- Do NOT include DOI unless you are certain it exists.
${CITATION_INTEGRITY}`,
  },

  "APA 7th": {
    id: "APA 7th",
    name: "APA (7th Edition)",
    description: "Author-date style standard in Psychology, Education, and Social Sciences.",
    disciplines: ["psychology", "education", "counselling", "social work", "communication", "neuroscience", "cognitive science"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "top-right",
      runningHead: false,
      h1Alignment: "center", h1Bold: true, h2Italic: false, h3Italic: true,
      referenceListTitle: "References",
      blockQuoteWordThreshold: 40, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## APA 7th REFERENCING — STRICT RULES

### Heading style:
- All headings use TITLE CASE (capitalise all major words).
- Level 1: Centred, Bold, Title Case
- Level 2: Left-aligned, Bold, Title Case
- Level 3: Left-aligned, Bold Italic, Title Case

### In-text citation format:
- Author-year: (Author, Year) or Author (Year) when named in sentence.
- Two authors: (Smith & Jones, 2021) in brackets; "Smith and Jones (2021)" in prose.
- Three or more authors: (Smith et al., 2021) from FIRST citation.
- Multiple sources: (Brown, 2020; Smith, 2021) — alphabetical by first author.
- Direct quotes: (Author, Year, p. XX) — mandatory page number for direct quotes.

### Block quotes:
- Any direct quotation of 40+ words must be formatted as an indented block quote (0.5 in from left margin). Do not use quotation marks. Page number required: (Author, Year, p. XX).

### References (title: "References"):
- Alphabetical by first author surname. Do NOT number entries.
- Hanging indent (0.5 in).
- Journal: Author, A. B., & Jones, C. D. (Year). Title of article. *Journal Name*, *Volume*(Issue), pp–pp. https://doi.org/xxxxx
- No DOI: Retrieved from https://specific-page-url
- Book: Author, A. B. (Year). *Title of Book: Subtitle*. Publisher. https://doi.org/xxxxx
- Website: Author, A. B. (Year, Month Day). *Title of page*. Site Name. https://specific-url
${CITATION_INTEGRITY}`,
  },

  "APA 6th": {
    id: "APA 6th",
    name: "APA (6th Edition)",
    description: "Older APA format still required by some institutions — differs from 7th in running head, et al. rules, and URL format.",
    disciplines: ["psychology", "education", "social work"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "top-right",
      runningHead: true,
      h1Alignment: "center", h1Bold: true, h2Italic: false, h3Italic: true,
      referenceListTitle: "References",
      blockQuoteWordThreshold: 40, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## APA 6th REFERENCING — STRICT RULES (differs from APA 7th)

### Key differences from APA 7th:
- Running head required: "RUNNING HEAD: SHORT TITLE" on title page, "SHORT TITLE" on subsequent pages.
- Et al.: Use "et al." for 6+ authors from first citation; 3–5 authors cite all authors on first mention, then "et al.".
- Two authors: Always use "&" both in brackets AND in prose (APA 6th does not distinguish).
- DOI format: Use doi: prefix (no URL): doi:10.xxxx/xxxxx
- URLs: Use "Retrieved from https://..." (not bare URL, no access date unless content changes frequently).

### In-text citation format:
- (Author, Year) or Author (Year)
- 3–5 authors first cite: (Smith, Jones, & Brown, 2018); subsequent: (Smith et al., 2018)
- 6+ authors: (Smith et al., 2018) from first citation
- Direct quotes: (Author, Year, p. XX)

### Block quotes:
- 40+ words → indented block quote, no quotation marks, page number in parenthetical after terminal punctuation.

### References (title: "References"):
- Alphabetical by first author surname. No numbers.
- Hanging indent (0.5 in).
- Journal: Author, A. B., & Jones, C. D. (Year). Title of article. *Journal Name*, *Volume*(Issue), pp–pp. doi:10.xxxx/xxxxx
- No DOI available: Retrieved from https://specific-url
- Book: Author, A. B. (Year). *Title of Book*. Publisher.
${CITATION_INTEGRITY}`,
  },

  "MLA 9th": {
    id: "MLA 9th",
    name: "MLA (9th Edition)",
    description: "Author-page style for Literature, Languages, and Humanities.",
    disciplines: ["literature", "english", "languages", "film", "cultural studies", "linguistics", "philosophy", "history of art"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "top-right",
      runningHead: false,
      h1Alignment: "left", h1Bold: false, h2Italic: false, h3Italic: false,
      referenceListTitle: "Works Cited",
      blockQuoteWordThreshold: 50, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## MLA 9th REFERENCING — STRICT RULES

### Heading style:
- MLA does not prescribe specific heading levels. Use clear, consistent headings.
- Title Case for all headings.

### In-text citation format:
- Author-page (NO year): (Smith 45) or Smith argues (45)
- Two authors: (Smith and Jones 45)
- Three or more authors: (Smith et al. 45)
- No author: (Short Title 45) or full title if short enough
- Do NOT include year in in-text citations.

### Block quotes:
- 4+ lines of prose or 3+ lines of poetry → indented block quote (1 inch from left margin). No quotation marks. Parenthetical citation AFTER terminal punctuation.

### Works Cited (title: "Works Cited"):
- Alphabetical by author surname. No numbers. Hanging indent.
- Journal: Author, First. "Article Title." *Journal*, vol. X, no. Y, Year, pp. ZZ–ZZ. DOI or URL. Accessed {DATE}.
- Book: Author, First. *Book Title*. Publisher, Year.
- Website: Author, First. "Page Title." *Site Name*, Date, URL. Accessed {DATE}.
- Note: MLA 9th uses "Accessed" date for all web sources.
${CITATION_INTEGRITY}`,
  },

  "Chicago (Author-Date)": {
    id: "Chicago (Author-Date)",
    name: "Chicago (Author-Date)",
    description: "Author-date variant of Chicago used in Sciences and Social Sciences.",
    disciplines: ["political science", "economics", "anthropology", "archaeology", "environmental science", "geography"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "center", h1Bold: false, h2Italic: false, h3Italic: false,
      referenceListTitle: "Bibliography",
      blockQuoteWordThreshold: 100, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## CHICAGO AUTHOR-DATE REFERENCING — STRICT RULES

### Heading style:
- Title Case. Level 1 headings centred; lower levels left-aligned.

### In-text citation format:
- Author-year-page: (Smith 2021, 45) or Smith (2021) argues…
- Two authors: (Smith and Jones 2021) — use "and" NOT "&"
- Three authors (first cite): (Smith, Jones, and Brown 2021); subsequent: (Smith et al. 2021)
- Four or more authors: (Smith et al. 2021) from first cite
- Multiple citations: (Brown 2020; Smith 2021) — alphabetical, semicolons
- Direct quotes must include page number: (Smith 2021, 45)

### Block quotes:
- 100+ words → indented block quote (0.5 in each side). No quotation marks. Citation after terminal punctuation.

### Bibliography (title: "Bibliography"):
- Alphabetical by first author surname. No numbers. Hanging indent.
- Journal: Author, First. Year. "Article Title." *Journal* Volume (Issue): pages. https://doi-or-url.
- Book: Author, First. Year. *Book Title*. Place: Publisher.
- Website: Author, First. Year. "Page Title." Site Name. Accessed {DATE}. https://specific-url.
${CITATION_INTEGRITY}`,
  },

  "Chicago (Notes-Bibliography)": {
    id: "Chicago (Notes-Bibliography)",
    name: "Chicago (Notes-Bibliography)",
    description: "Footnote/endnote variant of Chicago — standard for History, Arts, and Humanities.",
    disciplines: ["history", "art history", "music", "religion", "theology", "classics", "philosophy", "cultural studies", "architecture"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "center", h1Bold: false, h2Italic: false, h3Italic: false,
      referenceListTitle: "Bibliography",
      blockQuoteWordThreshold: 100, blockQuoteIndentTwips: 720,
      usesFootnotes: true,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## CHICAGO NOTES-BIBLIOGRAPHY REFERENCING — STRICT RULES

### Heading style:
- Title Case. Level 1 headings centred; lower levels left-aligned.

### CRITICAL — FOOTNOTE RULE:
You MUST use Markdown footnotes for ALL citations. There are NO parenthetical citations in this style.

**How to write footnotes:**
1. Insert a superscript-style footnote marker immediately after the punctuation: text ends here.[^1]
2. At the BOTTOM of the document, write the full footnote definition:
   [^1]: Firstname Lastname, *Title of Book* (City: Publisher, Year), Page.

**First full citation format:**
- Book: [^N]: Firstname Lastname, *Title of Book* (City: Publisher, Year), Page.
- Journal: [^N]: Firstname Lastname, "Article Title," *Journal Name* Volume, no. Issue (Year): Page.
- Website: [^N]: Firstname Lastname, "Page Title," Site Name, accessed {DATE}, https://specific-url.

**Subsequent citations to same source (use short form):**
- [^N]: Lastname, *Short Title*, Page.
- If immediately following the same source: [^N]: Ibid., Page. (or just "Ibid." if same page)

**Rules:**
- Every claim requiring attribution gets a footnote number in the text.
- Same source appearing again uses short-form or Ibid. — never repeat the full citation.
- Do NOT use author-date parenthetical citations anywhere in the text.

### Block quotes:
- 100+ words → indented block quote (0.5 in each side). Footnote number after terminal punctuation.

### Bibliography (title: "Bibliography"):
- Alphabetical by author surname. No numbers. Hanging indent.
- Different format from footnotes — surname first:
  Lastname, Firstname. *Title of Book*. City: Publisher, Year.
  Lastname, Firstname. "Article Title." *Journal Name* Volume, no. Issue (Year): Pages.
  Lastname, Firstname. "Page Title." Site Name. Accessed {DATE}. https://specific-url.
${CITATION_INTEGRITY}`,
  },

  "Vancouver": {
    id: "Vancouver",
    name: "Vancouver",
    description: "Numbered citation style standard in Medicine and Health Sciences.",
    disciplines: ["medicine", "dentistry", "pharmacy", "physiotherapy", "medical science", "health sciences", "biomedical", "clinical"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: false,
      referenceListTitle: "References",
      blockQuoteWordThreshold: 40, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "sentence",
      numberReferences: true,
    },
    aiPrompt: `## VANCOUVER REFERENCING — STRICT RULES

### In-text citation format:
- Number ALL citations in ORDER OF FIRST APPEARANCE: [1], [2], [3]…
- Use square brackets consistently throughout. Do NOT use superscript (write [1] not ¹).
- Same source cited again = same number: "As shown in previous work [1], and confirmed by [3]…"
- Multiple sources: [1,3] or [1–4] for a range.

### Block quotes:
- 40+ words → indented block quote with citation number after terminal punctuation.

### References (title: "References"):
- NUMBERED in order of first citation appearance (NOT alphabetical).
- Abbreviate journal names (e.g., N Engl J Med, Lancet, BMJ).
- Journal: 1. Author AB, Author CD. Title of article. Journal Abbrev. Year;Volume(Issue):pages.
- Book: 2. Author EF. Title of Book. Place: Publisher; Year.
- Website: 3. Author GH. Title of page [Internet]. Year [cited {DATE}]. Available from: https://specific-url
- List ALL authors (up to 6); if more than 6: first 6 authors, then "et al."
${CITATION_INTEGRITY}`,
  },

  "IEEE": {
    id: "IEEE",
    name: "IEEE",
    description: "Numbered citation style standard in Engineering and Computer Science.",
    disciplines: ["engineering", "computer science", "electrical engineering", "mechanical engineering", "software engineering", "information technology", "telecommunications", "robotics"],
    docx: {
      lineSpacing: 240,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: false,
      referenceListTitle: "References",
      blockQuoteWordThreshold: 40, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: true,
    },
    aiPrompt: `## IEEE REFERENCING — STRICT RULES

### In-text citation format:
- Number ALL citations in ORDER OF FIRST APPEARANCE using square brackets: [1], [2], [3]
- Same source = same number throughout the entire document.
- Multiple at once: [1], [2], [3] or [1]–[3] for consecutive.
- Citation precedes final punctuation: "…shown in the literature [1]."

### References (title: "References"):
- NUMBERED in order of first citation (NOT alphabetical).
- Journal: [1] A. B. Author and C. D. Author, "Title of article," *Journal Name*, vol. X, no. Y, pp. ZZ–ZZ, Mon. Year.
- Book: [2] A. B. Author, *Title of Book*. City, Country: Publisher, Year.
- Conference: [3] A. B. Author, "Title of paper," in *Proc. Conf. Name*, City, Country, Year, pp. ZZ–ZZ.
- Website: [4] A. B. Author. (Year). Title. [Online]. Available: https://specific-url. [Accessed: {DATE}]
- Use abbreviated first names (initials only). Abbreviate month names (Jan., Feb., Mar., etc.).
${CITATION_INTEGRITY}`,
  },

  "OSCOLA": {
    id: "OSCOLA",
    name: "OSCOLA",
    description: "Oxford Standard for Citation of Legal Authorities — UK Law.",
    disciplines: ["law", "legal studies", "criminology", "international law", "human rights law"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: false,
      referenceListTitle: "Bibliography",
      blockQuoteWordThreshold: 50, blockQuoteIndentTwips: 720,
      usesFootnotes: true,
      headingCase: "sentence",
      numberReferences: false,
    },
    aiPrompt: `## OSCOLA REFERENCING — STRICT RULES

### CRITICAL — FOOTNOTE RULE:
All citations use footnotes. There are NO parenthetical author-date citations.

**Footnote syntax:**
- Insert marker immediately after the punctuation: text here.[^1]
- At the bottom: [^1]: Full citation in OSCOLA format.

**Subsequent citation to same source:**
- [^N]: ibid (if immediately following, same page).
- [^N]: ibid [page] (immediately following, different page).
- [^N]: Lastname, *Short Title* (Year) [page]. (short form for non-consecutive repeat)

**Citation formats:**
- Journal article: [^1]: Firstname Lastname, 'Article Title' (Year) Volume(Issue) Journal Abbreviation First-page, Pinpoint-page.
- Book: [^1]: Firstname Lastname, *Title* (Edition, Publisher Year) Pinpoint-page.
- Case: *Case Name* [Year] Court Abbreviation Report page.
  e.g.: *Donoghue v Stevenson* [1932] AC 562.
- Legislation: Legislation Title Year (jurisdiction if not UK).
  e.g.: Human Rights Act 1998.
- EU material: Council Regulation (EC) No 44/2001 [Year] OJ L reference.
- Online: Firstname Lastname, 'Page Title' (*Website Name*, Date) <https://specific-url> accessed {DATE}.

### Bibliography (title: "Bibliography"):
- Separate sections: Primary Sources (Cases, Legislation), Secondary Sources (Books, Articles, Other).
- Secondary sources: Lastname, Firstname, *Title* (Edition, Publisher Year).
- Journal: Lastname, Firstname, 'Article Title' (Year) Vol(Issue) Journal First-page.
${CITATION_INTEGRITY}`,
  },

  "AGLC 4": {
    id: "AGLC 4",
    name: "AGLC 4",
    description: "Australian Guide to Legal Citation (4th ed.) — Australian and NZ Law.",
    disciplines: ["law", "legal studies", "australian law", "new zealand law", "international law"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: false,
      referenceListTitle: "Bibliography",
      blockQuoteWordThreshold: 50, blockQuoteIndentTwips: 720,
      usesFootnotes: true,
      headingCase: "sentence",
      numberReferences: false,
    },
    aiPrompt: `## AGLC 4 REFERENCING — STRICT RULES (Australian Guide to Legal Citation, 4th ed.)

### CRITICAL — FOOTNOTE RULE:
All citations use footnotes. There are NO parenthetical in-text citations.

**Footnote syntax:**
- Insert marker after the punctuation: text here.[^1]
- At the bottom: [^1]: Full AGLC citation.

**Subsequent citations:**
- [^N]: ibid (immediately following, same pinpoint).
- [^N]: ibid [pinpoint] (immediately following, different pinpoint).
- [^N]: Lastname, above n [original footnote number], [pinpoint]. (non-consecutive repeat)

**Cases (Australian):**
[^1]: *Case Name* (Year) Volume Report First-page, Pinpoint.
e.g.: [^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 69 (Brennan J).

**Legislation (Australian):**
[^N]: *Legislation Title* Year (jurisdiction abbreviation) s X.
e.g.: [^N]: *Corporations Act* 2001 (Cth) s 9.

**Journal article:**
[^N]: Firstname Lastname, 'Article Title' (Year) Volume(Issue) *Journal Name* First-page, Pinpoint.

**Book:**
[^N]: Firstname Lastname, *Book Title* (Publisher, Edition Year) Pinpoint.

**Online:**
[^N]: Firstname Lastname, 'Page Title' (*Site Name*, Date) <https://specific-url> accessed {DATE}.

### Bibliography (title: "Bibliography"):
- Separate sections: Cases, Legislation, Journal Articles, Books, Other.
- Cases: *Case Name* (Year) Volume Report First-page.
- Legislation: *Legislation Title* Year (Jurisdiction).
- Articles: Lastname, Firstname, 'Article Title' (Year) Volume(Issue) *Journal* First-page.
- Books: Lastname, Firstname, *Book Title* (Publisher, Edition Year).
${CITATION_INTEGRITY}`,
  },

  "AMA": {
    id: "AMA",
    name: "AMA",
    description: "American Medical Association — used in Medical journals and US Health Sciences.",
    disciplines: ["medicine", "surgery", "public health", "dentistry", "nursing", "pharmacology", "biomedical research"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "left", h1Bold: true, h2Italic: false, h3Italic: false,
      referenceListTitle: "References",
      blockQuoteWordThreshold: 40, blockQuoteIndentTwips: 720,
      usesFootnotes: false,
      headingCase: "title",
      numberReferences: true,
    },
    aiPrompt: `## AMA REFERENCING — STRICT RULES (American Medical Association)

### In-text citation format:
- Number citations in ORDER OF FIRST APPEARANCE using superscript format: write as [1] (since markdown has no superscript, use [N] consistently).
- Same source cited again = same number.
- Multiple at once: [1,2] or [1-3] for consecutive range.

### References (title: "References"):
- NUMBERED in order of first appearance (NOT alphabetical).
- List ALL authors up to 6; if 7 or more: first 3 authors, then "et al."
- Abbreviate journal names per NLM (e.g., N Engl J Med, JAMA, BMJ, Lancet).
- Journal: 1. Author AB, Author CD, Author EF. Title of article. *Journal Abbrev*. Year;Volume(Issue):pages. doi:10.xxxx/xxxxx
- Book: 2. Author AB, Author CD. *Title of Book*. Publisher; Year.
- Chapter in book: 3. Author AB. Chapter title. In: Editor CD, ed. *Book Title*. Publisher; Year:pages.
- Website: 4. Author AB. Title of page. Site Name. Published/Updated Date. Accessed {DATE}. https://specific-url
- Note: Use en dash (–) for page ranges. Use semicolon between year and volume for journals.
${CITATION_INTEGRITY}`,
  },

  "Turabian": {
    id: "Turabian",
    name: "Turabian",
    description: "A simplified version of Chicago used in undergraduate papers and theses — footnote or author-date variant.",
    disciplines: ["history", "humanities", "religious studies", "classics", "theology", "philosophy", "social sciences"],
    docx: {
      lineSpacing: 480,
      marginTop: 1440, marginLeft: 1440, marginRight: 1440, marginBottom: 1440,
      pageNumberPosition: "bottom-center",
      runningHead: false,
      h1Alignment: "center", h1Bold: false, h2Italic: false, h3Italic: false,
      referenceListTitle: "Bibliography",
      blockQuoteWordThreshold: 100, blockQuoteIndentTwips: 720,
      usesFootnotes: true,
      headingCase: "title",
      numberReferences: false,
    },
    aiPrompt: `## TURABIAN REFERENCING — STRICT RULES (Notes-Bibliography variant)

Turabian is a student-oriented adaptation of Chicago Manual of Style (Notes-Bibliography).

### CRITICAL — FOOTNOTE RULE:
Use Markdown footnotes for all citations. No parenthetical author-date citations.

**Footnote syntax:**
- In text: text ends here.[^1]
- At bottom: [^1]: Full Turabian citation.

**Subsequent citations (short form):**
- Ibid. for immediately repeated source (same page): [^N]: Ibid.
- Ibid., [page] for same source, different page: [^N]: Ibid., 47.
- Short form for non-consecutive: [^N]: Lastname, *Short Title*, Page.

**First footnote — full citation:**
- Book: [^1]: Firstname Lastname, *Title of Book* (City: Publisher, Year), Page.
- Journal: [^1]: Firstname Lastname, "Article Title," *Journal Name* Volume, no. Issue (Year): Page.
- Edited volume: [^1]: Firstname Lastname, "Chapter Title," in *Book Title*, ed. Editor Name (City: Publisher, Year), Page.
- Website: [^1]: Firstname Lastname, "Page Title," Site Name, Date, https://specific-url, accessed {DATE}.

### Block quotes:
- 100+ words or 8+ lines → indented block quote (0.5 in from each side). No quotation marks.

### Bibliography (title: "Bibliography"):
- Alphabetical by surname. Hanging indent. Surname-first format.
- Book: Lastname, Firstname. *Title of Book*. City: Publisher, Year.
- Journal: Lastname, Firstname. "Article Title." *Journal Name* Volume, no. Issue (Year): Pages.
- Website: Lastname, Firstname. "Page Title." Site Name. Date. https://specific-url. Accessed {DATE}.
${CITATION_INTEGRITY}`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the AI prompt block for the given citation style. Falls back to Harvard. */
export function getCitationStylePrompt(style: string, currentDate = ""): string {
  const def = CITATION_STYLE_LIBRARY[style] ?? CITATION_STYLE_LIBRARY["Harvard"];
  const dateStr = currentDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return def.aiPrompt.replace(/\{DATE\}/g, dateStr);
}

/** Returns DOCX formatting rules for the given citation style. Falls back to Harvard. */
export function getCitationStyleDocx(style: string): DocxStyleRules {
  return (CITATION_STYLE_LIBRARY[style] ?? CITATION_STYLE_LIBRARY["Harvard"]).docx;
}

/** Infers the most likely citation style for a given field of study string.
 *  Returns null if no confident match (let user choose).
 */
export function inferCitationStyle(fieldOfStudy: string): string | null {
  if (!fieldOfStudy) return null;
  const f = fieldOfStudy.toLowerCase();

  // Exact discipline matches first
  for (const [id, def] of Object.entries(CITATION_STYLE_LIBRARY)) {
    if (def.disciplines.some(d => f.includes(d))) {
      return id;
    }
  }

  // Broader keyword fallback
  if (/law|legal|juridical|juris|llb|llm/.test(f)) return "OSCOLA";
  if (/medicine|medical|clinical|health|nursing|pharma/.test(f)) return "Vancouver";
  if (/engineer|computing|software|it\b|information tech/.test(f)) return "IEEE";
  if (/psych|counsel|social work/.test(f)) return "APA 7th";
  if (/history|art|music|theolog|religio|classic|philosophi/.test(f)) return "Chicago (Notes-Bibliography)";
  if (/literature|english|language|linguist|film/.test(f)) return "MLA 9th";
  if (/business|management|marketing|econom|finance|account/.test(f)) return "Harvard";

  return null;
}

/** Returns the ordered list of style options for dropdowns. */
export function getCitationStyleDropdownOptions(): { id: string; label: string; description: string }[] {
  return Object.values(CITATION_STYLE_LIBRARY).map(s => ({
    id: s.id,
    label: s.name,
    description: s.description,
  }));
}
