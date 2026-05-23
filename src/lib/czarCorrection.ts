export type CorrectionType = "grammar" | "style" | "structure" | "argument" | "register";

export const CORRECTION_TYPE_META: Record<CorrectionType, {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  pillClass: string;
}> = {
  grammar: {
    label: "Grammar",
    colorClass: "text-green-700 dark:text-green-400",
    bgClass: "bg-green-50 dark:bg-green-950/40",
    borderClass: "border-green-400 dark:border-green-600",
    pillClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  },
  style: {
    label: "Style",
    colorClass: "text-blue-700 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    borderClass: "border-blue-400 dark:border-blue-600",
    pillClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  },
  structure: {
    label: "Structure",
    colorClass: "text-orange-700 dark:text-orange-400",
    bgClass: "bg-orange-50 dark:bg-orange-950/40",
    borderClass: "border-orange-400 dark:border-orange-600",
    pillClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  },
  argument: {
    label: "Argument",
    colorClass: "text-red-700 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/40",
    borderClass: "border-red-400 dark:border-red-600",
    pillClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
  register: {
    label: "Register",
    colorClass: "text-purple-700 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/40",
    borderClass: "border-purple-400 dark:border-purple-600",
    pillClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  },
};

export interface CorrectionChange {
  id: string;
  type: CorrectionType;
  original: string;
  corrected: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected";
}

export interface CorrectionSummary {
  total: number;
  by_type: Partial<Record<CorrectionType, number>>;
  word_count_before: number;
  word_count_after: number;
  register_notes: string[];
  original_text: string;
}

export interface TextSegment { kind: "text"; text: string }
export interface ChangeSegment { kind: "change"; change: CorrectionChange }
export type Segment = TextSegment | ChangeSegment;

export function buildSegments(originalText: string, changes: CorrectionChange[]): Segment[] {
  const usedIntervals: [number, number][] = [];
  const positioned: { change: CorrectionChange; index: number }[] = [];

  for (const change of changes) {
    if (!change.original) continue;
    let searchFrom = 0;
    let found = -1;

    while (searchFrom <= originalText.length - change.original.length) {
      const idx = originalText.indexOf(change.original, searchFrom);
      if (idx === -1) break;
      const end = idx + change.original.length;
      const overlaps = usedIntervals.some(([s, e]) => idx < e && end > s);
      if (!overlaps) {
        found = idx;
        usedIntervals.push([idx, end]);
        break;
      }
      searchFrom = idx + 1;
    }

    if (found !== -1) {
      positioned.push({ change, index: found });
    }
  }

  positioned.sort((a, b) => a.index - b.index);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const { change, index } of positioned) {
    if (index < cursor) continue;
    if (index > cursor) {
      segments.push({ kind: "text", text: originalText.slice(cursor, index) });
    }
    segments.push({ kind: "change", change });
    cursor = index + change.original.length;
  }

  if (cursor < originalText.length) {
    segments.push({ kind: "text", text: originalText.slice(cursor) });
  }

  return segments;
}

export function buildCleanText(originalText: string, changes: CorrectionChange[]): string {
  const positioned = changes
    .map(c => ({ change: c, index: originalText.indexOf(c.original) }))
    .filter(p => p.index !== -1)
    .sort((a, b) => b.index - a.index);

  let result = originalText;
  for (const { change, index } of positioned) {
    const replacement = change.status === "rejected" ? change.original : change.corrected;
    result = result.slice(0, index) + replacement + result.slice(index + change.original.length);
  }
  return result;
}
