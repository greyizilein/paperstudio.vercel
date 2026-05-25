// run-code — execute user code via the Piston API and return stdout/stderr/exitCode.
// POST body: { code: string, language: string, stdin?: string }
// Returns:   { stdout, stderr, exitCode, language, version, error? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Languages supported by this function.
const SUPPORTED_LANGUAGES = new Set([
  "python",
  "javascript",
  "typescript",
  "r",
  "julia",
  "bash",
]);

// Normalise common aliases to canonical Piston language names.
function normaliseLanguage(lang: string): string {
  const lower = lang.trim().toLowerCase();
  switch (lower) {
    case "python3":
    case "py":
      return "python";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    default:
      return lower;
  }
}

// Return a sensible filename extension for each language so Piston picks the
// right compiler/interpreter.
function filenameFor(language: string): string {
  switch (language) {
    case "python":      return "main.py";
    case "javascript":  return "main.js";
    case "typescript":  return "main.ts";
    case "r":           return "main.r";
    case "julia":       return "main.jl";
    case "bash":        return "main.sh";
    default:            return "main.txt";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Validate the JWT by calling getUser() with the caller's token.
  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { code?: unknown; language?: unknown; stdin?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { code, language: rawLanguage, stdin = "" } = body;

  if (typeof code !== "string" || !code.trim()) {
    return new Response(
      JSON.stringify({ error: "code (non-empty string) is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (typeof rawLanguage !== "string" || !rawLanguage.trim()) {
    return new Response(
      JSON.stringify({ error: "language (string) is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const language = normaliseLanguage(rawLanguage);

  if (!SUPPORTED_LANGUAGES.has(language)) {
    return new Response(
      JSON.stringify({
        error: `Unsupported language "${language}". Supported: ${[...SUPPORTED_LANGUAGES].join(", ")}`,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Call Piston ─────────────────────────────────────────────────────────────
  const pistonPayload = {
    language,
    version: "*",
    files: [{ name: filenameFor(language), content: code }],
    stdin: typeof stdin === "string" ? stdin : "",
    args: [],
    compile_timeout: 10000,
    run_timeout: 8000,
    compile_memory_limit: -1,
    run_memory_limit: 268435456, // 256 MB
  };

  let pistonRes: Response;
  try {
    pistonRes = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pistonPayload),
      signal: AbortSignal.timeout(10_000), // 10-second total timeout
    });
  } catch (err) {
    console.error("run-code: Piston fetch failed:", err);
    return new Response(
      JSON.stringify({ error: "Code execution service unavailable. Please try again." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!pistonRes.ok) {
    const body = await pistonRes.text().catch(() => "(no body)");
    console.error(`run-code: Piston returned ${pistonRes.status}:`, body);
    return new Response(
      JSON.stringify({ error: `Code execution service error (${pistonRes.status})` }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let pistonData: {
    language: string;
    version: string;
    run: { stdout: string; stderr: string; output: string; code: number | null; signal: string | null };
    compile?: { stdout: string; stderr: string; output: string; code: number | null };
  };
  try {
    pistonData = await pistonRes.json();
  } catch (err) {
    console.error("run-code: Failed to parse Piston response:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected response from code execution service" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Build response ──────────────────────────────────────────────────────────
  // A compile-phase failure (e.g. TypeScript) surfaces in pistonData.compile.
  const compileErr = pistonData.compile?.code !== undefined && pistonData.compile.code !== 0
    ? pistonData.compile.stderr || pistonData.compile.output || ""
    : "";

  const run = pistonData.run;
  const exitCode = run.code ?? (run.signal ? 1 : 0);
  const stdout = run.stdout ?? "";
  // Prepend compile errors (if any) to stderr so the caller sees them.
  const stderr = compileErr
    ? [compileErr, run.stderr].filter(Boolean).join("\n")
    : (run.stderr ?? "");

  return new Response(
    JSON.stringify({
      stdout,
      stderr,
      exitCode,
      language: pistonData.language,
      version: pistonData.version,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
