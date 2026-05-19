// Frontend-safe citation style metadata — no Deno imports.
// Mirror of the dropdown data in generate-chapter/citationStyles.ts.
// Used by NewProject.tsx for the style dropdown and auto-inference.

export interface CitationStyleMeta {
  id: string;
  label: string;
  description: string;
  disciplines: string[];
}

export const CITATION_STYLE_METADATA: CitationStyleMeta[] = [
  {
    id: "Harvard",
    label: "Harvard",
    description: "Author-date · UK/Australian Business, Humanities & Social Sciences",
    disciplines: ["business", "management", "marketing", "economics", "sociology", "social science", "education", "health", "nursing", "psychology", "humanities"],
  },
  {
    id: "APA 7th",
    label: "APA (7th Edition)",
    description: "Author-date · Psychology, Education & Social Sciences",
    disciplines: ["psychology", "education", "counselling", "social work", "communication", "neuroscience", "cognitive science"],
  },
  {
    id: "APA 6th",
    label: "APA (6th Edition)",
    description: "Older APA — still required by some institutions (running head, different et al. rules)",
    disciplines: ["psychology", "education", "social work"],
  },
  {
    id: "MLA 9th",
    label: "MLA (9th Edition)",
    description: "Author-page · Literature, Languages & Humanities",
    disciplines: ["literature", "english", "languages", "film", "cultural studies", "linguistics", "philosophy", "history of art"],
  },
  {
    id: "Chicago (Author-Date)",
    label: "Chicago (Author-Date)",
    description: "Author-date · Sciences, Social Sciences & Political Science",
    disciplines: ["political science", "economics", "anthropology", "archaeology", "environmental science", "geography"],
  },
  {
    id: "Chicago (Notes-Bibliography)",
    label: "Chicago (Notes-Bibliography)",
    description: "Footnotes · History, Arts & Humanities",
    disciplines: ["history", "art history", "music", "religion", "theology", "classics", "philosophy", "cultural studies", "architecture"],
  },
  {
    id: "Vancouver",
    label: "Vancouver",
    description: "Numbered · Medicine & Health Sciences",
    disciplines: ["medicine", "dentistry", "pharmacy", "physiotherapy", "medical science", "health sciences", "biomedical", "clinical"],
  },
  {
    id: "IEEE",
    label: "IEEE",
    description: "Numbered · Engineering & Computer Science",
    disciplines: ["engineering", "computer science", "electrical engineering", "mechanical engineering", "software engineering", "information technology", "telecommunications", "robotics"],
  },
  {
    id: "OSCOLA",
    label: "OSCOLA",
    description: "Footnotes · UK Law (Oxford Standard for Citation of Legal Authorities)",
    disciplines: ["law", "legal studies", "criminology", "international law", "human rights law"],
  },
  {
    id: "AGLC 4",
    label: "AGLC 4",
    description: "Footnotes · Australian & NZ Law (Australian Guide to Legal Citation)",
    disciplines: ["law", "legal studies", "australian law", "new zealand law", "international law"],
  },
  {
    id: "AMA",
    label: "AMA",
    description: "Numbered · US Medical Journals (American Medical Association)",
    disciplines: ["medicine", "surgery", "public health", "dentistry", "nursing", "pharmacology", "biomedical research"],
  },
  {
    id: "Turabian",
    label: "Turabian",
    description: "Footnotes · Humanities theses (simplified Chicago)",
    disciplines: ["history", "humanities", "religious studies", "classics", "theology", "philosophy", "social sciences"],
  },
];

/** Returns the citation style ID most likely for a given field of study, or null. */
export function inferCitationStyle(fieldOfStudy: string): string | null {
  if (!fieldOfStudy) return null;
  const f = fieldOfStudy.toLowerCase();

  for (const style of CITATION_STYLE_METADATA) {
    if (style.disciplines.some(d => f.includes(d))) {
      return style.id;
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
