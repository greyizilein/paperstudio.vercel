export interface Voice {
  id: string;
  name: string;
  tag: string;
  glyph: string;
  desc: string;
  meters: { warmth: number; formality: number; brevity: number; wit: number };
}

export interface Piece {
  id: string;
  name: string;
  meta: string;
  meta2?: string;
  active?: boolean;
}

export interface OutlineItem {
  id: string;
  text: string;
  level: 1 | 2;
  current?: boolean;
}

export interface Suggestion {
  id: string;
  kind: "voice" | "grammar" | "cut";
  tone: string;
  was: string;
  now: string;
}

export interface SettingsSection {
  id: string;
  label: string;
  glyph: string;
  group: "voice" | "app" | "meta";
}

export const CZ_VOICES: Voice[] = [
  {
    id: "self",
    name: "Your voice",
    tag: "baseline",
    glyph: "§",
    desc: "Your own rhythm — Czar studied 12,000 words you wrote and learned the shape of it.",
    meters: { warmth: 62, formality: 38, brevity: 48, wit: 55 },
  },
  {
    id: "didion",
    name: "Didion-ish",
    tag: "spare",
    glyph: "D",
    desc: "Short sentences. Cold weather. The thing said plainly, then left there.",
    meters: { warmth: 28, formality: 55, brevity: 84, wit: 40 },
  },
  {
    id: "baldwin",
    name: "Baldwin-ish",
    tag: "urgent",
    glyph: "B",
    desc: "Long clauses that arrive at moral weight. Use sparingly.",
    meters: { warmth: 72, formality: 65, brevity: 18, wit: 50 },
  },
  {
    id: "newsletter",
    name: "Newsletter",
    tag: "warm",
    glyph: "N",
    desc: "Conversational, lightly punctuated. Like you're writing one friend.",
    meters: { warmth: 88, formality: 24, brevity: 52, wit: 70 },
  },
  {
    id: "memo",
    name: "Memo",
    tag: "crisp",
    glyph: "M",
    desc: "Bullet-adjacent prose. Verbs first. No qualifiers.",
    meters: { warmth: 22, formality: 70, brevity: 92, wit: 18 },
  },
  {
    id: "longform",
    name: "Longform essay",
    tag: "considered",
    glyph: "L",
    desc: "Build the argument. Earn the reader. Trust them with subordinate clauses.",
    meters: { warmth: 58, formality: 72, brevity: 24, wit: 60 },
  },
];

export const CZ_PIECES: Piece[] = [
  { id: "p1", name: "Letter to the founders", meta: "1,842w", active: true },
  { id: "p2", name: "A short story — Margaret", meta: "4,612w" },
  { id: "p3", name: "Sub-stack #14", meta: "880w" },
  { id: "p4", name: "Cold pitch — Vogue", meta: "320w", meta2: "draft" },
];

export const CZ_OUTLINE: OutlineItem[] = [
  { id: "o1", text: "A letter to the founders, with apology", level: 1, current: true },
  { id: "o2", text: "What we said we would build", level: 2 },
  { id: "o3", text: "What we actually built", level: 2 },
  { id: "o4", text: "The thing about Wednesdays", level: 1 },
  { id: "o5", text: "On burning the deck", level: 2 },
  { id: "o6", text: "A modest proposal", level: 1 },
];

export const CZ_SUGGESTIONS: Suggestion[] = [
  {
    id: "s1",
    kind: "voice",
    tone: "sharper",
    was: "I believe we were perhaps a little too eager in our promises.",
    now: "We promised too much.",
  },
  {
    id: "s2",
    kind: "grammar",
    tone: "fix",
    was: "Each of the founders have their own version of the story.",
    now: "Each of the founders has their own version of the story.",
  },
  {
    id: "s3",
    kind: "cut",
    tone: "— 14 words",
    was: "It is important to note, at this juncture, that we did, in fact, ship.",
    now: "We shipped.",
  },
];

export const CZ_SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "modes",     label: "Writing modes",  glyph: "§", group: "voice" },
  { id: "train",     label: "Train a voice",  glyph: "+", group: "voice" },
  { id: "editor",    label: "Editor",         glyph: "¶", group: "app" },
  { id: "dictation", label: "Dictation",      glyph: "◉", group: "app" },
  { id: "import",    label: "Import & export", glyph: "↓", group: "app" },
  { id: "shortcuts", label: "Keyboard",       glyph: "⌘", group: "app" },
  { id: "account",   label: "Account",        glyph: "A", group: "meta" },
];
