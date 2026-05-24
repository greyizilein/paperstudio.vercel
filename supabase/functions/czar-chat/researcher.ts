// researcher.ts — Real academic source discovery and verification for CZAR
// Uses Tavily, Serper Scholar, CrossRef, and Semantic Scholar.

export interface VerifiedSource {
  id: string;           // "S1", "S2", etc.
  authors: string[];    // ["Smith, J.", "Jones, A."]
  year: number | null;
  title: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url: string;
  snippet: string;
  confidence: "verified" | "probable" | "web-only";
}

// ---------------------------------------------------------------------------
// Tavily search
// ---------------------------------------------------------------------------

async function searchTavily(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} academic research`,
        search_depth: "basic",
        max_results: 8,
      }),
      signal,
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.results ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? r.snippet ?? "",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Serper Scholar search
// ---------------------------------------------------------------------------

async function searchSerper(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Array<{ title: string; url: string; snippet: string; publicationInfo?: string }>> {
  try {
    const resp = await fetch("https://google.serper.dev/scholar", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 8 }),
      signal,
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.organic ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.link ?? "",
      snippet: r.snippet ?? "",
      publicationInfo: r.publicationInfo?.summary ?? "",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// CrossRef verification
// ---------------------------------------------------------------------------

async function verifyCrossRef(
  title: string,
): Promise<Partial<VerifiedSource> | null> {
  try {
    const encoded = encodeURIComponent(title.slice(0, 120));
    const resp = await fetch(
      `https://api.crossref.org/works?query.title=${encoded}&rows=1&select=DOI,title,author,published-print,published-online,container-title,volume,issue,page`,
      {
        headers: {
          "User-Agent": "CZAR-PaperStudio/1.0 (mailto:support@paperstudio.app)",
        },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const item = data?.message?.items?.[0];
    if (!item) return null;

    const foundTitle = (item.title?.[0] ?? "").toLowerCase();
    if (titleSimilarity(foundTitle, title.toLowerCase()) < 0.45) return null;

    const authors = (item.author ?? []).slice(0, 6).map((a: any) => {
      const family = a.family ?? "";
      const given = a.given ? `${a.given.charAt(0)}.` : "";
      return [family, given].filter(Boolean).join(", ");
    });

    const year =
      item["published-print"]?.["date-parts"]?.[0]?.[0] ??
      item["published-online"]?.["date-parts"]?.[0]?.[0] ??
      null;

    return {
      authors: authors.length > 0 ? authors : undefined,
      year: typeof year === "number" ? year : null,
      title: item.title?.[0] ?? title,
      journal: item["container-title"]?.[0],
      volume: item.volume,
      issue: item.issue,
      pages: item.page,
      doi: item.DOI,
      url: item.DOI ? `https://doi.org/${item.DOI}` : undefined,
      confidence: "verified" as const,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Semantic Scholar search
// ---------------------------------------------------------------------------

async function searchSemanticScholar(
  query: string,
  signal: AbortSignal,
): Promise<Array<Partial<VerifiedSource>>> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&fields=title,authors,year,journal,externalIds,abstract,venue&limit=5`,
      { signal },
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.data ?? []).map((p: any) => {
      const doi = p.externalIds?.DOI ?? null;
      const authors = (p.authors ?? []).slice(0, 6).map((a: any) => {
        const parts = (a.name ?? "").split(" ");
        if (parts.length < 2) return a.name ?? "";
        const family = parts[parts.length - 1];
        const initial = parts[0].charAt(0) + ".";
        return `${family}, ${initial}`;
      });
      return {
        authors,
        year: p.year ?? null,
        title: p.title ?? "",
        journal: p.journal?.name ?? p.venue ?? undefined,
        volume: p.journal?.volume ?? undefined,
        pages: p.journal?.pages ?? undefined,
        doi: doi ?? undefined,
        url: doi ? `https://doi.org/${doi}` : `https://semanticscholar.org/paper/${p.paperId}`,
        snippet: (p.abstract ?? "").slice(0, 400),
        confidence: doi ? ("probable" as const) : ("web-only" as const),
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function titleSimilarity(a: string, b: string): number {
  const stopWords = new Set(["the", "a", "an", "of", "in", "and", "or", "on", "for", "with", "to"]);
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w)));
  const wA = words(a);
  const wB = words(b);
  if (wA.size === 0 || wB.size === 0) return 0;
  let overlap = 0;
  for (const w of wA) if (wB.has(w)) overlap++;
  return overlap / Math.min(wA.size, wB.size);
}

function parseSerperPublicationInfo(
  summary: string,
): { authors: string[]; journal?: string; year?: number } {
  // Format: "J Smith, A Jones - Journal Name, 2023"
  const dashIdx = summary.indexOf(" - ");
  if (dashIdx === -1) return { authors: [] };

  const authorsPart = summary.slice(0, dashIdx).trim();
  const rest = summary.slice(dashIdx + 3).trim();

  const authors = authorsPart.split(",").map((a) => {
    const parts = a.trim().split(" ");
    if (parts.length >= 2) {
      const family = parts.slice(1).join(" ");
      const initial = parts[0].charAt(0) + ".";
      return `${family}, ${initial}`;
    }
    return a.trim();
  }).filter(Boolean);

  const yearMatch = rest.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
  const journal = rest.replace(/,?\s*\b(19|20)\d{2}\b\s*$/, "").trim() || undefined;

  return { authors, journal, year };
}

function parseWebSource(
  title: string,
  url: string,
  snippet: string,
  publicationInfo?: string,
): Partial<VerifiedSource> {
  let authors: string[] = [];
  let journal: string | undefined;
  let year: number | null = null;

  if (publicationInfo) {
    const parsed = parseSerperPublicationInfo(publicationInfo);
    authors = parsed.authors;
    journal = parsed.journal;
    year = parsed.year ?? null;
  }

  if (!year) {
    const m = (snippet + " " + title).match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0]) : null;
  }

  return { title, url, snippet, authors, journal, year, confidence: "web-only" as const };
}

function dedupKey(s: Partial<VerifiedSource>): string {
  if (s.doi) return `doi:${s.doi.toLowerCase()}`;
  return `title:${(s.title ?? "").toLowerCase().slice(0, 60)}`;
}

// ---------------------------------------------------------------------------
// Main discovery function
// ---------------------------------------------------------------------------

export async function discoverSources(
  queries: string[],
  tavilyKey: string | null,
  serperKey: string | null,
  signal: AbortSignal,
): Promise<VerifiedSource[]> {
  const pool = new Map<string, Partial<VerifiedSource>>();

  const searchPromises: Promise<void>[] = [];
  const uniqueQueries = [...new Set(queries)].slice(0, 5);

  for (const query of uniqueQueries) {
    if (tavilyKey) {
      searchPromises.push(
        searchTavily(query, tavilyKey, signal).then((results) => {
          for (const r of results) {
            const partial = parseWebSource(r.title, r.url, r.snippet);
            const key = dedupKey(partial);
            if (key && !pool.has(key)) pool.set(key, partial);
          }
        }),
      );
    }

    if (serperKey) {
      searchPromises.push(
        searchSerper(query, serperKey, signal).then((results) => {
          for (const r of results) {
            const partial = parseWebSource(r.title, r.url, r.snippet, r.publicationInfo);
            const key = dedupKey(partial);
            if (key && !pool.has(key)) pool.set(key, partial);
          }
        }),
      );
    }

    searchPromises.push(
      searchSemanticScholar(query, signal).then((results) => {
        for (const r of results) {
          const key = dedupKey(r);
          if (key && !pool.has(key)) pool.set(key, r);
        }
      }),
    );
  }

  await Promise.allSettled(searchPromises);

  if (signal.aborted) return [];

  // CrossRef verification for web-only results with decent titles
  const webOnly = [...pool.values()].filter(
    (r) => r.confidence === "web-only" && (r.title?.length ?? 0) > 15,
  );

  const verifyPromises = webOnly.slice(0, 12).map(async (r) => {
    if (!r.title) return;
    const verified = await verifyCrossRef(r.title);
    if (verified?.doi) {
      const key = dedupKey(r);
      const existing = pool.get(key);
      if (existing) {
        pool.set(key, { ...existing, ...verified });
        // Also index by DOI so we don't re-add it later
        pool.set(`doi:${verified.doi!.toLowerCase()}`, { ...existing, ...verified });
      }
    }
  });

  await Promise.allSettled(verifyPromises);

  // Build final ranked list
  const ranked = [...pool.values()]
    .filter((r) => (r.title?.length ?? 0) > 5)
    .sort((a, b) => {
      const order = { verified: 0, probable: 1, "web-only": 2 };
      return (
        (order[a.confidence as keyof typeof order] ?? 2) -
        (order[b.confidence as keyof typeof order] ?? 2)
      );
    });

  // Deduplicate once more by title similarity
  const final: VerifiedSource[] = [];
  let idx = 1;

  for (const s of ranked) {
    if (final.length >= 20) break;
    const isDup = final.some(
      (f) => titleSimilarity(f.title, s.title ?? "") > 0.8,
    );
    if (isDup) continue;

    final.push({
      id: `S${idx}`,
      authors: s.authors ?? [],
      year: s.year ?? null,
      title: s.title ?? "",
      journal: s.journal,
      volume: s.volume,
      issue: s.issue,
      pages: s.pages,
      doi: s.doi,
      url: s.url ?? "",
      snippet: s.snippet ?? "",
      confidence: (s.confidence as "verified" | "probable" | "web-only") ?? "web-only",
    });
    idx++;
  }

  return final;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatAuthorList(authors: string[], format: "inline" | "reference"): string {
  if (authors.length === 0) return "Unknown Author";
  if (format === "inline") {
    // "Smith" / "Smith and Jones" / "Smith et al."
    const surnames = authors.map((a) => a.split(",")[0].trim());
    if (surnames.length === 1) return surnames[0];
    if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`;
    return `${surnames[0]} et al.`;
  }
  // Harvard reference list: all authors up to 6, then et al.
  if (authors.length <= 6) {
    return authors.slice(0, -1).join(", ") + " and " + authors[authors.length - 1];
  }
  return authors.slice(0, 6).join(", ") + " et al.";
}

// Format source for the writer's context block (compact)
export function formatSourceForWriter(s: VerifiedSource): string {
  const authors = formatAuthorList(s.authors, "inline");
  const year = s.year ? ` (${s.year})` : "";
  const journal = s.journal ? ` — *${s.journal}*` : "";
  const doi = s.doi ? ` — doi:${s.doi}` : "";
  return `[${s.id}] ${authors}${year}. "${s.title}"${journal}${doi}`;
}

// Format source for ## References section (Harvard, with live DOI link)
export function formatSourceForReferences(s: VerifiedSource): string {
  const authors = formatAuthorList(s.authors, "reference");
  const year = s.year ? ` (${s.year})` : " (n.d.)";
  const title = s.journal
    ? `'${s.title}'`
    : `*${s.title}*`;
  const journal = s.journal ? `, *${s.journal}*` : "";
  const vol = s.volume ? `, ${s.volume}` : "";
  const issue = s.issue ? `(${s.issue})` : "";
  const pages = s.pages ? `, pp. ${s.pages}` : "";
  const link = s.doi
    ? ` Available at: [https://doi.org/${s.doi}](https://doi.org/${s.doi})`
    : s.url
    ? ` Available at: [${s.url}](${s.url})`
    : "";

  return `${authors}${year} ${title}${journal}${vol}${issue}${pages}.${link}`;
}
