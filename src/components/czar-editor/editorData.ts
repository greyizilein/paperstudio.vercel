export interface CzVoice {
  id: string;
  name: string;
  tag: string;
  glyph: string;
  desc: string;
  meters: { warmth: number; formality: number; brevity: number; wit: number };
}

export const CZ_VOICES: CzVoice[] = [
  { id: 'self', name: 'Your voice', tag: 'baseline', glyph: '§',
    desc: 'Your own rhythm — Czar studied 12,000 words you wrote and learned the shape of it.',
    meters: { warmth: 62, formality: 38, brevity: 48, wit: 55 } },
  { id: 'didion', name: 'Didion-ish', tag: 'spare', glyph: 'D',
    desc: 'Short sentences. Cold weather. The thing said plainly, then left there.',
    meters: { warmth: 28, formality: 55, brevity: 84, wit: 40 } },
  { id: 'baldwin', name: 'Baldwin-ish', tag: 'urgent', glyph: 'B',
    desc: 'Long clauses that arrive at moral weight. Use sparingly.',
    meters: { warmth: 72, formality: 65, brevity: 18, wit: 50 } },
  { id: 'newsletter', name: 'Newsletter', tag: 'warm', glyph: 'N',
    desc: "Conversational, lightly punctuated. Like you're writing one friend.",
    meters: { warmth: 88, formality: 24, brevity: 52, wit: 70 } },
  { id: 'memo', name: 'Memo', tag: 'crisp', glyph: 'M',
    desc: 'Bullet-adjacent prose. Verbs first. No qualifiers.',
    meters: { warmth: 22, formality: 70, brevity: 92, wit: 18 } },
  { id: 'longform', name: 'Longform essay', tag: 'considered', glyph: 'L',
    desc: 'Build the argument. Earn the reader. Trust them with subordinate clauses.',
    meters: { warmth: 58, formality: 72, brevity: 24, wit: 60 } },
];
