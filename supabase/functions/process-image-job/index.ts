// process-image-job — background worker for the image_jobs queue.
//
// Triggered by `generate-images` (batch mode) immediately after a job row
// is inserted. Iterates the figures, calls Gemini for each, updates progress
// after every figure, and writes the final ZIP base64 (or error) into the row.
//
// Uses the service role key to bypass RLS — clients never call this directly.
// Each figure has a 45s per-model timeout; one stuck call cannot poison the
// rest of the batch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildImagePrompt, generateImage, getScheme } from "../_shared/image-gen.ts";
import { buildZipBase64 } from "../_shared/zip-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FigureDesc {
  id: string;
  title: string;
  description: string;
  chapterTitle?: string;
  /** Optional — when present, the worker upserts the result into chapter_figures
   *  so future .docx exports embed the actual PNG instead of a grey placeholder. */
  chapterId?: string;
  /** Optional — used as the figure_number column when upserting (e.g. "4.1"). */
  figureNumber?: string;
}

async function processJob(jobId: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: job, error: fetchErr } = await sb
    .from("image_jobs").select("*").eq("id", jobId).maybeSingle();

  if (fetchErr || !job) {
    console.error(`[worker job=${jobId}] not found:`, fetchErr);
    return;
  }
  if (job.status !== "queued") {
    console.warn(`[worker job=${jobId}] status is "${job.status}", skipping`);
    return;
  }
  if (!LOVABLE_API_KEY) {
    await sb.from("image_jobs")
      .update({ status: "failed", error: "LOVABLE_API_KEY not configured" })
      .eq("id", jobId);
    return;
  }

  const requestId = job.request_id || jobId.slice(0, 8);
  await sb.from("image_jobs").update({ status: "processing" }).eq("id", jobId);

  const figures: FigureDesc[] = Array.isArray(job.figures) ? job.figures : [];
  const scheme = getScheme(job.project_title || "Dissertation", job.colour_scheme || undefined);
  const generatedImages: Array<{ filename: string; title: string; description: string; base64: string }> = [];

  for (let i = 0; i < figures.length; i++) {
    // Honour cancellation — re-read the row before each figure so users can stop a long batch.
    const { data: latest } = await sb.from("image_jobs").select("status").eq("id", jobId).maybeSingle();
    if (latest?.status === "cancelled") {
      console.log(`[worker job=${jobId}] cancelled by user at figure ${i + 1}/${figures.length}`);
      return;
    }

    const fig = figures[i];
    const prompt = buildImagePrompt(fig.title, fig.description, scheme);
    const { imageUrl, attempts } = await generateImage(prompt, LOVABLE_API_KEY, `${requestId}/${i + 1}`);

    // Log attempts for diagnostics
    try {
      await sb.from("image_generation_attempts").insert(attempts.map((a) => ({
        job_id: jobId,
        user_id: job.user_id,
        request_id: requestId,
        figure_id: fig.id,
        figure_title: fig.title,
        model: a.model,
        status: a.status,
        duration_ms: a.duration_ms,
        error: a.error || null,
      })));
    } catch (logErr) {
      console.warn(`[worker job=${jobId}] attempt log failed:`, logErr);
    }

    if (imageUrl) {
      const b64 = imageUrl.replace("data:image/png;base64,", "");
      const safeName = fig.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 60);
      generatedImages.push({
        filename: `${safeName || "figure"}_${i + 1}.png`,
        title: fig.title,
        description: fig.description,
        base64: b64,
      });

      // Persist to chapter_figures so the .docx export embeds the real PNG
      // instead of falling back to the grey [Figure: title] placeholder box.
      // Best-effort — never block job completion if this write fails.
      if (fig.chapterId) {
        try {
          await sb.from("chapter_figures").upsert({
            chapter_id: fig.chapterId,
            user_id: job.user_id,
            figure_id: fig.id,
            figure_number: fig.figureNumber || String(i + 1),
            title: fig.title,
            description: fig.description,
            source_line: "Source: Author's analysis",
            image_data_uri: imageUrl,
          }, { onConflict: "chapter_id,figure_id" });
        } catch (upsertErr) {
          console.warn(`[worker job=${jobId}] chapter_figures upsert failed for ${fig.id}:`, upsertErr);
        }
      }
    } else {
      console.warn(`[worker job=${jobId}] figure ${i + 1} failed all models — skipping`);
    }

    // Update progress after each figure (so the UI's polling shows live counts).
    await sb.from("image_jobs")
      .update({ completed: i + 1 })
      .eq("id", jobId);
  }

  if (generatedImages.length === 0) {
    await sb.from("image_jobs")
      .update({ status: "failed", error: "No images could be generated. Try again." })
      .eq("id", jobId);
    return;
  }

  // Build the ZIP
  const enc = new TextEncoder();
  const manifest = [
    `Image Manifest — ${job.project_title}`,
    "═".repeat(50),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Figures:",
    "",
    ...generatedImages.flatMap((img) => [
      `• ${img.filename}`,
      `  Title: ${img.title}`,
      `  Description: ${img.description}`,
      "",
    ]),
  ].join("\n");

  const zipFiles = [
    { filename: "manifest.txt", data: enc.encode(manifest) },
    ...generatedImages.map((img) => {
      const raw = atob(img.base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return { filename: img.filename, data: bytes };
    }),
  ];

  const zipBase64 = buildZipBase64(zipFiles);
  const filename = `${(job.project_title || "Project").replace(/\s+/g, "_")}_Figures.zip`;

  await sb.from("image_jobs").update({
    status: "completed",
    result_zip_b64: zipBase64,
    result_filename: filename,
    completed: figures.length,
  }).eq("id", jobId);

  console.log(`[worker job=${jobId}] completed ${generatedImages.length}/${figures.length} figures`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run the work in the background so the HTTP response can return
    // immediately. EdgeRuntime.waitUntil keeps the function alive long enough
    // for the loop to finish.
    const work = processJob(jobId).catch(async (e) => {
      console.error(`[worker job=${jobId}] crashed:`, e);
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await sb.from("image_jobs").update({
          status: "failed",
          error: (e as Error)?.message || String(e),
        }).eq("id", jobId);
      } catch { /* ignore */ }
    });

    // @ts-ignore — EdgeRuntime is a Supabase Edge runtime global.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      work.catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, jobId }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-image-job error:", e);
    return new Response(JSON.stringify({ error: (e as Error)?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
