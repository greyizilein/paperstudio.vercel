// generate-images — public-facing image API.
//
// Single-figure mode (called inline from Writer/CZAR while the user waits):
//   POST { figureId, figureNumber, title, description, projectTitle, colourScheme? }
//   → 200 { figureId, figureNumber, title, imageUrl, dataUrl }
//
// Batch (ZIP) mode (called from the export modal — multiple figures):
//   POST { figures: [...], projectTitle, colourScheme?, projectId? }
//   → 202 { jobId, status: "queued", total }
//   The actual generation happens in `process-image-job` so we can't time
//   out at 150s. The client polls the `image_jobs` row for completion.
//
// Authenticate with the user's JWT to gate billing/tier and to write the
// job row under their user_id. The background worker uses the service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildImagePrompt,
  generateImage,
  getScheme,
} from "../_shared/image-gen.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SingleFigureRequest {
  figureId: string;
  figureNumber: string;
  title: string;
  description: string;
  projectTitle: string;
  colourScheme?: string;
  /** Optional — when present, the generated PNG is upserted into chapter_figures
   *  so the .docx export embeds it instead of falling back to a grey placeholder.
   *  Required for the "pre-generate on outline tick" flow. */
  chapterId?: string;
}

interface FigureDesc {
  id: string;
  title: string;
  description: string;
  chapterTitle?: string;
  /** Forwarded to the worker so each successful figure is also written to
   *  chapter_figures, keying off (chapter_id, figure_id). */
  chapterId?: string;
  figureNumber?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ── Single figure mode (inline generation during writing) ─────────
    if (body.figureId && body.title && typeof body.description === "string" && body.description.trim().length > 0) {
      const { figureId, figureNumber, title, description, projectTitle, colourScheme, chapterId } = body as SingleFigureRequest;
      // Treat well-known palette names as "default" so getScheme doesn't choke.
      const safeScheme = colourScheme && /^[#a-zA-Z0-9_-]+$/.test(colourScheme) && colourScheme !== "academic" ? colourScheme : undefined;
      const scheme = getScheme(projectTitle || "Dissertation", safeScheme);
      const prompt = buildImagePrompt(title, description, scheme);

      const { imageUrl, attempts, modelUsed } = await generateImage(prompt, LOVABLE_API_KEY, requestId);

      // Persist diagnostics — best-effort, never block the response.
      try {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await sb.from("image_generation_attempts").insert(attempts.map((a) => ({
          user_id: user.id,
          request_id: requestId,
          figure_id: figureId,
          figure_title: title,
          model: a.model,
          status: a.status,
          duration_ms: a.duration_ms,
          error: a.error || null,
        })));
      } catch (logErr) {
        console.warn(`[gimg req=${requestId}] attempt log failed:`, logErr);
      }

      if (imageUrl) {
        if (modelUsed) {
          logAiUsage({
            action: "generate_image",
            model: modelUsed,
            inputText: prompt.slice(0, 200),
            outputTokens: 1000,
          });
        }

        // Pre-generation flow: persist into chapter_figures so the .docx export
        // embeds the real PNG when this figure's marker eventually appears.
        if (chapterId) {
          try {
            const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
            await sb.from("chapter_figures").upsert({
              chapter_id: chapterId,
              user_id: user.id,
              figure_id: figureId,
              figure_number: figureNumber || "",
              title,
              description,
              source_line: "Source: Author's analysis",
              image_data_uri: imageUrl,
            }, { onConflict: "chapter_id,figure_id" });
          } catch (upsertErr) {
            console.warn(`[gimg req=${requestId}] chapter_figures upsert failed:`, upsertErr);
          }
        }

        return new Response(
          JSON.stringify({ figureId, figureNumber, title, imageUrl, dataUrl: imageUrl, requestId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Image generation failed across all models", attempts, requestId }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Batch mode → enqueue and return immediately ───────────────────
    const { figures, projectTitle, colourScheme, projectId } = body as {
      figures: FigureDesc[];
      projectTitle: string;
      colourScheme?: string;
      projectId?: string;
    };

    if (!figures?.length) {
      return new Response(JSON.stringify({ error: "No figures provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the job row using the user's session client so RLS validates ownership.
    const { data: job, error: insErr } = await supabase
      .from("image_jobs")
      .insert({
        user_id: user.id,
        project_id: projectId ?? null,
        figures,
        project_title: projectTitle ?? "Dissertation",
        colour_scheme: colourScheme ?? null,
        status: "queued",
        total: figures.length,
        completed: 0,
        request_id: requestId,
      })
      .select("id")
      .single();

    if (insErr || !job) {
      console.error(`[gimg req=${requestId}] enqueue failed:`, insErr);
      return new Response(JSON.stringify({ error: insErr?.message || "Failed to queue job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger the worker. We use functions.invoke from the service-role client
    // so the call survives this response. The worker runs to completion in
    // the background using EdgeRuntime.waitUntil internally.
    const trigger = (async () => {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await sb.functions.invoke("process-image-job", {
          body: { jobId: job.id },
        });
      } catch (e) {
        console.error(`[gimg req=${requestId}] worker trigger failed:`, e);
      }
    })();

    // Use waitUntil if available so the worker invoke survives the response close.
    // @ts-ignore — EdgeRuntime is a Supabase Edge runtime global.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(trigger);
    } else {
      // Fallback: fire-and-forget. The fetch should still leave the loop.
      trigger.catch(() => {});
    }

    return new Response(
      JSON.stringify({ jobId: job.id, status: "queued", total: figures.length, requestId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[gimg req=${requestId}] error:`, e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
