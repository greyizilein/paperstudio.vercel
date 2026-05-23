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

// Raw event from backend — no UI state
export interface CorrectionChange {
  id: string;
  type: CorrectionType;
  original: string;
  corrected: string;
  explanation: string;
}

// UI-layer change with selection + override instruction
export interface CorrectionChangeUI extends CorrectionChange {
  selected: boolean;
  overrideInstruction: string;
}

export interface CorrectionSummary {
  total: number;
  by_type: Partial<Record<CorrectionType, number>>;
  word_count_before: number;
  word_count_after: number;
  register_notes: string[];
  original_text: string;
}

export function buildCleanText(originalText: string, changes: CorrectionChangeUI[]): string {
  const positioned = changes
    .filter(c => c.selected)
    .map(c => ({ change: c, index: originalText.indexOf(c.original) }))
    .filter(p => p.index !== -1)
    .sort((a, b) => b.index - a.index);

  let result = originalText;
  for (const { change, index } of positioned) {
    result = result.slice(0, index) + change.corrected + result.slice(index + change.original.length);
  }
  return result;
}
