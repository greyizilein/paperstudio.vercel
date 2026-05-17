import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project } from "@/types/project";
import { FDButton } from "@/components/firstdraft/FDButton";
import { FDBadge } from "@/components/firstdraft/FDBadge";
import { ProgressBar } from "@/components/firstdraft/ProgressBar";

export function Home({ projects, onNew, onOpen, onDelete }: { 
  projects: Project[]; onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void 
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-1 bg-primary rounded-full" />
            <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Academic Workspace</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary tracking-tight">Research Portfolio</h1>
          <p className="text-muted-foreground mt-4 max-w-md font-light">Manage your ongoing dissertations and research projects with AI-enhanced precision.</p>
        </div>
        <FDButton onClick={onNew} size="lg" className="gap-3 group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
          <span>Initiate New Project</span>
        </FDButton>
      </div>

      {projects.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 bg-surface/30 border border-primary/5 rounded-[2.5rem] text-center px-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10" />
          <div className="w-24 h-24 bg-surface border border-primary/10 rounded-3xl flex items-center justify-center text-primary mb-8 shadow-2xl shadow-primary/10">
            <FolderPlus size={40} />
          </div>
          <h2 className="font-display text-2xl font-bold text-primary mb-4">No active research found</h2>
          <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-light leading-relaxed">
            Your workspace is currently empty. Begin your academic journey by defining your research scope.
          </p>
          <FDButton onClick={onNew} size="lg" className="px-10">Start First Project</FDButton>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((p) => {
            const completedCount = p.chapters.filter(c => c.status === "completed").length;
            const progress = p.chapters.length ? Math.round((completedCount / p.chapters.length) * 100) : 0;
            const totalWords = p.chapters.reduce((sum, c) => sum + (c.word_count_actual || 0), 0);
            const isDeleting = deletingId === p.id;
            
            return (
              <motion.div key={p.id} whileHover={{ y: -8 }} onClick={() => !isDeleting && onOpen(p.id)}
                className={cn(
                  "group relative bg-surface border border-primary/5 rounded-[2rem] p-8 transition-all duration-500 overflow-hidden",
                  !isDeleting && "cursor-pointer hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
                )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -z-10 group-hover:bg-primary/10 transition-colors" />
                <div className="flex justify-between items-start mb-8">
                  <FDBadge color="brand">{p.degree}</FDBadge>
                  <div className="flex items-center gap-2">
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); setDeletingId(null); }}
                          className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all text-[10px] font-bold uppercase shadow-lg shadow-destructive/20">Confirm</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                          className="px-3 py-1.5 bg-primary/5 text-muted-foreground rounded-lg hover:bg-primary/10 transition-all text-[10px] font-bold uppercase">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                        className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all" title="Delete Project">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-primary leading-tight mb-4 line-clamp-2">{p.title}</h3>
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{p.citation_style}</span>
                  <span className="w-1 h-1 bg-primary/10 rounded-full" />
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{p.language_style}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest">
                    <span className="text-muted-foreground">{completedCount} / {p.chapters.length} Chapters</span>
                    <span className="text-primary">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Research Progress</span>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">
                      {totalWords > 0 ? `${totalWords.toLocaleString()} words` : `${p.word_count.toLocaleString()} target`}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
