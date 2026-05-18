// Inline humaniser — single Gemini Flash call combining the objectives of
// the 5-stage academic humanisation pipeline into one pass:
//   Stage 1: Structure Break (syntactic variety)
//   Stage 2: Citation Texture (vary integration patterns)
//   Stage 3: Human Fingerprints (hedges, concessions, short punchy sentences)
//   Stage 4: Paragraph Rhythm (length variation, non-preview topic sentences)
//   Stage 5: Surface Polish (remove remaining AI tells)
//
// Falls back to original text on ANY error — never blocks generation.

const HUMANISE_GATEWAY =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const HUMANISE_MODEL = "gemini-2.5-flash";
const HUMANISE_TIMEOUT_MS = 25_000;
const HUMANISE_MAX_WORDS = 1_200; // skip if section is too large — always falls back

const HUMANISE_SYSTEM = `You are an academic humanisation engine. Your sole job is to rewrite the text so it reads as genuine human scholarship and scores 0% on AI-detection tools (GPTZero, Winston AI, Turnitin). Apply all five transformations in a single pass:

━━ STAGE 1 — STRUCTURE BREAK ━━
Vary every sentence opener so NO TWO consecutive sentences share the same syntactic structure at their opening. Mix:
• Prepositional phrases: "In care settings…", "Among the factors…"
• Participial phrases: "Drawing on three longitudinal studies…"
• Subordinate clauses: "Where practitioners fail to…"
• Short declarators: "This matters." / "The stakes are real."
• Mid-sentence pivots using: however, yet, that said, still, even so
Break any sentence longer than 45 words into two — but never two short sentences in a row without a longer one following.

━━ STAGE 2 — CITATION TEXTURE ━━
The pattern "Author (Year) verb that [claim]" must NOT appear more than once per paragraph. Replace with:
• Claim first: "…outcomes worsen under delayed intervention (Smith, 2021)."
• Study summary: "A 2020 Cochrane review of 34 trials found that…"
• Named without verb: "As Jones and Ali (2020) noted, the picture is more complex."
• Mid-sentence dash insertion: "…care models — which Rietman et al. (2022) found structurally inadequate — continue to…"
• Passive attribution: "It has been argued (Thompson, 2016) that…"
DO NOT change citation content — only the syntactic integration.

━━ STAGE 3 — HUMAN FINGERPRINTS ━━
Each of the following must appear at least twice across the text:
• HEDGES: Replace confident assertions — "may", "tends to", "in many cases", "often", "can suggest"
• SELF-COMMENTARY: "This matters because…", "What this reveals is…", "The implication here is…"
• CONCESSIONS: "Even so,", "This does not mean…", "Even well-intentioned practitioners…", "It would be wrong to suggest…"
• SHORT PUNCHY INTERRUPTIONS: Insert 1–2 sentences of under 10 words among dense paragraphs — "This is not a minor concern.", "The evidence here is unambiguous.", "Timing, in other words, is structural."

━━ STAGE 4 — PARAGRAPH RHYTHM ━━
• At least one paragraph must be noticeably short (2–3 sentences)
• At least one must be long and dense
• At least 2 paragraph topic sentences must open with a challenge, pivot, or concession — NOT a preview of what follows:
  ✓ "This assumption deserves scrutiny."
  ✓ "Yet the structural problem runs deeper."
  ✓ "It would be wrong to overstate the case."
  ✗ "This section will examine…"

━━ STAGE 5 — SURFACE POLISH ━━
REMOVE every instance of:
⛔ "Furthermore," / "Moreover," / "Additionally," / "In addition,"
⛔ "It is important to note that" / "It is worth noting" / "It should be noted"
⛔ "This demonstrates" / "This highlights" / "This underscores" / "This illustrates" / "This suggests" as a sentence opener
⛔ "In today's world" / "In today's rapidly changing" / "In recent years, there has been"
⛔ "plays a crucial role" / "plays a key role" / "plays an important role"
⛔ "This report will…" / "This essay will…" / "This section will…"
⛔ "a wide range of" / "a variety of" — replace with specifics
⛔ Balanced three-part lists "X, Y, and Z" — break one up naturally

BANNED PARAGRAPH CLOSERS — rewrite any paragraph ending with:
⛔ "remains crucial/essential/fundamental to X"
⛔ "is therefore of great importance"
⛔ "cementing its place as" / "cementing its niche"
⛔ Any sentence restating the paragraph's opening claim

PRESERVE exactly — character for character:
• All citations: (Author, Year) / (Author et al., Year) — never alter
• All markdown headings: ## and ### — preserve exactly
• All statistics, percentages, figures, sample sizes, dates
• All direct quotes inside quotation marks
• All proper nouns, organisation names

OUTPUT: The rewritten text only. No preamble. No "Here is the rewritten version". No commentary.`;

export async function inlineHumaniseSection(
  text: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!apiKey || !text.trim()) return text;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // Skip if too large (would timeout) or too small (not worth it)
  if (wordCount > HUMANISE_MAX_WORDS || wordCount < 80) return text;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HUMANISE_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => abort.abort(), { once: true });

  try {
    const maxTokens = Math.min(8000, Math.ceil(wordCount * 1.6) + 400);

    const res = await fetch(HUMANISE_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HUMANISE_MODEL,
        messages: [
          { role: "system", content: HUMANISE_SYSTEM },
          { role: "user", content: text },
        ],
        temperature: 1,
        max_tokens: maxTokens,
      }),
      signal: abort.signal,
    });

    if (!res.ok) {
      console.warn(`[inlineHumaniseSection] gateway ${res.status} — using original`);
      return text;
    }

    const json = await res.json();
    const result: unknown = json?.choices?.[0]?.message?.content;
    if (typeof result === "string" && result.trim().length > 80) {
      return result.trim();
    }
    return text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("abort") && !msg.includes("cancel")) {
      console.warn("[inlineHumaniseSection] failed — using original:", msg.slice(0, 100));
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function encodeSSEDelta(text: string): Uint8Array {
  const oai = { choices: [{ delta: { content: text } }] };
  return ENC.encode(`data: ${JSON.stringify(oai)}\n\n`);
}

// Wraps an upstream SSE Response (OpenAI-compatible delta format).
// Buffers delta text until H2 section boundaries (\n\n## ), humanises each
// completed section with Gemini Flash, then re-emits as SSE. Client and any
// downstream (teeAndPersistChapterStream) only ever see humanised text.
//
// Sections over HUMANISE_MAX_WORDS or matching References/Bibliography are
// forwarded unchanged. Any Gemini error falls back to the original section.
export function humaniseSectionStream(upstream: Response, apiKey: string): Response {
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let lineBuf = "";
      let textAccum = "";

      async function flushSection(text: string): Promise<void> {
        if (!text) return;
        const isRef = /^#+\s*(References|Bibliography|Works Cited)\b/im.test(text);
        if (isRef) {
          try { controller.enqueue(encodeSSEDelta(text)); } catch { /* closed */ }
          return;
        }
        const humanised = await inlineHumaniseSection(text, apiKey);
        try { controller.enqueue(encodeSSEDelta(humanised)); } catch { /* closed */ }
      }

      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuf += DEC.decode(value, { stream: true });
          let nl: number;
          while ((nl = lineBuf.indexOf("\n")) !== -1) {
            const line = lineBuf.slice(0, nl).trimEnd();
            lineBuf = lineBuf.slice(nl + 1);

            if (line.startsWith("event:")) {
              try { controller.enqueue(ENC.encode(line + "\n")); } catch { /* closed */ }
              continue;
            }
            if (!line.startsWith("data:")) continue;

            const json = line.slice(5).trim();

            if (json === "[DONE]") {
              await flushSection(textAccum);
              textAccum = "";
              try { controller.enqueue(ENC.encode("data: [DONE]\n\n")); } catch { /* closed */ }
              break outer;
            }

            try {
              const parsed = JSON.parse(json) as Record<string, unknown>;
              const choices = parsed?.choices as Array<{ delta?: { content?: string; type?: string } }> | undefined;
              const delta = choices?.[0]?.delta;

              if (delta?.type === "thinking_delta") {
                try { controller.enqueue(ENC.encode(`data: ${json}\n\n`)); } catch { /* closed */ }
                continue;
              }

              const content = delta?.content;
              if (typeof content !== "string") continue;

              textAccum += content;

              // Flush at H2 section boundaries
              let boundaryIdx: number;
              while ((boundaryIdx = textAccum.indexOf("\n\n## ", 40)) !== -1) {
                const section = textAccum.slice(0, boundaryIdx + 2);
                textAccum = textAccum.slice(boundaryIdx + 2);
                await flushSection(section);
              }
            } catch { /* malformed JSON */ }
          }
        }

        if (textAccum.trim()) await flushSection(textAccum);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[humaniseSectionStream] error:", msg);
        }
        if (textAccum) {
          try { controller.enqueue(encodeSSEDelta(textAccum)); } catch { /* closed */ }
        }
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
