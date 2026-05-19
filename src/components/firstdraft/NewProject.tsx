import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Info, Check, Upload, Loader2, Plus, Trash2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project, type Methodology } from "@/types/project";
import {
  CHAPTER_CONFIGS,
  SAMPLING_OPTIONS,
  DATA_COLLECTION_OPTIONS,
  FRAMEWORK_OPTIONS,
  FRAMEWORK_HINTS,
  CITATION_STYLES,
  LANGUAGE_STYLES,
  FORMALITY_OPTIONS,
  METHODOLOGY_DEPTH_OPTIONS,
  VOICE_OPTIONS,
  HEDGING_OPTIONS,
  CH_WEIGHTS,
  ABSTRACT_WC,
  LANGUAGE_LEVEL_DESCRIPTIONS,
  guessField,
} from "@/lib/constants";
import { CITATION_STYLE_METADATA, inferCitationStyle } from "@/lib/citationStylesMeta";
import { Slider } from "@/components/ui/slider";

type WizardStep = 0 | 1 | 2 | 3 | 4;

type ChapterDist = { name: string; type: string; wc: number; isCustom?: boolean };

type FormState = {
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
  framework_justification: string;
  writing_mode: "natural" | "default";
  language_level: number;
  formality: string;
  methodology_depth: string;
  voice: string;
  hedging: string;
  hypotheses: string[];
  includeHypotheses: boolean;
  includeAppendix: string;
  abstractInclusion: string;
  customChapterTitles: string;
  uploadedInstructions: string;
};

const DEGREE_OPTIONS = ["BSc / BA", "MSc", "MA / MBA", "PhD / DPhil"];
const STEP_LABELS = ["Your dissertation", "How you're researching", "Chapter plan", "Your questions", "Ready to go"];

const initialForm: FormState = {
  title: "",
  university: "",
  degree: "MSc",
  field_of_study: "",
  word_count: 10000,
  citation_style: "Harvard",
  language_style: "English (UK)",
  research_methodology: "Quantitative",
  data_collection_method: "Surveys / Questionnaires",
  sampling_technique: "Probability Sampling",
  sample_size: 100,
  research_objectives: ["", "", "", ""],
  research_questions: ["", "", "", ""],
  research_framework: "None",
  framework_justification: "",
  writing_mode: "default",
  language_level: 4,
  formality: "Standard journal (default)",
  methodology_depth: "Standard",
  voice: "Third person only",
  hedging: "Medium (standard)",
  hypotheses: ["", "", ""],
  includeHypotheses: false,
  includeAppendix: "No",
  abstractInclusion: "Yes — drafted last",
  customChapterTitles: "",
  uploadedInstructions: "",
};

/** Get the abstract word count based on degree */
function getAbstractWC(degree: string): number {
  if (degree === "PhD / DPhil") return ABSTRACT_WC.phd;
  if (degree === "BSc / BA") return ABSTRACT_WC.undergraduate;
  return ABSTRACT_WC.masters;
}

/**
 * Abstract is NOT included in the user's selected word count.
 * User selects e.g. 10,000 words → chapters split across 10,000.
 * Abstract gets its own fixed allocation on top.
 */
function getDefaultChapters(methodology: Methodology, totalWC: number, degree?: string): ChapterDist[] {
  const configs = CHAPTER_CONFIGS[methodology] || CHAPTER_CONFIGS["Mixed Methods"];
  const abstractWC = getAbstractWC(degree || "MSc");

  // First pass: allocate by weight using floor, then redistribute remainder so the
  // body sum exactly matches the user's selected total.
  const bodyConfigs = configs.filter(c => c.type !== "abstract");
  const totalWeight = bodyConfigs.reduce((s, c) => s + (CH_WEIGHTS[c.type] as number || 0), 0) || 1;
  const raw = bodyConfigs.map(c => {
    const w = (CH_WEIGHTS[c.type] as number) || 0.15;
    return (totalWC * w) / totalWeight;
  });
  const floored = raw.map(v => Math.floor(v));
  let remainder = totalWC - floored.reduce((s, n) => s + n, 0);
  const fractions = raw.map((v, i) => ({ i, frac: v - floored[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < fractions.length; k++) floored[fractions[k].i] += 1;

  let bodyIdx = 0;
  return configs.map((c) => {
    if (c.type === "abstract") return { name: c.title, type: c.type, wc: abstractWC };
    return { name: c.title, type: c.type, wc: floored[bodyIdx++] };
  });
}

function suggestFramework(fieldOfStudy: string, methodology: string): string {
  const field = fieldOfStudy.toLowerCase();
  const method = methodology.toLowerCase();
  const isHealth = /health|medicine|medical|nursing|clinical|pharmacy|biomedical/.test(field);
  const isBusiness = /business|management|marketing|finance|economics|mba|accounting|commerce/.test(field);
  const isSocial = /social|psycholog|sociolog|education|counsell|welfare|community/.test(field);
  if (isHealth) {
    if (method.includes("qualitative")) return "SPIDER";
    if (method.includes("mixed")) return "PICOS";
    return "PICO";
  }
  if (isBusiness) {
    if (method.includes("quantitative")) return "SMART";
    return "CIMO";
  }
  if (isSocial && method.includes("qualitative")) return "SPICE";
  if (method.includes("qualitative")) return "SPIDER";
  return "FINER";
}

export function NewProject({ onBack, onCreate }: { onBack: () => void; onCreate: (p: Project) => void }) {
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [chapters, setChapters] = useState<ChapterDist[]>(() => getDefaultChapters("Quantitative", 10000, "MSc"));
  const [autoGenerated, setAutoGenerated] = useState(false);
  const [suggestedFramework, setSuggestedFramework] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Custom chapter input state
  const [customChapterName, setCustomChapterName] = useState("");

  // Auto-suggest research framework based on field + methodology
  useEffect(() => {
    const suggestion = suggestFramework(form.field_of_study, form.research_methodology);
    setSuggestedFramework(suggestion);
    if (form.research_framework === "None") {
      setForm(prev => ({ ...prev, research_framework: suggestion }));
    }
  }, [form.field_of_study, form.research_methodology]);

  // In simple mode, infer field of study from the title as the user types
  useEffect(() => {
    if (!showAdvanced && form.title.length > 8) {
      const inferred = guessField(form.title, "");
      if (inferred && inferred !== "General") {
        setForm(prev => ({ ...prev, field_of_study: inferred }));
      }
    }
  }, [form.title, showAdvanced]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest citation style when field of study changes (only if user hasn't picked one yet)
  useEffect(() => {
    if (form.citation_style) return; // user already chose — don't override
    const suggested = inferCitationStyle(form.field_of_study);
    if (suggested) setForm(prev => ({ ...prev, citation_style: suggested }));
  }, [form.field_of_study]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstructionsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      let text = "";
      if (file.name.endsWith(".docx")) {
        const ab = await file.arrayBuffer();
        const uint8 = new Uint8Array(ab);
        const decoder = new TextDecoder("utf-8");
        const raw = decoder.decode(uint8);
        const xmlMatch = raw.match(/word\/document\.xml/);
        if (xmlMatch) {
          const xmlStart = raw.indexOf("<w:body");
          const xmlEnd = raw.indexOf("</w:body>") + 9;
          if (xmlStart > -1 && xmlEnd > 9) {
            const xmlSlice = raw.slice(xmlStart, xmlEnd);
            text = xmlSlice.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/ +/g, " ").trim();
          }
        }
        if (!text) text = `[Could not extract text from ${file.name} — paste content manually]`;
      } else {
        text = await file.text();
      }
      updateForm("uploadedInstructions", text.slice(0, 8000));
    } catch {
      updateForm("uploadedInstructions", `[Error reading ${file.name} — please paste content manually]`);
    }
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateListValue = (key: "research_objectives" | "research_questions" | "hypotheses", index: number, value: string) => {
    const next = [...form[key]];
    next[index] = value;
    updateForm(key, next);
  };

  // Recalculate chapter word counts when total changes — abstract is separate.
  // Distributes the EXACT total to body chapters (no rounding loss).
  const recalcChapterWC = (totalWC: number, degree?: string) => {
    const abstractWC = getAbstractWC(degree ?? form.degree);
    setChapters((prev) => {
      const customChapters = prev.filter(ch => ch.isCustom);
      const customTotalWC = customChapters.reduce((s, c) => s + c.wc, 0);
      const distributableWC = Math.max(0, totalWC - customTotalWC);

      // Identify standard body chapters (in order) and their weights
      const standardBody = prev
        .map((ch, idx) => ({ ch, idx }))
        .filter(({ ch }) => !ch.isCustom && ch.type !== "abstract" && CH_WEIGHTS[ch.type] != null);
      const totalWeight = standardBody.reduce((s, { ch }) => s + (CH_WEIGHTS[ch.type] as number), 0) || 1;

      const raw = standardBody.map(({ ch }) => (distributableWC * (CH_WEIGHTS[ch.type] as number)) / totalWeight);
      const floored = raw.map(v => Math.floor(v));
      let remainder = distributableWC - floored.reduce((s, n) => s + n, 0);
      const fractions = raw.map((v, i) => ({ i, frac: v - floored[i] }))
        .sort((a, b) => b.frac - a.frac);
      for (let k = 0; k < remainder && k < fractions.length; k++) floored[fractions[k].i] += 1;

      const wcByIdx = new Map<number, number>();
      standardBody.forEach(({ idx }, i) => wcByIdx.set(idx, floored[i]));

      return prev.map((ch, i) => {
        if (ch.type === "abstract") return { ...ch, wc: abstractWC };
        if (wcByIdx.has(i)) return { ...ch, wc: wcByIdx.get(i)! };
        return ch; // custom chapters retain their wc
      });
    });
  };

  // Sum excluding abstract (abstract is on top)
  const bodyChapterSum = chapters.filter(c => c.type !== "abstract").reduce((s, c) => s + c.wc, 0);
  const abstractChapter = chapters.find(c => c.type === "abstract");
  const totalWithAbstract = bodyChapterSum + (abstractChapter?.wc || 0);

  const updateChapterWC = (index: number, wc: number) => {
    setChapters((prev) => prev.map((ch, i) => (i === index ? { ...ch, wc } : ch)));
  };

  const degreeTierLabel = useMemo(() => {
    if (form.degree === "BSc / BA") return "Undergraduate";
    if (form.degree === "MSc" || form.degree === "MA / MBA") return "Masters";
    if (form.degree === "PhD / DPhil") return "PhD";
    return "";
  }, [form.degree]);

  const wcMax = useMemo(() => {
    if (form.degree === "BSc / BA") return 20000;
    if (form.degree === "MSc" || form.degree === "MA / MBA") return 30000;
    if (form.degree === "PhD / DPhil") return 100000;
    return 30000;
  }, [form.degree]);

  const wcExceedsMax = form.word_count > wcMax;
  const wcFillPct = useMemo(() => {
    return Math.min(Math.round((form.word_count / wcMax) * 100), 100);
  }, [form.word_count, wcMax]);

  const estimatedPages = useMemo(() => Math.round(form.word_count / 275), [form.word_count]);

  // Step 4 (Objectives) requires at least one objective AND at least one question
  // — we never want to start a chapter generation with no questions on file.
  const objectivesFilled = form.research_objectives.filter(o => o.trim()).length;
  const questionsFilled = form.research_questions.filter(q => q.trim()).length;
  const objectivesStepValid = objectivesFilled === 0 || questionsFilled > 0;

  const canContinue =
    (step === 0 && form.title.trim().length > 0) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && objectivesStepValid) ||
    step === 4;

  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAutoGenerate = async () => {
    if (!form.title.trim()) {
      setAutoGenerated(false);
      return;
    }
    setAiGenerating(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("generate-objectives", {
        body: {
          title: form.title.trim(),
          field: form.field_of_study || "General",
          methodology: form.research_methodology,
          framework: form.research_framework,
          degree: form.degree,
          objectiveCount: form.research_objectives.length,
          includeHypotheses: form.includeHypotheses,
        },
      });
      if (error) throw error;
      // FORCE-REPLACE objectives — the AI's set is the canonical one for the title.
      // Users can edit after; we never want to leave an objective slot blank when
      // the AI returned a full set.
      if (data?.objectives && Array.isArray(data.objectives) && data.objectives.length > 0) {
        const slotCount = Math.max(form.research_objectives.length, data.objectives.length);
        const newObj: string[] = Array(slotCount).fill("");
        data.objectives.forEach((o: string, i: number) => { if (i < slotCount) newObj[i] = o; });
        // Preserve any user-typed objectives that the AI didn't overwrite.
        form.research_objectives.forEach((existing, i) => {
          if (existing.trim() && !newObj[i]) newObj[i] = existing;
        });
        updateForm("research_objectives", newObj);
      }
      // FORCE-REPLACE questions — same treatment as objectives.
      if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        const slotCount = Math.max(form.research_questions.length, data.questions.length);
        const newQ: string[] = Array(slotCount).fill("");
        data.questions.forEach((q: string, i: number) => { if (i < slotCount) newQ[i] = q; });
        form.research_questions.forEach((existing, i) => {
          if (existing.trim() && !newQ[i]) newQ[i] = existing;
        });
        updateForm("research_questions", newQ);
      }
      if (data?.hypotheses && form.includeHypotheses) {
        const newH = [...form.hypotheses];
        data.hypotheses.forEach((h: string, i: number) => {
          if (i < newH.length && !newH[i].trim()) newH[i] = h;
        });
        updateForm("hypotheses", newH);
      }
      setAutoGenerated(true);
    } catch (err: any) {
      console.error("AI generation failed:", err);
      const short = form.title.trim().split(" ").slice(0, 7).join(" ").toLowerCase();
      const newObj = [...form.research_objectives];
      const fallbacks = [
        `To examine the current state of ${short}.`,
        `To identify the main drivers and barriers influencing ${short}.`,
        `To assess the relationship between selected variables and outcomes related to ${short}.`,
        `To evaluate the effectiveness of current approaches to ${short} in practice.`,
      ];
      newObj.forEach((o, i) => { if (!o.trim() && fallbacks[i]) newObj[i] = fallbacks[i]; });
      updateForm("research_objectives", newObj);
      // Also fill questions from fallbacks so we never leave them blank.
      const newQ = [...form.research_questions];
      const qFallbacks = [
        `What is the current state of ${short}?`,
        `What are the main drivers and barriers influencing ${short}?`,
        `What is the relationship between selected variables and outcomes related to ${short}?`,
        `How effective are current approaches to ${short} in practice?`,
      ];
      newQ.forEach((q, i) => { if (!q.trim() && qFallbacks[i]) newQ[i] = qFallbacks[i]; });
      updateForm("research_questions", newQ);
      setAutoGenerated(true);
    } finally {
      setAiGenerating(false);
    }
  };

  // Add a custom chapter
  const addCustomChapter = () => {
    const name = customChapterName.trim();
    if (!name) return;
    const insertIndex = chapters.findIndex(c => c.type === "abstract");
    const newChapter: ChapterDist = {
      name: `Ch ${insertIndex > 0 ? insertIndex + 1 : chapters.length} · ${name}`,
      type: "custom",
      wc: Math.round(form.word_count * 0.12), // default 12% allocation
      isCustom: true,
    };
    if (insertIndex >= 0) {
      setChapters(prev => [...prev.slice(0, insertIndex), newChapter, ...prev.slice(insertIndex)]);
    } else {
      setChapters(prev => [...prev, newChapter]);
    }
    setCustomChapterName("");
  };

  const removeCustomChapter = (index: number) => {
    setChapters(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const createdAt = new Date().toISOString();
    onCreate({
      id: crypto.randomUUID(),
      title: form.title.trim(),
      university: form.university.trim(),
      degree: form.degree.trim(),
      field_of_study: form.field_of_study.trim(),
      word_count: form.word_count,
      citation_style: form.citation_style,
      language_style: form.language_style,
      research_methodology: form.research_methodology,
      data_collection_method: form.data_collection_method.trim(),
      sampling_technique: form.sampling_technique.trim(),
      sample_size: form.sample_size,
      research_objectives: form.research_objectives.filter(Boolean),
      research_questions: form.research_questions.filter(Boolean),
      research_framework: form.research_framework.trim(),
      framework_justification: form.framework_justification.trim(),
      writing_mode: form.writing_mode,
      language_level: form.language_level,
      include_hypotheses: form.includeHypotheses,
      created_date: createdAt,
      chapters: chapters.map((ch, index) => ({
        id: crypto.randomUUID(),
        order_index: index,
        title: ch.name,
        type: ch.type,
        content: "",
        status: "pending" as const,
        word_count_target: ch.wc,
        word_count_actual: 0,
        draft_config: {
          target_words: ch.wc,
          stats_count: 5,
          source_year_start: 2016,
          source_year_end: 2024,
          headings: [],
          includeHypotheses: form.includeHypotheses,
          hypotheses: form.hypotheses.filter(Boolean),
        } as any,
      })),
    });
  };

  // Rebuild chapters when methodology changes (structural)
  useEffect(() => {
    // Preserve custom chapters when methodology changes
    const customChapters = chapters.filter(c => c.isCustom);
    const newDefaults = getDefaultChapters(form.research_methodology, form.word_count, form.degree);
    const insertIndex = newDefaults.findIndex(c => c.type === "abstract");
    if (customChapters.length > 0 && insertIndex >= 0) {
      setChapters([...newDefaults.slice(0, insertIndex), ...customChapters, ...newDefaults.slice(insertIndex)]);
    } else {
      setChapters([...newDefaults, ...customChapters]);
    }
  }, [form.research_methodology]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-recalculate chapter word counts when total word count or degree changes
  useEffect(() => {
    if (form.word_count > 0) recalcChapterWC(form.word_count, form.degree);
  }, [form.word_count, form.degree]); // eslint-disable-line react-hooks/exhaustive-deps

  // Methodology cascade: Qualitative studies have no formal hypotheses, so when
  // the user flips to Qualitative we auto-disable hypotheses + clear the list.
  useEffect(() => {
    if (form.research_methodology === "Qualitative" && form.includeHypotheses) {
      updateForm("includeHypotheses", false);
      updateForm("hypotheses", ["", "", ""]);
    }
  }, [form.research_methodology]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToStep = (target: WizardStep) => {
    setStep(target);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-[640px] lg:max-w-[1100px] flex-col px-3.5 py-4 sm:px-6 sm:py-7 lg:min-h-screen lg:justify-start"
    >
      <button
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary border-none bg-transparent cursor-pointer"
      >
        <ArrowLeft size={13} /> Back to dashboard
      </button>

      {/* ─── SIMPLE QUICK-CREATE VIEW ─── */}
      {!showAdvanced && (
        <div className="flex-1 flex flex-col gap-6 pt-3">
          <div>
            <h1 className="font-heading text-[20px] sm:text-[26px] font-black tracking-tight text-foreground leading-tight mb-1.5">
              What's your dissertation about?
            </h1>
            <p className="text-[13px] text-muted-foreground">Enter your topic — we handle the rest automatically.</p>
          </div>

          <textarea
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            placeholder="e.g. The impact of social media on mental health among UK university students"
            autoFocus
            rows={3}
            className="w-full rounded-[12px] border-[1.5px] border-border bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/60 resize-none leading-relaxed transition-colors"
          />

          <div>
            <label className="block text-[11px] font-bold text-foreground mb-2 uppercase tracking-[0.08em]">Degree level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEGREE_OPTIONS.map((d) => {
                const active = form.degree === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateForm("degree", d)}
                    className={cn(
                      "rounded-[8px] border-[1.5px] py-2.5 text-[12px] font-bold transition-all",
                      active ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-foreground hover:border-primary/40"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreate}
              disabled={!form.title.trim()}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-foreground text-background text-[14px] font-bold transition-all hover:bg-foreground/85 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles size={16} /> Start writing →
            </button>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Settings2 size={12} /> Advanced settings
            </button>
          </div>
        </div>
      )}

      {/* ─── ADVANCED WIZARD VIEW ─── */}
      {showAdvanced && (
      <>
      <div className="mb-3 flex items-center gap-2">
        <h1 className="font-heading text-[18px] sm:text-[22px] font-black tracking-tight text-foreground leading-tight flex-1">Advanced setup</h1>
        <button
          type="button"
          onClick={() => setShowAdvanced(false)}
          className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 border border-border rounded-full px-2.5 py-1"
        >
          ← Simple
        </button>
      </div>

      {/* Step indicator — compact */}
      <div className="mb-3 flex items-center overflow-x-auto pb-1 scrollbar-none">
        {STEP_LABELS.map((label, index) => {
          const isDone = index < step;
          const isActive = index === step;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div
                  className={cn(
                    "flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.5px] text-[9px] font-black transition-all",
                    isDone && "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary bg-background text-primary",
                    !isDone && !isActive && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isDone ? <Check size={9} /> : index + 1}
                </div>
                <span className={cn(
                  "whitespace-nowrap text-[9px] font-extrabold uppercase tracking-[0.06em]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div className={cn("mx-1 h-[1.5px] min-w-4 flex-1", index < step ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: BASICS */}
        {step === 0 && (
          <motion.div key="step-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2.5">
            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Dissertation Title <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="e.g. The Impact of Digital Marketing on Consumer Behaviour…"
                    className="w-full rounded-[7px] border-[1.5px] border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground resize-none min-h-[54px] leading-snug"
                  />
                </div>

                <div className="grid gap-2.5 grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      University <span className="text-muted-foreground font-normal text-[10px]">opt.</span>
                    </label>
                    <input
                      type="text"
                      value={form.university}
                      onChange={(e) => updateForm("university", e.target.value)}
                      placeholder="e.g. University of Lagos"
                      className="w-full rounded-[7px] border-[1.5px] border-border bg-background px-3 py-1.5 text-[13px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">Field of Study</label>
                    <input
                      type="text"
                      value={form.field_of_study}
                      onChange={(e) => updateForm("field_of_study", e.target.value)}
                      placeholder="e.g. Business"
                      className="w-full rounded-[7px] border-[1.5px] border-border bg-background px-3 py-1.5 text-[13px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <TickGroup
                  label="Degree Level"
                  required
                  options={DEGREE_OPTIONS}
                  value={form.degree}
                  onChange={(v) => updateForm("degree", v)}
                />

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">Total Word Count</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.word_count}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                        updateForm("word_count", val);
                      }}
                      className={cn(
                        "w-[110px] rounded-[7px] border-[1.5px] bg-background px-3 py-1.5 text-[13px] text-foreground outline-none font-mono",
                        wcExceedsMax ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                      )}
                    />
                    <div className={cn("flex-1 flex items-center gap-2 px-2.5 py-[7px] border rounded-[7px]", wcExceedsMax ? "bg-destructive/5 border-destructive/40" : "bg-secondary border-border")}>
                      <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", wcExceedsMax ? "bg-destructive" : "bg-primary")} style={{ width: `${wcFillPct}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-mono whitespace-nowrap", wcExceedsMax ? "text-destructive" : "text-muted-foreground")}>
                        ≈{estimatedPages}pp{wcExceedsMax && ` · max ${(wcMax/1000)|0}k`}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Abstract ({getAbstractWC(form.degree)}w) added separately.
                  </p>
                </div>

                {/* Citation Style — all 12 styles with descriptions */}
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5">Citation Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CITATION_STYLE_METADATA.map((style) => {
                      const active = form.citation_style === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => updateForm("citation_style", style.id)}
                          title={style.description}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all cursor-pointer",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.citation_style && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {CITATION_STYLE_METADATA.find(s => s.id === form.citation_style)?.description}
                    </p>
                  )}
                </div>

                <TickGroup
                  label="Language Style"
                  options={["English (UK)", "English (US)", "English (Nigeria / West Africa)", "English (Australia)"]}
                  value={form.language_style}
                  onChange={(v) => updateForm("language_style", v)}
                />

                {/* Writing Mode — compact tick row */}
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5">Writing style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "default", label: "Default", hint: "Context-aware, consistent voice." },
                      { id: "natural", label: "Natural ✨", hint: "Different voice every output." },
                    ].map((m) => {
                      const active = form.writing_mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateForm("writing_mode", m.id as "natural" | "default")}
                          className={cn(
                            "rounded-[8px] border-[1.5px] p-2.5 text-left transition-all cursor-pointer flex items-start gap-2",
                            active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex items-center justify-center rounded-full h-[15px] w-[15px] flex-shrink-0",
                              active ? "bg-primary border-primary" : "bg-background border-border"
                            )}
                            style={{ borderWidth: 1.5, borderStyle: "solid" }}
                          >
                            {active && <Check size={9} strokeWidth={3.5} className="text-primary-foreground" />}
                          </span>
                          <div>
                            <div className={cn("text-[12px] font-bold leading-tight", active ? "text-primary" : "text-foreground")}>{m.label}</div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{m.hint}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* STEP 2: STRATEGY */}
        {step === 1 && (
          <motion.div key="step-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2.5">
            <section className="rounded-[10px] border border-border bg-card p-3.5 space-y-2.5">
              <TickGroup
                label="How are you researching it?"
                required
                options={["Quantitative", "Qualitative", "Mixed Methods"]}
                value={form.research_methodology}
                onChange={(v) => updateForm("research_methodology", v as Methodology)}
              />
              <p className="text-[10px] text-muted-foreground leading-snug">
                <Info size={10} className="inline mr-1 text-primary" />
                Sampling & sample-size live in Chapter 3 settings.
              </p>
            </section>

            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <CardTitle>Study type</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORK_OPTIONS.map((fw) => (
                  <div key={fw} className="relative">
                    <TickChip
                      label={fw}
                      active={form.research_framework === fw}
                      onClick={() => updateForm("research_framework", fw)}
                    />
                    {fw === suggestedFramework && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-primary text-primary-foreground px-1 py-0 rounded-full leading-tight pointer-events-none">✦</span>
                    )}
                  </div>
                ))}
              </div>
              {suggestedFramework && (
                <p className="text-[10px] text-primary mt-1 font-semibold">
                  ✦ Suggested for your field — you can change this any time
                </p>
              )}
              <div className="mt-1.5 rounded-[6px] border border-border bg-secondary p-2 text-[11px] text-muted-foreground leading-snug min-h-[28px]">
                {FRAMEWORK_HINTS[form.research_framework] || "Pick a framework to guide questions & analysis."}
              </div>
            </section>

            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <label className="block text-[11px] font-bold text-foreground mb-1">
                Writing complexity — <span className="text-primary">{form.language_level}/7</span>
              </label>
              <Slider
                value={[form.language_level]}
                onValueChange={(v) => updateForm("language_level", v[0])}
                min={1} max={7} step={1}
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                {LANGUAGE_LEVEL_DESCRIPTIONS[form.language_level] || ""}
              </p>
            </section>

            <section className="rounded-[10px] border border-border bg-card p-3.5 space-y-2.5">
              <TickGroup label="Formality" options={FORMALITY_OPTIONS} value={form.formality} onChange={(v) => updateForm("formality", v)} />
              <TickGroup label="Voice" options={VOICE_OPTIONS} value={form.voice} onChange={(v) => updateForm("voice", v)} />
              <TickGroup label="Hedging" options={HEDGING_OPTIONS} value={form.hedging} onChange={(v) => updateForm("hedging", v)} />
            </section>
          </motion.div>
        )}

        {/* STEP 3: CHAPTERS */}
        {step === 2 && (
          <motion.div key="step-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2.5">
            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <CardTitle className="mb-0">Your chapter plan</CardTitle>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-bold text-primary whitespace-nowrap">
                  {form.word_count.toLocaleString()} + {abstractChapter?.wc || 0}
                </span>
              </div>

              <table className="w-full border-collapse">
                <tbody>
                  {chapters.map((ch, i) => (
                    <tr key={`${ch.type}-${i}`} className="border-b border-border last:border-b-0">
                      <td className="py-1.5 pr-2">
                        <div className="text-[12.5px] font-bold text-foreground leading-tight">{ch.name}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                          {ch.isCustom ? "custom" : ch.type.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={ch.wc}
                            min={0}
                            onChange={(e) => updateChapterWC(i, parseInt(e.target.value) || 0)}
                            className="w-[68px] px-2 py-[3px] border-[1.5px] border-border rounded-[6px] text-[12px] font-mono text-right outline-none focus:border-primary bg-background"
                          />
                          {ch.isCustom && (
                            <button type="button" onClick={() => removeCustomChapter(i)} className="p-0.5 rounded text-muted-foreground hover:text-destructive">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between px-2 py-1.5 bg-primary/5 border border-primary/20 rounded-[7px] mt-2">
                <span className="text-[11px] text-muted-foreground">Body total</span>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-[11px] text-primary">{bodyChapterSum.toLocaleString()}</strong>
                  <button type="button" onClick={() => recalcChapterWC(form.word_count)} className="text-[10px] font-bold text-primary hover:underline">Redistribute</button>
                </div>
              </div>

              {/* Add custom chapter inline */}
              <div className="flex gap-1.5 mt-2">
                <input
                  type="text"
                  value={customChapterName}
                  onChange={(e) => setCustomChapterName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomChapter(); } }}
                  placeholder="Add custom chapter…"
                  className="flex-1 rounded-[7px] border-[1.5px] border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={addCustomChapter}
                  disabled={!customChapterName.trim()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] border-[1.5px] border-border bg-background text-[11px] font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            </section>

            <section className="rounded-[10px] border border-border bg-card p-3.5 space-y-2.5">
              <TickGroup
                label="Include appendix?"
                options={["No", "Ethics template", "Full appendix (PhD)"]}
                value={form.includeAppendix === "Yes — ethics template" ? "Ethics template" : form.includeAppendix === "Yes — full appendix (PhD)" ? "Full appendix (PhD)" : "No"}
                onChange={(v) => updateForm("includeAppendix", v === "Ethics template" ? "Yes — ethics template" : v === "Full appendix (PhD)" ? "Yes — full appendix (PhD)" : "No")}
              />
              <TickGroup
                label="Abstract"
                options={["Yes — drafted last", "No"]}
                value={form.abstractInclusion}
                onChange={(v) => updateForm("abstractInclusion", v)}
              />
            </section>
          </motion.div>
        )}

        {/* STEP 4: OBJECTIVES */}
        {step === 3 && (
          <motion.div key="step-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2.5">
            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="flex items-center justify-between mb-2 gap-2">
                <CardTitle className="mb-0">What are you studying?</CardTitle>
                <button
                  onClick={handleAutoGenerate}
                  disabled={aiGenerating || !form.title.trim()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] border-border bg-background text-[10px] font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {aiGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} {aiGenerating ? "…" : "✨ Auto-fill for me"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground mb-1 flex items-center gap-1.5">
                    Objectives
                    <span className="flex-1 h-px bg-border" />
                    <button type="button" onClick={() => { if (form.research_objectives.length > 1) updateForm("research_objectives", form.research_objectives.slice(0, -1)); }}
                      className="text-muted-foreground hover:text-destructive text-[12px] font-bold px-1">−</button>
                    <button type="button" onClick={() => { if (form.research_objectives.length < 6) updateForm("research_objectives", [...form.research_objectives, ""]); }}
                      className="text-muted-foreground hover:text-primary text-[12px] font-bold px-1">+</button>
                  </div>
                  {form.research_objectives.map((obj, i) => (
                    <div key={`o-${i}`} className="relative mb-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-muted-foreground pointer-events-none">{i + 1}.</span>
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => updateListValue("research_objectives", i, e.target.value)}
                        placeholder={["To examine…", "To identify…", "To assess…", "To evaluate…", "To explore…", "To determine…"][i]}
                        className="w-full pl-5 pr-2 py-1.5 rounded-[6px] border-[1.5px] border-border bg-background text-[12px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground mb-1 flex items-center gap-1.5">
                    Questions
                    <span className="flex-1 h-px bg-border" />
                    <button type="button" onClick={() => { if (form.research_questions.length > 1) updateForm("research_questions", form.research_questions.slice(0, -1)); }}
                      className="text-muted-foreground hover:text-destructive text-[12px] font-bold px-1">−</button>
                    <button type="button" onClick={() => { if (form.research_questions.length < 6) updateForm("research_questions", [...form.research_questions, ""]); }}
                      className="text-muted-foreground hover:text-primary text-[12px] font-bold px-1">+</button>
                  </div>
                  {form.research_questions.map((q, i) => (
                    <div key={`q-${i}`} className="relative mb-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-muted-foreground pointer-events-none">{i + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => updateListValue("research_questions", i, e.target.value)}
                        placeholder={["What is…?", "How does…?", "To what extent…?", "What factors…?"][i]}
                        className="w-full pl-5 pr-2 py-1.5 rounded-[6px] border-[1.5px] border-border bg-background text-[12px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hypotheses tick row */}
              <div className="mt-2.5 pt-2 border-t border-border">
                <TickGroup
                  label="Include hypotheses?"
                  options={["No", "Yes"]}
                  value={form.includeHypotheses ? "Yes" : "No"}
                  onChange={(v) => updateForm("includeHypotheses", v === "Yes")}
                />
                {form.includeHypotheses && (
                  <div className="space-y-1 mt-2">
                    {form.hypotheses.map((h, i) => (
                      <div key={`h-${i}`} className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-muted-foreground pointer-events-none">H{i + 1}</span>
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => updateListValue("hypotheses", i, e.target.value)}
                          placeholder={`H${i + 1}: …`}
                          className="w-full pl-7 pr-2 py-1.5 rounded-[6px] border-[1.5px] border-border bg-background text-[12px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[10px] border border-border bg-card p-3.5">
              <div
                className="border-[1.5px] border-dashed border-border rounded-[7px] p-2.5 text-center cursor-pointer transition-all bg-secondary hover:border-primary hover:bg-primary/5"
                onClick={() => uploadRef.current?.click()}
              >
                <Upload size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-[11px] font-bold text-foreground">Upload objectives / questions</div>
                <div className="text-[10px] text-muted-foreground">.txt, .pdf, .doc, .docx — or paste below</div>
              </div>
              <input
                ref={uploadRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx,.md,.csv"
                className="hidden"
                onChange={handleInstructionsUpload}
              />
              <textarea
                rows={2}
                value={form.uploadedInstructions}
                onChange={(e) => updateForm("uploadedInstructions", e.target.value)}
                placeholder="Or paste research objectives, questions and hypotheses here…"
                className="w-full mt-2 rounded-[7px] border-[1.5px] border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground resize-none min-h-[54px] leading-snug"
              />
            </section>

            {/* Inline validation warning — never let users leave step 3 with objectives but no questions */}
            {step === 3 && objectivesFilled > 0 && questionsFilled === 0 && (
              <div className="rounded-[8px] border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 leading-snug">
                ⚠ You've added research objectives but no research questions. Add at least one question before continuing — Chapter 1 needs them.
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 4 && (
          <motion.div key="step-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2.5">
            <section className="overflow-hidden rounded-[10px] border border-border bg-card">
              <div className="bg-foreground px-3.5 py-3.5">
                <h2 className="font-heading text-base font-black tracking-tight text-background leading-tight">{form.title || "Untitled Dissertation"}</h2>
                <div className="mt-2 h-0.5 w-8 rounded-full bg-background/30" />
              </div>
              <div className="grid grid-cols-3 border-b border-border">
                {[
                  { label: "Degree", value: form.degree || "—" },
                  { label: "Field", value: form.field_of_study || "—" },
                  { label: "Method", value: form.research_methodology },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 border-r border-border last:border-r-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-[12px] font-bold text-foreground leading-tight">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-b border-border">
                {[
                  { label: "Framework", value: form.research_framework || "None" },
                  { label: "Style", value: form.citation_style },
                  { label: "Words", value: `${form.word_count.toLocaleString()}+${abstractChapter?.wc || 0}` },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 border-r border-border last:border-r-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-[12px] font-bold text-foreground leading-tight">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="p-3">
                <div className="mb-2 flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="h-px w-6 bg-border" /> Structural breakdown
                </div>
                <div className="space-y-1">
                  {chapters.map((ch, i) => (
                    <div key={`${ch.type}-${i}`} className="flex items-center justify-between rounded-[6px] bg-secondary px-2.5 py-1.5">
                      <span className="text-[12px] text-foreground truncate pr-2">{ch.name}</span>
                      <span className="font-mono text-[11px] font-bold text-foreground flex-shrink-0">{ch.wc.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation — round B/W arrow buttons (Lovable-style) */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={() => (step === 0 ? onBack() : goToStep((step - 1) as WizardStep))}
          aria-label={step === 0 ? "Cancel" : "Previous step"}
          className="inline-flex items-center justify-center h-11 w-11 rounded-full border-[1.5px] border-foreground/15 bg-background text-foreground transition-all hover:bg-foreground hover:text-background hover:border-foreground cursor-pointer"
        >
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>

        <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
          Step {step + 1} of {STEP_LABELS.length}
        </div>

        {step < 4 ? (
          <button
            onClick={() => goToStep((step + 1) as WizardStep)}
            disabled={!canContinue}
            aria-label="Next step"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-foreground text-background transition-all hover:bg-foreground/85 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={!form.title.trim()}
            aria-label="Create dissertation"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-foreground text-background text-[13px] font-bold transition-all hover:bg-foreground/85 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} /> Create dissertation
          </button>
        )}
      </div>
      </>)}
    </motion.div>
  );
}

function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-2", className)}>
      {children}
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

/**
 * TickChip — compact pill with a circular tick on the left, matching the
 * Lovable round-tick checkbox style used elsewhere in the app. Used inside
 * <TickGroup> to replace dropdowns when the option count is small (≤ ~6).
 */
function TickChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-[5px] text-[12px] font-bold transition-all cursor-pointer select-none whitespace-nowrap",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all",
          "h-[14px] w-[14px]",
          active ? "bg-primary border-primary" : "bg-background border-border"
        )}
        style={{ borderWidth: 1.5, borderStyle: "solid" }}
      >
        {active && <Check size={9} strokeWidth={3.5} className="text-primary-foreground" />}
      </span>
      {label}
    </button>
  );
}

function TickGroup({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <TickChip key={o} label={o} active={value === o} onClick={() => onChange(o)} />
        ))}
      </div>
    </div>
  );
}
