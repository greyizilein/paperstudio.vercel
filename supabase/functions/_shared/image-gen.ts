// Image generation primitives shared between `generate-images` (single-figure
// inline use) and `process-image-job` (batch background worker).
//
// Models are ordered SPEED-first. Edge functions have a ~150s budget; the slow
// Pro model used to time out before any client ever saw the response. Flash
// models finish in ~10-15s and produce pro-quality output. Pro is kept as
// the very last fallback.

const IMAGE_MODELS = [
  "google/gemini-3.1-flash-image-preview", // Nano Banana 2 — fast + pro quality (PRIMARY)
  "google/gemini-2.5-flash-image",          // Nano Banana — fast fallback
  "google/gemini-3-pro-image-preview",      // slow premium — last resort
];

const MODEL_TIMEOUT_MS = 45_000;

export interface AttemptOutcome {
  model: string;
  status: "success" | "failure" | "timeout" | "rate_limited";
  duration_ms: number;
  error?: string;
}

export interface GenerateResult {
  imageUrl: string | null;
  attempts: AttemptOutcome[];
  modelUsed?: string;
}

const PALETTES = [
  "professional academic blue (#1f4e79) and light grey (#d9e2f3) with navy accents",
  "academic teal (#008080) and warm orange (#e07b39) with cream background",
  "deep red (#8b0000) and navy (#001f3f) with light gold accents",
  "forest green (#2d572c) and gold (#b8860b) with ivory background",
  "royal purple (#4b0082) and silver (#c0c0c0) with white background",
  "earth tones: sienna (#a0522d), olive (#808000), and slate (#708090)",
];

export function getScheme(projectTitle: string, colourScheme?: string): string {
  if (colourScheme) return colourScheme;
  const titleHash = projectTitle.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  return PALETTES[titleHash % PALETTES.length];
}

export function buildImagePrompt(title: string, description: string, scheme: string): string {
  return `Create a professional, publication-ready academic chart/figure for a printed dissertation.

Title: "${title}"
Description: ${description}
Colour scheme: ${scheme}

Requirements:
- LAYOUT & SPACING (CRITICAL):
  - The image MUST have a generous white border/margin on ALL four sides (at least 80px padding from every edge)
  - NO text, labels, axes, legends, or any content should touch or overflow beyond the image edges
  - All chart elements must stay within a safe zone that is 85% of the total image area, centered
  - Minimum 40px spacing between the chart title and the top of the chart area
  - Minimum 40px spacing between axis labels and the chart edges
  - Minimum 30px spacing between the legend and any chart elements
  - The legend must be positioned clearly outside the data area (below or to the right) with adequate spacing
  - Axis tick labels must have breathing room — not crowded or overlapping

- DATA ACCURACY (CRITICAL):
  - If the description contains specific numerical data values, percentages, or statistics, you MUST reproduce them EXACTLY in the chart
  - Do not approximate or round numbers. Every data point mentioned must appear precisely as stated
  - Include data value annotations directly on/above bars or data points for precise reading

- VISUAL QUALITY:
  - Clean white background with high contrast elements
  - Clear, readable axis labels with appropriate font size (14pt equivalent minimum)
  - Professional legend positioned to not obscure data
  - Title at the top in bold with clear separation from chart
  - Grid lines should be subtle (light grey, thin)
  - Data points/bars should use the specified colour palette
  - All text must be sharp and legible at 300 DPI print resolution
  - Use proper number formatting on axes (commas for thousands, appropriate decimal places)
  - Include sample size annotation (n=) where applicable
  - Source note at bottom if description mentions a source — with adequate bottom margin
  - Style: suitable for a peer-reviewed journal or doctoral dissertation
  - The overall composition should look clean, spacious, and professionally typeset`;
}

/**
 * Try every model with one retry on 429. Returns the first successful image
 * along with a per-model attempt log so callers can persist diagnostics.
 */
export async function generateImage(prompt: string, apiKey: string, requestId = "anon"): Promise<GenerateResult> {
  const attempts: AttemptOutcome[] = [];

  for (const model of IMAGE_MODELS) {
    let backoffMs = 3000;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
          signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
        });
        const ms = Date.now() - t0;

        if (resp.status === 429 && attempt === 0) {
          attempts.push({ model, status: "rate_limited", duration_ms: ms, error: `429 (retrying in ${backoffMs}ms)` });
          console.warn(`[gimg req=${requestId}] ${model} rate-limited (${ms}ms), retry in ${backoffMs}ms`);
          await new Promise(r => setTimeout(r, backoffMs));
          backoffMs *= 3;
          continue;
        }

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          const short = errText.slice(0, 200);
          attempts.push({ model, status: "failure", duration_ms: ms, error: `HTTP ${resp.status}: ${short}` });
          console.error(`[gimg req=${requestId}] ${model} failed (${resp.status}, ${ms}ms): ${short}`);
          break; // try next model
        }

        const data = await resp.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl && imageUrl.startsWith("data:image/png;base64,")) {
          attempts.push({ model, status: "success", duration_ms: ms });
          console.log(`[gimg req=${requestId}] ${model} ok in ${ms}ms`);
          return { imageUrl, attempts, modelUsed: model };
        }

        attempts.push({ model, status: "failure", duration_ms: ms, error: "no image in response" });
        console.warn(`[gimg req=${requestId}] ${model} returned no image (${ms}ms)`);
        break;
      } catch (err) {
        const ms = Date.now() - t0;
        const isTimeout = (err as Error)?.name === "TimeoutError" || (err as Error)?.name === "AbortError";
        attempts.push({
          model,
          status: isTimeout ? "timeout" : "failure",
          duration_ms: ms,
          error: (err as Error)?.message || String(err),
        });
        console.error(`[gimg req=${requestId}] ${model} ${isTimeout ? "timed out" : "threw"} after ${ms}ms`);
        break;
      }
    }
  }

  return { imageUrl: null, attempts };
}
