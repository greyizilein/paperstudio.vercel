import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Check, Copy, Download, PenTool, Settings, Wand2, X, Plus, Trash2, Upload,
  BarChart2, Search, ShieldCheck, Loader2, Sparkles, BookOpen, StopCircle
} from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { type Project, type Chapter, type ChapterDraftConfig } from "@/types/project";
import { CHAPTER_CONFIGS, ANALYSIS_OPTIONS, VISUALIZATION_OPTIONS } from "@/lib/constants";
import { FDButton } from "@/components/firstdraft/FDButton";
import { FDBadge } from "@/components/firstdraft/FDBadge";
import { FDInput } from "@/components/firstdraft/FDInput";
import { ChartRenderer } from "@/components/firstdraft/ChartRenderer";
import { streamGenerateChapter } from "@/lib/streamChat";
import { toast } from "sonner";

export function ProjectView({ project, onBack, onUpdate }: { project: Project; onBack: () => void; onUpdate: (p: Project) => void }) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "analysis" | "export">("write");
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [draftConfig, setDraftConfig] = useState<ChapterDraftConfig>({
    target_words: 2000, stats_count: 5, source_year_start: 2018, source_year_end: 2025, headings: [], analysis_types: [], visualizations: []
  });

  const currentChapter = project.chapters.find(c => c.order_index === activeChapterIndex);

  useEffect(() => {
    if (isConfiguring && currentChapter?.draft_config) {
      setDraftConfig(currentChapter.draft_config);
    } else if (isConfiguring) {
      setDraftConfig({
        target_words: currentChapter?.word_count_target || 2000, stats_count: 5,
        source_year_start: 2018, source_year_end: 2025, headings: [], analysis_types: [], visualizations: []
      });
    }
  }, [isConfiguring, currentChapter]);

  useEffect(() => {
    if (project.chapters.length === 0) {
      const configs = CHAPTER_CONFIGS[project.research_methodology] || CHAPTER_CONFIGS["Mixed Methods"];
      const totalDefault = configs.reduce((sum, c) => sum + c.words, 0);
      const initialChapters = configs.map((c, i) => ({
        id: crypto.randomUUID(), order_index: i, title: c.title, type: c.type,
        content: "", status: "pending" as const,
        word_count_target: Math.round((c.words / totalDefault) * project.word_count), word_count_actual: 0
      }));
      onUpdate({ ...project, chapters: initialChapters });
    }
  }, [project, onUpdate]);

  useEffect(() => {
    if (currentChapter) {
      setDraftConfig(prev => ({ ...prev, target_words: currentChapter.word_count_target, headings: currentChapter.draft_config?.headings || [] }));
      setIsConfiguring(false); setError(null);
    }
  }, [activeChapterIndex, currentChapter]);

  const completedCount = project.chapters.filter(c => c.status === "completed").length;
  const progress = project.chapters.length ? Math.round((completedCount / project.chapters.length) * 100) : 0;
  const totalWords = project.chapters.reduce((sum, c) => sum + (c.word_count_actual || 0), 0);

  const handleGenerate = async () => {
    if (!currentChapter) return;
    setIsGenerating(true); setIsConfiguring(false); setError(null); setStreamingContent("");
    setGenStatus("Connecting to AI engine...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const projectPayload = {
      title: project.title, degree: project.degree, university: project.university,
      field_of_study: project.field_of_study, research_methodology: project.research_methodology,
      data_collection_method: project.data_collection_method, sampling_technique: project.sampling_technique,
      sample_size: project.sample_size, research_framework: project.research_framework,
      framework_justification: project.framework_justification, research_objectives: project.research_objectives,
      research_questions: project.research_questions, citation_style: project.citation_style,
      language_style: project.language_style,
    };

    const chapterPayload = { type: currentChapter.type, title: currentChapter.title };
    let fullContent = "";

    try {
      await streamGenerateChapter({
        project: projectPayload,
        chapter: chapterPayload,
        draftConfig,
        signal: abortController.signal,
        onDelta: (text) => {
          fullContent += text;
          setStreamingContent(fullContent);
          // Update status messages based on content length
          const words = fullContent.split(/\s+/).filter(Boolean).length;
          if (words < 100) setGenStatus("Drafting introduction...");
          else if (words < 500) setGenStatus("Developing arguments...");
          else if (words < 1000) setGenStatus("Synthesizing evidence...");
          else setGenStatus(`Writing... ${words.toLocaleString()} words`);
        },
        onDone: (polishedContent) => {
          if (polishedContent) fullContent = polishedContent;
          const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
          const updatedChapter: Chapter = {
            ...currentChapter, content: fullContent, status: "completed",
            word_count_actual: wordCount, draft_config: draftConfig,
          };
          const updatedChapters = project.chapters.map(c => c.order_index === activeChapterIndex ? updatedChapter : c);
          onUpdate({ ...project, chapters: updatedChapters });
          setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          toast.success(`${currentChapter.title} generated — ${wordCount.toLocaleString()} words`);
        },
        onError: (errMsg) => {
          setError(errMsg);
          setIsGenerating(false); setGenStatus(""); setStreamingContent("");
          toast.error(errMsg);
        },
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
        // Save partial content if user cancelled
        if (fullContent.length > 100) {
          const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
          const updatedChapter: Chapter = {
            ...currentChapter, content: fullContent, status: "completed",
            word_count_actual: wordCount, draft_config: draftConfig,
          };
          const updatedChapters = project.chapters.map(c => c.order_index === activeChapterIndex ? updatedChapter : c);
          onUpdate({ ...project, chapters: updatedChapters });
          toast.info(`Generation stopped — ${wordCount.toLocaleString()} words saved`);
        }
      } else {
        setError(e.message || "Generation failed");
        toast.error(e.message || "Generation failed");
      }
      setIsGenerating(false); setGenStatus(""); setStreamingContent("");
    }
    abortControllerRef.current = null;
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleCopy = () => {
    if (currentChapter) { navigator.clipboard.writeText(currentChapter.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleDownload = () => {
    const sortedChapters = [...project.chapters].sort((a, b) => a.order_index - b.order_index);
    const fullText = `${project.title.toUpperCase()}\n${"=".repeat(project.title.length)}\nDegree: ${project.degree}\nMethodology: ${project.research_methodology}\nCitation Style: ${project.citation_style}\n\n${sortedChapters.map(c => `${c.title}\n${"-".repeat(c.title.length)}\n\n${c.content}`).join("\n\n")}`;
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_Manuscript.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDownloadChapter = () => {
    if (!currentChapter) return;
    const text = `${project.title.toUpperCase()}\nChapter: ${currentChapter.title}\n\n${currentChapter.content}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_${currentChapter.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 md:py-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10 group">
            <ChevronLeft size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight text-primary line-clamp-2 sm:line-clamp-1">{project.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <FDBadge color="brand">{project.degree}</FDBadge>
              <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{project.citation_style}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-primary/5 overflow-x-auto no-scrollbar">
          <FDButton variant={activeTab === "write" ? "primary" : "ghost"} size="sm" onClick={() => setActiveTab("write")} className="flex-shrink-0 gap-2"><PenTool size={16} /> Synthesis</FDButton>
          <FDButton variant={activeTab === "analysis" ? "primary" : "ghost"} size="sm" onClick={() => setActiveTab("analysis")} className="flex-shrink-0 gap-2"><BarChart2 size={16} /> Analytics</FDButton>
          <FDButton variant={activeTab === "export" ? "primary" : "ghost"} size="sm" onClick={() => setActiveTab("export")} className="flex-shrink-0 gap-2"><Download size={16} /> Export</FDButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-3">
          <div className="sticky top-0 lg:top-24 z-40 bg-background/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none -mx-6 px-6 py-4 lg:p-0 lg:mx-0 border-b border-primary/5 lg:border-none">
            <div className="hidden lg:flex items-center gap-3 mb-6 px-4">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Manuscript Structure</h3>
            </div>
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible no-scrollbar">
              {project.chapters.sort((a, b) => a.order_index - b.order_index).map((c) => (
                <button key={c.id} onClick={() => setActiveChapterIndex(c.order_index)}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 flex-shrink-0 lg:flex-shrink lg:w-full border group relative overflow-hidden",
                    activeChapterIndex === c.order_index 
                      ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20" 
                      : "bg-surface border-primary/5 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.02]"
                  )}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-colors",
                    activeChapterIndex === c.order_index ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/5 text-muted-foreground group-hover:text-primary"
                  )}>{c.order_index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold truncate transition-colors",
                      activeChapterIndex === c.order_index ? "text-primary-foreground" : "text-foreground group-hover:text-primary"
                    )}>{c.title}</p>
                    <p className={cn("text-[10px] font-medium mt-1 transition-colors",
                      activeChapterIndex === c.order_index ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>{c.status === "completed" ? `${c.word_count_actual?.toLocaleString()} words` : "Pending synthesis"}</p>
                  </div>
                  {c.status === "completed" && <Check size={14} className={activeChapterIndex === c.order_index ? "text-primary-foreground" : "text-primary"} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === "write" && (
              <motion.div key="write-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="bg-surface border border-primary/5 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg uppercase tracking-[0.2em] border border-primary/20">Section {activeChapterIndex + 1}</span>
                        <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{currentChapter?.type}</span>
                      </div>
                      <h2 className="text-xl sm:text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">{currentChapter?.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {currentChapter?.status === "completed" && (
                        <>
                          <FDButton variant="brand-outline" size="sm" onClick={handleCopy} className="gap-2">
                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
                          </FDButton>
                          <FDButton variant="brand-outline" size="sm" onClick={handleDownloadChapter} className="gap-2">
                            <Download size={16} /> Export Chapter
                          </FDButton>
                        </>
                      )}
                      <FDButton variant={currentChapter?.status === "completed" ? "brand-outline" : "primary"} onClick={() => setIsConfiguring(true)} className="gap-2">
                        <Settings size={18} /> {currentChapter?.status === "completed" ? "Re-configure" : "Initialize Synthesis"}
                      </FDButton>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="relative min-h-[300px] sm:min-h-[500px] bg-primary/[0.02] rounded-2xl sm:rounded-3xl border border-primary/5 p-4 sm:p-8 md:p-16 overflow-hidden group/content">
                    <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
                    {isGenerating ? (
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 relative">
                              <div className="absolute inset-0 border-2 border-primary/10 rounded-full" />
                              <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <Sparkles className="absolute inset-0 m-auto text-primary" size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">Generating</p>
                              <p className="text-xs text-muted-foreground">{genStatus}</p>
                            </div>
                          </div>
                          <FDButton variant="brand-outline" size="sm" onClick={handleStopGeneration} className="gap-2">
                            <StopCircle size={16} /> Stop
                          </FDButton>
                        </div>
                        {streamingContent && (
                          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-p:leading-relaxed prose-p:mb-8 prose-p:font-light">
                            <Markdown>{streamingContent}</Markdown>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {!isGenerating && currentChapter?.content ? (
                      <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-p:leading-relaxed prose-p:mb-8 prose-p:font-light">
                        <Markdown components={{
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'chart') {
                              return <ChartRenderer content={String(children).replace(/\n$/, '')} />;
                            }
                            return <code className={className} {...props}>{children}</code>;
                          }
                        }}>
                          {currentChapter.content}
                        </Markdown>
                      </div>
                    ) : !isGenerating && !currentChapter?.content && (
                      <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 bg-surface border border-primary/5 rounded-3xl flex items-center justify-center text-muted-foreground/30 mb-8 shadow-2xl group-hover/content:border-primary/30 transition-colors">
                          <PenTool size={40} />
                        </div>
                        <h3 className="text-xl font-display font-bold text-primary mb-3 tracking-tight">Manuscript Empty</h3>
                        <p className="text-muted-foreground text-sm mb-10 max-w-sm mx-auto font-light leading-relaxed">
                          Configure your synthesis parameters to initiate the AI drafting engine for this chapter.
                        </p>
                        <FDButton onClick={() => setIsConfiguring(true)} size="lg" className="gap-3 px-10">
                          <Settings size={20} /> Configure & Synthesize
                        </FDButton>
                      </div>
                    )}

                    {error && (
                      <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{error}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "analysis" && (
              <motion.div key="analysis-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                <div className="py-32 text-center bg-surface border border-primary/5 rounded-[2.5rem] shadow-2xl">
                  <div className="w-24 h-24 bg-primary/[0.02] rounded-3xl flex items-center justify-center text-muted-foreground/30 mx-auto mb-8 border border-primary/5">
                    <BarChart2 size={40} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-primary mb-3 tracking-tight">Analytics</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto font-light leading-relaxed">
                    AI-driven analysis will be available once Lovable Cloud is enabled. This will include AI detection scanning and citation compliance checking.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "export" && (
              <motion.div key="export-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="bg-surface border border-primary/5 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-12 md:p-20 shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                  <div className="w-24 h-24 bg-primary/[0.02] rounded-3xl flex items-center justify-center text-muted-foreground/30 mx-auto mb-10 border border-primary/5">
                    <Download size={48} />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary mb-4 tracking-tight">Finalize Manuscript</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-16 font-light leading-relaxed">
                    Download the complete dissertation or copy individual sections for final refinement.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
                    <div className="p-8 bg-primary/[0.02] rounded-3xl border border-primary/5 group hover:border-primary/30 transition-colors">
                      <p className="text-5xl font-display font-bold text-primary">{completedCount}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-3">Sections Synthesized</p>
                    </div>
                    <div className="p-8 bg-primary/[0.02] rounded-3xl border border-primary/5 group hover:border-primary/30 transition-colors">
                      <p className="text-5xl font-display font-bold text-primary">{totalWords.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-3">Total Word Count</p>
                    </div>
                  </div>
                  <div className="space-y-4 mb-16 text-left">
                    {project.chapters.sort((a, b) => a.order_index - b.order_index).map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between p-5 bg-primary/[0.01] border border-primary/5 rounded-2xl hover:bg-primary/[0.03] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border transition-all",
                            ch.status === "completed" ? "bg-primary/20 border-primary/40 text-primary" : "bg-primary/5 border-primary/10 text-muted-foreground/30")}>
                            {ch.status === "completed" && <Check size={14} />}
                          </div>
                          <span className={cn("text-sm font-bold transition-colors", ch.status === "completed" ? "text-primary" : "text-muted-foreground/30")}>{ch.title}</span>
                        </div>
                        {ch.status === "completed" && <span className="font-mono text-[10px] font-bold text-muted-foreground">{ch.word_count_actual?.toLocaleString()} words</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <FDButton onClick={handleDownload} disabled={completedCount === 0} size="lg" className="w-full sm:w-auto px-12 gap-3 shadow-2xl shadow-primary/20">
                      <Download size={20} /> Download Manuscript
                    </FDButton>
                    <FDButton variant="brand-outline" size="lg" className="w-full sm:w-auto px-12 gap-3" disabled={completedCount === 0}
                      onClick={() => { const sorted = [...project.chapters].sort((a, b) => a.order_index - b.order_index); navigator.clipboard.writeText(sorted.map(c => `${c.title}\n\n${c.content}`).join("\n\n---\n\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      {copied ? <Check size={20} /> : <Copy size={20} />} {copied ? "Copied All" : "Copy to Clipboard"}
                    </FDButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {isConfiguring && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-primary/5 rounded-2xl sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl shadow-primary/10 flex flex-col relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
              <div className="p-4 sm:p-8 md:p-12 border-b border-primary/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary tracking-tight">Synthesis Parameters</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Fine-tune the AI drafting engine</p>
                </div>
                <button onClick={() => setIsConfiguring(false)} className="p-3 hover:bg-primary/5 rounded-full transition-colors text-muted-foreground hover:text-primary"><X size={24} /></button>
              </div>

              <div className="p-4 sm:p-8 md:p-12 overflow-y-auto space-y-8 sm:space-y-12">
                <div className="grid grid-cols-1 gap-6 sm:gap-10 sm:grid-cols-2">
                  <FDInput label="Target Word Count" type="number" value={draftConfig.target_words} onChange={(v: string) => setDraftConfig(prev => ({ ...prev, target_words: parseInt(v) || 0 }))} />
                  <FDInput label="Min. Empirical Evidence" type="number" value={draftConfig.stats_count} onChange={(v: string) => setDraftConfig(prev => ({ ...prev, stats_count: parseInt(v) || 0 }))} />
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    <FDInput label="Source Start Year" type="number" value={draftConfig.source_year_start} onChange={(v: string) => setDraftConfig(prev => ({ ...prev, source_year_start: parseInt(v) || 0 }))} />
                    <FDInput label="Source End Year" type="number" value={draftConfig.source_year_end} onChange={(v: string) => setDraftConfig(prev => ({ ...prev, source_year_end: parseInt(v) || 0 }))} />
                  </div>
                </div>

                {(currentChapter?.type === "findings" || currentChapter?.type === "quant" || currentChapter?.type === "qual") && (
                  <div className="space-y-8 pt-8 border-t border-primary/5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">Data Analysis</h4>
                      <FDBadge color="brand">Advanced Feature</FDBadge>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Raw Data (CSV/Text)</label>
                      <div className="relative group">
                        <textarea className="w-full bg-surface border border-primary/10 rounded-2xl p-4 text-sm text-primary focus:outline-none focus:border-primary/50 transition-colors font-mono min-h-[120px]"
                          placeholder="Paste your CSV data here..." value={draftConfig.uploaded_data || ""}
                          onChange={(e) => setDraftConfig(prev => ({ ...prev, uploaded_data: e.target.value }))} />
                        <div className="absolute top-4 right-4">
                          <input type="file" id="data-upload-modal" className="hidden" accept=".csv,.txt,.json"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (re) => { setDraftConfig(prev => ({ ...prev, uploaded_data: re.target?.result as string })); }; reader.readAsText(file); } }} />
                          <label htmlFor="data-upload-modal" className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm">
                            <Upload size={12} /> Upload
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2">
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Analysis Types</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                          {ANALYSIS_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors">
                              <input type="checkbox" className="accent-white w-4 h-4" checked={draftConfig.analysis_types?.includes(opt)}
                                onChange={(e) => { const types = draftConfig.analysis_types || []; if (e.target.checked) { setDraftConfig(prev => ({ ...prev, analysis_types: [...types, opt] })); } else { setDraftConfig(prev => ({ ...prev, analysis_types: types.filter(t => t !== opt) })); } }} />
                              <span className="text-xs font-medium text-foreground">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Visualizations</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                          {VISUALIZATION_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors">
                              <input type="checkbox" className="accent-white w-4 h-4" checked={draftConfig.visualizations?.includes(opt)}
                                onChange={(e) => { const vis = draftConfig.visualizations || []; if (e.target.checked) { setDraftConfig(prev => ({ ...prev, visualizations: [...vis, opt] })); } else { setDraftConfig(prev => ({ ...prev, visualizations: vis.filter(v => v !== opt) })); } }} />
                              <span className="text-xs font-medium text-foreground">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6 pt-8 border-t border-primary/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Specific Headings (Max 12)</h4>
                    <FDButton variant="ghost" size="sm" disabled={draftConfig.headings.length >= 12}
                      onClick={() => setDraftConfig(prev => ({ ...prev, headings: [...prev.headings, { text: "", target_words: Math.round(prev.target_words / (prev.headings.length + 1)) }] }))} className="text-primary">
                      <Plus size={14} /> Add Heading
                    </FDButton>
                  </div>
                  <div className="space-y-3">
                    {draftConfig.headings.map((h, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
                        <div className="flex-1">
                          <FDInput placeholder={`Heading ${i + 1}`} value={h.text}
                            onChange={(v: string) => { const nh = [...draftConfig.headings]; nh[i].text = v; setDraftConfig(prev => ({ ...prev, headings: nh })); }} />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="w-24 shrink-0">
                            <FDInput type="number" placeholder="Words" value={h.target_words}
                              onChange={(v: string) => { const nh = [...draftConfig.headings]; nh[i].target_words = parseInt(v) || 0; setDraftConfig(prev => ({ ...prev, headings: nh })); }} />
                          </div>
                          <button onClick={() => setDraftConfig(prev => ({ ...prev, headings: prev.headings.filter((_, idx) => idx !== i) }))}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-8 md:p-10 bg-surface border-t border-primary/5 flex gap-4 shrink-0">
                <FDButton variant="ghost" onClick={() => setIsConfiguring(false)} className="flex-1">Cancel</FDButton>
                <FDButton onClick={handleGenerate} size="lg" className="flex-[2] gap-2">
                  <Wand2 size={18} /> {currentChapter?.status === "completed" ? "Regenerate Chapter" : "Start Writing"}
                </FDButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
