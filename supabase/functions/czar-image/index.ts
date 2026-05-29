const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CZAR's visual assistant. Create clear, well-composed images to accompany writing. For academic or educational content: clean white background, clear labels, professional style suitable for a dissertation or report. For creative content: editorial quality, considered composition. No logos unless explicitly requested.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!req.headers.get("Authorization")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt, referenceImage } = (await req.json()) as {
      prompt: string;
      referenceImage?: string;
    };

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_API_KEY missing" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const parts: unknown[] = [
      { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
    ];

    if (referenceImage) {
      const [meta, b64] = referenceImage.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      parts.push({ inlineData: { mimeType, data: b64 } });
    }

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    );

    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("czar-image upstream error", upstream.status, t);
      const msg = upstream.status === 429
        ? "Too many requests. Try again in a moment."
        : "Couldn't generate that image.";
      return new Response(JSON.stringify({ error: msg }), {
        status: upstream.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json() as {
      candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };

    const responseParts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = responseParts.find((p: any) => p.inlineData);
    const imageUrl = imagePart?.inlineData
      ? `data:${imagePart.inlineData.mimeType ?? "image/png"};base64,${imagePart.inlineData.data}`
      : null;
    const text = responseParts.find((p: any) => p.text)?.text ?? "";

    return new Response(JSON.stringify({ imageUrl, text }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("czar-image error", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
