import { useState, useMemo, useRef, useEffect } from "react";
import { X, RefreshCw, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Image, Table2, CheckSquare, Square, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  getCanonicalSections,
  getOptionalSectionsForChapter,
  getChapterNumber,
  type CanonicalSection,
  type OptionalSectionDef,
} from "@/lib/chapterSchema";

export interface OutlineHeading {
  id: string;
  number: string;
  text: string;
  level: 1 | 2 | 3;
  wordCount: number;
  selected: boolean;
  /** Canonical headings cannot be removed/renamed; only word counts and added subsections are editable. */
  mandatory: boolean;
  isCustom?: boolean;
}

export interface SuggestedVisual {
  id: string;
  type: "image" | "table";
  description: string;
  selected: boolean;
  /** Pre-selected and not deselectable — required for the chapter (e.g. Ch 4 demographics). */
  mandatory?: boolean;
}

interface ProjectContext {
  title: string;
  field_of_study: string;
  degree: string;
  research_methodology: string;
  research_framework: string;
  framework_justification?: string;
  research_objectives: string[];
  research_questions: string[];
  include_hypotheses?: boolean;
}

interface Props {
  chapterType: string;
  chapterTitle: string;
  targetWords: number;
  methodology: string;
  degree?: string;
  includeHypotheses?: boolean;
  initialHeadings?: OutlineHeading[];
  projectContext?: ProjectContext;
  onConfirm: (headings: OutlineHeading[], visuals: SuggestedVisual[]) => void;
  onCancel: () => void;
  /** Fired the instant a user ticks/unticks a suggested visual.
   *  Lets the parent pre-enqueue image generation in the background so the PNG
   *  is ready by the time the writer stream reaches that figure marker. */
  onVisualToggle?: (visual: SuggestedVisual, selected: boolean) => void;
  /** Live image-generation status keyed by visual.id, surfaced as a chip on each ticked image visual. */
  visualImageStatus?: Record<string, "queued" | "rendering" | "ready" | "failed">;
}

// ── Build canonical headings (locked, mandatory) ─────────────────────────────

function buildCanonicalHeadings(
  chapterType: string,
  methodology: string,
  degree: string,
  targetWords: number,
  includeHypotheses: boolean,
): OutlineHeading[] {
  const sections = getCanonicalSections(chapterType, methodology, degree, { includeHypotheses });
  if (sections.length === 0) return [];
  const totalPct = sections.reduce((s, h) => s + h.defaultPct, 0) || 100;
  return sections.map((s, i) => ({
    id: `canonical-${chapterType}-${s.num}-${i}`,
    number: s.num,
    text: s.title,
    level: 1 as const,
    wordCount: Math.round((s.defaultPct / totalPct) * targetWords),
    selected: true,
    // Canonical headings are now suggestions, not locks. Users have full freedom
    // to rename, deselect, reorder, or remove them. The AI respects whatever
    // structure the user finally submits.
    mandatory: false,
    isCustom: false,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChapterOutlineModal({
  chapterType,
  chapterTitle,
  targetWords,
  methodology,
  degree,
  includeHypotheses,
  initialHeadings,
  projectContext,
  onConfirm,
  onCancel,
  onVisualToggle,
  visualImageStatus,
}: Props) {
  const effectiveDegree = degree || projectContext?.degree || "MSc";
  const effectiveIncludeHypotheses = includeHypotheses ?? projectContext?.include_hypotheses ?? false;

  const canonicalHeadings = useMemo(
    () => buildCanonicalHeadings(chapterType, methodology, effectiveDegree, targetWords, effectiveIncludeHypotheses),
    [chapterType, methodology, effectiveDegree, targetWords, effectiveIncludeHypotheses],
  );

  const optionalSections = useMemo<OptionalSectionDef[]>(
    () => getOptionalSectionsForChapter(chapterType),
    [chapterType],
  );

  const [headings, setHeadings] = useState<OutlineHeading[]>(
    initialHeadings && initialHeadings.length > 0 ? initialHeadings : canonicalHeadings,
  );
  const [newHeadingText, setNewHeadingText] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const [visuals, setVisuals] = useState<SuggestedVisual[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  // Fetch AI-generated visuals + optional subheading suggestions only — NEVER replace canonical headings.
  const fetchAiSuggestions = async (isRegenerate = false) => {
    if (!projectContext) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outline-suggestions", {
        body: {
          title: projectContext.title,
          field: projectContext.field_of_study,
          methodology: projectContext.research_methodology,
          objectives: projectContext.research_objectives,
          questions: projectContext.research_questions,
          framework: projectContext.research_framework,
          framework_justification: projectContext.framework_justification,
          degree: projectContext.degree,
          chapterType,
          chapterTitle,
          // Send the canonical headings as fixed context (so visuals + subheadings align with them)
          headings: headings.filter(h => h.selected).map(h => h.text),
          // Variation seed so two requests for the same chapter never return the same set
          variationSeed: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${isRegenerate ? "rgn" : "init"}`,
        },
      });

      if (!error && data?.visuals?.length > 0) {
        setVisuals(data.visuals.map((v: { type: "image" | "table"; description: string; mandatory?: boolean }, i: number) => ({
          id: `ai-visual-${Date.now()}-${i}`,
          type: v.type,
          description: v.description,
          selected: !!v.mandatory, // mandatory ones start ticked
          mandatory: !!v.mandatory,
        })));
      }
    } catch (e) {
      console.error("AI visual suggestions failed:", e);
    } finally {
      setAiLoading(false);
      setAiLoaded(true);
    }
  };

  useEffect(() => {
    if (!projectContext || aiLoaded) return;
    fetchAiSuggestions();
  }, [projectContext, chapterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedHeadings = headings.filter(h => h.selected);
  const totalSelected = selectedHeadings.reduce((s, h) => s + h.wordCount, 0);
  const diff = totalSelected - targetWords;

  const updateWC = (id: string, wc: number) => {
    setHeadings(prev => prev.map(h => h.id === id ? { ...h, wordCount: Math.max(50, wc) } : h));
  };

  const updateText = (id: string, text: string) => {
    setHeadings(prev => prev.map(h => {
      if (h.id !== id) return h;
      // Canonical headings: title is locked
      if (h.mandatory) return h;
      return { ...h, text };
    }));
  };

  const toggleSelected = (id: string) => {
    setHeadings(prev => prev.map(h => {
      if (h.id !== id) return h;
      // Canonical headings cannot be deselected
      if (h.mandatory) return h;
      return { ...h, selected: !h.selected };
    }));
  };

  const toggleVisual = (id: string) => {
    setVisuals(prev => {
      const target = prev.find(v => v.id === id);
      if (target?.mandatory) return prev; // locked — cannot deselect
      const next = prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v);
      const toggled = next.find(v => v.id === id);
      if (toggled && onVisualToggle) {
        onVisualToggle(toggled, toggled.selected);
      }
      return next;
    });
  };

  // Renumber only NON-canonical headings, preserving canonical numbers (1.1, 1.2…)
  const renumberCustomHeadings = (list: OutlineHeading[]): OutlineHeading[] => {
    const chNum = getChapterNumber(chapterType);
    const canonicalCount = list.filter(h => h.mandatory).length;
    let customIdx = 0;
    return list.map(h => {
      if (h.mandatory || h.number === "—") return h;
      customIdx++;
      return { ...h, number: `${chNum}.${canonicalCount + customIdx}` };
    });
  };

  const addCustomHeading = () => {
    if (!newHeadingText.trim()) return;
    const newHeading: OutlineHeading = {
      id: `custom-${Date.now()}`,
      number: "",
      text: newHeadingText.trim(),
      level: 1,
      wordCount: Math.round(targetWords * 0.06),
      selected: true,
      mandatory: false,
      isCustom: true,
    };
    setHeadings(prev => renumberCustomHeadings([...prev, newHeading]));
    setNewHeadingText("");
  };

  const addOptionalSection = (sec: OptionalSectionDef) => {
    const wc = Math.round(targetWords * (sec.defaultPct / 100));
    const newHeading: OutlineHeading = {
      id: `optional-${Date.now()}-${sec.text}`,
      number: "",
      text: sec.text,
      level: 1,
      wordCount: wc,
      selected: true,
      mandatory: false,
      isCustom: true,
    };
    setHeadings(prev => renumberCustomHeadings([...prev, newHeading]));
  };

  const removeHeading = (id: string) => {
    setHeadings(prev => {
      const target = prev.find(h => h.id === id);
      if (target?.mandatory) return prev; // can't remove canonical
      return renumberCustomHeadings(prev.filter(h => h.id !== id));
    });
  };

  const handleDragStart = (index: number) => { dragItemRef.current = index; };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverRef.current = index;
  };

  const handleDrop = () => {
    if (dragItemRef.current === null || dragOverRef.current === null || dragItemRef.current === dragOverRef.current) {
      dragItemRef.current = null; dragOverRef.current = null; return;
    }
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    const dragged = headings[from];
    const dropTarget = headings[to];
    // Block moving canonical headings, or moving anything into the canonical block
    if (dragged.mandatory || dropTarget?.mandatory) {
      dragItemRef.current = null; dragOverRef.current = null;
      return;
    }
    const newHeadings = [...headings];
    const [item] = newHeadings.splice(from, 1);
    newHeadings.splice(to, 0, item);
    setHeadings(renumberCustomHeadings(newHeadings));
    dragItemRef.current = null; dragOverRef.current = null;
  };

  const redistribute = () => {
    const selected = headings.filter(h => h.selected);
    if (selected.length === 0) return;
    const perHead = Math.round(targetWords / selected.length);
    const adjusted: OutlineHeading[] = selected.map((h, i) => ({
      ...h, wordCount: i === selected.length - 1 ? targetWords - perHead * (selected.length - 1) : perHead,
    }));
    const adjMap = Object.fromEntries(adjusted.map(h => [h.id, h.wordCount]));
    setHeadings(prev => prev.map(h => h.selected ? { ...h, wordCount: adjMap[h.id] ?? h.wordCount } : h));
  };

  const resetDefaults = () => {
    setHeadings(canonicalHeadings);
  };

  const addedTexts = new Set(headings.map(h => h.text));

  const selectedVisuals = visuals.filter(v => v.selected);

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-[900px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-black text-sm sm:text-base text-foreground truncate">
              Chapter Outline
              {aiLoading && <Loader2 size={14} className="inline-block animate-spin text-primary ml-2 align-text-bottom" />}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {chapterTitle} — target {targetWords.toLocaleString()} words
            </p>
          </div>
          {projectContext && (
            <button
              onClick={() => fetchAiSuggestions(true)}
              disabled={aiLoading}
              title="Regenerate study-specific visuals"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all flex-shrink-0 disabled:opacity-40"
            >
              <RefreshCw size={10} className={aiLoading ? "animate-spin" : ""} /> Refresh visuals
            </button>
          )}
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X size={18} /></button>
        </div>

        {/* Word count bar */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-border flex items-center gap-2 sm:gap-3 flex-shrink-0 bg-secondary/40">
          <div className="flex-1">
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", diff > targetWords * 0.05 ? "bg-destructive" : diff < -targetWords * 0.05 ? "bg-amber-500" : "bg-green")}
                style={{ width: `${Math.min(100, (totalSelected / targetWords) * 100)}%` }}
              />
            </div>
          </div>
          <span className={cn("text-[11px] font-bold whitespace-nowrap", Math.abs(diff) > targetWords * 0.05 ? "text-destructive" : "text-green")}>
            {totalSelected.toLocaleString()} / {targetWords.toLocaleString()}w
            {diff !== 0 && ` (${diff > 0 ? "+" : ""}${diff})`}
          </span>
          <button onClick={redistribute} title="Auto-redistribute word counts evenly"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all flex-shrink-0">
            <RefreshCw size={10} /> Redistribute
          </button>
          <button onClick={resetDefaults} className="text-[11px] text-muted-foreground hover:text-foreground hover:underline flex-shrink-0">
            Reset
          </button>
        </div>

        {/* Scrollable body — two-column on large screens */}
        <div className="flex-1 overflow-hidden flex flex-row min-h-0">
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
          <p className="text-[11px] text-muted-foreground mb-3">
            These are suggested standard headings for your degree and methodology — fully editable. Rename, reorder, deselect, remove, or add your own. The AI will follow whatever structure you confirm here.
          </p>

          {/* Headings list */}
          <div className="flex flex-col gap-1.5">
            {headings.map((h, idx) => (
              <div key={h.id}
                draggable={!h.mandatory}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDrop}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3 py-2 transition-colors",
                  h.mandatory ? "bg-primary/8 border border-primary/20 cursor-default" : "bg-secondary/60 cursor-grab active:cursor-grabbing",
                  !h.selected && "opacity-40"
                )}
              >
                {h.mandatory
                  ? <Lock size={11} className="text-primary flex-shrink-0" />
                  : <GripVertical size={11} className="text-muted-foreground flex-shrink-0" />}
                <input type="checkbox" checked={h.selected} disabled={h.mandatory}
                  onChange={() => toggleSelected(h.id)}
                  className="w-3.5 h-3.5 accent-primary flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60" />
                <span className="text-[10px] font-bold text-muted-foreground w-9 flex-shrink-0 hidden sm:block">{h.number || "—"}</span>
                <input
                  type="text" value={h.text} readOnly={h.mandatory}
                  onChange={(e) => updateText(h.id, e.target.value)}
                  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                  title={h.mandatory ? "Standard heading — locked" : "Click to rename"}
                  className={cn(
                    "flex-1 text-[12px] sm:text-[13px] leading-snug bg-transparent border-none outline-none min-w-0 font-semibold text-foreground",
                    h.mandatory && "cursor-default"
                  )}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={h.wordCount} disabled={!h.selected}
                    autoComplete="off" autoCorrect="off"
                    onChange={e => updateWC(h.id, parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                    className="w-[58px] sm:w-[68px] text-right px-1.5 py-1 text-[11px] border border-border rounded bg-background outline-none focus:border-primary disabled:opacity-40"
                  />
                  <span className="text-[10px] text-muted-foreground w-5">w</span>
                  {!h.mandatory ? (
                    <button onClick={() => removeHeading(h.id)} className="text-muted-foreground hover:text-destructive p-0.5" title="Remove section">
                      <Trash2 size={11} />
                    </button>
                  ) : (
                    <span className="w-[19px]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom heading */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <input
              type="text" value={newHeadingText}
              onChange={(e) => setNewHeadingText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomHeading()}
              placeholder="Add custom section heading…"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="flex-1 text-[12px] sm:text-[13px] px-3 py-2 border border-border rounded-lg bg-background outline-none focus:border-primary placeholder:text-muted-foreground"
            />
            <button onClick={addCustomHeading} disabled={!newHeadingText.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-bold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              <Plus size={11} /> Add
            </button>
          </div>

          {/* Optional sections panel removed per product decision —
              users can still add custom headings via the input above. */}

          {/* Suggested visuals panel — AI-generated, study-specific, varies every regeneration */}
          {(visuals.length > 0 || aiLoading) && (
            <div className="mt-2 border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowVisuals(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
              >
                {showVisuals ? <ChevronDown size={13} className="text-primary flex-shrink-0" /> : <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />}
                <span className="text-[12px] font-bold text-foreground">Suggested visuals</span>
                <span className="text-[11px] text-muted-foreground ml-1">
                  {aiLoading ? "— generating study-specific suggestions…" : "— tailored to your study, varies each refresh"}
                </span>
                {aiLoading && <Loader2 size={12} className="animate-spin text-primary ml-1" />}
                {visuals.filter(v => v.selected).length > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {visuals.filter(v => v.selected).length} selected
                  </span>
                )}
              </button>
              {showVisuals && (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visuals.map((v) => {
                    const status = v.type === "image" ? visualImageStatus?.[v.id] : undefined;
                    return (
                    <button
                      key={v.id}
                      onClick={() => toggleVisual(v.id)}
                      disabled={v.mandatory}
                      title={v.mandatory ? "Required for this chapter — cannot be deselected" : undefined}
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all",
                        v.selected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border bg-background hover:border-primary/50",
                        v.mandatory && "cursor-default ring-1 ring-primary/30"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center",
                        v.type === "image" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {v.type === "image" ? <Image size={12} /> : <Table2 size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide mr-1", v.type === "image" ? "text-blue-500" : "text-amber-500")}>
                          {v.type}
                        </span>
                        {v.mandatory && (
                          <span className="text-[9px] font-black uppercase tracking-wide mr-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                            Required
                          </span>
                        )}
                        <p className="text-[11px] text-foreground leading-snug mt-0.5">{v.description}</p>
                        {v.selected && status && (
                          <span className={cn(
                            "inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide",
                            status === "ready" && "bg-green-100 text-green-700",
                            status === "failed" && "bg-red-100 text-red-700",
                            (status === "queued" || status === "rendering") && "bg-blue-100 text-blue-700",
                          )}>
                            {status === "queued" && <><Loader2 size={9} className="animate-spin" /> Queued</>}
                            {status === "rendering" && <><Loader2 size={9} className="animate-spin" /> Rendering…</>}
                            {status === "ready" && <>✓ Ready</>}
                            {status === "failed" && <>! Failed — tap to retry</>}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {v.mandatory
                          ? <Lock size={12} className="text-primary" />
                          : v.selected
                            ? <CheckSquare size={14} className="text-primary" />
                            : <Square size={14} className="text-muted-foreground" />}
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>{/* end left column */}

          {/* Right: Document Preview pane — visible on lg+ screens */}
          <div className="hidden lg:flex flex-col w-[210px] border-l border-border bg-muted/30 overflow-y-auto p-3 gap-0 flex-shrink-0">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Document Preview</p>
            {/* Chapter title bar */}
            <div className="h-3 rounded bg-foreground/20 mb-3 w-full" />
            {/* Heading bars */}
            <div className="flex flex-col gap-1.5">
              {selectedHeadings.map((h) => {
                const maxW = h.level === 1 ? 100 : h.level === 2 ? 80 : 65;
                const isOptional = !h.mandatory && !h.isCustom;
                return (
                  <div key={h.id} className="flex flex-col gap-0.5">
                    <div
                      className={cn(
                        "rounded transition-all",
                        h.level === 1 ? "h-2.5" : h.level === 2 ? "h-2" : "h-1.5",
                        isOptional ? "border border-dashed border-primary/50 bg-primary/10" : "bg-foreground/15"
                      )}
                      style={{ width: `${maxW}%` }}
                      title={h.text}
                    />
                    {/* Body text placeholder lines */}
                    {h.level >= 2 && (
                      <div className="flex flex-col gap-0.5 pl-2">
                        <div className="h-1 rounded bg-foreground/7 w-full" />
                        <div className="h-1 rounded bg-foreground/7 w-[85%]" />
                        <div className="h-1 rounded bg-foreground/7 w-[70%]" />
                      </div>
                    )}
                    {/* Visual placeholder chips — show after the heading they logically belong to */}
                    {selectedVisuals.filter(sv => {
                      const descLower = sv.description.toLowerCase();
                      const headingLower = h.text.toLowerCase();
                      return descLower.includes(headingLower.split(" ").find(w => w.length > 4) || "");
                    }).map(sv => (
                      <div
                        key={sv.id}
                        className={cn(
                          "ml-2 rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 transition-all",
                          sv.type === "image" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {sv.type === "image" ? <Image size={7} /> : <Table2 size={7} />}
                        <span className="truncate max-w-[120px]">{sv.description.slice(0, 30)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {/* Visuals not matched to any heading */}
              {selectedVisuals.filter(sv => {
                return !selectedHeadings.some(h =>
                  sv.description.toLowerCase().includes(h.text.toLowerCase().split(" ").find(w => w.length > 4) || "")
                );
              }).map(sv => (
                <div
                  key={sv.id}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1",
                    sv.type === "image" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-700"
                  )}
                >
                  {sv.type === "image" ? <Image size={7} /> : <Table2 size={7} />}
                  <span className="truncate max-w-[140px]">{sv.description.slice(0, 30)}</span>
                </div>
              ))}
              {/* References placeholder */}
              <div className="mt-1 h-2 rounded bg-foreground/12 w-[70%]" title="References" />
              <div className="flex flex-col gap-0.5 pl-1 mt-0.5">
                {[90, 75, 85, 60, 80].map((w, i) => (
                  <div key={i} className="h-1 rounded bg-foreground/7" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
            <p className="text-[8px] text-muted-foreground mt-3 leading-snug">
              Optional sections shown with dashed outline. Visuals shown in colour.
            </p>
          </div>

        </div>{/* end two-column body */}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {selectedHeadings.length}/{headings.length} sections
            {visuals.filter(v => v.selected).length > 0 && `, ${visuals.filter(v => v.selected).length} visual${visuals.filter(v => v.selected).length > 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold border border-border text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedHeadings, visuals.filter(v => v.selected))}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors">
              Draft with this Outline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Local Check icon used inside optional buttons
function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
