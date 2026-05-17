export type Methodology = "Quantitative" | "Qualitative" | "Mixed Methods";

export interface ChapterConfig {
  type: string;
  title: string;
  words: number;
  order: number;
}

export interface Heading {
  text: string;
  target_words: number;
}

export interface ChapterDraftConfig {
  target_words: number;
  stats_count: number;
  source_year_start: number;
  source_year_end: number;
  headings: Heading[];
  uploaded_data?: string;
  analysis_types?: string[];
  visualizations?: string[];
}

/** Result of analyse-dataset edge function — cached on the chapter for Ch4. */
export interface CleanedDataProfile {
  filename: string;
  rows_in: number;
  rows_out: number;
  columns: Array<{
    name: string;
    type: "numeric" | "categorical" | "date" | "text";
    missing: number;
    missing_strategy?: string;
    outliers?: number;
    stats?: { mean?: number; sd?: number; min?: number; max?: number; median?: number };
    frequencies?: Array<{ value: string; count: number }>;
  }>;
  notes: string[];
  cleaned_preview: string; // first ~50 rows as CSV for the writer
}

export interface SupervisorRevision {
  id: string;
  applied_at: string;
  source: "docx" | "pdf" | "txt" | "paste";
  items_applied: number;
  previous_content: string; // for undo
}

export interface Chapter {
  id: string;
  order_index: number;
  title: string;
  type: string;
  content: string;
  status: "pending" | "completed";
  word_count_target: number;
  word_count_actual: number;
  draft_config?: ChapterDraftConfig;
  cleaned_data_profile?: CleanedDataProfile;
  supervisor_revisions?: SupervisorRevision[];
}

export type WritingMode = "natural" | "default";

export interface Project {
  id: string;
  title: string;
  university: string;
  degree: string;
  field_of_study: string;
  word_count: number;
  citation_style: string;
  language_style: string;
  research_methodology: Methodology;
  data_collection_method: string;
  sampling_technique: string;
  sample_size: number;
  research_objectives: string[];
  research_questions: string[];
  research_framework: string;
  framework_justification?: string;
  writing_mode?: WritingMode;
  language_level?: number;
  /** Whether the study includes formal research hypotheses (cascades to chapter outlines + AI prompts). */
  include_hypotheses?: boolean;
  chapters: Chapter[];
  created_date: string;
}
