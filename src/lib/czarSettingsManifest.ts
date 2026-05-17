// Compiles the CZAR settings object into a Settings Manifest string
// that gets injected into the writer's user payload as highest-priority rules.

const TOGGLE_RULES: Record<string, string> = {
  no_contractions: "Never use contractions (don't, won't, it's, etc.). Always write the full form.",
  section_pause: "Write ONE section at a time. After each section, stop and emit the literal token <<<SECTION_END>>> on its own line. Wait for the user to say 'continue' before writing the next section.",
  ban_filler: "Banned phrases (never use): 'In conclusion', 'In today's fast-paced world', 'It is important to note', 'delve', 'tapestry', 'navigate the landscape', 'leverage', 'in the realm of', 'plays a crucial role'.",
  vary_sentence_length: "Vary sentence length deliberately. Mix short, declarative sentences with longer compound ones. Avoid the AI staccato cadence.",
  british_spelling: "Use British English spelling throughout (colour, organise, behaviour, centre, programme, analyse, recognise).",
  oxford_comma: "Use the Oxford (serial) comma in lists of three or more items.",
  prefer_active_voice: "Prefer active voice. Only use passive when the agent is genuinely unknown or irrelevant.",
  cite_every_claim: "Every evidence-based claim must carry an in-text citation. No floating assertions.",
  academic_register_lock: "Maintain academic register throughout. No casual asides, no rhetorical questions to the reader, no second-person addresses.",
  auto_paragraph_break: "Break paragraphs after 4–5 sentences for readability. Each paragraph must address one focused idea.",
  spell_out_acronyms: "Spell out every acronym in full on first use, with the abbreviation in parentheses. Use the abbreviation thereafter.",
  double_check_numbers: "Re-verify every numerical claim, percentage, year, and statistic before stating it. Round consistently.",
  sources_only_2018_plus: "Only cite sources published in 2018 or later, except for foundational/seminal works which must be flagged as such.",
  include_executive_summary: "Begin the piece with a concise Executive Summary (≈150–200 words) before the main body.",
  include_keywords: "Add a 'Keywords' block of 5–7 comma-separated terms beneath the abstract or intro.",
  include_word_count_per_section: "At the end of each section heading, append the target word count in brackets, e.g. '## Introduction [400 words]'.",
  show_outline_first: "Before writing the body, present the outline as a bulleted list and write '--- BEGIN DRAFT ---' before the first paragraph.",
  humanise_after_writing: "(Handled client-side: Humaniser pass will run after generation.)",
  redact_personal_data: "(Handled at ingestion: PII has been redacted from any uploaded files.)",
};

const PICKER_RULES: Record<string, (val: string) => string> = {
  language: (v) => `Language variant: ${v === "US" ? "US English" : "UK English"}.`,
  citation_style: (v) => v === "none" ? "Citations: omit unless explicitly requested." : `Citation style: ${v}. Use ${v} formatting for every in-text citation and the References section.`,
  tone: (v) => `Tone & register: ${v.replace(/-/g, " ")}.`,
};

export function buildSettingsManifest(settings: Record<string, any>): string {
  if (!settings || typeof settings !== "object") return "";
  const lines: string[] = [];

  // Pickers (always present)
  for (const [key, fn] of Object.entries(PICKER_RULES)) {
    if (settings[key]) lines.push(`• ${fn(String(settings[key]))}`);
  }

  // Toggles (only if ON)
  for (const [key, rule] of Object.entries(TOGGLE_RULES)) {
    if (settings[key] === true) {
      // Skip rules marked client-side-only
      if (rule.startsWith("(Handled")) continue;
      lines.push(`• ${rule}`);
    }
  }

  if (settings.thinking_mode) {
    lines.push("• Thinking mode: spend extra reasoning effort before producing the final draft. Plan, then write.");
  }

  if (settings.allow_online_lookup !== false) {
    lines.push("• Online lookup is ENABLED: use Google Search grounding (Gemini) or the czar_web_lookup tool (GPT) to fetch real, current data — share prices, dividend dates, latest financials, statistics — instead of inventing or guessing.");
  } else {
    lines.push("• Online lookup is DISABLED: rely solely on training data. If asked for live figures, say you cannot fetch them right now.");
  }

  if (lines.length === 0) return "";

  return [
    "",
    "===== USER-ACTIVE SETTINGS (HIGHEST PRIORITY — OVERRIDE DEFAULTS) =====",
    ...lines,
    "===== END USER SETTINGS =====",
    "",
  ].join("\n");
}
