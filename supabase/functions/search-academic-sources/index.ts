import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AcademicSource {
  title: string;
  authors: string;
  year: string;
  journal: string;
  url: string;
  snippet?: string;
}

const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

// ── Serper Google Scholar ────────────────────────────────────────────────
async function serperScholar(query: string, count: number): Promise<AcademicSource[]> {
  if (!SERPER_API_KEY) return [];
  try {
    const res = await fetch("https://google.serper.dev/scholar", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(count * 2, 20), hl: "en" }),
    });
    if (!res.ok) {
      console.error("Serper scholar error", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    const organic: any[] = data.organic || [];
    return organic.map((r: any) => {
      const text = `${r.title || ""} ${r.snippet || ""} ${r.publicationInfo || ""}`;
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "n.d.";
      const pubInfo: string = r.publicationInfo || r.snippet || "";
      const authorMatch = pubInfo.match(/^([A-Z][a-zA-Z\-']+(?:,?\s+[A-Z]\.?\s*)*(?:,\s*[A-Z][a-zA-Z\-']+(?:,?\s+[A-Z]\.?\s*)*)*)/);
      const authors = authorMatch ? authorMatch[0].replace(/\s*-\s*.*$/, "").trim() : (r.title?.split(":")[0] || "Unknown");
      const journal = r.publication || r.source || (pubInfo.split("-").slice(1).join("-").trim()) || "Academic source";
      return {
        title: r.title || "Untitled",
        authors,
        year,
        journal,
        url: r.link || "",
        snippet: r.snippet || "",
      } as AcademicSource;
    }).filter((s) => s.title && s.title !== "Untitled");
  } catch (e) {
    console.error("serperScholar exception:", e);
    return [];
  }
}

// ── Tavily (academic search mode) ────────────────────────────────────────
async function tavilyAcademic(query: string, count: number): Promise<AcademicSource[]> {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        topic: "general",
        max_results: count,
        include_domains: [
          "scholar.google.com", "arxiv.org", "ssrn.com", "researchgate.net",
          "sciencedirect.com", "springer.com", "wiley.com", "tandfonline.com",
          "sagepub.com", "cambridge.org", "oup.com", "nature.com", "jstor.org",
          "ncbi.nlm.nih.gov", "pubmed.ncbi.nlm.nih.gov", "semanticscholar.org",
          "emerald.com", "informs.org", "ieee.org", "acm.org", "mdpi.com",
        ],
      }),
    });
    if (!res.ok) {
      console.error("Tavily error", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    const results: any[] = data.results || [];
    return results.map((r: any) => {
      const text = `${r.title || ""} ${r.content || ""}`;
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "n.d.";
      const host = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return "Web"; } })();
      return {
        title: r.title || "Untitled",
        authors: "See source",
        year,
        journal: host,
        url: r.url || "",
        snippet: (r.content || "").slice(0, 280),
      } as AcademicSource;
    }).filter((s) => s.title && s.url);
  } catch (e) {
    console.error("tavilyAcademic exception:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { topic, field, degree, count = 12 } = await req.json();
    const degreeLevel = degree?.includes("PhD")
      ? "doctoral thesis"
      : degree?.includes("MSc") || degree?.includes("MA")
      ? "masters dissertation"
      : "undergraduate dissertation";
    const query = `${topic} ${field} peer reviewed journal article academic ${degreeLevel}`;

    // Run Serper + Tavily in parallel
    const [serperResults, tavilyResults] = await Promise.all([
      serperScholar(query, count),
      tavilyAcademic(query, Math.ceil(count / 2)),
    ]);

    // Merge, dedupe by URL/title, prefer Serper (Scholar) ordering
    const seen = new Set<string>();
    const merged: AcademicSource[] = [];
    for (const s of [...serperResults, ...tavilyResults]) {
      const key = (s.url || s.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
      if (merged.length >= count) break;
    }

    return new Response(JSON.stringify({ sources: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-academic-sources error:", e);
    return new Response(JSON.stringify({ sources: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
