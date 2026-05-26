// Bibliographic engine — validates against user-provided BibTeX/Zotero data.

export interface BibEntry {
  id: string;
  author: string;
  year: string;
  title: string;
  journal?: string;
  volume?: string;
  pages?: string;
  doi?: string;
}

export function parseBibTex(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryRegex = /@\w+\{([^,]+),([\s\S]*?)\n\}/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const id = match[1].trim();
    const fields = match[2];

    const field = (name: string): string => {
      const m = new RegExp(`${name}\\s*=\\s*\\{([^}]+)\\}`, "i").exec(fields);
      return m ? m[1].trim() : "";
    };

    const author = field("author");
    const year = field("year");
    const title = field("title");
    if (!author || !year || !title) continue;

    entries.push({
      id,
      author,
      year,
      title,
      journal: field("journal") || field("booktitle"),
      volume: field("volume"),
      pages: field("pages"),
      doi: field("doi"),
    });
  }

  return entries;
}

export function buildBibliographyContext(entries: BibEntry[]): string {
  if (entries.length === 0) return "";
  return (
    "\n\n=== VERIFIED ACADEMIC SOURCES (PRIORITISE THESE) ===\n" +
    entries.map((e) => `[${e.id}] ${e.author} (${e.year}) — "${e.title}"`).join("\n") +
    "\n=== END VERIFIED SOURCES ===\n"
  );
}

export function formatBibEntryHarvard(entry: BibEntry): string {
  const surnames = entry.author
    .split(" and ")
    .map((a) => {
      const parts = a.split(",");
      return parts[0].trim() + (parts[1] ? `, ${parts[1].trim().charAt(0)}.` : "");
    })
    .join(", ");
  let ref = `${surnames} (${entry.year}) '${entry.title}'`;
  if (entry.journal) ref += `, *${entry.journal}*`;
  if (entry.volume) ref += `, ${entry.volume}`;
  if (entry.pages) ref += `, pp. ${entry.pages}`;
  if (entry.doi) ref += `. doi: ${entry.doi}`;
  return ref + ".";
}
