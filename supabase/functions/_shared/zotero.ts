// Zotero API helper — fetches real citations from a user's Zotero library

interface ZoteroItem {
  key: string;
  data: {
    itemType: string;
    title: string;
    creators: Array<{ creatorType: string; firstName?: string; lastName?: string; name?: string }>;
    date?: string;
    publicationTitle?: string;
    journalAbbreviation?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    DOI?: string;
    url?: string;
    publisher?: string;
    place?: string;
    abstractNote?: string;
    tags?: Array<{ tag: string }>;
  };
}

export interface FormattedCitation {
  key: string;
  authors: string;
  year: string;
  title: string;
  source: string;
  doi?: string;
  inText: string; // e.g. "(Smith & Jones, 2021)"
  narrative: string; // e.g. "Smith and Jones (2021)"
  fullReference: string;
}

function formatCreators(creators: ZoteroItem["data"]["creators"]): { short: string; narrative: string; full: string } {
  const authors = creators.filter(c => c.creatorType === "author");
  if (authors.length === 0) return { short: "Unknown", narrative: "Unknown", full: "Unknown" };

  const lastName = (c: typeof authors[0]) => c.lastName || c.name || "Unknown";
  const initials = (c: typeof authors[0]) => c.firstName ? c.firstName.split(/[\s-]/).map(n => n[0] + ".").join("") : "";

  if (authors.length === 1) {
    const name = lastName(authors[0]);
    return { short: name, narrative: name, full: `${lastName(authors[0])}, ${initials(authors[0])}` };
  }
  if (authors.length === 2) {
    return {
      short: `${lastName(authors[0])} & ${lastName(authors[1])}`,
      narrative: `${lastName(authors[0])} and ${lastName(authors[1])}`,
      full: `${lastName(authors[0])}, ${initials(authors[0])} & ${lastName(authors[1])}, ${initials(authors[1])}`,
    };
  }
  return {
    short: `${lastName(authors[0])} et al.`,
    narrative: `${lastName(authors[0])} et al.`,
    full: authors.map((a, i) => `${lastName(a)}, ${initials(a)}${i < authors.length - 1 ? (i === authors.length - 2 ? " & " : ", ") : ""}`).join(""),
  };
}

function extractYear(date?: string): string {
  if (!date) return "n.d.";
  const match = date.match(/(\d{4})/);
  return match ? match[1] : "n.d.";
}

function formatReference(item: ZoteroItem["data"], style: string): string {
  const creators = formatCreators(item.creators || []);
  const year = extractYear(item.date);
  const title = item.title || "Untitled";
  const journal = item.publicationTitle || "";
  const vol = item.volume || "";
  const issue = item.issue || "";
  const pages = item.pages || "";
  const doi = item.DOI ? `https://doi.org/${item.DOI}` : "";
  const publisher = item.publisher || "";

  if (style === "Harvard") {
    if (item.itemType === "journalArticle") {
      return `${creators.full} (${year}) '${title}', ${journal ? `*${journal}*` : ""}${vol ? `, ${vol}` : ""}${issue ? `(${issue})` : ""}${pages ? `, pp. ${pages}` : ""}.${doi ? ` Available at: ${doi}` : ""}`;
    }
    return `${creators.full} (${year}) *${title}*. ${publisher ? `${publisher}.` : ""}${doi ? ` Available at: ${doi}` : ""}`;
  }
  if (style === "APA 7th") {
    if (item.itemType === "journalArticle") {
      return `${creators.full} (${year}). ${title}. *${journal}*${vol ? `, *${vol}*` : ""}${issue ? `(${issue})` : ""}${pages ? `, ${pages}` : ""}.${doi ? ` ${doi}` : ""}`;
    }
    return `${creators.full} (${year}). *${title}*. ${publisher ? `${publisher}.` : ""}${doi ? ` ${doi}` : ""}`;
  }
  // Default fallback
  return `${creators.full} (${year}). ${title}. ${journal || publisher || ""}${doi ? `. ${doi}` : ""}`;
}

export async function fetchZoteroItems(query?: string, limit = 50): Promise<FormattedCitation[]> {
  const apiKey = Deno.env.get("ZOTERO_API_KEY");
  const userId = Deno.env.get("ZOTERO_USER_ID");
  if (!apiKey || !userId) {
    console.error("Zotero credentials not configured");
    return [];
  }

  try {
    let url = `https://api.zotero.org/users/${userId}/items?format=json&limit=${limit}&itemType=-attachment%20||%20-note`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }

    const resp = await fetch(url, {
      headers: { "Zotero-API-Key": apiKey, "Zotero-API-Version": "3" },
    });

    if (!resp.ok) {
      console.error(`Zotero API error: ${resp.status}`);
      return [];
    }

    const items: ZoteroItem[] = await resp.json();

    return items.map(item => {
      const creators = formatCreators(item.data.creators || []);
      const year = extractYear(item.data.date);
      return {
        key: item.key,
        authors: creators.short,
        year,
        title: item.data.title || "Untitled",
        source: item.data.publicationTitle || item.data.publisher || "",
        doi: item.data.DOI,
        inText: `(${creators.short}, ${year})`,
        narrative: `${creators.narrative} (${year})`,
        fullReference: formatReference(item.data, "Harvard"), // default; caller can re-format
      };
    });
  } catch (e) {
    console.error("Zotero fetch error:", e);
    return [];
  }
}

export function formatCitationsForPrompt(citations: FormattedCitation[], style: string): string {
  if (citations.length === 0) return "";
  
  const header = `## REAL CITATIONS FROM ZOTERO LIBRARY
You MUST use these real sources in your writing. These are verified, real academic sources from the user's Zotero library.
Prioritise these over any fabricated citations. Use them where relevant to the topic.
Citation style: ${style}

Available sources (${citations.length} items):`;

  const items = citations.map((c, i) => 
    `${i + 1}. In-text: ${c.inText} | Narrative: ${c.narrative}\n   Title: "${c.title}"\n   Source: ${c.source}${c.doi ? ` | DOI: ${c.doi}` : ""}`
  ).join("\n\n");

  return `${header}\n\n${items}\n\nIMPORTANT: When using these sources, cite them EXACTLY as shown above. You may also generate additional plausible synthetic citations where needed, but prioritise these real sources first.`;
}
