import { useState, useEffect } from "react";
import { Download, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Project, type Chapter } from "@/types/project";
import { extractBodyContent, countWords } from "@/lib/streamChat";

// ─── Font options ──────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  { label: "Arial 11pt", family: "Arial", size: 11 },
  { label: "Arial 12pt", family: "Arial", size: 12 },
  { label: "Calibri 11pt", family: "Calibri", size: 11 },
  { label: "Calibri 12pt", family: "Calibri", size: 12 },
  { label: "Times New Roman 12pt", family: "Times New Roman", size: 12 },
  { label: "Georgia 12pt", family: "Georgia", size: 12 },
  { label: "Garamond 12pt", family: "Garamond", size: 12 },
  { label: "Cambria 12pt", family: "Cambria", size: 12 },
  { label: "Palatino 12pt", family: "Palatino Linotype", size: 12 },
  { label: "Verdana 11pt", family: "Verdana", size: 11 },
];

interface SubmissionDetails {
  fullName: string;
  studentId: string;
  institution: string;
  moduleCode: string;
  moduleName: string;
  academicYear: string;
  supervisor: string;
  submissionDate: string;
  company: string;
  acknowledgements: string;
  dedication: string;
  abbreviations: string;
  glossary: string;
  documentType: string;
}

interface FinalExportProps {
  project: Project;
}

export function FinalExport({ project }: FinalExportProps) {
  const { user } = useAuth();
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[3]); // Calibri 12pt default
  const [details, setDetails] = useState<SubmissionDetails>({
    fullName: "",
    studentId: "",
    institution: project.university || "",
    moduleCode: "",
    moduleName: project.field_of_study || "",
    academicYear: "",
    supervisor: "",
    submissionDate: "",
    company: "",
    acknowledgements: "",
    dedication: "",
    abbreviations: "",
    glossary: "",
    documentType: "dissertation",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillDone, setAutofillDone] = useState(false);

  // Auto-populate fullName from the user's profile on mount
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.display_name) {
          setDetails((d) => d.fullName ? d : { ...d, fullName: data.display_name });
        }
      });
  }, [user?.id]);

  // Auto-fill preliminary pages once on mount, using AI grounded in the
  // study's title, field, supervisor, and chapter excerpts. User can edit
  // anything before downloading. We only run when there is at least one
  // drafted chapter so the AI has substance to work from.
  useEffect(() => {
    if (autofillDone) return;
    const hasDrafts = project.chapters.some((c) => c.content);
    if (!hasDrafts) return;
    setAutofillDone(true);
    setIsAutofilling(true);
    (async () => {
      try {
        const chaptersForCtx = project.chapters
          .filter((c) => c.content)
          .sort((a, b) => a.order_index - b.order_index)
          .map((c) => ({ title: c.title, content: c.content || "" }));
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autofill-prelims`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              projectTitle: project.title,
              field: project.field_of_study || "",
              university: project.university || "",
              fullName: details.fullName || "",
              supervisor: details.supervisor || "",
              chapters: chaptersForCtx,
            }),
          },
        );
        if (!resp.ok) return;
        const data = await resp.json();
        setDetails((d) => ({
          ...d,
          acknowledgements: d.acknowledgements || data.acknowledgements || "",
          dedication: d.dedication || data.dedication || "",
          abbreviations: d.abbreviations || data.abbreviations || "",
          glossary: d.glossary || data.glossary || "",
        }));
      } catch {
        // Silent fail — user can still write prelims manually
      } finally {
        setIsAutofilling(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const draftedChapters = project.chapters.filter((c) => c.content).sort((a, b) => a.order_index - b.order_index);
  const totalBodyWords = draftedChapters.reduce((sum, ch) => {
    return sum + countWords(extractBodyContent(ch.content || ""));
  }, 0);
  const isReady = draftedChapters.length > 0;

  const handleDownload = async () => {
    if (!isReady) {
      toast.error("No drafted chapters to export.");
      return;
    }
    setIsDownloading(true);
    toast.info("Preparing your dissertation…");

    try {
      // Submission details stored locally — no DB table needed

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-docx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            chapters: draftedChapters,
            projectTitle: project.title,
            format: "docx",
            isFinalExport: true,
            submissionDetails: details,
            fontFamily: selectedFont.family,
            fontSize: selectedFont.size,
            citationStyle: project.citation_style || null,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.error || "Export failed");
        return;
      }

      const data = await resp.json();
      if (data.encoding === "base64") {
        const binary = atob(data.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `${project.title.replace(/[/\\:*?"<>|]/g, "").trim()} Dissertation.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        toast.success("Dissertation downloaded successfully");
      }
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const field = (label: string, key: keyof SubmissionDetails, placeholder: string, optional = false) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
        {optional && <span className="ml-1 font-normal normal-case">(optional)</span>}
      </label>
      <input
        type="text"
        value={details[key]}
        onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
      />
    </div>
  );

  const textarea = (label: string, key: keyof SubmissionDetails, placeholder: string, rows = 4) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
        <span className="ml-1 font-normal normal-case">(optional)</span>
      </label>
      <textarea
        value={details[key]}
        onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors resize-y"
      />
    </div>
  );

  // Chapter checklist
  const chapterChecklist = project.chapters
    .sort((a, b) => a.order_index - b.order_index)
    .map((ch) => ({
      ch,
      done: !!ch.content,
      words: countWords(extractBodyContent(ch.content || "")),
    }));

  return (
    <div className="bg-background min-h-screen px-4 sm:px-6 py-10 font-sans">
      <div className="max-w-[480px] mx-auto space-y-4">

        {/* Stage header */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Final Export
          </p>
          <h1 className="text-[28px] font-black text-foreground leading-tight">Export Dissertation</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Fill in your details, choose a font, and download.
          </p>
        </div>

        {/* Chapter checklist */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-[12px] font-bold text-foreground mb-3">Chapters</p>
          <div className="space-y-2">
            {chapterChecklist.map(({ ch, done, words }) => (
              <div key={ch.id} className="flex items-center gap-2.5">
                {done
                  ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                  : <Circle size={15} className="text-muted-foreground/50 flex-shrink-0" />}
                <span className={cn("text-[12px] flex-1 truncate", done ? "text-foreground" : "text-muted-foreground")}>
                  {ch.title}
                </span>
                {done && (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {words.toLocaleString()}w
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ready to export card */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", isReady ? "bg-green-500" : "bg-muted-foreground/40")} />
            <span className="text-[13px] font-semibold text-foreground">
              {isReady
                ? `Ready to export — ${totalBodyWords.toLocaleString()} words`
                : "No drafted chapters yet"}
            </span>
          </div>
          <button
            onClick={handleDownload}
            disabled={!isReady || isDownloading}
            className="w-full py-3.5 rounded-xl bg-foreground text-background text-[14px] font-bold flex items-center justify-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDownloading
              ? <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Preparing…</>
              : <><Download size={16} /> Download .docx</>}
          </button>
        </div>

        {/* Document Font */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-[13px] font-bold text-foreground mb-3">Document Font</p>
          <div className="grid grid-cols-2 gap-2">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.label}
                onClick={() => setSelectedFont(font)}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-all text-left",
                  selectedFont.label === font.label
                    ? "bg-primary border-primary text-primary-foreground font-bold"
                    : "bg-card border-border text-foreground hover:border-primary hover:text-primary"
                )}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submission Details */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-[13px] font-bold text-foreground mb-0.5">
            Submission Details
            <span className="text-[11px] font-normal text-muted-foreground ml-1">(optional — added to title page)</span>
          </p>
          <p className="text-[11px] text-muted-foreground mb-4">Leave blank for fields you don't need.</p>
          <div className="space-y-3">
            {field("Full Name", "fullName", "Your name")}
            {field("Student ID", "studentId", "B00123456")}
            {field("Institution", "institution", "University of Manchester")}
            {field("Module Code", "moduleCode", "BMAN71201", true)}
            {field("Module Name", "moduleName", "Strategic Management", true)}
            {field("Academic Year", "academicYear", "2024/2025")}
            {field("Supervisor", "supervisor", "Dr. Sarah Chen", true)}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Submission Date
              </label>
              <input
                type="date"
                value={details.submissionDate}
                onChange={(e) => setDetails((d) => ({ ...d, submissionDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            {field("Company / Organisation", "company", "Optional", true)}
          </div>
        </div>

        {/* Preliminary Pages */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <p className="text-[13px] font-bold text-foreground mb-0.5">
            Preliminary Pages
            <span className="text-[11px] font-normal text-muted-foreground ml-1">(optional)</span>
          </p>
          <p className="text-[11px] text-muted-foreground mb-4">
            A Declaration page is auto-generated. {isAutofilling
              ? <span className="text-primary font-medium">AI is filling these in for you…</span>
              : "AI has pre-filled these — edit freely. Empty sections are skipped."}
          </p>
          <div className="space-y-3">
            {textarea(
              "Acknowledgements",
              "acknowledgements",
              "I would like to thank my supervisor, Dr. …, for their guidance throughout this study. I am also grateful to …",
              5
            )}
            {textarea(
              "Dedication",
              "dedication",
              "To my parents, whose support made this work possible.",
              2
            )}
            {textarea(
              "List of Abbreviations",
              "abbreviations",
              "GDP — Gross Domestic Product\nSME — Small and Medium Enterprise\nUNDP — United Nations Development Programme",
              5
            )}
            {textarea(
              "Glossary",
              "glossary",
              "Construct validity — The degree to which a test measures what it claims to measure.\nReliability — The consistency of a measurement tool over time.",
              4
            )}
          </div>
        </div>

        {/* Document type selector removed — defaulted to "dissertation" */}

        {/* Note */}
        <p className="text-[11px] text-muted-foreground text-center pb-8">
          Includes: Title Page · Declaration · Preface &amp; Acknowledgements · Abstract · Dedication · Glossary · TOC · List of Figures · List of Tables · Chapters · References · Appendices
        </p>
      </div>
    </div>
  );
}
