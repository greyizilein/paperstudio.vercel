// analyse-dataset — parse, clean, and profile an uploaded dataset.
// Accepts CSV / TSV / JSON pasted as a string (the writer already reads files
// client-side as text). Returns a structured profile + a cleaned preview that
// the Chapter 4 writer uses as ground truth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ColType = "numeric" | "categorical" | "date" | "text";

interface CleanOptions {
  treat999AsMissing?: boolean;
  keepOutliers?: boolean;
  missingMarkers?: string[];
}

const DEFAULT_MISSING = ["", "na", "n/a", "null", "none", "-", "nil"];

function detectDelimiter(sample: string): string {
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = 0;
  for (const c of candidates) {
    const lines = sample.split(/\r?\n/).slice(0, 5);
    const counts = lines.map((l) => l.split(c).length);
    if (counts.length === 0) continue;
    const consistent = counts.every((n) => n === counts[0]) && counts[0] > 1;
    if (consistent && counts[0] > bestCount) {
      bestCount = counts[0];
      best = c;
    }
  }
  return best;
}

function parseCSV(text: string, delim: string): string[][] {
  // Minimal CSV parser supporting quoted fields with escaped quotes.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

function isNumeric(v: string): boolean {
  if (v === "" || v == null) return false;
  return /^-?\d+(\.\d+)?$/.test(v.trim());
}

function isDate(v: string): boolean {
  if (v.length < 6) return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && /\d{4}/.test(v);
}

function inferType(values: string[]): ColType {
  const nonEmpty = values.filter((v) => v && v.trim() !== "");
  if (nonEmpty.length === 0) return "text";
  let num = 0, dt = 0;
  for (const v of nonEmpty) {
    if (isNumeric(v)) num++;
    else if (isDate(v)) dt++;
  }
  const ratio = (n: number) => n / nonEmpty.length;
  if (ratio(num) > 0.85) return "numeric";
  if (ratio(dt) > 0.85) return "date";
  const unique = new Set(nonEmpty.map((v) => v.toLowerCase().trim())).size;
  if (unique <= Math.min(20, Math.ceil(nonEmpty.length * 0.25))) return "categorical";
  return "text";
}

function statsForNumeric(vals: number[]) {
  if (!vals.length) return undefined;
  const sorted = [...vals].sort((a, b) => a - b);
  const sum = vals.reduce((s, v) => s + v, 0);
  const mean = sum / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, vals.length - 1));
  return {
    mean: +mean.toFixed(3),
    sd: +sd.toFixed(3),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

function detectOutliers(vals: number[]): number[] {
  if (vals.length < 8) return [];
  const sorted = [...vals].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return vals.filter((v) => v < lo || v > hi);
}

function freqTable(values: string[]): Array<{ value: string; count: number }> {
  const map = new Map<string, number>();
  for (const v of values) {
    const k = v.trim();
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({ value, count }));
}

function isMissing(v: string, opts: CleanOptions): boolean {
  if (v == null) return true;
  const s = v.trim().toLowerCase();
  if (DEFAULT_MISSING.includes(s)) return true;
  if (opts.missingMarkers?.map((m) => m.toLowerCase()).includes(s)) return true;
  if (opts.treat999AsMissing && (s === "999" || s === "-999")) return true;
  return false;
}

function cleanDataset(rawText: string, filename: string, opts: CleanOptions = {}) {
  const notes: string[] = [];
  let rows: string[][];

  // Try JSON first
  const trimmed = rawText.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const headers = [...new Set(arr.flatMap((o) => (typeof o === "object" && o ? Object.keys(o) : [])))];
      rows = [headers, ...arr.map((o) => headers.map((h) => String(o?.[h] ?? "")))];
      notes.push("Parsed as JSON.");
    } catch {
      const delim = detectDelimiter(rawText);
      rows = parseCSV(rawText, delim);
      notes.push(`Parsed as delimited text (delimiter: "${delim === "\t" ? "tab" : delim}").`);
    }
  } else {
    const delim = detectDelimiter(rawText);
    rows = parseCSV(rawText, delim);
    notes.push(`Parsed as delimited text (delimiter: "${delim === "\t" ? "tab" : delim}").`);
  }

  if (rows.length < 2) {
    return {
      filename,
      rows_in: 0,
      rows_out: 0,
      columns: [],
      notes: ["Dataset is empty or unreadable."],
      cleaned_preview: "",
    };
  }

  const headers = rows[0].map((h, i) => (h.trim() || `col_${i + 1}`));
  let dataRows = rows.slice(1);
  const rowsIn = dataRows.length;

  // Drop fully empty rows
  dataRows = dataRows.filter((r) => r.some((v) => v && v.trim() !== ""));
  if (rowsIn - dataRows.length > 0) notes.push(`Removed ${rowsIn - dataRows.length} fully empty rows.`);

  // Normalise width
  dataRows = dataRows.map((r) => {
    if (r.length < headers.length) return [...r, ...Array(headers.length - r.length).fill("")];
    if (r.length > headers.length) return r.slice(0, headers.length);
    return r;
  });

  // Trim whitespace
  dataRows = dataRows.map((r) => r.map((v) => (typeof v === "string" ? v.trim() : v)));

  // De-duplicate
  const before = dataRows.length;
  const seen = new Set<string>();
  dataRows = dataRows.filter((r) => {
    const k = r.join("\x1f");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (before - dataRows.length > 0) notes.push(`Removed ${before - dataRows.length} duplicate rows.`);

  // Per-column profile
  const columns = headers.map((name, idx) => {
    const colVals = dataRows.map((r) => r[idx] ?? "");
    const missingMask = colVals.map((v) => isMissing(v, opts));
    const nonMissing = colVals.filter((_, i) => !missingMask[i]);
    const type = inferType(nonMissing);

    let stats: any;
    let outliers = 0;
    let frequencies: any;
    if (type === "numeric") {
      let nums = nonMissing.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
      const olVals = detectOutliers(nums);
      outliers = olVals.length;
      if (!opts.keepOutliers && olVals.length > 0) {
        const olSet = new Set(olVals);
        nums = nums.filter((n) => !olSet.has(n));
        notes.push(`Column "${name}": dropped ${olVals.length} outlier(s) via IQR rule.`);
      }
      stats = statsForNumeric(nums);
    } else if (type === "categorical") {
      // Normalise case for categorical
      for (let i = 0; i < dataRows.length; i++) {
        const v = dataRows[i][idx];
        if (typeof v === "string" && v.trim()) {
          const normalised = v.trim();
          dataRows[i][idx] = normalised.charAt(0).toUpperCase() + normalised.slice(1).toLowerCase();
        }
      }
      const post = dataRows.map((r) => r[idx] ?? "");
      frequencies = freqTable(post);
    }

    return {
      name,
      type,
      missing: missingMask.filter(Boolean).length,
      missing_strategy: missingMask.some(Boolean)
        ? type === "numeric" ? "Listwise excluded from statistics" : "Treated as missing category"
        : undefined,
      outliers,
      stats,
      frequencies,
    };
  });

  // Drop fully empty columns
  const keptColIdx: number[] = [];
  const finalCols = columns.filter((c, i) => {
    const empty = c.missing === dataRows.length;
    if (!empty) keptColIdx.push(i);
    if (empty) notes.push(`Dropped column "${c.name}" — entirely empty.`);
    return !empty;
  });

  const finalHeaders = keptColIdx.map((i) => headers[i]);
  const finalRows = dataRows.map((r) => keptColIdx.map((i) => r[i]));

  // Cleaned preview (CSV, capped)
  const previewRowCount = Math.min(50, finalRows.length);
  const csvLines = [finalHeaders.join(",")];
  for (let i = 0; i < previewRowCount; i++) {
    csvLines.push(finalRows[i].map((v) => {
      const s = String(v ?? "");
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  if (finalRows.length > previewRowCount) {
    csvLines.push(`# … ${finalRows.length - previewRowCount} more rows omitted`);
  }

  return {
    filename,
    rows_in: rowsIn,
    rows_out: finalRows.length,
    columns: finalCols,
    notes,
    cleaned_preview: csvLines.join("\n"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { rawText, filename, options } = body as {
      rawText: string;
      filename?: string;
      options?: CleanOptions;
    };

    if (!rawText || typeof rawText !== "string") {
      return new Response(
        JSON.stringify({ error: "rawText (string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profile = cleanDataset(rawText, filename || "dataset", options || {});
    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyse-dataset error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
