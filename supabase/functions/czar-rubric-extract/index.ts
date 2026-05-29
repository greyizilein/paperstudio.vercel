// czar-rubric-extract — Extract marking criteria from a rubric/brief
// Accepts text or a base64-encoded file (PDF, DOCX, image).
// Returns structured JSON criteria the frontend stores per-conversation.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `You are a marking criteria extraction specialist.
Analyse the provided marking brief, assignment specification, or rubric.
Extract ALL marking criteria into structured JSON.

Return ONLY valid JSON (no markdown fences, no explanation before or after):
{
  "title": "Assignment title if found, else null",
  "total_marks": 100,
  "word_limit": null,
  "submission_format": null,
  "criteria": [
    {
      "category": "Category name — e.g. 'Critical Analysis', 'Structure and Coherence'",
      "weight_percent": 30,
      "description": "What this criterion assesses in 1–2 sentences",
      "distinction": "What a first-class / distinction response looks like",
      "merit": "What a merit / good response looks like",
      "pass": "Minimum requirements for a pass",
      "fail": "Common mistakes that lead to a fail for this criterion"
    }
  ],
  "notes": "Any other requirements, constraints, or special instructions not captured above, or null"
}

Rules:
- If weights are not explicitly stated, distribute them evenly across all criteria.
- If only pass/fail criteria exist (no distinction/merit bands), set those fields to null.
- Capture EVERY criterion — do not merge unless truly identical.
- title, total_marks, word_limit, submission_format, and notes may be null if absent.
- Ensure weight_percent values sum to 100.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  let body: { text?: string; file_base64?: string; filename?: string; mime?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (!body.text && !body.file_base64) {
    return new Response(
      JSON.stringify({ error: "Provide either text or file_base64" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const GOOGLE_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
  if (!GOOGLE_KEY) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  try {
    const parts: any[] = [
      { text: EXTRACTION_PROMPT + "\n\n---\n\nContent to analyse:\n" },
    ];

    if (body.file_base64) {
      const mime = body.mime || "application/pdf";
      parts.push({ inline_data: { mime_type: mime, data: body.file_base64 } });
    } else if (body.text) {
      parts.push({ text: body.text });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({ error: `AI error: ${errText}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip accidental markdown fences
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI output as JSON", raw }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
