// Bibliographic engine — validates against user-provided BibTeX/Zotero data.

export interface BibEntry {
  id: string;
  author: string;
  year: string;
  title: string;
}

export function parseBibTex(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const regex =
    /@\w+\{([^,]+),\s*author\s*=\s*\{([^}]+)\},\s*year\s*=\s*\{([^}]+)\},\s*title\s*=\s*\{([^}]+)\}/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({ id: match[1], author: match[2], year: match[3], title: match[4] });
  }
  return entries;
}

export function buildBibliographyContext(entries: BibEntry[]): string {
  if (entries.length === 0) return "";
  return (
    "\n\n=== VERIFIED SOURCES (USE THESE) ===\n" +
    entries.map((e) => `[${e.id}] ${e.author} (${e.year}) — "${e.title}"`).join("\n")
  );
}
