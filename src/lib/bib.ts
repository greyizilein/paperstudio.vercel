// Bibliographic engine — prioritises local BibTeX sources over web-search results.

export interface BibEntry {
  id: string;
  type: string;
  author: string;
  year: string;
  title: string;
  journal?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  source: string;
}

export function parseBibTex(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryRegex = /@(\w+)\{([^,]+),([\s\S]*?)\n\}/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const type = match[1].toLowerCase();
    const id = match[2].trim();
    const fields = match[3];

    const field = (name: string): string => {
      const m = new RegExp(`${name}\\s*=\\s*\\{([^}]+)\\}`, "i").exec(fields);
      return m ? m[1].trim() : "";
    };

    entries.push({
      id,
      type,
      author: field("author"),
      year: field("year"),
      title: field("title"),
      journal: field("journal") || field("booktitle"),
      volume: field("volume"),
      pages: field("pages"),
      doi: field("doi"),
      source: "Local Library",
    });
  }

  return entries;
}

export function buildBibliographyContext(entries: BibEntry[]): string {
  if (entries.length === 0) return "";
  const lines = entries.map((e) => `[${e.id}] ${e.author} (${e.year}) — ${e.title}`);
  return `\n\nUSE ONLY THESE VERIFIED SOURCES:\n${lines.join("\n")}`;
}

export function formatBibEntryHarvard(entry: BibEntry): string {
  const author = entry.author.includes(",")
    ? entry.author.split(" and ").map((a) => {
        const parts = a.split(",");
        return parts[0].trim() + (parts[1] ? `, ${parts[1].trim().charAt(0)}.` : "");
      }).join(", ")
    : entry.author;
  let ref = `${author} (${entry.year}) '${entry.title}'`;
  if (entry.journal) ref += `, *${entry.journal}*`;
  if (entry.volume) ref += `, ${entry.volume}`;
  if (entry.pages) ref += `, pp. ${entry.pages}`;
  if (entry.doi) ref += `. doi: ${entry.doi}`;
  return ref + ".";
}
