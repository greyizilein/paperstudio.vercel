// Inline humaniser — single Gemini Flash call per section.
// Used by generate-chapter (section-by-section, before SSE emission) and
// czar-chat (post-drain, before done event).
// Always falls back to original text on any error — never blocks generation.

const HUMANISE_GATEWAY =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const HUMANISE_MODEL = "gemini-2.5-flash";
const HUMANISE_TIMEOUT_MS = 45_000;

const HUMANISE_SYSTEM = `You are an expert academic editor whose sole job is rewriting AI-generated academic text so it scores 0% on AI-detection tools (GPTZero, Winston AI, Turnitin).

MANDATORY RHYTHM — enforce at paragraph level:
• At least one sentence ≤ 8 words per paragraph (short declarative or pivot)
• At least one sentence ≥ 30 words per paragraph (long analytical with embedded clauses)
• Never three consecutive sentences within 5 words of each other in length
• Vary sentence openers: evidence-first, concessive, subordinate clause, main-claim-first

REMOVE every instance of these AI fingerprints and replace with natural alternatives:
"Furthermore," / "Moreover," / "Additionally," / "In addition,"
"It is important to note that" / "It is worth noting that"
"This demonstrates" / "This highlights" / "This underscores" / "This suggests" / "This illustrates"
"In today's world" / "In today's fast-paced" / "In recent years" / "In the modern era"
"plays a crucial role" / "plays an important role" / "plays a key role"
"This report will" / "This study will" / "This essay will" / "This section will"
"a wide range of" / "a variety of" / "a number of"

BANNED PARAGRAPH CLOSERS — rewrite any paragraph ending with:
"remains crucial/essential/fundamental to X"
"is therefore of great importance"
"cementing its place as" / "cementing its position"
Any sentence that restates the paragraph's opening claim

PRESERVE exactly — character for character:
• All citations: (Author, Year) / (Author et al., Year) / [1] — never alter
• All markdown headings: ## Heading or ### Subheading — keep exactly
• All statistics, percentages, sample sizes, p-values, dates, monetary figures
• All direct quotes inside quotation marks
• All proper nouns, brand names, organisation names

ADD naturally where absent:
• One short declarative (≤8 words) per paragraph
• One natural pivot per section: "But," / "Yet," / "Still," at sentence start
• One precise, slightly unexpected word per major section (avoids AI's predictable vocabulary)

Output ONLY the rewritten text. No preamble, no "Here is the rewritten version", no commentary.`;

export async function inlineHumaniseSection(
  text: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!apiKey || !text.trim() || text.trim().length < 100) return text;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HUMANISE_TIMEOUT_MS);
  // Propagate caller's signal into our controller
  if (signal) signal.addEventListener("abort", () => abort.abort(), { once: true });

  try {
    const wordCount = text.split(/\s+/).length;
    const maxTokens = Math.min(16000, Math.ceil(wordCount * 1.5) + 600);

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
      console.warn("[inlineHumaniseSection] failed — using original:", msg.slice(0, 120));
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
// Buffers delta text until H2 section boundaries, humanises each section,
// then re-emits as SSE. The caller (and any downstream like teeAndPersistChapterStream)
// sees only the humanised text — no visible replacement.
//
// Section boundary: "\n\n## " (blank line + H2 heading).
// References/Bibliography sections are forwarded unchanged.
// Sections under 200 chars are forwarded unchanged (e.g. very short preambles).
export function humaniseSectionStream(upstream: Response, apiKey: string): Response {
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let lineBuf = "";   // raw SSE line buffer
      let textAccum = ""; // accumulated delta text waiting for next boundary

      async function flushSection(text: string): Promise<void> {
        if (!text) return;
        const isRef = /^#+\s*(References|Bibliography|Works Cited)\b/im.test(text);
        if (isRef || text.trim().length < 200) {
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

            // Forward non-data lines (event: thinking etc.) directly
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
              const choices = parsed?.choices as Array<{ delta?: { content?: string; type?: string; thinking?: string } }> | undefined;
              const delta = choices?.[0]?.delta;

              // Forward thinking events directly
              if (delta?.type === "thinking_delta" || delta?.thinking) {
                try { controller.enqueue(ENC.encode(`data: ${json}\n\n`)); } catch { /* closed */ }
                continue;
              }

              const content = delta?.content;
              if (typeof content !== "string") continue;

              textAccum += content;

              // Split on H2 section boundaries (double newline before ## heading)
              let boundaryIdx: number;
              while ((boundaryIdx = textAccum.indexOf("\n\n## ", 40)) !== -1) {
                const section = textAccum.slice(0, boundaryIdx + 2); // keep trailing \n\n
                textAccum = textAccum.slice(boundaryIdx + 2);        // remainder starts at ##
                await flushSection(section);
              }
            } catch { /* malformed JSON — skip */ }
          }
        }

        // Flush final section (no trailing boundary)
        if (textAccum.trim()) {
          await flushSection(textAccum);
        }
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
