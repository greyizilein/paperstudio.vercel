// Shared document-type detector — used by edge functions to set the
// [DOCTYPE:...] envelope tag on outgoing agent payloads, and by the docx
// exporter to render an honest declaration ("this report" / "this essay" /
// "this dissertation" rather than always defaulting to "dissertation").
//
// Mirrors the logic in src/pages/Czar.tsx (detectDocumentType) so the
// frontend and backend always agree on the document type.

const TYPE_PATTERNS: Array<[RegExp, string]> = [
  [/\bthesis\b/i, "thesis"],
  [/\bdissertation\b/i, "dissertation"],
  [/\b(case study)\b/i, "case study"],
  [/\b(research )?proposal\b/i, "proposal"],
  [/\bmemo(randum)?\b/i, "memo"],
  [/\breport\b/i, "report"],
  [/\bessay\b/i, "essay"],
  [/\b(article|paper)\b/i, "article"],
  [/\breview\b/i, "review"],
  [/\b(letter)\b/i, "letter"],
  [/\b(email|e-mail)\b/i, "email"],
];

/**
 * Detect the document type from an explicit brief.type, then from the
 * combined text of the user's prompt + (optional) generated content.
 * Returns lowercase type, defaulting to "document" when nothing matches.
 */
export function detectDocumentType(opts: {
  briefType?: string | null;
  userMessage?: string | null;
  content?: string | null;
}): string {
  const explicit = (opts.briefType || "").trim().toLowerCase();
  if (explicit) return explicit;
  const haystack = `${opts.userMessage || ""}\n${opts.content || ""}`;
  for (const [re, label] of TYPE_PATTERNS) {
    if (re.test(haystack)) return label;
  }
  return "document";
}
