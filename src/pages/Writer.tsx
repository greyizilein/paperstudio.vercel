import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check, Copy, Download, Settings, X, Plus, Trash2,
  Loader2, Sparkles, StopCircle, Wand2, BarChart2, Upload, Lock, MoreVertical, Image as ImageIcon, Cpu,
  FolderOpen, ChevronRight, ArrowLeft, PenLine, FileEdit, Columns2, GripVertical, Share2, MessageCircle
} from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { type Project, type Chapter, type ChapterDraftConfig } from "@/types/project";
import {
  CHAPTER_CONFIGS, ANALYSIS_OPTIONS, VISUALIZATION_OPTIONS,
  QUALITATIVE_ANALYSIS_OPTIONS, ANALYSIS_SOFTWARE_OPTIONS,
  FORMALITY_OPTIONS, HEDGING_OPTIONS, VOICE_OPTIONS,
  PARAGRAPH_LENGTH_OPTIONS, SENTENCE_COMPLEXITY_OPTIONS,
  THEORIST_DB, guessField, EXPORT_FORMATS,
  CONCLUSION_SECTIONS, ABSTRACT_TYPES, ABSTRACT_WC_OPTIONS,
  EMPIRICAL_LEVEL_OPTIONS, SEMINAL_WORKS_OPTIONS, DOI_OPTIONS,
  SOURCE_TYPE_DISTRIBUTION, TECHNICAL_DENSITY_OPTIONS, TRANSITION_STYLE_OPTIONS,
  LINE_SPACING_OPTIONS, MIXED_METHODS_OPTIONS,
  CHART_COMPLEXITY_OPTIONS, CHART_RESOLUTION_OPTIONS,
  FIGURE_NUMBERING_OPTIONS, TABLE_NUMBERING_OPTIONS,
  CAPTION_POSITION_OPTIONS, SOURCE_FORMAT_OPTIONS,
  QUANT_METHOD_DESCRIPTIONS, QUAL_METHOD_DESCRIPTIONS,
  CHAPTER_GUIDES,
} from "@/lib/constants";
import { ContextualToolbar } from "@/components/writer/ContextualToolbar";
import { OnboardingTour } from "@/components/writer/OnboardingTour";
import { ReorderChaptersModal } from "@/components/writer/ReorderChaptersModal";
import { ChartRenderer } from "@/components/firstdraft/ChartRenderer";
import { FinalExport } from "@/components/FinalExport";
import { ChapterOutlineModal, type OutlineHeading } from "@/components/ChapterOutlineModal";
import { ImageAckModal, ImageProgressModal, hasAckedImageNotice, ackImageNotice } from "@/components/ImageNoticeModal";
import { streamGenerateChapter } from "@/lib/streamChat";
import { extractBodyContent, countWords } from "@/lib/streamChat";
import { AI_MODELS, DEFAULT_MODEL_ID, TIER_COLORS, getModelById, isModelLockedForTier, getMinTierLabel } from "@/lib/aiModels";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, updateProject, getUserSubscription, incrementWordsUsed, deleteProject, type Subscription } from "@/lib/projectService";
import { UserProfilePopover } from "@/components/dashboard/UserProfilePopover";
import { BookLoader } from "@/components/ui/BookLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { DataQualityModal } from "@/components/writer/DataQualityModal";
import { SupervisorFeedbackModal } from "@/components/writer/SupervisorFeedbackModal";
import { toast } from "sonner";
import { authedHeaders } from "@/lib/edgeFetch";
import { computeParaDiff, type DiffParagraph } from "@/lib/diffUtils";

// ═══ PERSONALISE STATE ═══
interface PersonaliseState {
  formality: string;
  paragraphLength: string;
  sentenceComplexity: string;
  hedging: string;
  voicePerson: string;
  transitionStyle: string;
  technicalDensity: string;
  totalSources: number;
  minPerThousand: string;
  dateRange: string;
  customDateFrom: string;
  customDateTo: string;
  sourceTypeDistribution: string[];
  empiricalLevel: string;
  seminalWorks: string;
  doiInclusion: string;
  customHeadings: string;
  chapterTitleRename: string;
  lineSpacing: string;
  beginOnNewPage: boolean;
  includeAppendix: boolean;
  contentEmphasis: string;
  selectedTheorists: string[];
  customTheorist: string;
  geoScope: string;
  customGeoScope: string;
  analysisMethods: string[];
  qualMethods: string[];
  visualizations: string[];
  software: string[];
  customSoftware: string;
  notes: string;
  pastedInstructions: string;
  uploadedData: string;
  uploadedDataFilename: string;
  // introduction-specific
  researchObjectivesText: string;
  researchQuestionsText: string;
  autoGenerateObjectives: string;
  includeHypotheses: boolean;
  hypothesesText: string;
  // methodology-specific
  ontology: string;
  epistemology: string;
  methodologyDepth: string;
  instrumentGenerate: string;
  customSamplingDesc: string;
  // findings-specific
  chartColourScheme: string;
  chartCustomColour: string;
  chartComplexity: string;
  chartResolution: string;
  figureNumbering: string;
  tableNumbering: string;
  significanceAsterisks: boolean;
  confidenceIntervals: boolean;
  boldSignificant: boolean;
  standardisedBeta: boolean;
  vifValues: boolean;
  nAnnotation: boolean;
  chartBWFallback: boolean;
  mixedMethodsApproach: string;
  includeTriangulation: boolean;
  includeQuoteTables: boolean;
  captionPosition: string;
  sourceFormat: string;
  // abstract-specific
  abstractType: string;
  abstractTargetWC: string;
  abstractCustomWC: number;
  includeKeywords: boolean;
  dualLanguage: boolean;
  includeWCDeclaration: boolean;
  // chapter sections
  sectionsToInclude: string[];
  // lit review specific authors
  specificAuthors: string[];
  customAuthor: string;
}

const defaultPersonalise: PersonaliseState = {
  formality: "Standard journal (default)",
  paragraphLength: "Medium (4–7 sentences)",
  sentenceComplexity: "Mixed (default)",
  hedging: "Medium (standard)",
  voicePerson: "Third person only",
  transitionStyle: "Formal connectors",
  technicalDensity: "3 — Standard",
  totalSources: 18,
  minPerThousand: "System default",
  dateRange: "2018-2026",
  customDateFrom: "2018",
  customDateTo: "2026",
  sourceTypeDistribution: ["Journal articles (50–60% of sources)", "Books & edited volumes (20–30%)", "Government / institutional reports (10–15%)"],
  empiricalLevel: "Standard (50% empirical)",
  seminalWorks: "No — recent sources only",
  doiInclusion: "Auto (required for APA 7 & Vancouver)",
  customHeadings: "",
  chapterTitleRename: "",
  lineSpacing: "2.0× (UK default)",
  beginOnNewPage: true,
  includeAppendix: false,
  contentEmphasis: "",
  selectedTheorists: [],
  customTheorist: "",
  geoScope: "Global",
  customGeoScope: "",
  analysisMethods: ["Descriptive statistics (mean, SD, frequencies)"],
  qualMethods: [],
  visualizations: [],
  software: ["SPSS v27"],
  customSoftware: "",
  notes: "",
  pastedInstructions: "",
  uploadedData: "",
  uploadedDataFilename: "",
  researchObjectivesText: "",
  researchQuestionsText: "",
  autoGenerateObjectives: "Yes — AI generates, I review and edit",
  includeHypotheses: false,
  hypothesesText: "",
  ontology: "Post-positivist",
  epistemology: "Post-positivist",
  methodologyDepth: "Standard",
  instrumentGenerate: "No",
  customSamplingDesc: "",
  chartColourScheme: "Default Academic",
  chartCustomColour: "#4A154B",
  chartComplexity: "Level 2 — Standard",
  chartResolution: "300 DPI — print",
  figureNumbering: "Figure 4.1, 4.2…",
  tableNumbering: "Table 4.1, 4.2…",
  significanceAsterisks: true,
  confidenceIntervals: true,
  boldSignificant: true,
  standardisedBeta: false,
  vifValues: false,
  nAnnotation: false,
  chartBWFallback: false,
  mixedMethodsApproach: "Sequential Explanatory (quant → qual explains)",
  includeTriangulation: true,
  includeQuoteTables: false,
  captionPosition: "Above table (APA/Harvard default)",
  sourceFormat: "Source: Author, Year",
  abstractType: "Unstructured (standard prose, 300–500 words)",
  abstractTargetWC: "350 words (Masters default)",
  abstractCustomWC: 350,
  includeKeywords: true,
  dualLanguage: false,
  includeWCDeclaration: false,
  sectionsToInclude: [],
  specificAuthors: [],
  customAuthor: "",
};

// Chapter-specific sections
const INTRO_SECTIONS = [
  "Research background and context", "Problem statement", "Rationale / justification",
  "Research aims and objectives", "Scope and limitations", "Dissertation structure overview (roadmap)",
  "Conceptual framework overview", "Definition of key terms"
];
const INTRO_SECTIONS_DEFAULT = ["Research background and context", "Problem statement", "Rationale / justification", "Research aims and objectives", "Scope and limitations", "Dissertation structure overview (roadmap)"];

const LIT_SECTIONS = [
  "Thematic synthesis of literature", "Theoretical framework section", "Gap analysis paragraph",
  "PRISMA-compatible systematic review structure", "Meta-narrative review approach",
  "Conceptual model derived from literature", "Inclusion/exclusion criteria table (from framework)"
];
const LIT_SECTIONS_DEFAULT = ["Thematic synthesis of literature", "Theoretical framework section", "Gap analysis paragraph"];

const METH_SECTIONS = [
  "Research philosophy (ontology/epistemology)", "Research design justification", "Sampling strategy",
  "Data collection instruments", "Data analysis procedure", "Ethical considerations",
  "Validity and reliability", "Pilot study description", "Reflexivity statement",
  "Inclusion/exclusion criteria table", "PRISMA flow diagram reference"
];
const METH_SECTIONS_DEFAULT = ["Research philosophy (ontology/epistemology)", "Research design justification", "Sampling strategy", "Data collection instruments", "Data analysis procedure", "Ethical considerations", "Validity and reliability"];

const CONCLUSION_SECTIONS_DEFAULT = ["Summary of key findings (by objective)", "Answer each research question directly", "Contribution to knowledge / theory", "Practical recommendations", "Recommendations for future research", "Limitations of the study", "Concluding paragraph"];

const ONTOLOGY_OPTIONS = ["Post-positivist", "Positivist", "Constructivist / Interpretivist", "Critical realist", "Pragmatist"];
const EPISTEMOLOGY_OPTIONS = ["Post-positivist", "Objectivist", "Subjectivist", "Pragmatist"];
const INSTRUMENT_OPTIONS = ["No", "Yes — survey questionnaire skeleton", "Yes — semi-structured interview guide", "Yes — observation protocol", "Yes — focus group guide"];
const CHART_COLOUR_OPTIONS = ["Default Academic", "Monochrome (B&W print)", "Warm Scientific", "Pastel Light", "High Contrast (WCAG AA)", "Nature Journal"];

// Lit review specific authors — dynamically generated based on field (see suggestedLitAuthors memo below)

const CHAPTER_EMPTY: Record<string, { title: string; desc: string }> = {
  introduction: { title: "Ready to draft Ch 1", desc: "Add objectives, questions and hypotheses in Personalise, then begin drafting." },
  literature_review: { title: "Ready to draft Ch 2", desc: "Sources and citations are auto-generated. Personalise to set frameworks and theorists." },
  methodology: { title: "Ready to draft Ch 3", desc: "Personalise to choose analysis methods, sampling details and philosophy." },
  findings: { title: "Ready to draft Ch 4", desc: "Analysis methods and visualisations auto-detected from Ch 3. No new citations." },
  conclusion: { title: "Ready to draft Ch 5", desc: "No new sources. Summarises findings and includes recommendations." },
  abstract: { title: "Write abstract last", desc: "Complete all chapters first. The abstract summarises the full dissertation." },
};

export default function WriterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  // Quality review removed
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [userStyleSettings, setUserStyleSettings] = useState<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const continueCountRef = useRef(0);
  const userStoppedRef = useRef(false);
  const pendingReviseRef = useRef(false);
  // Resume tailer: when a chapter is being generated server-side (we may have
  // started it earlier and closed the tab), this polls chapters.draft_config._stream
  // to mirror server-side progress into the UI.
  const tailingChapterIdRef = useRef<string | null>(null);
  const tailingTimerRef = useRef<number | null>(null);
  const [draftConfig, setDraftConfig] = useState<ChapterDraftConfig>({
    target_words: 2000, stats_count: 5, source_year_start: 2018, source_year_end: 2026, headings: [], analysis_types: [], visualizations: []
  });
  const [selectedExportFormat, setSelectedExportFormat] = useState("docx");
  const [selectedChExportFormat, setSelectedChExportFormat] = useState("docx");
  const [objectiveCount, setObjectiveCount] = useState(4);
  const [isGeneratingObjectives, setIsGeneratingObjectives] = useState(false);
  // Grammar/editing engine removed
  const [editedChapterIds, setEditedChapterIds] = useState<Set<string>>(new Set());
  const [editedWordDeltas, setEditedWordDeltas] = useState<Record<string, number>>({});
  const [subscription, setSubscription] = useState<Subscription>({ tier: "free", word_limit: 3000, words_used: 0, status: "active" });
  // If the active model becomes locked for the user's tier (e.g. they downgraded
  // or we tightened gating), silently fall back to the always-available default.
  useEffect(() => {
    const isTest = (user?.email || "").toLowerCase() === "grey.izilein@gmail.com";
    if (isTest) return;
    if (isModelLockedForTier(selectedModelId, subscription?.tier || "free")) {
      setSelectedModelId(DEFAULT_MODEL_ID);
    }
  }, [subscription?.tier, selectedModelId, user?.email]);
  const [mobileChaptersOpen, setMobileChaptersOpen] = useState(false);
  // AI score estimator removed
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  // Inline figure generation tracking
  const [inlineImages, setInlineImages] = useState<Record<string, { status: "loading" | "done" | "error"; imageUrl?: string; title?: string }>>({});
  const processedMarkersRef = useRef<Set<string>>(new Set());
  // Pre-generation status for ticked Suggested Visuals (keyed by visual.id)
  const [visualImageStatus, setVisualImageStatus] = useState<Record<string, "queued" | "rendering" | "ready" | "failed">>({});
  // Draft recovery (localStorage auto-save)
  const [recoveryContent, setRecoveryContent] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const recoveryKeyRef = useRef<string>("");

  // Chapter outline modal
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  // Supervisor feedback + Data quality modals
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [showDataQualityModal, setShowDataQualityModal] = useState(false);
  // Humaniser panel
  const [showHumanisePanel, setShowHumanisePanel] = useState(false);
  const [humaniseStages, setHumaniseStages] = useState<{ stage: number; label: string; status: "pending" | "running" | "done" | "skipped" }[]>([]);
  const [humanisedText, setHumanisedText] = useState<string | null>(null);
  const [isHumanising, setIsHumanising] = useState(false);
  const humaniseAbortRef = useRef<AbortController | null>(null);
  const [humaniseDiff, setHumaniseDiff] = useState<DiffParagraph[] | null>(null);
  // Per-figure simulated progress (0–100)
  const [figureProgress, setFigureProgress] = useState<Record<string, number>>({});
  // Image acknowledgment + progress modals
  const [showImageAck, setShowImageAck] = useState(false);
  const [showImageProgress, setShowImageProgress] = useState(false);
  // Stores chapter completion data when figures are still generating after stream ends
  const pendingCompletionRef = useRef<{
    chapter: Chapter;
    updatedProject: typeof project;
    wordCount: number;
    isTestUser: boolean;
  } | null>(null);

  // Panels & modals
  const [personaliseMode, setPersonaliseMode] = useState<"standard" | "custom" | "advanced">("standard");
  const [showPersonalise, setShowPersonalise] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProjectsDrawer, setShowProjectsDrawer] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [splitPane, setSplitPane] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [correctionDiff, setCorrectionDiff] = useState<DiffParagraph[] | null>(null);
  const [correctionRevised, setCorrectionRevised] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  // Inline text editing toolbar
  const [textSelection, setTextSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditAction, setInlineEditAction] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTour, setShowTour] = useState(false);
  // Supervisor share link
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [supervisorCommentCounts, setSupervisorCommentCounts] = useState<Record<string, number>>({});
  // Chapter guide panel
  const [showGuide, setShowGuide] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportChModal, setShowExportChModal] = useState(false);
  const [showFinalExport, setShowFinalExport] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reviseText, setReviseText] = useState("");
  const [personalise, setPersonalise] = useState<PersonaliseState>({ ...defaultPersonalise });
  const [dynamicTheorists, setDynamicTheorists] = useState<string[]>([]);
  const [theoristsLoading, setTheoristsLoading] = useState(false);
  const theoristsCacheRef = useRef<Record<string, string[]>>({});

  // Reset edit mode and clear text selection when switching chapters
  useEffect(() => {
    setIsEditMode(false);
    setSplitPane(false);
    setTextSelection(null);
    setCorrectionDiff(null);
    setCorrectionRevised(null);
  }, [activeChapterIndex]);

  // Auto-disable split pane on narrow viewports
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setSplitPane(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Show onboarding tour for first-time studio visitors
  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(`ps:studio-toured:${user.id}`)) setShowTour(true);
    } catch { /* quota / private mode */ }
  }, [user?.id]);

  // Restore personalise from chapter draft_config when switching chapters
  useEffect(() => {
    if (!project) return;
    const ch = project.chapters.find(c => c.order_index === activeChapterIndex);
    if (ch?.draft_config && (ch.draft_config as any).personalise) {
      setPersonalise(prev => ({ ...prev, ...(ch.draft_config as any).personalise }));
    } else {
      // Pre-populate hypotheses from project creation only if user opted in
      const dc = ch?.draft_config as any;
      if (dc?.includeHypotheses === true && dc.hypotheses?.length > 0) {
        setPersonalise(prev => ({
          ...prev,
          includeHypotheses: true,
          hypothesesText: dc.hypotheses.map((h: string, i: number) => `H${i + 1}: ${h}`).join("\n"),
        }));
      }
    }
  }, [activeChapterIndex, project?.id]);

  // Hydrate `inlineImages` from chapter_figures whenever the active chapter
  // changes. Without this, reopening a previously-written chapter shows the
  // grey "[Figure placeholder]" even though the real PNG is in the database.
  // Match by figure number (the writer keys as fig-X.Y, batch jobs as fig_X.Y),
  // falling back to title-includes for safety.
  useEffect(() => {
    if (!project || !user) return;
    const ch = project.chapters.find(c => c.order_index === activeChapterIndex);
    if (!ch?.id || !ch.content) return;
    // Skip while actively streaming — the in-flight effect handles those.
    if (isGenerating) return;
    // Collect every marker in the saved chapter
    const markers = [...ch.content.matchAll(/<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g)];
    if (markers.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("chapter_figures")
        .select("figure_id, title, image_data_uri")
        .eq("chapter_id", ch.id);
      if (cancelled || error || !data?.length) return;
      const updates: Record<string, { status: "done"; imageUrl: string; title: string }> = {};
      for (const m of markers) {
        const num = m[1].trim();
        const title = m[2].trim();
        const figId = `fig-${num}`;
        // 1) exact id match (fig-X.Y or fig_X.Y)
        const exact = data.find(r => r.figure_id === `fig-${num}` || r.figure_id === `fig_${num}`);
        // 2) title fallback
        const titleHit = !exact && title
          ? data.find(r => (r.title || "").toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes((r.title || "").toLowerCase()))
          : undefined;
        const row = exact || titleHit;
        if (row?.image_data_uri) {
          updates[figId] = { status: "done", imageUrl: row.image_data_uri, title };
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setInlineImages(prev => ({ ...updates, ...prev })); // prev wins so in-flight loading isn't clobbered
      }
    })();
    return () => { cancelled = true; };
  }, [activeChapterIndex, project?.id, project?.chapters.find(c => c.order_index === activeChapterIndex)?.content?.length, user?.id, isGenerating]);

  // When all figures for a pending-completion chapter finish (success OR error),
  // mark it completed. A chapter must NOT be blocked forever by a figure that
  // failed to generate — the user can regenerate the figure separately.
  useEffect(() => {
    if (!pendingCompletionRef.current) return;
    const { chapter, updatedProject, wordCount } = pendingCompletionRef.current;
    // Use the FULL marker regex so we have title + description for backfill.
    const fullRegex = /<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g;
    const markers = [...(chapter.content || "").matchAll(fullRegex)];

    // Defensive backfill: any marker present in the final content but never
    // seen by the streaming-detection effect (landed in the final delta after
    // the effect's last run, OR the chapter was hydrated from server resume)
    // — actually try to generate the image, don't just error it out.
    const missingFigs = markers.filter(m => !inlineImages[`fig-${m[1]}`]);
    if (missingFigs.length > 0 && project && user && currentChapter) {
      setInlineImages(prev => {
        const next = { ...prev };
        for (const m of missingFigs) {
          const id = `fig-${m[1]}`;
          if (!next[id]) next[id] = { status: "loading", title: m[2].trim() };
        }
        return next;
      });
      // Fire generation requests in parallel (non-blocking)
      missingFigs.forEach((m) => {
        const figureId = `fig-${m[1]}`;
        const figNumber = m[1];
        const title = m[2].trim();
        const description = m[3].trim();
        if (processedMarkersRef.current.has(figureId)) return;
        processedMarkersRef.current.add(figureId);
        console.log(`[figure-backfill] generating ${figureId}: ${title}`);
        (async () => {
          try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 90_000);
            const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-images`, {
              method: "POST",
              headers: await authedHeaders(),
              body: JSON.stringify({ figureId, figureNumber: figNumber, title, description, projectTitle: project.title, chapterId: currentChapter.id }),
              signal: ctl.signal,
            });
            clearTimeout(t);
            if (resp.ok) {
              const data = await resp.json();
              const url: string | undefined = data.imageUrl || data.dataUrl;
              if (url) {
                setInlineImages(prev => ({ ...prev, [figureId]: { status: "done", imageUrl: url, title } }));
                if (currentChapter && user) {
                  await supabase.from("chapter_figures").upsert({
                    chapter_id: currentChapter.id, user_id: user.id, figure_id: figureId,
                    figure_number: figNumber, title, description,
                    source_line: "Source: Author's analysis", image_data_uri: url,
                  }, { onConflict: "chapter_id,figure_id" });
                }
                return;
              }
            }
            console.warn(`[figure-backfill] ${figureId} failed (${resp.status})`);
            setInlineImages(prev => ({ ...prev, [figureId]: { status: "error", title } }));
          } catch (e) {
            console.warn(`[figure-backfill] ${figureId} threw:`, e);
            setInlineImages(prev => ({ ...prev, [figureId]: { status: "error", title } }));
          }
        })();
      });
      return; // re-run when state updates
    }


    const stillLoading = markers.filter(m => {
      const img = inlineImages[`fig-${m[1]}`];
      return img?.status === "loading";
    }).length;
    if (stillLoading > 0) {
      setGenStatus(`Generating figures (${stillLoading} remaining)…`);
      return;
    }
    pendingCompletionRef.current = null;
    handleUpdate(updatedProject as any);
    setGenStatus("");
    setIsGenerating(false);
    // Count successful vs failed embeds so the user knows what to expect on download
    const total = markers.length;
    const ok = markers.filter(m => inlineImages[`fig-${m[1]}`]?.status === "done").length;
    const failed = total - ok;
    if (total === 0) {
      toast.success(`${chapter.title} — ${wordCount.toLocaleString()} words`);
    } else if (failed === 0) {
      toast.success(`${chapter.title} — ${wordCount.toLocaleString()} words · ${ok} ${ok === 1 ? "figure" : "figures"} embedded`);
    } else {
      toast.success(`${chapter.title} — ${wordCount.toLocaleString()} words · ${ok}/${total} figures embedded`);
      toast.warning(`${failed} ${failed === 1 ? "figure" : "figures"} didn't generate — click "Download Images" to retry`);
    }
  }, [inlineImages]);

  // Watchdog: if any figure stays in "loading" for >120s, force it to "error"
  // so the chapter-completion gate above can fire. Belt-and-braces protection
  // against silent edge-function timeouts.
  useEffect(() => {
    const loadingIds = Object.entries(inlineImages)
      .filter(([, v]) => v?.status === "loading")
      .map(([id]) => id);
    if (loadingIds.length === 0) return;
    const watchdog = setTimeout(() => {
      setInlineImages(prev => {
        const next = { ...prev };
        for (const id of loadingIds) {
          if (next[id]?.status === "loading") {
            console.warn(`[figure-watchdog] forcing ${id} to error after 120s`);
            next[id] = { ...next[id], status: "error" };
          }
        }
        return next;
      });
    }, 120_000);
    return () => clearTimeout(watchdog);
  }, [inlineImages]);

  // First time the user sees an image being generated, show the
  // "images only render in the downloaded document" notice.
  useEffect(() => {
    const anyLoading = Object.values(inlineImages).some(v => v?.status === "loading");
    if (anyLoading && !hasAckedImageNotice()) setShowImageAck(true);
    // Auto-open progress modal once acknowledged and there's something to track
    if (anyLoading && hasAckedImageNotice() && !showImageProgress) setShowImageProgress(true);
  }, [inlineImages, showImageProgress]);

  // Aggregate progress for the live image-progress modal
  const imageProgressInfo = useMemo(() => {
    const entries = Object.values(inlineImages);
    const total = entries.length;
    const done = entries.filter(v => v?.status === "done").length;
    const failed = entries.filter(v => v?.status === "error").length;
    const loading = entries.filter(v => v?.status === "loading").length;
    return { total, done, failed, loading };
  }, [inlineImages]);

  // Hard ceiling: 180s after pendingCompletionRef is set, force-complete the
  // chapter no matter what so the user is never stuck on "Generating figures…".
  useEffect(() => {
    if (!pendingCompletionRef.current) return;
    const ceiling = setTimeout(() => {
      const ref = pendingCompletionRef.current;
      if (!ref) return;
      console.warn("[figure-ceiling] 180s reached — force-completing chapter");
      pendingCompletionRef.current = null;
      handleUpdate(ref.updatedProject as any);
      setGenStatus("");
      setIsGenerating(false);
      toast.error("Some figures could not generate — use the Regenerate button on each.");
    }, 180_000);
    return () => clearTimeout(ceiling);
  }, [pendingCompletionRef.current]);

  // Dynamic theorists via AI
  useEffect(() => {
    if (!project) return;
    const cacheKey = `${project.field_of_study}|${project.title}|${project.research_framework}`;
    if (theoristsCacheRef.current[cacheKey]) {
      setDynamicTheorists(theoristsCacheRef.current[cacheKey]);
      return;
    }
    setTheoristsLoading(true);
    (async () => {
    const headers = await authedHeaders().catch(() => null);
    if (!headers) { setTheoristsLoading(false); return; }
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-objectives`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: project.title, field: project.field_of_study,
        methodology: project.research_methodology, framework: project.research_framework,
        degree: project.degree, objectiveCount: 0,
        requestType: "theorists",
      }),
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.theorists?.length) {
        theoristsCacheRef.current[cacheKey] = data.theorists;
        setDynamicTheorists(data.theorists);
      } else {
        // Fallback to static
        const field = guessField(project.title, project.field_of_study);
        const fallback = [...new Set([...(THEORIST_DB[field] || []), ...(THEORIST_DB.default || [])])].slice(0, 12);
        setDynamicTheorists(fallback);
      }
    }).catch(() => {
      const field = guessField(project.title, project.field_of_study);
      const fallback = [...new Set([...(THEORIST_DB[field] || []), ...(THEORIST_DB.default || [])])].slice(0, 12);
      setDynamicTheorists(fallback);
    }).finally(() => setTheoristsLoading(false));
    })();
  }, [project?.title, project?.field_of_study, project?.research_framework]);

  // Suggested theorists — uses dynamic AI results with static fallback
  const suggestedTheorists = useMemo(() => {
    if (dynamicTheorists.length > 0) return dynamicTheorists;
    if (!project) return [];
    const field = guessField(project.title, project.field_of_study);
    const fieldTheories = THEORIST_DB[field] || [];
    const defaults = THEORIST_DB.default || [];
    return [...new Set([...fieldTheories, ...defaults])].slice(0, 12);
  }, [project?.title, project?.field_of_study, dynamicTheorists]);

  // Dynamic lit review authors based on topic field
  const suggestedLitAuthors = useMemo(() => {
    const all = suggestedTheorists;
    return all.slice(0, 8).map((t, i) => {
      const hash = t.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const year = 2018 + (hash % 9);
      const match = t.match(/^([^(]+)\(([^)]+)\)/);
      if (match) return `${match[1].trim()} (${year})`;
      return `${t} (${year})`;
    });
  }, [suggestedTheorists]);

  useEffect(() => {
    if (!user || !projectId) return;
    loadProject();
    loadUserSettings();
  }, [user?.id, projectId]);

  const loadUserSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("settings_json").eq("user_id", user.id).maybeSingle();
    if (!data?.settings_json) return;
    const s = data.settings_json as Record<string, string>;
    // Apply default model if valid
    if (s.default_ai_model) {
      const { getModelById } = await import("@/lib/aiModels");
      if (getModelById(s.default_ai_model)) setSelectedModelId(s.default_ai_model);
    }
    // Store other style settings for use in generation
    setUserStyleSettings(s);
  };

  const loadProject = async () => {
    if (!user) return;
    if (project && project.id === projectId) return;
    setLoading(true);
    try {
      const [projects, sub] = await Promise.all([fetchProjects(user.id), getUserSubscription(user.id)]);
      setAllProjects(projects);
      // Override subscription for test user — full unlimited access
      if (user.email === "grey.izilein@gmail.com") {
        setSubscription({ tier: "phd", word_limit: 999999, words_used: 0, status: "active" });
      } else {
        setSubscription(sub);
      }
      const found = projects.find(p => p.id === projectId);
        if (found) {
          setProject(found);
          if (found.chapters.length === 0) {
            const methKey = found.research_methodology as keyof typeof CHAPTER_CONFIGS;
            const configs = CHAPTER_CONFIGS[methKey] || CHAPTER_CONFIGS["Quantitative"];
            const totalDefault = configs.reduce((sum, c) => sum + c.words, 0);
            const initialChapters = configs.map((c, i) => ({
              id: crypto.randomUUID(), order_index: i, title: c.title, type: c.type,
              content: "", status: "pending" as const,
              word_count_target: Math.round((c.words / totalDefault) * found.word_count), word_count_actual: 0
            }));
            const updated = { ...found, chapters: initialChapters };
            setProject(updated);
            await updateProject(user.id, updated);
          } else {
            // Fix methodology mismatch: update chapter titles to match project methodology
            const methKey = found.research_methodology as keyof typeof CHAPTER_CONFIGS;
            const configs = CHAPTER_CONFIGS[methKey] || CHAPTER_CONFIGS["Quantitative"];
            const needsUpdate = found.chapters.some((ch, i) => {
              const config = configs.find(c => c.type === ch.type);
              return config && config.title !== ch.title;
            });
            if (needsUpdate) {
              const fixedChapters = found.chapters.map(ch => {
                const config = configs.find(c => c.type === ch.type);
                return config ? { ...ch, title: config.title } : ch;
              });
              const updated = { ...found, chapters: fixedChapters };
              setProject(updated);
              await updateProject(user.id, updated);
            }
          }
          const firstPending = found.chapters.find(c => c.status !== "completed");
          if (firstPending) setActiveChapterIndex(firstPending.order_index);
      } else {
        toast.error("Project not found");
        navigate("/new-project");
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  // ── Resume tailer for in-progress chapter writes ──
  // When the server is mid-write (started in another tab, after disconnect, etc.)
  // we poll chapters.draft_config._stream every ~1.5s and mirror progress.
  const stopTailing = useCallback(() => {
    if (tailingTimerRef.current) {
      window.clearInterval(tailingTimerRef.current);
      tailingTimerRef.current = null;
    }
    tailingChapterIdRef.current = null;
  }, []);

  const startTailingChapter = useCallback((chapterId: string) => {
    if (tailingChapterIdRef.current === chapterId) return;
    stopTailing();
    tailingChapterIdRef.current = chapterId;
    setIsGenerating(true);
    setError(null);
    setGenStatus("Resuming generation…");
    let lastContentLen = 0;
    let stuckTicks = 0;
    const tick = async () => {
      if (tailingChapterIdRef.current !== chapterId) return;
      try {
        const { data: row } = await supabase
          .from("chapters")
          .select("content, draft_config, word_count_actual, status")
          .eq("id", chapterId)
          .maybeSingle();
        const stream = (row?.draft_config as any)?._stream || {};
        const fullText: string = stream.full_text || row?.content || "";
        const inProgress: boolean = !!stream.in_progress;
        const status: string = stream.completion_status || "";
        const lastSeen = stream.last_seen_at ? Date.parse(stream.last_seen_at) : 0;
        const heartbeatAge = lastSeen ? Date.now() - lastSeen : Infinity;

        if (fullText && fullText.length > lastContentLen) {
          lastContentLen = fullText.length;
          stuckTicks = 0;
          setStreamingContent(fullText);
          const words = fullText.split(/\s+/).filter(Boolean).length;
          setGenStatus(`Resuming… ${words.toLocaleString()} words`);
        } else {
          stuckTicks += 1;
        }

        // Exit conditions:
        // 1. Server marked complete (in_progress=false)
        // 2. Heartbeat has been silent for >90s (server died)
        // 3. Content has been stuck for >40 ticks (~60s) with no heartbeat
        const finished = !inProgress && (status === "done" || status === "stopped" || status === "error");
        const heartbeatDead = heartbeatAge > 90_000;
        const stuck = stuckTicks > 40 && heartbeatAge > 30_000;

        if (finished || heartbeatDead || stuck) {
          stopTailing();
          // Apply finalised content to project state
          const finalText = fullText;
          const wordCount = countBodyWords(finalText);
          if (project) {
            const updated = {
              ...project,
              chapters: project.chapters.map(c =>
                c.id === chapterId
                  ? {
                      ...c,
                      content: finalText,
                      status: status === "done" ? ("completed" as const) : c.status,
                      word_count_actual: wordCount,
                    }
                  : c
              ),
            };
            handleUpdate(updated);
          }
          setIsGenerating(false);
          setGenStatus("");
          setStreamingContent("");
          if (status === "done") {
            toast.success(`Chapter generated — ${wordCount.toLocaleString()} words`);
          } else if (status === "stopped") {
            toast.info(`Generation stopped — ${wordCount.toLocaleString()} words saved`);
          } else if (status === "error" || heartbeatDead || stuck) {
            toast.warning("Generation lost connection. Saved partial work.");
          }
        }
      } catch (e) {
        console.warn("[writer-tail] tick failed:", e);
      }
    };
    // Kick off immediately, then poll
    tick();
    tailingTimerRef.current = window.setInterval(tick, 1500);
  }, [project, stopTailing]);

  // On mount / project load, detect any chapter currently being written server-side.
  useEffect(() => {
    if (!project || isGenerating) return;
    for (const ch of project.chapters) {
      const stream = (ch.draft_config as any)?._stream;
      if (!stream?.in_progress) continue;
      const lastSeen = stream.last_seen_at ? Date.parse(stream.last_seen_at) : 0;
      if (!lastSeen) continue;
      // Resume only if heartbeat is fresh (< 60s old)
      if (Date.now() - lastSeen < 60_000) {
        // Switch to that chapter and start tailing
        if (ch.order_index !== activeChapterIndex) setActiveChapterIndex(ch.order_index);
        if (stream.full_text) setStreamingContent(stream.full_text);
        startTailingChapter(ch.id);
        toast.info(`Resuming "${ch.title}" — generation continued in background`);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Load supervisor comment counts for this project's share link(s)
  useEffect(() => {
    if (!project?.id) return;
    (async () => {
      const { data: links } = await supabase
        .from("share_links")
        .select("id")
        .eq("project_id", project.id);
      if (!links || links.length === 0) return;
      const { data: coms } = await supabase
        .from("supervisor_comments")
        .select("chapter_id")
        .in("share_link_id", links.map(l => l.id));
      if (!coms) return;
      const counts: Record<string, number> = {};
      coms.forEach(c => { counts[c.chapter_id] = (counts[c.chapter_id] || 0) + 1; });
      setSupervisorCommentCounts(counts);
    })();
  }, [project?.id]);

  // Clean up tailer on unmount
  useEffect(() => {
    return () => stopTailing();
  }, [stopTailing]);

  // Stop button handler — writes stop_requested=true so the server-side
  // tee aborts the upstream Claude/Gateway call. Also closes the local
  // SSE connection so the UI shows immediate feedback.
  const handleStopGeneration = useCallback(async () => {
    userStoppedRef.current = true;
    const ch = project?.chapters.find(c => c.order_index === activeChapterIndex);
    if (ch?.id) {
      try {
        // Read current draft_config so we don't clobber other fields.
        const { data: row } = await supabase
          .from("chapters")
          .select("draft_config")
          .eq("id", ch.id)
          .maybeSingle();
        const cfg = (row?.draft_config as any) || {};
        const nextStream = { ...(cfg._stream || {}), stop_requested: true };
        await supabase
          .from("chapters")
          .update({ draft_config: { ...cfg, _stream: nextStream } })
          .eq("id", ch.id);
      } catch (e) {
        console.warn("[writer-stop] failed to set stop flag:", e);
      }
    }
    abortControllerRef.current?.abort();
    setGenStatus("Stopping…");
  }, [project, activeChapterIndex]);



  // Revise trigger effect — must be before early return
  const [triggerGenerate, setTriggerGenerate] = useState(false);
  useEffect(() => {
    if (pendingReviseRef.current && personalise.notes === reviseText && reviseText) {
      pendingReviseRef.current = false;
      setTriggerGenerate(true);
    }
  }, [personalise.notes]);

  // ── localStorage auto-save: keep streaming content in case browser suspends the tab ──
  useEffect(() => {
    const ch = project?.chapters.find(c => c.order_index === activeChapterIndex);
    if (!isGenerating || !ch) return;
    const key = `ps_draft_${ch.id}`;
    recoveryKeyRef.current = key;
    const timer = setInterval(() => {
      if (streamingContent.length > 200) {
        localStorage.setItem(key, JSON.stringify({ content: streamingContent, savedAt: Date.now() }));
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [isGenerating, streamingContent, activeChapterIndex, project?.id]);

  // On chapter switch, check for an unfinished auto-saved draft
  useEffect(() => {
    const ch = project?.chapters.find(c => c.order_index === activeChapterIndex);
    if (!ch || ch.status === "completed") {
      setShowRecovery(false);
      return;
    }
    const key = `ps_draft_${ch.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const { content, savedAt } = JSON.parse(raw);
      if (content && content.length > 300 && Date.now() - savedAt < 7_200_000) {
        setRecoveryContent(content);
        setShowRecovery(true);
        recoveryKeyRef.current = key;
      }
    } catch { /* ignore corrupt entries */ }
  }, [activeChapterIndex, project?.id]);

  // ── Dismiss selection toolbar when clicking outside it ──
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const toolbar = document.getElementById("contextual-toolbar");
      if (toolbar && toolbar.contains(e.target as Node)) return;
      setTextSelection(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // ── Detect figure markers in streaming content ──
  // Do NOT call image generation while prose is still streaming. The writer must
  // finish first; figures are queued after the final chapter text is saved so
  // the drafting UI can never be replaced by a figure-generation wait screen.
  useEffect(() => {
    if (!isGenerating || !streamingContent || !project) return;
    const markerRegex = /<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g;
    let match;
    while ((match = markerRegex.exec(streamingContent)) !== null) {
      const figureId = `fig-${match[1]}`;
      const title = match[2].trim();
      setInlineImages(prev => prev[figureId] ? prev : { ...prev, [figureId]: { status: "loading", title } });
    }
  }, [streamingContent, isGenerating, project?.title]);

  // Reset processed markers when starting a new generation
  useEffect(() => {
    if (isGenerating) {
      processedMarkersRef.current.clear();
      setInlineImages({});
    }
  }, [isGenerating]);

  // Early return AFTER all hooks
  if (loading || !project) {
    return <BookLoader fullScreen label="Loading your project…" />;
  }

  const currentChapter = project.chapters.find(c => c.order_index === activeChapterIndex);
  const completedCount = project.chapters.filter(c => c.status === "completed").length;
  const targetWC = currentChapter?.word_count_target || 0;

  // Chapter locking — sequential order enforcement
  const isChapterLocked = (ch: Chapter): boolean => {
    if (ch.order_index === 0) return false; // First chapter always unlocked
    const prevChapter = project.chapters.find(c => c.order_index === ch.order_index - 1);
    return !prevChapter || prevChapter.status !== "completed";
  };
  const currentLocked = currentChapter ? isChapterLocked(currentChapter) : false;

  // Build previous chapters context for AI awareness
  const getPreviousChaptersContext = (): string => {
    // Build full study-level context so the AI understands the entire dissertation
    const parts: string[] = [];
    
    // Study overview — always inject
    parts.push(`## STUDY OVERVIEW (you are writing this dissertation)
- Title: "${project.title}"
- Degree: ${project.degree} | Field: ${project.field_of_study} | University: ${project.university}
- Methodology: ${project.research_methodology}
- Data Collection: ${project.data_collection_method} | Sampling: ${project.sampling_technique} (n=${project.sample_size})
- Framework: ${project.research_framework}
- Objectives: ${(project.research_objectives || []).filter(Boolean).map((o, i) => `${i+1}. ${o}`).join("; ")}
- Questions: ${(project.research_questions || []).filter(Boolean).map((q, i) => `${i+1}. ${q}`).join("; ")}
- Citation Style: ${project.citation_style}`);

    // Central argument / thesis — extracted from the Introduction so all subsequent
    // chapters can thread the same argument rather than restarting from scratch
    if (currentChapter?.type !== "introduction" && currentChapter?.type !== "abstract") {
      const introChapter = project.chapters.find(c => c.type === "introduction" && c.content);
      if (introChapter) {
        const introContent = introChapter.content || "";
        // Strip markdown headings from the first ~1000 chars to get the opening argument prose
        const thesisArea = introContent.slice(0, 1000).replace(/^#+\s+.*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
        if (thesisArea) {
          parts.push(`## CENTRAL ARGUMENT & THESIS (extracted from Introduction — thread this throughout)
${thesisArea}`);
        }
      }
    }

    // Previous chapters — key content for coherence
    if (currentChapter && currentChapter.order_index > 0) {
      const prevChapters = project.chapters
        .filter(c => c.order_index < currentChapter.order_index && c.content)
        .sort((a, b) => a.order_index - b.order_index);
      if (prevChapters.length > 0) {
        parts.push("## PREVIOUSLY WRITTEN CHAPTERS");
        prevChapters.forEach(c => {
          const content = c.content || "";
          const refIdx = content.search(/^##\s+Ref/im);
          const mainContent = refIdx >= 0 ? content.slice(0, refIdx) : content;
          // Hand the AI the FULL prior chapter (refs stripped). Only ceiling at 25k chars
          // so we don't blow the model context window when concatenating 4+ chapters.
          const summary = mainContent.length > 25000 ? mainContent.slice(0, 25000) + "\n\n[…chapter truncated at 25k chars to fit context window]" : mainContent;
          parts.push(`### ${c.title}\n${summary}`);
        });
      }
    }

    return parts.join("\n\n");
  };

  // Count body words only (excludes References / Bibliography / Reference List)
  const countBodyWords = (content: string): number => countWords(extractBodyContent(content));

  const isTestUser = user?.email === "grey.izilein@gmail.com";

  const currentWC = isGenerating ? countBodyWords(streamingContent) : (currentChapter?.word_count_actual || 0);
  const wcPct = targetWC > 0 ? Math.min(Math.round((currentWC / targetWC) * 100), 100) : 0;

  const handleTourDone = () => {
    if (user) {
      try { localStorage.setItem(`ps:studio-toured:${user.id}`, "1"); } catch {}
    }
    setShowTour(false);
  };

  const handleChapterManagerSave = async (result: { chapters: Chapter[]; deletedIds: string[] }) => {
    if (!project || !user) return;
    if (result.deletedIds.length > 0) {
      try {
        await supabase.from("chapters").delete().in("id", result.deletedIds);
      } catch (err: any) {
        toast.error("Failed to delete chapters: " + err.message);
        return;
      }
    }
    const reindexed = result.chapters.map((ch, i) => ({ ...ch, order_index: i }));
    // If the active chapter was deleted, reset to first available
    const activeStillExists = reindexed.some(ch => ch.order_index === activeChapterIndex);
    if (!activeStillExists && reindexed.length > 0) setActiveChapterIndex(reindexed[0].order_index);
    handleUpdate({ ...project, chapters: reindexed });
    setShowReorderModal(false);
  };

  const handleShare = async () => {
    if (!project || !user) return;
    setShareLoading(true);
    try {
      const { data: existing } = await supabase
        .from("share_links")
        .select("token")
        .eq("project_id", project.id)
        .maybeSingle();

      let token: string;
      if (existing) {
        token = existing.token;
      } else {
        token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        const { error } = await supabase
          .from("share_links")
          .insert({ project_id: project.id, token, created_by: user.id });
        if (error) throw error;
      }

      const url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);
      setShowShareModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleUpdate = async (updated: Project) => {
    setProject(updated);
    if (user) {
      setSaveStatus("saving");
      if (saveResetRef.current) clearTimeout(saveResetRef.current);
      try {
        await updateProject(user.id, updated);
        setSaveStatus("saved");
      } catch (err: any) {
        toast.error(err.message);
        setSaveStatus("idle");
        return;
      }
      saveResetRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const queueFiguresAfterDraft = (chapter: Chapter, content: string, projectTitle: string): number => {
    if (!user || !chapter?.id || !content) return 0;
    const markerRegex = /<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g;
    const markers = [...content.matchAll(markerRegex)];
    let queued = 0;

    for (const marker of markers) {
      const figNumber = marker[1].trim();
      const figureId = `fig-${figNumber}`;
      const title = marker[2].trim();
      const description = marker[3].trim();
      if (!title || !description) continue;
      if (processedMarkersRef.current.has(figureId) && inlineImages[figureId]?.status !== "error") continue;

      processedMarkersRef.current.add(figureId);
      queued += 1;
      setInlineImages(prev => {
        if (prev[figureId]?.status === "done" || prev[figureId]?.status === "loading") return prev;
        return { ...prev, [figureId]: { status: "loading", title } };
      });
      setFigureProgress(prev => ({ ...prev, [figureId]: Math.max(prev[figureId] ?? 0, 5) }));

      const progressInterval = window.setInterval(() => {
        setFigureProgress(prev => {
          const cur = prev[figureId] ?? 0;
          if (cur >= 85) return prev;
          return { ...prev, [figureId]: cur + 6 };
        });
      }, 1000);

      void (async () => {
        try {
          const { data: cached } = await supabase
            .from("chapter_figures")
            .select("image_data_uri, figure_id")
            .eq("chapter_id", chapter.id)
            .in("figure_id", [figureId, `fig_${figNumber}`])
            .maybeSingle();
          if (cached?.image_data_uri) {
            window.clearInterval(progressInterval);
            setFigureProgress(prev => ({ ...prev, [figureId]: 100 }));
            setInlineImages(prev => ({ ...prev, [figureId]: { status: "done", imageUrl: cached.image_data_uri, title } }));
            return;
          }

          const ctl = new AbortController();
          const timeoutId = window.setTimeout(() => ctl.abort(), 90_000);
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-images`, {
            method: "POST",
            headers: await authedHeaders(),
            body: JSON.stringify({
              figureId,
              figureNumber: figNumber,
              title,
              description,
              projectTitle,
              chapterId: chapter.id,
              colourScheme: personalise.chartColourScheme,
            }),
            signal: ctl.signal,
          });
          window.clearTimeout(timeoutId);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          const url: string | undefined = data.imageUrl || data.dataUrl;
          if (!url) throw new Error("No image returned");
          window.clearInterval(progressInterval);
          setFigureProgress(prev => ({ ...prev, [figureId]: 100 }));
          setInlineImages(prev => ({ ...prev, [figureId]: { status: "done", imageUrl: url, title } }));
        } catch (e) {
          console.warn(`[figure-after-draft] ${figureId} failed:`, e);
          window.clearInterval(progressInterval);
          setFigureProgress(prev => ({ ...prev, [figureId]: 0 }));
          setInlineImages(prev => ({ ...prev, [figureId]: { status: "error", title } }));
        }
      })();
    }

    return queued;
  };

  const handleContinueWriting = async (existingContent: string, remainingWords: number) => {
    if (!currentChapter || !project) return;
    if (userStoppedRef.current) return; // User clicked Stop — don't start a new pass
    userStoppedRef.current = false;
    setIsGenerating(true); setError(null);
    setGenStatus(`Continuing... targeting ${remainingWords} more words`);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const enhancedConfig = {
      ...draftConfig,
      target_words: currentChapter.word_count_target || 2000,
      personalise: { ...personalise },
      style_settings: userStyleSettings,
    };

    const projectPayload = {
      title: project.title, degree: project.degree, university: project.university,
      field_of_study: project.field_of_study, research_methodology: project.research_methodology,
      data_collection_method: project.data_collection_method, sampling_technique: project.sampling_technique,
      sample_size: project.sample_size, research_framework: project.research_framework,
      framework_justification: project.framework_justification, research_objectives: project.research_objectives,
      research_questions: project.research_questions, citation_style: project.citation_style,
      language_style: project.language_style,
    };

    // Strip references section before sending to AI — prevents duplicate ref lists
    const bodyOnly = extractBodyContent(existingContent);
    // Start fullContent from bodyOnly so AI appends cleanly: body1 + body2 + refs (one section)
    let fullContent = bodyOnly;
    setStreamingContent(fullContent);

    try {
      await streamGenerateChapter({
        project: projectPayload,
        chapter: { id: currentChapter.id, type: currentChapter.type, title: currentChapter.title },
        draftConfig: enhancedConfig,
        modelId: selectedModelId,
        continuation: { existingContent: bodyOnly, remainingWords },
        signal: abortController.signal,
        onDelta: (text) => {
          fullContent += text;
          setStreamingContent(fullContent);
          const words = fullContent.split(/\s+/).filter(Boolean).length;
          setGenStatus(`Continuing... ${words.toLocaleString()} words`);
        },
        onDone: (polishedContent) => {
          if (polishedContent) fullContent = polishedContent;
          const wordCount = countBodyWords(fullContent);
          const target = currentChapter.word_count_target || 0;

          const gap = target - wordCount;
          if (!userStoppedRef.current && gap > 200 && continueCountRef.current < 3) {
            continueCountRef.current += 1;
            toast.info(`Auto-continuing (pass ${continueCountRef.current + 1}) — ${wordCount.toLocaleString()} / ${target.toLocaleString()} words`);
            handleContinueWriting(fullContent, gap);
            return;
          }

          continueCountRef.current = 0;
          userStoppedRef.current = false;
          const updatedChapter: Chapter = {
            ...currentChapter, content: fullContent, status: "completed",
            word_count_actual: wordCount, draft_config: enhancedConfig,
          };
          const updatedChapters = project.chapters.map(c => c.order_index === activeChapterIndex ? updatedChapter : c);
          // Track word usage for continue-writing — only for first drafts, not redrafts; skip for test user
          if (user && !isTestUser && currentChapter.status === "pending") {
            const newWords = wordCount - (currentChapter.word_count_actual || 0);
            if (newWords > 0) {
              incrementWordsUsed(user.id, newWords).then(() => setSubscription(s => ({ ...s, words_used: s.words_used + newWords }))).catch(() => {});
            }
          }
          handleUpdate({ ...project, chapters: updatedChapters });
          setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          const queuedFigures = queueFiguresAfterDraft(updatedChapter, fullContent, project.title);
          toast.success(`${currentChapter.title} — ${wordCount.toLocaleString()} words`);
          if (queuedFigures > 0) toast.info(`${queuedFigures} figure${queuedFigures === 1 ? "" : "s"} queued in the background`);
        },
        onError: (errMsg) => {
          // Save what we have on error
          if (fullContent.length > bodyOnly.length + 100) {
            const wordCount = countBodyWords(fullContent);
            handleUpdate({ ...project, chapters: project.chapters.map(c => c.order_index === activeChapterIndex ? { ...currentChapter, content: fullContent, status: "completed", word_count_actual: wordCount, draft_config: enhancedConfig } : c) });
          }
          setError(errMsg); setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          toast.error(errMsg);
        },
      });
    } catch (e: any) {
      if (fullContent.length > bodyOnly.length + 100) {
        const wordCount = countBodyWords(fullContent);
        handleUpdate({ ...project, chapters: project.chapters.map(c => c.order_index === activeChapterIndex ? { ...currentChapter, content: fullContent, status: "completed", word_count_actual: wordCount, draft_config: enhancedConfig } : c) });
        toast.info(`Saved ${wordCount.toLocaleString()} words`);
      }
      setIsGenerating(false); setGenStatus(""); setStreamingContent("");
    }
    abortControllerRef.current = null;
  };

  // Called when the user confirms the outline modal (or via direct trigger with preConfirmedHeadings)
  const handleGenerate = async (preConfirmedHeadings?: OutlineHeading[], confirmedVisuals?: import("@/components/ChapterOutlineModal").SuggestedVisual[]) => {
    if (!currentChapter || !project || !user) return;
    // Free tier: block chapters beyond Chapter 1 (skip for admin)
    if (!isTestUser && subscription.tier === "free" && activeChapterIndex > 0) {
      toast.error("Free tier only includes Chapter 1. Upgrade to generate additional chapters.");
      return;
    }
    // Subscription check — skip for test user and redrafts
    const isRedraft = currentChapter.status === "completed";
    if (!isTestUser && !isRedraft && (subscription.status === "expired" || subscription.words_used >= subscription.word_limit)) {
      toast.error(`Credits expired — you've used all ${subscription.word_limit.toLocaleString()} words on your ${subscription.tier} plan. Upgrade to continue.`);
      return;
    }
    // Block generation if chapter is locked
    if (currentLocked) {
      toast.error("Complete the previous chapter first before drafting this one.");
      return;
    }
    setShowOutlineModal(false);
    setIsGenerating(true); setShowPersonalise(false); setShowModelPicker(false);
    setError(null); setStreamingContent("");
    setGenStatus("Connecting to AI engine...");
    continueCountRef.current = 0;
    userStoppedRef.current = false;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Merge confirmed outline headings into draftConfig
    const outlineHeadings = preConfirmedHeadings
      ? preConfirmedHeadings.map(h => ({ text: `${h.number} ${h.text}`, target_words: h.wordCount }))
      : draftConfig.headings || [];

    const visualInstructions = confirmedVisuals && confirmedVisuals.length > 0
      ? confirmedVisuals.map(v => `[${v.type === "image" ? "FIGURE" : "TABLE"}] ${v.description}`).join("\n")
      : undefined;

    const enhancedConfig = {
      ...draftConfig,
      target_words: currentChapter.word_count_target || 2000,
      headings: outlineHeadings,
      personalise: { ...personalise },
      uploaded_data: personalise.uploadedData || undefined,
      style_settings: userStyleSettings,
      visual_instructions: visualInstructions,
      confirmed_visuals: confirmedVisuals || [],
    };

    const projectPayload = {
      title: project.title, degree: project.degree, university: project.university,
      field_of_study: project.field_of_study, research_methodology: project.research_methodology,
      data_collection_method: project.data_collection_method, sampling_technique: project.sampling_technique,
      sample_size: project.sample_size, research_framework: project.research_framework,
      framework_justification: project.framework_justification, research_objectives: project.research_objectives,
      research_questions: project.research_questions, citation_style: project.citation_style,
      language_style: project.language_style,
    };

    let fullContent = "";

    try {
      await streamGenerateChapter({
        project: projectPayload,
        chapter: { id: currentChapter.id, type: currentChapter.type, title: currentChapter.title },
        draftConfig: { ...enhancedConfig, previousChaptersContext: getPreviousChaptersContext() },
        modelId: selectedModelId,
        signal: abortController.signal,
        onDelta: (text) => {
          fullContent += text;
          setStreamingContent(fullContent);
          const words = fullContent.split(/\s+/).filter(Boolean).length;
          if (words < 100) setGenStatus("Drafting introduction...");
          else if (words < 500) setGenStatus("Developing arguments...");
          else if (words < 1000) setGenStatus("Synthesizing evidence...");
          else setGenStatus(`Writing... ${words.toLocaleString()} words`);
        },
        onDone: (polishedContent) => {
          if (polishedContent) fullContent = polishedContent;
          const wordCount = countBodyWords(fullContent);
          const target = currentChapter.word_count_target || 0;

          // Auto-continue if below target, up to 3 times, unless user stopped
          const gap = target - wordCount;
          if (!userStoppedRef.current && gap > 200 && continueCountRef.current < 3) {
            continueCountRef.current += 1;
            toast.info(`Auto-continuing (pass ${continueCountRef.current + 1}) — ${wordCount.toLocaleString()} / ${target.toLocaleString()} words`);
            // Save partial
            const partialChapter = { ...currentChapter, content: fullContent, word_count_actual: wordCount };
            handleUpdate({ ...project, chapters: project.chapters.map(c => c.order_index === activeChapterIndex ? partialChapter : c) });
            handleContinueWriting(fullContent, gap);
            return;
          }

          continueCountRef.current = 0;
          userStoppedRef.current = false;
          const updatedChapter: Chapter = {
            ...currentChapter, content: fullContent, status: "completed",
            word_count_actual: wordCount, draft_config: enhancedConfig,
          };
          handleUpdate({ ...project, chapters: project.chapters.map(c => c.order_index === activeChapterIndex ? updatedChapter : c) });
          // Track word usage — only first drafts, skip test user
          if (user && !isTestUser && !isRedraft) {
            incrementWordsUsed(user.id, wordCount).then(() => setSubscription(s => ({ ...s, words_used: s.words_used + wordCount }))).catch(() => {});
          }
          setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          const queuedFigures = queueFiguresAfterDraft(updatedChapter, fullContent, project.title);
          toast.success(`${currentChapter.title} generated — ${wordCount.toLocaleString()} words`);
          if (queuedFigures > 0) toast.info(`${queuedFigures} figure${queuedFigures === 1 ? "" : "s"} queued in the background`);
          // Browser push notification if tab is not focused and permission granted
          if (document.hidden && Notification.permission === "granted") {
            new Notification("PAPERSTUDIO — Chapter Ready", {
              body: `${currentChapter.title} (${wordCount.toLocaleString()} words)`,
              icon: "/favicon.ico",
            });
          }
        },
        onError: (errMsg) => {
          setError(errMsg); setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          toast.error(errMsg);
        },
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
        if (fullContent.length > 100) {
          const wordCount = countBodyWords(fullContent);
          handleUpdate({ ...project, chapters: project.chapters.map(c => c.order_index === activeChapterIndex ? { ...currentChapter, content: fullContent, status: "completed", word_count_actual: wordCount, draft_config: enhancedConfig } : c) });
          toast.info(`Generation stopped — ${wordCount.toLocaleString()} words saved`);
        }
      } else { setError(e.message || "Generation failed"); toast.error(e.message); }
      setIsGenerating(false); setGenStatus(""); setStreamingContent("");
    }
    abortControllerRef.current = null;
  };

  // triggerCritique removed

  // Count figures still loading in the current chapter
  const pendingFiguresCount = (() => {
    if (!currentChapter?.content) return 0;
    const markers = [...currentChapter.content.matchAll(/<!-- FIGURE:([^:]+):/g)];
    let pending = 0;
    for (const m of markers) {
      const figId = `fig-${m[1]}`;
      const img = inlineImages[figId];
      if (img && img.status !== "done") pending++;
    }
    return pending;
  })();

  const handleAccept = () => {
    if (!currentChapter || !project) return;
    if (pendingFiguresCount > 0) {
      // Non-blocking: figures keep rendering in the background and slot into
      // the chapter the moment they're ready. The user no longer waits.
      toast.info(`${pendingFiguresCount} figure${pendingFiguresCount === 1 ? "" : "s"} still rendering — they'll appear automatically when ready`);
    } else {
      toast.success("Chapter accepted ✓");
    }
    const next = (activeChapterIndex + 1) % project.chapters.length;
    setActiveChapterIndex(next);
  };

  const handleStartHumanise = async () => {
    if (!currentChapter?.content || isHumanising) return;
    const content = currentChapter.content;
    const wordCount = countBodyWords(content);
    if (wordCount < 80) { toast.error("Chapter is too short to humanise (minimum 80 words)."); return; }

    setIsHumanising(true);
    setHumanisedText(null);
    setHumaniseStages([
      { stage: 1, label: "Structure Break", status: "pending" },
      { stage: 2, label: "Citation Texture", status: "pending" },
      { stage: 3, label: "Human Fingerprints", status: "pending" },
      { stage: 4, label: "Paragraph Rhythm", status: "pending" },
      { stage: 5, label: "Surface Polish", status: "pending" },
    ]);

    const abort = new AbortController();
    humaniseAbortRef.current = abort;

    // Hard 120s timeout — Claude Sonnet full rewrite of a long chapter can take 60-90s
    const hardTimeout = setTimeout(() => {
      abort.abort();
      toast.error("Humaniser timed out. Please try again.");
      setIsHumanising(false);
    }, 120_000);

    try {
      const headers = await authedHeaders();
      const modelId = currentChapter.draft_config?.model_id || selectedModelId;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/czar-humanise`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: content, model: modelId }),
        signal: abort.signal,
      });
      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => "");
        toast.error(`Humaniser failed (${resp.status}): ${txt.slice(0, 120)}`);
        setIsHumanising(false);
        clearTimeout(hardTimeout);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let currentEvent = "message";
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line) { currentEvent = "message"; continue; }
          if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (currentEvent === "stage_start") {
              const s = parsed.stage as number;
              setHumaniseStages(prev => prev.map(st => st.stage === s ? { ...st, status: "running" } : st));
            } else if (currentEvent === "stage_done") {
              const s = parsed.stage as number;
              setHumaniseStages(prev => prev.map(st => st.stage === s ? { ...st, status: "done" } : st));
            } else if (currentEvent === "stage_skip") {
              const s = parsed.stage as number;
              setHumaniseStages(prev => prev.map(st => st.stage === s ? { ...st, status: "skipped" } : st));
            } else if (currentEvent === "done") {
              gotDone = true;
              if (parsed?.error || parsed?.stages_completed === 0) {
                toast.error(`Humaniser error: ${parsed?.error || "no output returned. Please try again."}`);
              } else {
                const result = parsed?.humanised || "";
                if (result && result.trim().length > 50) {
                  setHumanisedText(result);
                  setHumaniseDiff(computeParaDiff(content, result));
                  setHumaniseStages(prev => prev.map(st => st.status === "pending" ? { ...st, status: "skipped" } : st));
                } else {
                  toast.error("Humaniser returned an empty result. Please try again.");
                }
              }
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!gotDone && !abort.signal.aborted) {
        toast.error("Humaniser ended unexpectedly. Please try again.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || abort.signal.aborted) {
        // Cancelled by user or hard timeout — already handled
      } else {
        toast.error(e?.message || "Humaniser failed");
      }
    } finally {
      clearTimeout(hardTimeout);
      setIsHumanising(false);
    }
  };

  const handleApplyHumanised = async () => {
    if (!humanisedText || !currentChapter || !project || !user) return;
    const wc = countBodyWords(humanisedText);
    const chapterWords = currentChapter.word_count_actual || 0;
    handleUpdate({ ...project, chapters: project.chapters.map(c => c.id === currentChapter.id ? { ...c, content: humanisedText, word_count_actual: wc } : c) });
    // Keep textarea in sync when user is in edit mode
    if (isEditMode) setEditContent(humanisedText);
    if (!isTestUser) {
      incrementWordsUsed(user.id, Math.max(0, chapterWords)).catch(() => {});
      setSubscription(s => ({ ...s, words_used: s.words_used + Math.max(0, chapterWords) }));
    }
    setShowHumanisePanel(false);
    setHumanisedText(null);
    setHumaniseDiff(null);
    setHumaniseStages([]);
    toast.success("Chapter humanised and applied.");
  };

  const handleSupervisorRevisionApplied = async (revisedContent: string, _count: number) => {
    if (!currentChapter) return;
    const diff = computeParaDiff(currentChapter.content || "", revisedContent);
    setCorrectionRevised(revisedContent);
    setCorrectionDiff(diff);
    setShowSupervisorModal(false);
  };

  const handleAcceptCorrections = async () => {
    if (!correctionRevised || !currentChapter || !project || !user) return;
    const wc = countBodyWords(correctionRevised);
    const prevContent = currentChapter.content;
    const changed = correctionDiff?.filter(p => p.type !== "unchanged").length ?? 0;
    const newRevisions = [
      ...(currentChapter.supervisor_revisions || []),
      { id: crypto.randomUUID(), applied_at: new Date().toISOString(), source: "docx" as const, items_applied: changed, previous_content: prevContent },
    ];
    handleUpdate({ ...project, chapters: project.chapters.map(c => c.id === currentChapter.id ? { ...c, content: correctionRevised, word_count_actual: wc, supervisor_revisions: newRevisions } : c) });
    setCorrectionDiff(null);
    setCorrectionRevised(null);
    toast.success("Corrections accepted and saved.");
  };

  const handleDownloadWithHighlights = () => {
    if (!correctionDiff || !currentChapter) return;
    const colors: Record<DiffParagraph["type"], string> = {
      unchanged: "transparent",
      modified: "#fef08a",
      added: "#bbf7d0",
      deleted: "#fecaca",
    };
    const paras = correctionDiff.map(p => {
      const bg = colors[p.type];
      const del = p.type === "deleted" ? " style=\"text-decoration:line-through;opacity:0.6;\"" : "";
      const wrap = bg !== "transparent"
        ? `<p style="background:${bg};padding:6px 10px;margin:8px 0;border-radius:4px;"${del}>${p.text.replace(/\n/g, "<br>")}</p>`
        : `<p>${p.text.replace(/\n/g, "<br>")}</p>`;
      return wrap;
    }).join("\n");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentChapter.title} — Corrections</title></head><body style="font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:20px;line-height:1.8;"><h1>${currentChapter.title}</h1><p style="font-size:12px;color:#666;">Legend: <span style="background:#fef08a;padding:2px 6px">Modified</span> <span style="background:#bbf7d0;padding:2px 6px">Added</span> <span style="background:#fecaca;padding:2px 6px">Deleted</span></p><hr style="margin:16px 0;">${paras}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    downloadBlob(blob, `${professionalFilename(currentChapter.title)}_Corrections.html`);
    toast.success("Highlighted corrections downloaded.");
  };

  // ── Professional filename derivation (Title_Case_Words.ext, no underscores collapsed) ──
  const professionalFilename = (base: string, suffix?: string): string => {
    const cleaned = base.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
    const titleCased = cleaned
      .split(" ")
      .map((w) => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
      .join("_");
    const suf = suffix ? `_${suffix}` : "";
    return `${titleCased || "Document"}${suf}`;
  };

  // ── Pull author/institution from profile for cover page ──
  const buildSubmissionDetails = async (): Promise<Record<string, string>> => {
    const sd: Record<string, string> = {
      institution: project?.university || "",
      moduleName: project?.field_of_study || "",
      documentType: (project?.degree || "dissertation").toLowerCase().includes("phd") ? "thesis" : "dissertation",
      submissionDate: new Date().toISOString().slice(0, 10),
    };
    try {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, university")
          .eq("user_id", user.id)
          .single();
        if (data?.display_name) sd.fullName = data.display_name;
        if (!sd.institution && data?.university) sd.institution = data.university;
      }
    } catch { /* non-fatal */ }
    return sd;
  };

  const handleDownloadChapter = () => {
    if (!currentChapter || !project) return;
    const baseName = professionalFilename(currentChapter.title, "Chapter");
    const content = currentChapter.content || "";

    if (selectedChExportFormat === "md") {
      const md = `# ${currentChapter.title}\n\n${content}\n\n[Word count: ~${(currentChapter.word_count_actual || 0).toLocaleString()} words]`;
      const blob = new Blob([md], { type: "text/markdown" });
      downloadBlob(blob, `${baseName}.md`);
    } else if (selectedChExportFormat === "txt") {
      const text = `${currentChapter.title.toUpperCase()}\n${"═".repeat(50)}\n\n${content}\n\n[Word count: ~${(currentChapter.word_count_actual || 0).toLocaleString()} words]`;
      const blob = new Blob([text], { type: "text/plain" });
      downloadBlob(blob, `${baseName}.txt`);
    } else {
      // Single-chapter docx/pdf/latex — no cover page, but consolidated reference list and clean formatting.
      exportViaEdgeFunction([currentChapter], baseName, selectedChExportFormat, { isFinalExport: false });
    }
    toast.success("Chapter downloaded");
  };

  const handleExportAll = async () => {
    if (!project) return;
    const sorted = [...project.chapters].sort((a, b) => a.order_index - b.order_index).filter(c => c.content);
    if (sorted.length === 0) { toast.error("No drafted chapters to export."); return; }
    const baseName = professionalFilename(project.title, "Dissertation");

    if (selectedExportFormat === "md") {
      const md = sorted.map(c => `# ${c.title}\n\n${c.content}`).join("\n\n---\n\n");
      const fullMd = `---\ntitle: "${project.title}"\n---\n\n${md}`;
      const blob = new Blob([fullMd], { type: "text/markdown" });
      downloadBlob(blob, `${baseName}.md`);
    } else if (selectedExportFormat === "txt") {
      const fullText = `${project.title.toUpperCase()}\n${"═".repeat(50)}\n\n${sorted.map(c => `${c.title.toUpperCase()}\n${"─".repeat(50)}\n\n${c.content}`).join("\n\n")}`;
      const blob = new Blob([fullText], { type: "text/plain" });
      downloadBlob(blob, `${baseName}.txt`);
    } else {
      // Full dissertation — render with cover page, TOC, Roman/Arabic page numbers, consolidated refs.
      const submissionDetails = await buildSubmissionDetails();
      exportViaEdgeFunction(sorted, baseName, selectedExportFormat, { isFinalExport: true, submissionDetails });
    }
    toast.success("Dissertation exported");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const exportViaEdgeFunction = async (
    chapters: Chapter[],
    filename: string,
    format: string,
    extras: { isFinalExport?: boolean; submissionDetails?: Record<string, string> } = {},
  ) => {
    try {
      toast.info("Preparing export...");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-docx`, {
        method: "POST",
        headers: await authedHeaders(),
        body: JSON.stringify({
          chapters,
          projectTitle: project?.title || "Dissertation",
          format,
          isFinalExport: !!extras.isFinalExport,
          submissionDetails: extras.submissionDetails || null,
        }),
      });
      if (!resp.ok) { const err = await resp.json(); toast.error(err.error || "Export failed"); return; }
      const data = await resp.json();

      if (data.renderAsPdf) {
        // PDF: open HTML in new window and trigger print-to-PDF
        const binary = atob(data.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const htmlBlob = new Blob([bytes], { type: "text/html" });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const w = window.open(htmlUrl, "_blank");
        if (w) {
          w.addEventListener("load", () => {
            setTimeout(() => { w.print(); }, 500);
          });
        }
        toast.success("PDF ready — use Print → Save as PDF");
        return;
      }

      if (data.encoding === "base64") {
        const binary = atob(data.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        downloadBlob(blob, data.filename || `${filename}.docx`);
      } else {
        // Plain text content (md, txt, latex)
        const blob = new Blob([data.content], { type: "text/plain" });
        downloadBlob(blob, data.filename || `${filename}.txt`);
      }
      toast.success("Export complete");
    } catch (e: any) { toast.error(e.message || "Export failed"); }
  };

  // ── File text extraction helper (handles txt/csv/md and best-effort docx/pdf) ──
  const extractFileText = async (file: File): Promise<string> => {
    const MAX_CHARS = 12_000; // per file, enough for AI context
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["txt", "csv", "tsv", "md", "json"].includes(ext)) {
      return new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(((r.result as string) || "").slice(0, MAX_CHARS));
        r.readAsText(file);
      });
    }
    if (["docx", "doc"].includes(ext)) {
      // DOCX = ZIP. Use DecompressionStream to inflate the word/document.xml entry.
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Scan for PK local file headers and find word/document.xml
        const pkSig = [0x50, 0x4b, 0x03, 0x04];
        let pos = 0;
        while (pos < bytes.length - 30) {
          if (bytes[pos] === pkSig[0] && bytes[pos+1] === pkSig[1] && bytes[pos+2] === pkSig[2] && bytes[pos+3] === pkSig[3]) {
            const compression = bytes[pos+8] | (bytes[pos+9] << 8);
            const compSize = bytes[pos+18] | (bytes[pos+19] << 8) | (bytes[pos+20] << 16) | (bytes[pos+21] << 24);
            const fnLen = bytes[pos+26] | (bytes[pos+27] << 8);
            const extraLen = bytes[pos+28] | (bytes[pos+29] << 8);
            const fnBytes = bytes.slice(pos+30, pos+30+fnLen);
            const fn = new TextDecoder().decode(fnBytes);
            const dataStart = pos + 30 + fnLen + extraLen;
            if (fn === "word/document.xml") {
              let xmlBytes: Uint8Array;
              if (compression === 0) {
                xmlBytes = bytes.slice(dataStart, dataStart + compSize);
              } else if (compression === 8) {
                const compressed = bytes.slice(dataStart, dataStart + compSize);
                const ds = new DecompressionStream("deflate-raw");
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();
                writer.write(compressed); writer.close();
                const chunks: Uint8Array[] = [];
                let r2; while (!(r2 = await reader.read()).done) chunks.push(r2.value);
                const total = chunks.reduce((s, c) => s + c.length, 0);
                xmlBytes = new Uint8Array(total);
                let off = 0; for (const c of chunks) { xmlBytes.set(c, off); off += c.length; }
              } else break;
              const xml = new TextDecoder().decode(xmlBytes);
              // Extract text from <w:t> tags
              const text = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
                .map(t => t.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
              return text.slice(0, MAX_CHARS);
            }
            pos = dataStart + compSize;
          } else { pos++; }
        }
      } catch { /* fall through */ }
      return `[${file.name} — could not extract text automatically. Please save as .txt and re-upload for best results.]`;
    }
    if (ext === "pdf") {
      // PDF: scan for BT/ET text blocks (basic, works for simple PDFs)
      try {
        const buf = await file.arrayBuffer();
        const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
        const blocks = text.match(/BT([\s\S]*?)ET/g) || [];
        const extracted = blocks.flatMap(b => b.match(/\(([^)]{1,200})\)/g) || [])
          .map(s => s.slice(1, -1).replace(/\\n/g, " ").replace(/\\/g, "")).join(" ");
        return extracted.slice(0, MAX_CHARS) || `[${file.name} — PDF text could not be extracted. Please copy-paste content into the instructions box below.]`;
      } catch { /* fall through */ }
      return `[${file.name} — paste content below for best results.]`;
    }
    return `[${file.name} — unsupported format. Supported: .txt, .csv, .md, .docx, .pdf]`;
  };

  const handleMultiFileUpload = async (files: FileList, field: "uploadedData" | "pastedInstructions") => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const results: string[] = [];
    const names: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
      const text = await extractFileText(file);
      if (text) { results.push(`=== ${file.name} ===\n${text}`); names.push(file.name); }
    }
    if (results.length === 0) return;
    const combined = results.join("\n\n");
    if (field === "uploadedData") {
      setPersonalise(p => ({ ...p, uploadedData: combined, uploadedDataFilename: names.join(", ") }));
    } else {
      setPersonalise(p => ({ ...p, pastedInstructions: (p.pastedInstructions ? p.pastedInstructions + "\n\n---\n\n" : "") + combined }));
    }
    toast.success(`${names.length} file${names.length > 1 ? "s" : ""} loaded: ${names.join(", ")}`);
  };

  const handleAutoGenerateObjectives = async () => {
    if (!project) return;
    setIsGeneratingObjectives(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-objectives`, {
        method: "POST",
        headers: await authedHeaders(),
        body: JSON.stringify({
          title: project.title, field: project.field_of_study,
          methodology: project.research_methodology, framework: project.research_framework,
          degree: project.degree, objectiveCount, includeHypotheses: personalise.includeHypotheses,
        }),
      });
      if (!resp.ok) { const err = await resp.json(); toast.error(err.error || "Generation failed"); return; }
      const data = await resp.json();
      const objText = (data.objectives || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
      const qText = (data.questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");
      const hText = (data.hypotheses || []).map((h: string, i: number) => `H${i + 1}: ${h}`).join("\n");
      setPersonalise(p => ({
        ...p,
        researchObjectivesText: objText,
        researchQuestionsText: qText,
        ...(personalise.includeHypotheses && hText ? { hypothesesText: hText } : {}),
      }));
      toast.success("Objectives, questions & hypotheses generated!");
    } catch (e: any) { toast.error(e.message || "Failed to generate"); }
    finally { setIsGeneratingObjectives(false); }
  };

  // Revision limits by tier
  const MAX_REVISIONS: Record<string, number> = { free: 0, undergraduate: 3, masters: 8, phd: 999 };
  const getMaxRevisions = () => MAX_REVISIONS[subscription.tier] ?? 0;
  const currentChapterRevisions = currentChapter ? (currentChapter as any).revision_count || 0 : 0;
  const maxRevisions = getMaxRevisions();
  const revisionsRemaining = Math.max(0, maxRevisions - currentChapterRevisions);

  // Grammar/editing engine and AI score estimator removed

  const handleRevise = () => {
    setShowReviseModal(false);
    setPersonalise(prev => ({ ...prev, notes: reviseText }));
    pendingReviseRef.current = true;
  };

  // ── Inline text-selection editing ──
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // never clear — pointerdown listener handles that
    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 4) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTextSelection({ text: selectedText, rect });
  };

  const handleInlineEdit = async (action: string) => {
    if (!textSelection || !currentChapter || inlineEditLoading) return;
    const selectedText = textSelection.text;
    setInlineEditLoading(true);
    setInlineEditAction(action);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inline-edit`,
        {
          method: "POST",
          headers: await authedHeaders(),
          body: JSON.stringify({ selection: selectedText, action, citationStyle: project?.citation_style }),
        }
      );
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Edit failed");
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let replacement = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) replacement += delta;
          } catch { /* ignore */ }
        }
      }
      if (replacement) {
        const newContent = currentChapter.content!.replace(selectedText, () => replacement.trim());
        if (newContent !== currentChapter.content) {
          const wc = countBodyWords(newContent);
          handleUpdate({
            ...project!,
            chapters: project!.chapters.map(c =>
              c.id === currentChapter.id ? { ...c, content: newContent, word_count_actual: wc } : c
            ),
          });
          toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} applied`);
        } else {
          toast.info("Couldn't locate that text in the chapter — try selecting less");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Edit failed");
    } finally {
      setInlineEditLoading(false);
      setInlineEditAction(null);
      setTextSelection(null);
    }
  };
  // Check triggerGenerate flag in a requestAnimationFrame after render
  if (triggerGenerate) {
    requestAnimationFrame(() => {
      setTriggerGenerate(false);
      setShowOutlineModal(true); // go through outline modal
    });
  }

  const handleCopy = () => {
    if (!currentChapter?.content) return;
    navigator.clipboard.writeText(currentChapter.content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const selectedModel = getModelById(selectedModelId);
  const emptyState = CHAPTER_EMPTY[currentChapter?.type || "introduction"] || { title: "Ready to draft", desc: "Click Draft." };
  const isNoCiteChapter = currentChapter?.type === "conclusion" || currentChapter?.type === "abstract";
  const isReuseCiteChapter = currentChapter?.type === "findings";
  const chType = currentChapter?.type || "introduction";

  const getSections = () => {
    if (chType === "introduction") return INTRO_SECTIONS;
    if (chType === "literature_review") return LIT_SECTIONS;
    if (chType === "methodology") return METH_SECTIONS;
    if (chType === "conclusion") return CONCLUSION_SECTIONS;
    return [];
  };
  const getDefaultSections = () => {
    if (chType === "introduction") return INTRO_SECTIONS_DEFAULT;
    if (chType === "literature_review") return LIT_SECTIONS_DEFAULT;
    if (chType === "methodology") return METH_SECTIONS_DEFAULT;
    if (chType === "conclusion") return CONCLUSION_SECTIONS_DEFAULT;
    return [];
  };
  const sections = getSections();

  const handleAddCustomTheorist = () => {
    if (!personalise.customTheorist.trim()) return;
    setPersonalise(p => ({
      ...p,
      selectedTheorists: [...p.selectedTheorists, p.customTheorist.trim()],
      customTheorist: ""
    }));
    toast.success("Theorist added.");
  };

  const handleAddCustomAuthor = () => {
    if (!personalise.customAuthor.trim()) return;
    setPersonalise(p => ({
      ...p,
      specificAuthors: [...p.specificAuthors, p.customAuthor.trim()],
      customAuthor: ""
    }));
    toast.success("Author added.");
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Top Nav */}
      <nav className="relative h-11 border-b border-border flex items-center px-2 sm:px-4 gap-1.5 sm:gap-2.5 flex-shrink-0 bg-background">
        <button
          onClick={() => navigate("/")}
          aria-label="Back to home"
          title="Home"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex-shrink-0"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="text-[12px] sm:text-[13px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 hidden sm:block">
          <strong className="text-foreground font-bold">{project.title.slice(0, 40)}</strong>
          <span className="hidden lg:inline">&nbsp;·&nbsp;{project.degree}&nbsp;·&nbsp;{project.citation_style}</span>
        </div>
        {/* Save status indicator */}
        <div className="flex-shrink-0 hidden sm:flex items-center h-5 overflow-hidden">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
              <Loader2 size={11} className="animate-spin" />Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500">
              <Check size={11} strokeWidth={2.5} />Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto flex-shrink-0">
          {/* Overflow menu — all sizes */}
          <div className="relative">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="More" className="inline-flex items-center p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
              <MoreVertical size={16} />
            </button>
            {mobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-[80]" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-[260px] bg-background border border-border rounded-2xl shadow-2xl z-[81] p-2 grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-150">
                  {[
                    { icon: Copy, label: copied ? "Copied" : "Copy", onClick: () => { handleCopy(); setMobileMenuOpen(false); } },
                    { icon: Download, label: "Chapter", onClick: () => { setShowExportChModal(true); setMobileMenuOpen(false); } },
                    { icon: Download, label: "All", onClick: () => { setShowExportModal(true); setMobileMenuOpen(false); } },
                    { icon: FileEdit, label: "Corrections", onClick: () => { setShowSupervisorModal(true); setMobileMenuOpen(false); } },
                    { icon: GripVertical, label: "Reorder", onClick: () => { setShowReorderModal(true); setMobileMenuOpen(false); } },
                    { icon: Share2, label: "Share", onClick: () => { handleShare(); setMobileMenuOpen(false); } },
                    { icon: Sparkles, label: "Settings", onClick: () => { setShowPersonalise(true); setMobileMenuOpen(false); } },
                    { icon: FolderOpen, label: "Projects", onClick: () => { setShowProjectsDrawer(true); setMobileMenuOpen(false); } },
                    { icon: Plus, label: "New", onClick: () => { navigate("/new-project"); setMobileMenuOpen(false); } },
                  ].map((item) => (
                    <button key={item.label} onClick={item.onClick} title={item.label} className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-secondary/40 hover:bg-secondary text-foreground transition-all">
                      <item.icon size={18} />
                      <span className="text-[10px] font-bold leading-tight text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <UserProfilePopover
            userInitials={(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
            userName={user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            email={user?.email}
            tier={subscription.tier}
            wordsUsed={subscription.words_used}
            wordLimit={subscription.word_limit}
            onSignOut={async () => { const { supabase: sb } = await import("@/integrations/supabase/client"); await sb.auth.signOut(); navigate("/auth"); }}
            size="sm"
            avatarUrl={user?.user_metadata?.avatar_url}
          />
        </div>
      </nav>

      {/* Mobile chapter drawer */}
      {mobileChaptersOpen && (
        <div className="md:hidden fixed inset-0 z-[90] bg-foreground/20" onClick={() => setMobileChaptersOpen(false)}>
          <div className="absolute left-0 top-11 bottom-0 w-[220px] bg-background border-r border-border overflow-y-auto py-2 animate-in slide-in-from-left duration-200" onClick={e => e.stopPropagation()}>
            <div className="text-[10px] font-extrabold tracking-[0.08em] uppercase text-muted-foreground px-3.5 pt-2.5 pb-1">Chapters</div>
            {project.chapters.sort((a, b) => a.order_index - b.order_index).map(ch => {
              const locked = isChapterLocked(ch);
              return (
              <button key={ch.id} onClick={() => { if (!locked) { setActiveChapterIndex(ch.order_index); setMobileChaptersOpen(false); } else { toast.error("Complete the previous chapter first."); } }}
                className={cn(
                  "w-full flex items-center gap-2 px-3.5 py-2 text-[13px] border-l-2 transition-all",
                  locked && "opacity-50 cursor-not-allowed",
                  activeChapterIndex === ch.order_index
                    ? "text-primary border-l-primary bg-primary/5 font-bold"
                    : "text-muted-foreground border-l-transparent hover:bg-secondary hover:text-foreground",
                  ch.status === "completed" && activeChapterIndex !== ch.order_index && "text-foreground"
                )}>
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                  ch.status === "completed" ? "bg-green" : locked ? "bg-border" : activeChapterIndex === ch.order_index ? "bg-aqua" : "bg-border"
                )} />
                <span className="truncate">{ch.title}</span>
                {locked && <Lock size={10} className="ml-auto text-muted-foreground flex-shrink-0" />}
              </button>
              );
            })}
            <div className="px-3.5 py-2 text-xs text-muted-foreground">
              <b className="text-foreground">{subscription.words_used.toLocaleString()}</b> / {subscription.word_limit.toLocaleString()} words used
            </div>
          </div>
        </div>
      )}

      {/* Projects drawer */}
      {showProjectsDrawer && (
        <div className="fixed inset-0 z-[90] bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowProjectsDrawer(false)}>
          <div className="relative w-full max-w-[480px] max-h-[80dvh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="text-[13px] font-bold text-foreground">My Projects</span>
              <button onClick={() => setShowProjectsDrawer(false)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            </div>
            {/* Subscription strip */}
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-b border-border flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: subscription.status === "active" ? "#4DB68A" : "#dc2626" }} />
              <span className="text-[11px] font-bold capitalize text-foreground">{subscription.tier}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{subscription.words_used.toLocaleString()}/{subscription.word_limit.toLocaleString()} words</span>
            </div>
            {/* Project list */}
            <div className="flex-1 overflow-y-auto">
              {allProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center">
                  <FolderOpen size={24} className="opacity-40" />
                  <p className="text-[12px]">No projects yet</p>
                </div>
              ) : allProjects.map(p => {
                const done = p.chapters.filter(c => c.status === "completed").length;
                const total = p.chapters.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isCurrent = p.id === projectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => { setShowProjectsDrawer(false); navigate(`/writer/${p.id}`); }}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/40",
                      isCurrent && "bg-primary/5"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", isCurrent ? "bg-primary" : pct === 100 ? "bg-green" : "bg-border")} />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] font-bold truncate", isCurrent ? "text-primary" : "text-foreground")}>{p.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{done}/{total} ch · {pct}%</div>
                    </div>
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        if (!confirm(`Delete "${p.title}"?`)) return;
                        try {
                          await deleteProject(p.id);
                          setAllProjects(prev => prev.filter(proj => proj.id !== p.id));
                          toast.success("Project deleted");
                          if (p.id === projectId) navigate("/new-project");
                        } catch (err: any) { toast.error(err.message); }
                      }}
                      className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                    <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
            </div>
            {/* Footer: new project + settings */}
            <div className="px-4 py-3 border-t border-border flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowProjectsDrawer(false); navigate("/new-project"); }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} /> New project
              </button>
              <button
                onClick={() => { setShowProjectsDrawer(false); navigate("/settings?tab=billing"); }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Billing & plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shell */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Nav — toggled via showSidebar */}
        {showSidebar && <nav className="w-[192px] flex-shrink-0 border-r border-border bg-background flex-col overflow-y-auto py-2 flex animate-in slide-in-from-left duration-200">
          <div className="text-[10px] font-extrabold tracking-[0.08em] uppercase text-muted-foreground px-3.5 pt-2.5 pb-1">Chapters</div>
          {project.chapters.sort((a, b) => a.order_index - b.order_index).map(ch => {
            const locked = isChapterLocked(ch);
            return (
            <button key={ch.id} onClick={() => { if (!locked) setActiveChapterIndex(ch.order_index); else toast.error("Complete the previous chapter first."); }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 text-[13px] border-l-2 transition-all",
                locked && "opacity-50 cursor-not-allowed",
                activeChapterIndex === ch.order_index
                  ? "text-primary border-l-primary bg-primary/5 font-bold"
                  : "text-muted-foreground border-l-transparent hover:bg-secondary hover:text-foreground",
                ch.status === "completed" && activeChapterIndex !== ch.order_index && "text-foreground"
              )}>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                ch.status === "completed" ? "bg-green" : locked ? "bg-border" : activeChapterIndex === ch.order_index ? "bg-aqua" : "bg-border"
              )} />
              <span className="truncate">{ch.title}</span>
              {locked ? (
                <Lock size={10} className="ml-auto text-muted-foreground flex-shrink-0" />
              ) : editedChapterIds.has(ch.id) ? (
                <span className={cn("text-[10px] font-bold ml-auto whitespace-nowrap", editedWordDeltas[ch.id] && editedWordDeltas[ch.id] > 0 ? "text-green" : "text-destructive")}>
                  {editedWordDeltas[ch.id] ? (editedWordDeltas[ch.id] > 0 ? `+${editedWordDeltas[ch.id]}` : editedWordDeltas[ch.id]) : "✎"}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground ml-auto font-mono">{ch.word_count_target?.toLocaleString()}</span>
              )}
            </button>
            );
          })}
          <div className="h-px bg-border mx-3.5 my-1.5" />
          <div className="px-3.5 py-1.5 text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">{subscription.words_used.toLocaleString()} / {subscription.word_limit.toLocaleString()}</b> words<br />
            {completedCount} of {project.chapters.length} done · {subscription.tier} tier
          </div>
          <div className="mt-auto px-3 py-2 border-t border-border">
            <button onClick={() => setShowExportModal(true)}
              className="w-full py-1.5 rounded-md text-xs font-bold border border-border text-foreground hover:border-primary hover:text-primary transition-all">
              Download ALL
            </button>
          </div>
        </nav>}

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Chapter strip — compact numbered dots + correction button at far right */}
          <div className="h-10 border-b border-border flex items-center flex-shrink-0 bg-background">
            {/* Scrollable dots */}
            <div className="flex items-center px-3 gap-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
              {(() => {
                const sorted = project.chapters.slice().sort((a, b) => a.order_index - b.order_index);
                const nonAbstract = sorted.filter(c => c.type !== "abstract");
                return sorted.map((ch) => {
                  const locked = isChapterLocked(ch);
                  const isActive = activeChapterIndex === ch.order_index;
                  const chapterNum = nonAbstract.findIndex(c => c.id === ch.id) + 1;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { if (!locked) setActiveChapterIndex(ch.order_index); else toast.error("Complete the previous chapter first."); }}
                      title={ch.word_count_actual
                        ? `${ch.title}\n${ch.word_count_actual.toLocaleString()} / ${(ch.word_count_target || 0).toLocaleString()}w`
                        : ch.title}
                      className={cn(
                        "relative w-8 h-8 rounded-full text-[12px] font-extrabold flex-shrink-0 flex items-center justify-center transition-all",
                        locked && "opacity-40 cursor-not-allowed",
                        isActive
                          ? "bg-foreground text-background"
                          : ch.status === "completed"
                            ? "bg-green/15 text-green hover:bg-green/25"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                      )}
                    >
                      {ch.status === "completed" ? "✓" : ch.type === "abstract" ? "A" : chapterNum}
                      {(supervisorCommentCounts[ch.id] ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center pointer-events-none">
                          {supervisorCommentCounts[ch.id] > 9 ? "9+" : supervisorCommentCounts[ch.id]}
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            {/* Correction slot + Humanise buttons — always pinned right */}
            <div className="flex-shrink-0 flex items-center border-l border-border px-2 gap-1">
              <button
                onClick={() => {
                  if (!currentChapter?.content) { toast.error("Complete this chapter first."); return; }
                  setShowHumanisePanel(true);
                  setHumanisedText(null);
                  setHumaniseDiff(null);
                  setHumaniseStages([]);
                  setIsHumanising(false);
                }}
                title="Humanise this chapter"
                className="w-7 h-7 rounded-md flex items-center justify-center transition-all text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Wand2 size={13} />
              </button>
              <button
                onClick={() => currentChapter?.status === "completed" ? setShowSupervisorModal(true) : toast.error("Complete this chapter first.")}
                title="Apply supervisor corrections"
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all",
                  correctionDiff ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <FileEdit size={13} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto relative bg-background">
            {isGenerating && !streamingContent ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <BookLoader size={64} label={genStatus || "Connecting to AI engine..."} />
                <p className="text-[13px] text-muted-foreground max-w-[240px] leading-relaxed mt-2">Your chapter is being generated. Content will appear here as it's written.</p>
              </div>
            ) : isGenerating && streamingContent ? (
              <div className="max-w-[680px] lg:max-w-[920px] xl:max-w-[1080px] 2xl:max-w-[1180px] mx-auto px-4 sm:px-10 py-6 prose-academic">
                <h1 className="not-prose text-xl sm:text-2xl font-bold text-foreground mb-6 leading-snug">{currentChapter?.title}</h1>
                <Markdown remarkPlugins={[remarkGfm]} components={{
                  ol: ({ children, ...props }: any) => <ol {...props}>{children}</ol>,
                  ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
                  p({ children, ...props }: any) {
                    const text = String(children);
                    if (/^\[Space for Figure[\s\d.]+\]$/i.test(text.trim())) return null;
                    // Detect figure marker comments rendered as text
                    const figMatch = text.match(/<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/);
                    if (figMatch) {
                      const figId = `fig-${figMatch[1]}`;
                      const img = inlineImages[figId];
                      return (
                        <div className="my-6 flex flex-col items-center">
                          <p className="text-[13px] font-bold text-foreground mb-2">Figure {figMatch[1]}: {figMatch[2].trim()}</p>
                          {img?.status === "done" && img.imageUrl ? (
                            <img src={img.imageUrl} alt={figMatch[2].trim()} className="max-w-full rounded-lg shadow-md border border-border" />
                          ) : img?.status === "loading" ? (
                            <div className="w-full h-48 rounded-lg bg-secondary/60 flex items-center justify-center gap-2 border border-border">
                              <Loader2 size={16} className="animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">Generating figure…</span>
                            </div>
                          ) : img?.status === "error" ? (
                            <div className="w-full h-32 rounded-lg bg-destructive/5 flex items-center justify-center border border-destructive/20">
                              <span className="text-xs text-destructive">Figure generation failed</span>
                            </div>
                          ) : (
                            <div className="w-full h-48 rounded-lg bg-secondary/40 flex items-center justify-center border border-border">
                              <span className="text-xs text-muted-foreground">Waiting for image generation…</span>
                            </div>
                          )}
                          {/* description intentionally hidden — sent only to image model */}
                        </div>
                      );
                    }
                    return <p {...props}>{children}</p>;
                  },
                }}>{streamingContent.replace(/<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g, '\n\n<!-- FIGURE:$1:$2:$3 -->\n\n')}</Markdown>
                <span className="inline-block w-[2px] h-[14px] bg-primary align-text-bottom ml-px animate-pulse" />
              </div>
            ) : currentChapter?.content ? (
              <div
                className={cn(
                  isEditMode ? "flex flex-col h-full" : "max-w-[680px] lg:max-w-[920px] xl:max-w-[1080px] 2xl:max-w-[1180px] mx-auto px-4 sm:px-10 py-6 prose-academic",
                  !isEditMode && editedChapterIds.has(currentChapter.id) && "border-l-4 border-l-green pl-5"
                )}
                onMouseUp={!isEditMode ? handleTextSelection : undefined}
                onTouchEnd={!isEditMode ? handleTextSelection : undefined}
              >
                {/* Chapter title in canvas */}
                <div className={cn("flex items-start justify-between gap-2 mb-5", isEditMode && "flex-shrink-0 px-5 sm:px-10 pt-6 pb-2")}>
                  <h1 className="not-prose text-xl sm:text-2xl font-bold text-foreground leading-snug flex-1">{currentChapter?.title}</h1>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    <button
                      onClick={() => setShowGuide(s => !s)}
                      title="Chapter guide"
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors w-5 h-5 rounded-full border border-border flex items-center justify-center hover:border-foreground/40"
                    >?</button>
                    <button
                      onClick={() => {
                        if (isEditMode) {
                          if (currentChapter && editContent !== currentChapter.content) {
                            const wc = countBodyWords(editContent);
                            setEditedChapterIds(prev => new Set(prev).add(currentChapter.id));
                            setEditedWordDeltas(prev => ({ ...prev, [currentChapter.id]: wc - (currentChapter.word_count_actual || 0) }));
                            handleUpdate({ ...project, chapters: project.chapters.map(c => c.id === currentChapter.id ? { ...c, content: editContent, word_count_actual: wc } : c) });
                          }
                          setIsEditMode(false);
                        } else {
                          setEditContent(currentChapter.content || "");
                          setIsEditMode(true);
                        }
                      }}
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isEditMode ? <><Check size={11} className="inline mr-0.5" /> Done</> : <>✎ Edit</>}
                    </button>
                    {isEditMode && (
                      <button
                        onClick={() => setSplitPane(s => !s)}
                        title="Split view (desktop)"
                        className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Columns2 size={11} />
                        {splitPane ? "Single" : "Split"}
                      </button>
                    )}
                  </div>
                </div>
                {/* Recovery banner — shown when a previous auto-saved draft is found */}
                {showRecovery && recoveryContent && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
                    <span className="text-amber-700 font-semibold flex-1">A draft was auto-saved before your last session ended. Restore it?</span>
                    <button onClick={() => {
                      if (!currentChapter || !project) return;
                      const wc = countBodyWords(recoveryContent);
                      handleUpdate({ ...project, chapters: project.chapters.map(c => c.id === currentChapter.id ? { ...c, content: recoveryContent, word_count_actual: wc, status: "completed" } : c) });
                      localStorage.removeItem(recoveryKeyRef.current);
                      setShowRecovery(false); setRecoveryContent(null);
                      toast.success("Draft restored.");
                    }} className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">Restore</button>
                    <button onClick={() => { localStorage.removeItem(recoveryKeyRef.current); setShowRecovery(false); setRecoveryContent(null); }} className="px-3 py-1 rounded border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-100">Discard</button>
                  </div>
                )}
                {editedChapterIds.has(currentChapter.id) && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green bg-green/10 px-2 py-0.5 rounded">Edited</span>
                    {editedWordDeltas[currentChapter.id] !== undefined && (
                      <span className={cn("text-[11px] font-bold", editedWordDeltas[currentChapter.id] > 0 ? "text-green" : "text-destructive")}>
                        {editedWordDeltas[currentChapter.id] > 0 ? "+" : ""}{editedWordDeltas[currentChapter.id]} words
                      </span>
                    )}
                    <button onClick={() => {
                      setEditedChapterIds(prev => { const n = new Set(prev); n.delete(currentChapter.id); return n; });
                      setEditedWordDeltas(prev => { const n = { ...prev }; delete n[currentChapter.id]; return n; });
                    }} className="text-[11px] text-muted-foreground hover:text-foreground ml-auto">Dismiss</button>
                  </div>
                )}
                {isEditMode ? (
                  splitPane ? (
                    <div className="flex flex-1 overflow-hidden">
                      {/* Left — raw markdown */}
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                        className="flex-1 w-full resize-none bg-transparent outline-none text-[13px] text-foreground leading-relaxed font-mono px-5 py-6 border-r border-border overflow-y-auto"
                        placeholder="Chapter content…"
                      />
                      {/* Right — rendered preview */}
                      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 prose-academic text-[14px]">
                        <Markdown remarkPlugins={[remarkGfm]}>{editContent}</Markdown>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                      className="flex-1 w-full resize-none bg-transparent outline-none text-[14px] text-foreground leading-relaxed font-mono px-5 sm:px-10 py-6 min-h-[600px]"
                      placeholder="Chapter content…"
                    />
                  )
                ) : correctionDiff ? (
                  /* ── Correction diff view ── */
                  <div className="flex flex-col h-full">
                    <style>{`
                      .diff-del { background: rgba(239,68,68,0.18); color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
                      .dark .diff-del { color: #f87171; }
                      .diff-ins { background: rgba(34,197,94,0.18); color: #15803d; border-radius: 2px; padding: 0 1px; }
                      .dark .diff-ins { color: #4ade80; }
                    `}</style>
                    {/* Diff toolbar */}
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-amber-500/5 flex-wrap">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Corrections applied</span>
                      <span className="flex gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold">~ modified</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold">+ added</span>
                        <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold">– deleted</span>
                        <span className="text-[10px] text-muted-foreground/60 ml-1">inline: <span className="diff-del" style={{fontSize:"10px"}}>removed</span> <span className="diff-ins" style={{fontSize:"10px"}}>added</span></span>
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={handleDownloadWithHighlights} className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">⬇ Download</button>
                        <button onClick={() => { setCorrectionDiff(null); setCorrectionRevised(null); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
                        <button onClick={handleAcceptCorrections} className="text-[11px] px-3 py-1 rounded-lg bg-foreground text-background font-semibold hover:opacity-80 transition-opacity">Accept all</button>
                      </div>
                    </div>
                    {/* Diff paragraphs */}
                    <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-6 max-w-[680px] lg:max-w-[920px] xl:max-w-[1080px] mx-auto w-full space-y-1">
                      {correctionDiff.map((para, i) => {
                        const isHeading = /^#{1,4}\s/.test(para.text.trimStart());
                        return (
                          <div
                            key={i}
                            className={cn(
                              "px-3 py-2 rounded-md border-l-4 text-[14px] leading-relaxed transition-colors",
                              para.type === "unchanged" ? "border-transparent" :
                              para.type === "modified"  ? "bg-amber-500/8 border-amber-500" :
                              para.type === "added"     ? "bg-emerald-500/10 border-emerald-500" :
                                                          "bg-red-500/10 border-red-500 opacity-70"
                            )}
                          >
                            {para.type === "modified" && para.diffHtml && !isHeading ? (
                              <p dangerouslySetInnerHTML={{ __html: para.diffHtml }} className="text-foreground" />
                            ) : para.type === "deleted" ? (
                              <p className="line-through text-muted-foreground">{para.text}</p>
                            ) : (
                              <Markdown remarkPlugins={[remarkGfm]}>{para.text}</Markdown>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Markdown remarkPlugins={[remarkGfm]} components={{
                    ol: ({ children, ...props }: any) => <ol {...props}>{children}</ol>,
                    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
                    p({ children, ...props }: any) {
                      const text = String(children);
                      if (/^\[Space for Figure[\s\d.]+\]$/i.test(text.trim())) return null;
                      const figMatch = text.match(/<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/);
                      if (figMatch) {
                        const figId = `fig-${figMatch[1]}`;
                        const img = inlineImages[figId];
                        return (
                          <div className="my-6 flex flex-col items-center">
                            <p className="text-[13px] font-bold text-foreground mb-2">Figure {figMatch[1]}: {figMatch[2].trim()}</p>
                            {img?.status === "done" && img.imageUrl ? (
                              <img src={img.imageUrl} alt={figMatch[2].trim()} className="max-w-full rounded-lg shadow-md border border-border" />
                            ) : (
                              <div className="w-full h-32 rounded-lg bg-secondary/40 flex items-center justify-center border border-border">
                                <span className="text-xs text-muted-foreground italic">[Figure placeholder — generate images to view]</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return <p {...props}>{children}</p>;
                    },
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      if (!inline && match && match[1] === "chart") {
                        return <ChartRenderer content={String(children).replace(/\n$/, "")} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    }
                  }}>{currentChapter.content.replace(/<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g, '\n\n<!-- FIGURE:$1:$2:$3 -->\n\n')}</Markdown>
                )}
              </div>
            ) : currentLocked ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <Lock size={28} className="text-muted-foreground mb-3" />
                <h3 className="text-sm font-bold text-foreground mb-1">Chapter locked</h3>
                <p className="text-[13px] text-muted-foreground max-w-[240px] leading-relaxed">Complete the previous chapter first. Chapters must be written in order so PAPERSTUDIO can maintain context and coherence across your dissertation.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Chapter title */}
                <div className="px-5 sm:px-12 pt-7 pb-2 flex-shrink-0 flex items-start justify-between gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug flex-1">{currentChapter?.title}</h1>
                  <button
                    onClick={() => setShowGuide(s => !s)}
                    title="Chapter guide"
                    className="mt-1 flex-shrink-0 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors w-5 h-5 rounded-full border border-border flex items-center justify-center hover:border-foreground/40"
                  >?</button>
                </div>
                {/* Alert banners at top of canvas */}
                {(chType === "methodology" || chType === "findings") && (
                  <div className="mx-4 sm:mx-10 mt-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm">
                    <span className="text-amber-700 font-medium flex-1 text-left text-[12px]">
                      ⚠️ Tip: open <strong>Settings</strong> to configure methodology details before drafting.
                    </span>
                    <button onClick={() => setShowPersonalise(true)} className="px-2.5 py-1 rounded bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 flex-shrink-0">Settings</button>
                  </div>
                )}
                {showRecovery && recoveryContent && (
                  <div className="mx-4 sm:mx-10 mt-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm">
                    <span className="text-amber-700 font-semibold flex-1 text-[12px]">A draft was auto-saved. Restore it?</span>
                    <button onClick={() => {
                      if (!currentChapter || !project) return;
                      const wc = countBodyWords(recoveryContent);
                      handleUpdate({ ...project, chapters: project.chapters.map(c => c.id === currentChapter.id ? { ...c, content: recoveryContent, word_count_actual: wc, status: "completed" } : c) });
                      localStorage.removeItem(recoveryKeyRef.current);
                      setShowRecovery(false); setRecoveryContent(null);
                      toast.success("Draft restored.");
                    }} className="px-2.5 py-1 rounded bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">Restore</button>
                    <button onClick={() => { localStorage.removeItem(recoveryKeyRef.current); setShowRecovery(false); setRecoveryContent(null); }} className="text-[11px] text-amber-600 hover:underline">Discard</button>
                  </div>
                )}
                {/* Full canvas textarea */}
                <textarea
                  value={personalise.notes}
                  onChange={(e) => setPersonalise(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Click Draft below to start writing. Or add your own notes here first."
                  className="flex-1 w-full resize-none bg-transparent outline-none text-[15px] text-foreground px-5 sm:px-12 py-6 placeholder:text-muted-foreground/30 leading-relaxed"
                />
              </div>
            )}
            {error && (
              <div className="mx-8 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{error}</div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border flex-shrink-0 bg-background">

            {/* ── EMPTY STATE: bare icon pair ── */}
            {!currentChapter?.content && !isGenerating && !currentLocked && (
              <div className="flex items-center gap-4 px-4 py-2.5">
                <button
                  onClick={() => setShowPersonalise(true)}
                  title="Settings"
                  aria-label="Settings"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={() => setShowOutlineModal(true)}
                  title="Draft chapter"
                  aria-label="Draft chapter"
                  className="inline-flex items-center gap-1 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <PenLine size={14} /><span className="text-xs font-medium">Draft</span>
                </button>
              </div>
            )}

            {/* ── GENERATING: word count + Stop ── */}
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                    <b className={currentWC >= targetWC ? "text-green" : ""}>{currentWC.toLocaleString()}</b> / {targetWC.toLocaleString()}w
                  </span>
                  <div className="flex-1 h-[2px] bg-border rounded-sm overflow-hidden">
                    <div className="h-full bg-primary rounded-sm transition-all duration-500" style={{ width: `${wcPct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{wcPct}%</span>
                </div>
                <button
                  onClick={() => handleStopGeneration()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:border-destructive hover:text-destructive transition-all flex-shrink-0"
                >
                  <StopCircle size={13} /> Stop
                </button>
              </div>
            )}

            {/* ── COMPLETED: notes + actions ── */}
            {currentChapter?.content && !isGenerating && (
              <>
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    <b className={currentWC >= targetWC ? "text-green" : ""}>{currentWC.toLocaleString()}</b> / {targetWC.toLocaleString()}w
                  </span>
                  <div className="flex-1 h-[2px] bg-border rounded-sm overflow-hidden">
                    <div className="h-full bg-primary rounded-sm transition-all duration-500" style={{ width: `${wcPct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{wcPct}%</span>
                </div>
                {currentChapter?.status === "completed" && (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 border-t border-border flex-wrap">
                    {currentChapter.word_count_actual && currentChapter.word_count_target && currentChapter.word_count_actual < currentChapter.word_count_target && (
                      <button onClick={() => handleContinueWriting(currentChapter.content || "", (currentChapter.word_count_target || 0) - (currentChapter.word_count_actual || 0))}
                        className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-bold bg-aqua/10 text-aqua border border-aqua/20 hover:bg-aqua/20 transition-all">
                        <Plus size={11} /> Continue Writing
                      </button>
                    )}
                    <button onClick={() => setShowOutlineModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                      <Wand2 size={11} /> Draft again
                    </button>
                    <div className="w-px h-3 bg-border" />
                    <button onClick={() => setShowReviseModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                      Revise
                    </button>
                    <div className="ml-auto">
                      <button onClick={handleAccept} className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors">
                        <Check size={11} /> Mark complete
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Contextual inline-edit toolbar (appears on text selection) ─── */}
      {textSelection && (
        <ContextualToolbar
          rect={textSelection.rect}
          isLoading={inlineEditLoading}
          activeAction={inlineEditAction}
          onAction={handleInlineEdit}
        />
      )}

      {/* ─── Chapter Guide bottom sheet ─── */}
      {showGuide && currentChapter && (() => {
        const guide = CHAPTER_GUIDES[currentChapter.type as string];
        if (!guide) return null;
        return (
          <>
            <div className="fixed inset-0 z-[100] bg-foreground/20" onClick={() => setShowGuide(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-[101] bg-background border-t border-border rounded-t-2xl max-h-[75dvh] flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-8 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="text-sm font-bold text-foreground">Chapter guide</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{currentChapter.title}</div>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-1.5">What is this chapter for?</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{guide.purpose}</p>
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-1.5">What to include</div>
                  <ul className="space-y-1.5">
                    {guide.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-snug">
                        <span className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-secondary/50 rounded-xl px-4 py-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-1">Tip</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{guide.tip}</p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══ PERSONALISE SLIDE PANEL ═══ */}
      <div className={cn("fixed inset-0 bg-foreground/20 z-[100] transition-opacity", showPersonalise ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setShowPersonalise(false)} />
      {/* Desktop: slides in from right. Mobile: slides up from bottom as a sheet. */}
      <div className={cn(
        "fixed bg-background flex flex-col z-[101] transition-transform duration-200",
        "md:top-11 md:right-0 md:bottom-0 md:w-[320px] md:border-l md:border-border",
        "max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-t-2xl max-md:border-t max-md:border-border max-md:max-h-[88dvh] max-md:overflow-hidden",
        showPersonalise ? "md:translate-x-0 max-md:translate-y-0" : "md:translate-x-full max-md:translate-y-full"
      )}>
        {/* Mobile drag handle */}
        <div className="max-md:flex hidden justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>
        <div className="px-3.5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <div className="font-heading text-sm font-black text-foreground">Personalise — {currentChapter?.title}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {isNoCiteChapter ? "No citations for this chapter" : isReuseCiteChapter ? "Reuse citations from Ch 1 & 2 only" : "Configure generation settings"}
            </div>
          </div>
          <button onClick={() => setShowPersonalise(false)} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>

        {/* Mode toggle */}
        <div className="px-3.5 py-2 border-b border-border flex-shrink-0">
          <div className="flex gap-1">
            {(["standard", "custom", "advanced"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPersonaliseMode(mode)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[11px] font-bold capitalize transition-all",
                  personaliseMode === mode
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "standard" ? "Simple" : mode === "custom" ? "Custom" : "Advanced"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
            {personaliseMode === "standard" && "Quick setup — essential settings only"}
            {personaliseMode === "custom" && "Add sources, citations & analysis methods"}
            {personaliseMode === "advanced" && "Full control over every generation setting"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 text-sm">
          {/* ═══ AI MODEL SELECTION ═══ */}
          <PanelSection label="AI model">
            <div className="space-y-1.5">
              {AI_MODELS.map((m) => {
                const tier = (subscription?.tier || "free").toLowerCase();
                const locked = !isTestUser && isModelLockedForTier(m.id, tier);
                const active = selectedModelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) {
                        toast.error(`${m.name} requires ${getMinTierLabel(m.id)} — upgrade to unlock.`);
                        return;
                      }
                      setSelectedModelId(m.id);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-lg border transition-all flex items-start gap-2",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 bg-background",
                      locked && "opacity-60 cursor-not-allowed hover:border-border"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {locked ? (
                        <Lock size={13} className="text-muted-foreground" />
                      ) : active ? (
                        <Check size={13} className="text-primary" />
                      ) : (
                        <Cpu size={13} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12.5px] font-bold text-foreground">{m.name}</span>
                        <span className="text-[9.5px] font-semibold text-muted-foreground">· {m.provider}</span>
                        {locked && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            {getMinTierLabel(m.id)}
                          </span>
                        )}
                        {active && !locked && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{m.description}</div>
                    </div>
                  </button>
                );
              })}
              {!isTestUser && (subscription?.tier || "free").toLowerCase() === "free" && (
                <div className="text-[10.5px] text-muted-foreground pt-1">
                  Locked models become available after upgrading your plan.
                </div>
              )}
            </div>
          </PanelSection>

          {/* Writing style section removed — baked into mode/craft model defaults */}

          {/* ═══ INTRODUCTION: Objectives, Questions, Hypotheses ═══ */}
          {chType === "introduction" && personaliseMode !== "standard" && (
            <PanelSection label="Research objectives & questions">
              <PanelField label={`Research objectives`}>
                <textarea value={personalise.researchObjectivesText} onChange={e => setPersonalise(p => ({ ...p, researchObjectivesText: e.target.value }))}
                  placeholder={"1. To examine…\n2. To identify…\n3. To assess…\n4. To evaluate…"}
                  className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background resize-none h-20" />
              </PanelField>
              <PanelField label={`Research questions`}>
                <textarea value={personalise.researchQuestionsText} onChange={e => setPersonalise(p => ({ ...p, researchQuestionsText: e.target.value }))}
                  placeholder={"1. What is…?\n2. How does…?\n3. To what extent…?\n4. What factors…?"}
                  className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background resize-none h-20" />
              </PanelField>
              <PanelField label="Include hypotheses?">
                <PanelSelect value={personalise.includeHypotheses ? "Yes — numbered H1, H2, H3…" : "No"} options={["No", "Yes — numbered H1, H2, H3…"]}
                  onChange={v => setPersonalise(p => ({ ...p, includeHypotheses: v !== "No" }))} />
              </PanelField>
              {personalise.includeHypotheses && (
                <PanelField label="Hypotheses">
                  <textarea value={personalise.hypothesesText} onChange={e => setPersonalise(p => ({ ...p, hypothesesText: e.target.value }))}
                    placeholder={"H1: There is a significant…\nH2: There is a significant…"}
                    className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background resize-none h-16" />
                </PanelField>
              )}
            </PanelSection>
          )}

          {/* ═══ SOURCES & CITATIONS — only for chapters that use citations ═══ */}
          {!isNoCiteChapter && !isReuseCiteChapter && chType !== "abstract" && personaliseMode !== "standard" && (
            <PanelSection label="Sources & citations">
              <div className="grid grid-cols-2 gap-2">
                <PanelField label="Total sources">
                  <input type="number" value={personalise.totalSources} min={5} max={100}
                    onChange={e => setPersonalise(p => ({ ...p, totalSources: parseInt(e.target.value) || 18 }))}
                    className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                </PanelField>
                <PanelField label="Min. per 1,000 words">
                  <PanelSelect value={personalise.minPerThousand} options={["System default", "3", "5", "8", "10", "12"]} onChange={v => setPersonalise(p => ({ ...p, minPerThousand: v }))} />
                </PanelField>
              </div>
              <PanelField label="Source date range">
                <PanelSelect value={personalise.dateRange} options={["2016-2024", "2010-2024", "2000-2024", "1990-2024", "Custom…"]}
                  onChange={v => setPersonalise(p => ({ ...p, dateRange: v }))} />
              </PanelField>
              {personalise.dateRange === "Custom…" && (
                <div className="flex gap-2 items-center">
                  <input type="number" value={personalise.customDateFrom} min={1950} max={2024} onChange={e => setPersonalise(p => ({ ...p, customDateFrom: e.target.value }))}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" placeholder="From" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="number" value={personalise.customDateTo} min={1950} max={2024} onChange={e => setPersonalise(p => ({ ...p, customDateTo: e.target.value }))}
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" placeholder="To" />
                </div>
              )}
              <PanelField label="Source type distribution">
                <div className="flex flex-col gap-1">
                  {SOURCE_TYPE_DISTRIBUTION.map(s => (
                    <label key={s} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                      <input type="checkbox" checked={personalise.sourceTypeDistribution.includes(s)}
                        onChange={e => setPersonalise(p => ({
                          ...p, sourceTypeDistribution: e.target.checked ? [...p.sourceTypeDistribution, s] : p.sourceTypeDistribution.filter(x => x !== s)
                        }))} className="w-3 h-3 accent-primary" />
                      {s}
                    </label>
                  ))}
                </div>
              </PanelField>
              <PanelField label="Empirical evidence level">
                <PanelSelect value={personalise.empiricalLevel} options={EMPIRICAL_LEVEL_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, empiricalLevel: v }))} />
              </PanelField>
              <PanelField label="Include seminal works (pre-2000)?">
                <PanelSelect value={personalise.seminalWorks} options={SEMINAL_WORKS_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, seminalWorks: v }))} />
              </PanelField>
              <PanelField label="DOI inclusion">
                <PanelSelect value={personalise.doiInclusion} options={DOI_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, doiInclusion: v }))} />
              </PanelField>
            </PanelSection>
          )}

          {/* ═══ LIT REVIEW: Specific authors ═══ */}
          {chType === "literature_review" && personaliseMode === "advanced" && (
            <PanelSection label="Specific authors to include">
              <div className="flex flex-col gap-1 mb-2">
                {suggestedLitAuthors.map(a => (
                  <label key={a} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                    <input type="checkbox" checked={personalise.specificAuthors.includes(a)}
                      onChange={e => setPersonalise(p => ({
                        ...p, specificAuthors: e.target.checked ? [...p.specificAuthors, a] : p.specificAuthors.filter(x => x !== a)
                      }))} className="w-3 h-3 accent-primary" />
                    {a}
                  </label>
                ))}
              </div>
              <PanelField label="Add author / year not listed">
                <div className="flex gap-1.5">
                  <input type="text" value={personalise.customAuthor} onChange={e => setPersonalise(p => ({ ...p, customAuthor: e.target.value }))}
                    placeholder="e.g. Smith, J. (2022)"
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                  <button onClick={handleAddCustomAuthor} className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10">+ Add</button>
                </div>
              </PanelField>
            </PanelSection>
          )}

          {/* ═══ THEORISTS & GEOGRAPHY — all except abstract & findings ═══ */}
          {chType !== "abstract" && chType !== "findings" && chType !== "conclusion" && personaliseMode === "advanced" && (
            <PanelSection label="Key theorists & geography">
              <PanelField label={<>Key theorists & frameworks <span className="text-[10px] font-bold bg-aqua/20 text-aqua px-1.5 py-px rounded-full ml-1">AUTO-SUGGESTED</span></>}>
                <div className="text-[11px] text-muted-foreground mb-1.5 leading-snug">Based on your title and field. Tap to select.</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {suggestedTheorists.map(t => (
                    <button key={t} onClick={() => setPersonalise(p => ({
                      ...p, selectedTheorists: p.selectedTheorists.includes(t) ? p.selectedTheorists.filter(x => x !== t) : [...p.selectedTheorists, t]
                    }))}
                      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                        personalise.selectedTheorists.includes(t) ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                      )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", personalise.selectedTheorists.includes(t) ? "bg-primary" : "bg-aqua")} />
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <input type="text" value={personalise.customTheorist} onChange={e => setPersonalise(p => ({ ...p, customTheorist: e.target.value }))}
                    placeholder="Add a theorist or framework…"
                    className="flex-1 px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                  <button onClick={handleAddCustomTheorist} className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10">+ Add</button>
                </div>
              </PanelField>
              <div className="grid grid-cols-2 gap-2">
                <PanelField label="Geographic scope">
                  <PanelSelect value={personalise.geoScope} options={["Global", "UK / Europe", "North America", "Sub-Saharan Africa", "West Africa / Nigeria", "South Asia", "East Asia", "Latin America", "Custom…"]}
                    onChange={v => setPersonalise(p => ({ ...p, geoScope: v }))} />
                </PanelField>
                <PanelField label="Custom geographic scope">
                  <input type="text" value={personalise.customGeoScope} onChange={e => setPersonalise(p => ({ ...p, customGeoScope: e.target.value }))}
                    placeholder="Specify region or country…"
                    className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                </PanelField>
              </div>
            </PanelSection>
          )}

          {/* ═══ METHODOLOGY: Research Design ═══ */}
          {chType === "methodology" && personaliseMode !== "standard" && (
            <>
              <PanelSection label="Research design">
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Methodology">
                    <PanelSelect value={project.research_methodology} options={["Quantitative", "Qualitative", "Mixed Methods"]} onChange={() => {}} />
                  </PanelField>
                  <PanelField label="Data collection">
                    <PanelSelect value={project.data_collection_method || ""} options={["Surveys / Questionnaires", "Interviews", "Observation", "Focus Groups", "Secondary Data", "Document Analysis", "Experiment", "Other…"]} onChange={() => {}} />
                  </PanelField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Sampling technique">
                    <PanelSelect value={project.sampling_technique || ""} options={["Probability Sampling", "Purposive Sampling", "Convenience Sampling", "Snowball Sampling", "Stratified Random", "Cluster Sampling", "Other…"]} onChange={() => {}} />
                  </PanelField>
                  <PanelField label="Sample size (n)">
                    <input type="number" value={project.sample_size || 0} readOnly
                      className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none bg-secondary text-foreground" />
                  </PanelField>
                </div>
                <PanelField label="Custom sampling description">
                  <input type="text" value={personalise.customSamplingDesc} onChange={e => setPersonalise(p => ({ ...p, customSamplingDesc: e.target.value }))}
                    placeholder="Describe any specific sampling details…"
                    className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                </PanelField>
              </PanelSection>

              <PanelSection label="Research philosophy">
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Ontology">
                    <PanelSelect value={personalise.ontology} options={ONTOLOGY_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, ontology: v }))} />
                  </PanelField>
                  <PanelField label="Epistemology">
                    <PanelSelect value={personalise.epistemology} options={EPISTEMOLOGY_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, epistemology: v }))} />
                  </PanelField>
                </div>
                <PanelField label="Methodology depth">
                  <PanelSelect value={personalise.methodologyDepth} options={["Standard", "Extended — with epistemological justification", "Extended + Critical realist position (PhD)"]}
                    onChange={v => setPersonalise(p => ({ ...p, methodologyDepth: v }))} />
                </PanelField>
              </PanelSection>
            </>
          )}

          {/* ═══ ANALYSIS METHODS — for methodology & findings ═══ */}
          {(chType === "methodology" || chType === "findings") && personaliseMode !== "standard" && (
            <PanelSection label={chType === "findings" ? "Quantitative analysis methods" : "Data analysis methods"}>
              {chType === "findings" && (
                <div className="text-[10px] font-bold text-green uppercase tracking-wide mb-1">Auto-selected from Chapter 3</div>
              )}
              {chType === "findings" ? (
                <>
                  {/* Auto-selected methods with descriptions */}
                  <div className="flex flex-col gap-1 mb-2">
                    {personalise.analysisMethods.map(a => (
                      <label key={a} className="flex items-start gap-1.5 text-[13px] text-foreground cursor-pointer">
                        <input type="checkbox" checked className="w-3 h-3 accent-green mt-0.5"
                          onChange={e => !e.target.checked && setPersonalise(p => ({ ...p, analysisMethods: p.analysisMethods.filter(x => x !== a) }))} />
                        <span><b>{a.split(" (")[0]}</b> {QUANT_METHOD_DESCRIPTIONS[a] && <span className="text-[11px] text-muted-foreground">— {QUANT_METHOD_DESCRIPTIONS[a]}</span>}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Additional options</div>
                  <div className="flex flex-col gap-1">
                    {ANALYSIS_OPTIONS.filter(a => !personalise.analysisMethods.includes(a)).map(a => (
                      <label key={a} className="flex items-start gap-1.5 text-[13px] text-foreground cursor-pointer">
                        <input type="checkbox" checked={false} className="w-3 h-3 accent-primary mt-0.5"
                          onChange={e => e.target.checked && setPersonalise(p => ({ ...p, analysisMethods: [...p.analysisMethods, a] }))} />
                        <span>{a} {QUANT_METHOD_DESCRIPTIONS[a] && <span className="text-[11px] text-muted-foreground">— {QUANT_METHOD_DESCRIPTIONS[a]}</span>}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Quantitative</div>
                  <div className="flex flex-col gap-1 mb-2">
                    {ANALYSIS_OPTIONS.map(a => (
                      <label key={a} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                        <input type="checkbox" checked={personalise.analysisMethods.includes(a)}
                          onChange={e => setPersonalise(p => ({
                            ...p, analysisMethods: e.target.checked ? [...p.analysisMethods, a] : p.analysisMethods.filter(x => x !== a)
                          }))} className="w-3 h-3 accent-primary" />
                        {a}
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 mt-3">Qualitative</div>
              <div className="flex flex-col gap-1">
                {QUALITATIVE_ANALYSIS_OPTIONS.map(a => (
                  <label key={a} className="flex items-start gap-1.5 text-[13px] text-foreground cursor-pointer">
                    <input type="checkbox" checked={personalise.qualMethods.includes(a)}
                      onChange={e => setPersonalise(p => ({
                        ...p, qualMethods: e.target.checked ? [...p.qualMethods, a] : p.qualMethods.filter(x => x !== a)
                      }))} className="w-3 h-3 accent-primary mt-0.5" />
                    <span>{a} {chType === "findings" && QUAL_METHOD_DESCRIPTIONS[a] && <span className="text-[11px] text-muted-foreground">— {QUAL_METHOD_DESCRIPTIONS[a]}</span>}</span>
                  </label>
                ))}
              </div>
            </PanelSection>
          )}

          {/* ═══ ANALYSIS SOFTWARE — methodology only ═══ */}
          {chType === "methodology" && personaliseMode === "advanced" && (
            <PanelSection label="Analysis software">
              <div className="flex flex-col gap-1 mb-2">
                {ANALYSIS_SOFTWARE_OPTIONS.map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                    <input type="checkbox" checked={personalise.software.includes(s)}
                      onChange={e => setPersonalise(p => ({
                        ...p, software: e.target.checked ? [...p.software, s] : p.software.filter(x => x !== s)
                      }))} className="w-3 h-3 accent-primary" />
                    {s}
                  </label>
                ))}
              </div>
              <PanelField label="Other software">
                <input type="text" value={personalise.customSoftware} onChange={e => setPersonalise(p => ({ ...p, customSoftware: e.target.value }))}
                  placeholder="Any other analysis software…"
                  className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
              </PanelField>
            </PanelSection>
          )}

          {/* ═══ CHARTS & VISUALISATIONS — findings only ═══ */}
          {chType === "findings" && personaliseMode === "advanced" && (
            <>
              <PanelSection label="Charts & visualisations">
                <div className="text-[10px] font-bold text-green uppercase tracking-wide mb-1">Auto-selected</div>
                <div className="flex flex-col gap-1 mb-2">
                  {personalise.visualizations.map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                      <input type="checkbox" checked className="w-3 h-3 accent-green"
                        onChange={e => !e.target.checked && setPersonalise(p => ({ ...p, visualizations: p.visualizations.filter(x => x !== v) }))} />
                      <b>{v}</b>
                    </label>
                  ))}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Additional charts</div>
                <div className="flex flex-col gap-1">
                  {VISUALIZATION_OPTIONS.filter(v => !personalise.visualizations.includes(v)).map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                      <input type="checkbox" checked={false} className="w-3 h-3 accent-primary"
                        onChange={e => e.target.checked && setPersonalise(p => ({ ...p, visualizations: [...p.visualizations, v] }))} />
                      {v}
                    </label>
                  ))}
                </div>
              </PanelSection>

              {/* Chart settings */}
              <PanelSection label="Chart settings">
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Colour scheme">
                    <PanelSelect value={personalise.chartColourScheme} options={CHART_COLOUR_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, chartColourScheme: v }))} />
                  </PanelField>
                  <PanelField label="Custom primary colour">
                    <input type="color" value={personalise.chartCustomColour} onChange={e => setPersonalise(p => ({ ...p, chartCustomColour: e.target.value }))}
                      className="w-full h-8 border border-border rounded-md cursor-pointer" />
                  </PanelField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Complexity level">
                    <PanelSelect value={personalise.chartComplexity} options={CHART_COMPLEXITY_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, chartComplexity: v }))} />
                  </PanelField>
                  <PanelField label="Resolution">
                    <PanelSelect value={personalise.chartResolution} options={CHART_RESOLUTION_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, chartResolution: v }))} />
                  </PanelField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Figure numbering">
                    <PanelSelect value={personalise.figureNumbering} options={FIGURE_NUMBERING_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, figureNumbering: v }))} />
                  </PanelField>
                  <PanelField label="Table numbering">
                    <PanelSelect value={personalise.tableNumbering} options={TABLE_NUMBERING_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, tableNumbering: v }))} />
                  </PanelField>
                </div>
                <div className="flex flex-col gap-1 mt-1.5">
                  <CheckItem label="Significance asterisks (* p<.05, ** p<.01, *** p<.001)" checked={personalise.significanceAsterisks} onChange={v => setPersonalise(p => ({ ...p, significanceAsterisks: v }))} />
                  <CheckItem label="95% CIs in all regression tables" checked={personalise.confidenceIntervals} onChange={v => setPersonalise(p => ({ ...p, confidenceIntervals: v }))} />
                  <CheckItem label="Bold statistically significant results" checked={personalise.boldSignificant} onChange={v => setPersonalise(p => ({ ...p, boldSignificant: v }))} />
                  <CheckItem label="Standardised (β) alongside unstandardised (B)" checked={personalise.standardisedBeta} onChange={v => setPersonalise(p => ({ ...p, standardisedBeta: v }))} />
                  <CheckItem label="VIF values for multicollinearity assessment" checked={personalise.vifValues} onChange={v => setPersonalise(p => ({ ...p, vifValues: v }))} />
                  <CheckItem label="n= annotation on each chart" checked={personalise.nAnnotation} onChange={v => setPersonalise(p => ({ ...p, nAnnotation: v }))} />
                </div>
              </PanelSection>

              {/* Mixed methods integration */}
              <PanelSection label="Mixed methods integration">
                <PanelField label="Integration approach">
                  <PanelSelect value={personalise.mixedMethodsApproach} options={MIXED_METHODS_OPTIONS}
                    onChange={v => setPersonalise(p => ({ ...p, mixedMethodsApproach: v }))} />
                </PanelField>
                <div className="flex flex-col gap-1">
                  <CheckItem label="Include triangulation matrix / integration summary" checked={personalise.includeTriangulation} onChange={v => setPersonalise(p => ({ ...p, includeTriangulation: v }))} />
                  <CheckItem label="Include participant quote tables alongside quant results" checked={personalise.includeQuoteTables} onChange={v => setPersonalise(p => ({ ...p, includeQuoteTables: v }))} />
                </div>
              </PanelSection>

              {/* Table formatting */}
              <PanelSection label="Table formatting">
                <div className="grid grid-cols-2 gap-2">
                  <PanelField label="Caption position">
                    <PanelSelect value={personalise.captionPosition} options={CAPTION_POSITION_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, captionPosition: v }))} />
                  </PanelField>
                  <PanelField label="Source format">
                    <PanelSelect value={personalise.sourceFormat} options={SOURCE_FORMAT_OPTIONS}
                      onChange={v => setPersonalise(p => ({ ...p, sourceFormat: v }))} />
                  </PanelField>
                </div>
              </PanelSection>

              {/* Data upload */}
              <PanelSection label="Upload your data">
                <input type="file" accept=".csv,.tsv,.txt,.xlsx,.json,.md" multiple id="dataset-upload" className="hidden"
                  onChange={e => { if (e.target.files?.length) { handleMultiFileUpload(e.target.files, "uploadedData"); e.target.value = ""; } }} />
                <label htmlFor="dataset-upload" className="border-2 border-dashed border-border rounded-md p-2.5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all block">
                  <div className="text-[13px] font-bold text-primary flex items-center justify-center gap-1.5">
                    <Upload size={13} />
                    {personalise.uploadedDataFilename ? `✓ ${personalise.uploadedDataFilename}` : "Click or drop files to upload"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">.csv .txt .xlsx .json — up to 10MB per file, multiple files allowed</p>
                </label>
                {personalise.uploadedData && (
                  <button onClick={() => setPersonalise(p => ({ ...p, uploadedData: "", uploadedDataFilename: "" }))}
                    className="text-[11px] text-destructive hover:underline mt-1">Remove uploaded data</button>
                )}
              </PanelSection>
            </>
          )}

          {/* ═══ METHODOLOGY: Instrument generation ═══ */}
          {chType === "methodology" && personaliseMode === "advanced" && (
            <PanelSection label="Data collection instrument (appendix)">
              <PanelField label="Generate instrument draft?">
                <PanelSelect value={personalise.instrumentGenerate} options={INSTRUMENT_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, instrumentGenerate: v }))} />
              </PanelField>
            </PanelSection>
          )}

          {/* ═══ ABSTRACT FORMAT ═══ */}
          {chType === "abstract" && personaliseMode === "advanced" && (
            <PanelSection label="Abstract format">
              <PanelField label="Abstract type">
                <PanelSelect value={personalise.abstractType} options={ABSTRACT_TYPES} onChange={v => setPersonalise(p => ({ ...p, abstractType: v }))} />
              </PanelField>
              <PanelField label="Target word count">
                <PanelSelect value={personalise.abstractTargetWC} options={ABSTRACT_WC_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, abstractTargetWC: v }))} />
              </PanelField>
              {personalise.abstractTargetWC === "Custom…" && (
                <PanelField label="Custom word count">
                  <input type="number" value={personalise.abstractCustomWC} min={150} max={800}
                    onChange={e => setPersonalise(p => ({ ...p, abstractCustomWC: parseInt(e.target.value) || 350 }))}
                    placeholder="Enter exact word count…"
                    className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background" />
                </PanelField>
              )}
              <div className="flex flex-col gap-1">
                <CheckItem label="Include keywords (5 terms below abstract)" checked={personalise.includeKeywords} onChange={v => setPersonalise(p => ({ ...p, includeKeywords: v }))} />
                <CheckItem label="Dual-language abstract (Masters)" checked={personalise.dualLanguage} onChange={v => setPersonalise(p => ({ ...p, dualLanguage: v }))} />
                <CheckItem label="Include word count declaration in abstract" checked={personalise.includeWCDeclaration} onChange={v => setPersonalise(p => ({ ...p, includeWCDeclaration: v }))} />
              </div>
            </PanelSection>
          )}

          {/* ═══ STRUCTURE — all chapters ═══ */}
          {personaliseMode === "advanced" && (
            <PanelSection label="Structure">
              <PanelField label="Line spacing">
                <PanelSelect value={personalise.lineSpacing} options={LINE_SPACING_OPTIONS} onChange={v => setPersonalise(p => ({ ...p, lineSpacing: v }))} />
              </PanelField>
              <div className="flex flex-col gap-1">
                <CheckItem label="Begin chapter on new page" checked={personalise.beginOnNewPage} onChange={v => setPersonalise(p => ({ ...p, beginOnNewPage: v }))} />
                <CheckItem label="Include appendix for this chapter" checked={personalise.includeAppendix} onChange={v => setPersonalise(p => ({ ...p, includeAppendix: v }))} />
              </div>
            </PanelSection>
          )}

          {/* ═══ UPLOAD INSTRUCTIONS — all chapters ═══ */}
          <PanelSection label="Upload documents / instructions">
            <input type="file" accept=".txt,.doc,.docx,.pdf,.md,.csv,.json" multiple id="instructions-upload" className="hidden"
              onChange={e => { if (e.target.files?.length) { handleMultiFileUpload(e.target.files, "pastedInstructions"); e.target.value = ""; } }} />
            <label htmlFor="instructions-upload" className="border-2 border-dashed border-border rounded-md p-2.5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all block">
              <div className="text-[13px] font-bold text-primary flex items-center justify-center gap-1.5">
                <Upload size={13} /> Click or drop documents here
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">.txt .docx .pdf .md .csv — up to 10MB per file, multiple files allowed</p>
            </label>
            <PanelField label="Or paste instructions directly">
              <textarea value={personalise.pastedInstructions} onChange={e => setPersonalise(p => ({ ...p, pastedInstructions: e.target.value }))}
                placeholder="Paste any written instructions, outline, or notes here…"
                className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background resize-none h-14 mt-2" />
            </PanelField>
            {personalise.pastedInstructions && (
              <button onClick={() => setPersonalise(p => ({ ...p, pastedInstructions: "" }))}
                className="text-[11px] text-destructive hover:underline mt-1">Clear instructions</button>
            )}
          </PanelSection>

          {/* ═══ NO-CITE / INFO NOTICES ═══ */}
          {isReuseCiteChapter && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800 leading-relaxed">
              <b>Citation rule:</b> Chapter 4 synthesises your data with existing literature from Chapters 1 & 2. No new sources are introduced — only references already cited in earlier chapters.
            </div>
          )}
          {isNoCiteChapter && chType === "conclusion" && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800 leading-relaxed">
              <b>Citation rule:</b> Chapter 5 contains no citations at all. It summarises your findings and provides recommendations without referencing any sources.
            </div>
          )}
          {chType === "abstract" && (
            <div className="bg-aqua/10 border border-aqua/20 rounded-md px-3 py-2 text-xs text-aqua leading-relaxed">
              <b>Note:</b> The abstract is generated last and summarises the complete dissertation. Ensure all chapters are accepted before drafting.
            </div>
          )}
        </div>

        <div className="px-3.5 py-2.5 border-t border-border flex gap-2 flex-shrink-0">
          <button onClick={() => setShowPersonalise(false)} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={async () => {
            setShowPersonalise(false);
            if (project && currentChapter && user) {
              const updatedChapters = project.chapters.map(c => c.id === currentChapter.id ? { ...c, draft_config: { ...((c.draft_config as any) || {}), personalise } } : c);
              const updatedProject = { ...project, chapters: updatedChapters };
              setProject(updatedProject);
              try { await updateProject(user.id, updatedProject); } catch {}
            }
            toast.success("Settings saved.");
          }} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors">Save & apply</button>
        </div>
      </div>

      {/* ═══ EXPORT MODAL ═══ */}
      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Download ALL — Full Dissertation">
        <div className="bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5 text-xs text-primary mb-3">
          Your tier: <b className="capitalize">{subscription.tier}</b> · {subscription.words_used.toLocaleString()} / {subscription.word_limit.toLocaleString()} words
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
          Downloads your complete dissertation in the selected format.
        </p>
        {EXPORT_FORMATS.map(f => {
          const locked = !isTestUser && !f.tiers.includes(subscription.tier);
          return (
            <div key={f.id} onClick={() => !locked && setSelectedExportFormat(f.id)}
              className={cn("flex items-center gap-2.5 p-2 border rounded-md mb-1.5 transition-all",
                locked ? "opacity-40 cursor-not-allowed border-border" :
                selectedExportFormat === f.id ? "border-primary bg-primary/5 cursor-pointer" : "border-border cursor-pointer hover:border-primary"
              )}>
              {locked ? <span className="text-xs text-muted-foreground">🔒</span> : <input type="radio" name="exportFmt" className="accent-primary" checked={selectedExportFormat === f.id} readOnly />}
              <div className="flex-1">
                <div className="text-[13px] font-bold text-foreground">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{f.desc}</div>
              </div>
              {locked && <span className="text-[10px] text-muted-foreground">Upgrade</span>}
            </div>
          );
        })}
        <div className="flex justify-end gap-2 mt-3">
          <button disabled={isGeneratingImages} onClick={async () => {
            // Download Images as ZIP — uses the async job queue so we never
            // hit the 150s edge-function timeout (the previous synchronous
            // implementation would silently die on jobs of 5+ figures).
            setIsGeneratingImages(true);
            const toastId = toast.loading("Queuing image job…", { duration: 5_000 });
            // Match both **Figure N: title**\n*desc* AND <!-- FIGURE:N:title:desc --> markers
            const captionRegex = /\*\*Figure\s+(\d+[\.\d]*):?\s*(.+?)\*\*[\n\r\s]*\*([^*]+)\*/g;
            const markerRegex = /<!-- FIGURE:([^:]+):([^:]+):(.+?) -->/g;
            const figures: Array<{ id: string; title: string; description: string; chapterTitle: string; chapterId: string; figureNumber: string }> = [];
            for (const ch of project.chapters.filter(c => c.content)) {
              let match;
              while ((match = captionRegex.exec(ch.content || "")) !== null) {
                figures.push({ id: `fig_${match[1]}`, title: `Figure ${match[1]}: ${match[2]}`, description: match[3], chapterTitle: ch.title, chapterId: ch.id, figureNumber: match[1] });
              }
              while ((match = markerRegex.exec(ch.content || "")) !== null) {
                const isDupe = figures.some(f => f.id === `fig_${match![1]}` && f.chapterId === ch.id);
                if (!isDupe) {
                  figures.push({ id: `fig_${match[1]}`, title: `Figure ${match[1]}: ${match[2].trim()}`, description: match[3].trim(), chapterTitle: ch.title, chapterId: ch.id, figureNumber: match[1] });
                }
              }
            }
            if (figures.length === 0) {
              toast.dismiss(toastId);
              setIsGeneratingImages(false);
              toast.error("No figure placeholders found in chapters. Ensure 'Include figures' is ticked before generating.");
              return;
            }
            try {
              // Step 1: enqueue the job (returns instantly with a jobId).
              const enqueue = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-images`, {
                method: "POST",
                headers: await authedHeaders(),
                body: JSON.stringify({
                  figures,
                  projectTitle: project.title,
                  colourScheme: personalise.chartColourScheme,
                  projectId: project.id,
                }),
              });
              if (!enqueue.ok) {
                toast.dismiss(toastId);
                const err = await enqueue.json().catch(() => ({}));
                setIsGeneratingImages(false);
                toast.error(err.error || "Failed to queue image job");
                return;
              }
              const { jobId } = await enqueue.json();
              if (!jobId) {
                toast.dismiss(toastId);
                setIsGeneratingImages(false);
                toast.error("Job queued but no id returned. Try again.");
                return;
              }
              toast.dismiss(toastId);

              // Step 2: subscribe to realtime updates on the job row.
              // Realtime pushes each progress tick instantly (no 2.5s polling lag).
              // We keep a 30-second polling fallback in case realtime drops, plus an
              // 8-minute ceiling to bound worst-case PhD-tier batches.
              const MAX_MS = 8 * 60 * 1000;
              const startedAt = Date.now();
              const progressToastId = toast.loading(`Generating image 0 of ${figures.length}…`, { duration: MAX_MS });

              await new Promise<void>((resolve) => {
                let settled = false;
                const finish = () => { if (!settled) { settled = true; resolve(); } };

                const handle = (job: any) => {
                  if (settled || !job) return;
                  if (typeof job.completed === "number") {
                    toast.loading(`Generating image ${job.completed} of ${job.total ?? figures.length}…`, { id: progressToastId });
                  }
                  if (job.status === "completed" && job.result_zip_b64) {
                    toast.dismiss(progressToastId);
                    const binary = atob(job.result_zip_b64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const blob = new Blob([bytes], { type: "application/zip" });
                    downloadBlob(blob, job.result_filename || `${project.title.replace(/\s+/g, "_")}_Figures.zip`);
                    toast.success(`${job.completed} image${job.completed === 1 ? "" : "s"} downloaded as ZIP`);
                    setIsGeneratingImages(false);
                    cleanup();
                    finish();
                  } else if (job.status === "failed" || job.status === "cancelled") {
                    toast.dismiss(progressToastId);
                    toast.error(job.error || (job.status === "cancelled" ? "Image job cancelled" : "Image generation failed"));
                    setIsGeneratingImages(false);
                    cleanup();
                    finish();
                  }
                };

                const channel = supabase
                  .channel(`image-job-${jobId}`)
                  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "image_jobs", filter: `id=eq.${jobId}` },
                    (payload) => handle(payload.new))
                  .subscribe();

                // Safety-net poller every 15s in case realtime drops.
                const poller = setInterval(async () => {
                  const { data: job } = await supabase.from("image_jobs")
                    .select("status, completed, total, result_zip_b64, result_filename, error")
                    .eq("id", jobId).maybeSingle();
                  if (job) handle(job);
                  if (Date.now() - startedAt > MAX_MS) {
                    toast.dismiss(progressToastId);
                    toast.error("Image generation took too long. Check Settings → Image Jobs to retry.");
                    setIsGeneratingImages(false);
                    cleanup();
                    finish();
                  }
                }, 15_000);

                const cleanup = () => {
                  clearInterval(poller);
                  supabase.removeChannel(channel);
                };
              });
            } catch (e: any) {
              toast.dismiss(toastId);
              toast.error(e.message || "Image generation failed");
              setIsGeneratingImages(false);
            }
          }} title="Re-download all generated figures as a ZIP. Figures are already embedded in your .docx export." className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary border border-border disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isGeneratingImages ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Download size={12} /> Download Figures</>}
          </button>
          <button onClick={() => setShowExportModal(false)} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
          <button onClick={() => { setShowExportModal(false); handleExportAll(); }} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90">Download</button>
        </div>
      </Modal>

      {/* ═══ EXPORT CHAPTER MODAL ═══ */}
      <Modal open={showExportChModal} onClose={() => setShowExportChModal(false)} title={`Export — ${currentChapter?.title}`}>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
          Download this chapter in the selected format.
        </p>
        {EXPORT_FORMATS.filter(f => isTestUser || f.tiers.includes(subscription.tier)).map(f => (
          <div key={f.id} onClick={() => setSelectedChExportFormat(f.id)}
            className={cn("flex items-center gap-2.5 p-2 border rounded-md mb-1.5 cursor-pointer transition-all",
              selectedChExportFormat === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary"
            )}>
            <input type="radio" name="expChFmt" className="accent-primary" checked={selectedChExportFormat === f.id} readOnly />
            <div className="flex-1">
              <div className="text-[13px] font-bold text-foreground">{f.name}</div>
              <div className="text-[11px] text-muted-foreground">{f.desc}</div>
            </div>
          </div>
        ))}
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => setShowExportChModal(false)} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
          <button onClick={() => { setShowExportChModal(false); handleDownloadChapter(); }} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90">Download</button>
        </div>
      </Modal>

      {/* ═══ REVISE MODAL ═══ */}
      <Modal open={showReviseModal} onClose={() => setShowReviseModal(false)} title="Request revision">
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
          Describe what should change. The entire chapter will be rewritten from scratch.
        </p>
        <textarea value={reviseText} onChange={(e) => setReviseText(e.target.value)} rows={4}
          className="w-full px-2.5 py-2 border border-border rounded-md text-[13px] text-foreground outline-none focus:border-primary bg-background resize-none"
          placeholder="e.g. Expand the social constructivism section. Add more post-2020 empirical sources…" />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => setShowReviseModal(false)} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
          <button onClick={handleRevise} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90">Redraft</button>
        </div>
      </Modal>

      {/* Grammar/editing engine removed */}

      {/* ═══ CHAPTER OUTLINE MODAL ═══ */}
      {showOutlineModal && currentChapter && (
        <ChapterOutlineModal
          chapterType={currentChapter.type}
          chapterTitle={currentChapter.title}
          targetWords={currentChapter.word_count_target || draftConfig.target_words || 2000}
          methodology={project?.research_methodology || "Quantitative"}
          degree={project?.degree}
          includeHypotheses={!!project?.include_hypotheses}
          initialHeadings={
            currentChapter.draft_config?.headings?.length
              ? currentChapter.draft_config.headings.map((h, i) => ({
                  id: `existing-${i}`,
                  number: `${i + 1}`,
                  text: h.text,
                  level: 1 as const,
                  wordCount: h.target_words,
                  selected: true,
                  mandatory: false,
                  isCustom: true,
                }))
              : undefined
          }
          projectContext={project ? {
            title: project.title,
            field_of_study: project.field_of_study,
            degree: project.degree,
            research_methodology: project.research_methodology,
            research_framework: project.research_framework,
            framework_justification: project.framework_justification,
            research_objectives: project.research_objectives,
            research_questions: project.research_questions,
            include_hypotheses: !!project.include_hypotheses,
          } : undefined}
          onConfirm={(headings, visuals) => handleGenerate(headings, visuals)}
          onCancel={() => setShowOutlineModal(false)}
          visualImageStatus={visualImageStatus}
          onVisualToggle={(visual, selected) => {
            if (visual.type !== "image" || !currentChapter || !user || !project) return;
            if (!selected) {
              setVisualImageStatus(prev => {
                const next = { ...prev };
                delete next[visual.id];
                return next;
              });
              return;
            }
            // Queue only. Actual image generation now starts after the chapter
            // prose has finished and markers exist in saved content.
            setVisualImageStatus(prev => ({ ...prev, [visual.id]: "queued" }));
          }}
        />
      )}

      {/* ═══ FINAL EXPORT OVERLAY ═══ */}
      {showFinalExport && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-background overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <span className="text-sm font-black text-foreground">Final Export</span>
            <button onClick={() => setShowFinalExport(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1">
            <FinalExport project={project} />
          </div>
        </div>
      )}

      {/* Diff preview modal removed (grammar engine deleted) */}

      {/* ═══ IMAGE NOTICE & PROGRESS MODALS ═══ */}
      <ImageAckModal
        open={showImageAck}
        onAcknowledge={() => { ackImageNotice(); setShowImageAck(false); }}
      />
      <ImageProgressModal
        open={showImageProgress}
        info={imageProgressInfo}
        onWait={() => { /* keep open while still loading */ }}
        onExit={() => setShowImageProgress(false)}
        onDownloadAnyway={() => { setShowImageProgress(false); setShowFinalExport(true); }}
      />

      {/* Humanise panel */}
      {showHumanisePanel && currentChapter && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                  <Wand2 size={15} className="text-primary" />
                  AI Humaniser
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  7-stage pipeline that rewrites this chapter to pass AI detection.
                  Credits deducted from your word pack.
                </p>
              </div>
              <button
                onClick={() => { humaniseAbortRef.current?.abort(); setShowHumanisePanel(false); setIsHumanising(false); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chapter info */}
            <div className="mb-4 px-3 py-2.5 bg-secondary/50 rounded-lg text-[12px] text-muted-foreground flex justify-between">
              <span className="font-medium text-foreground truncate max-w-[60%]">{currentChapter.title}</span>
              <span>{(currentChapter.word_count_actual || countBodyWords(currentChapter.content || "")).toLocaleString()} words</span>
            </div>

            {/* Stage progress */}
            {humaniseStages.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {humaniseStages.map(s => (
                  <div key={s.stage} className="flex items-center gap-2.5 text-[12px]">
                    <span className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold",
                      s.status === "done" ? "bg-green-500/20 text-green-500" :
                      s.status === "running" ? "bg-primary/20 text-primary animate-pulse" :
                      s.status === "skipped" ? "bg-secondary text-muted-foreground" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {s.status === "done" ? "✓" : s.status === "skipped" ? "−" : s.stage}
                    </span>
                    <span className={cn(
                      s.status === "running" ? "text-foreground font-medium" :
                      s.status === "done" ? "text-foreground" :
                      "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                    {s.status === "running" && <Loader2 size={11} className="animate-spin text-primary ml-auto" />}
                  </div>
                ))}
              </div>
            )}

            {/* Result ready — diff view */}
            {humanisedText && (
              <div className="mb-4">
                <style>{`
                  .diff-del { background: rgba(239,68,68,0.18); color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
                  .dark .diff-del { color: #f87171; }
                  .diff-ins { background: rgba(34,197,94,0.18); color: #15803d; border-radius: 2px; padding: 0 1px; }
                  .dark .diff-ins { color: #4ade80; }
                `}</style>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-foreground">{countBodyWords(humanisedText).toLocaleString()} words</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold">~ modified</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold">+ added</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold">– deleted</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-1">inline: <span className="diff-del" style={{fontSize:"10px"}}>removed</span> <span className="diff-ins" style={{fontSize:"10px"}}>added</span></span>
                </div>
                {humaniseDiff && (
                  <div className="overflow-y-auto max-h-[50vh] rounded-lg border border-border space-y-0.5 p-2 bg-background text-[13px] leading-relaxed">
                    {humaniseDiff.map((para, i) => (
                      <div
                        key={i}
                        className={cn(
                          "px-2 py-1.5 rounded border-l-4",
                          para.type === "unchanged" ? "border-transparent" :
                          para.type === "modified"  ? "bg-amber-500/8 border-amber-500" :
                          para.type === "added"     ? "bg-emerald-500/10 border-emerald-500" :
                                                      "bg-red-500/10 border-red-500 opacity-70"
                        )}
                      >
                        {para.type === "modified" && para.diffHtml ? (
                          <p dangerouslySetInnerHTML={{ __html: para.diffHtml }} />
                        ) : para.type === "deleted" ? (
                          <p className="line-through text-muted-foreground">{para.text}</p>
                        ) : (
                          <p>{para.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!isHumanising && !humanisedText && (
                <button
                  onClick={handleStartHumanise}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Wand2 size={13} />
                  Humanise chapter
                </button>
              )}
              {isHumanising && (
                <button
                  onClick={() => { humaniseAbortRef.current?.abort(); setIsHumanising(false); }}
                  className="flex-1 h-9 rounded-lg bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle size={13} />
                  Cancel
                </button>
              )}
              {humanisedText && (
                <>
                  <button
                    onClick={() => { setHumanisedText(null); setHumaniseDiff(null); setHumaniseStages([]); }}
                    className="h-9 px-4 rounded-lg bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleApplyHumanised}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={13} />
                    Apply humanised version
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supervisor corrections modal */}
      {currentChapter && (
        <SupervisorFeedbackModal
          open={showSupervisorModal}
          onClose={() => setShowSupervisorModal(false)}
          chapter={currentChapter}
          project={project}
          onApplied={handleSupervisorRevisionApplied}
        />
      )}

      {/* Chapter re-order modal */}
      {showReorderModal && (
        <ReorderChaptersModal
          chapters={project.chapters}
          projectId={project.id}
          userId={user?.id || ""}
          onSave={handleChapterManagerSave}
          onClose={() => setShowReorderModal(false)}
        />
      )}

      {/* First-visit studio tour */}
      {showTour && <OnboardingTour onDone={handleTourDone} />}

      {/* Supervisor share link modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Share with supervisor</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Anyone with this link can read and comment on your draft.</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-[12px] bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none truncate"
                onFocus={e => e.currentTarget.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-foreground text-background text-[12px] font-bold hover:opacity-80 transition-opacity"
              >
                {shareCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            {(supervisorCommentCounts && Object.values(supervisorCommentCounts).some(v => v > 0)) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                <MessageCircle size={11} />
                Your supervisor has left comments — see badges on chapter dots.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ DIFF UTILITIES ═══

export type { DiffParagraph } from "@/lib/diffUtils";

// ═══ HELPER COMPONENTS ═══

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground mb-2">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PanelField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function PanelSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-1.5 border border-border rounded-md text-[13px] text-foreground outline-none focus:border-primary bg-background appearance-none">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-3 h-3 accent-primary" />
      {label}
    </label>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-foreground/20 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-xl max-w-[360px] w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-heading text-[15px] font-black text-foreground mb-1.5">{title}</h3>
        {children}
      </div>
    </div>
  );
}
