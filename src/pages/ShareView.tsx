import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { BookLoader } from "@/components/ui/BookLoader";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareProject {
  id: string;
  title: string;
  degree: string | null;
  field_of_study: string | null;
  university: string | null;
}

interface ShareChapter {
  id: string;
  title: string;
  content: string;
  order_index: number;
  type: string;
  status: string;
  word_count_actual: number | null;
}

interface Comment {
  id: string;
  chapter_id: string;
  paragraph_index: number;
  comment: string;
  author_name: string | null;
  created_at: string;
}

interface CommentTarget {
  chapterId: string;
  paraIndex: number;
  rect: DOMRect;
}

export default function ShareView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ShareProject | null>(null);
  const [chapters, setChapters] = useState<ShareChapter[]>([]);
  const [shareLinkId, setShareLinkId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem("ps:share-author") || "");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { setError("Invalid share link."); setLoading(false); return; }
    (async () => {
      // Resolve share link → project
      const { data: link, error: linkErr } = await supabase
        .from("share_links")
        .select("id, project_id, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (linkErr || !link) { setError("This share link doesn't exist or has been removed."); setLoading(false); return; }
      if (link.expires_at && new Date(link.expires_at) < new Date()) { setError("This share link has expired."); setLoading(false); return; }

      setShareLinkId(link.id);

      // Load project
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("id, title, degree, field_of_study, university")
        .eq("id", link.project_id)
        .maybeSingle();

      if (projErr || !proj) { setError("Project not found."); setLoading(false); return; }
      setProject(proj as ShareProject);

      // Load completed chapters
      const { data: chs } = await supabase
        .from("chapters")
        .select("id, title, content, order_index, type, status, word_count_actual")
        .eq("project_id", proj.id)
        .eq("status", "completed")
        .order("order_index");

      const chapList = (chs || []) as ShareChapter[];
      setChapters(chapList);
      if (chapList.length > 0) setActiveChapterId(chapList[0].id);

      // Load existing comments
      const { data: existingComments } = await supabase
        .from("supervisor_comments")
        .select("id, chapter_id, paragraph_index, comment, author_name, created_at")
        .eq("share_link_id", link.id)
        .order("created_at");

      setComments((existingComments || []) as Comment[]);
      setLoading(false);
    })();
  }, [token]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCommentTarget(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleParagraphClick = (chapterId: string, paraIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCommentTarget({ chapterId, paraIndex, rect });
    setCommentText("");
  };

  const handleSubmitComment = async () => {
    if (!commentTarget || !commentText.trim() || !shareLinkId) return;
    if (authorName.trim()) localStorage.setItem("ps:share-author", authorName.trim());
    setSubmitting(true);
    try {
      const { data, error: err } = await supabase
        .from("supervisor_comments")
        .insert({
          share_link_id: shareLinkId,
          chapter_id: commentTarget.chapterId,
          paragraph_index: commentTarget.paraIndex,
          comment: commentText.trim(),
          author_name: authorName.trim() || null,
        })
        .select()
        .single();
      if (err) throw err;
      setComments(prev => [...prev, data as Comment]);
      setCommentText("");
      toast.success("Comment added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeChapter = chapters.find(c => c.id === activeChapterId);
  const paragraphs = activeChapter ? (activeChapter.content || "").split(/\n\n+/).filter(Boolean) : [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <BookLoader fullScreen label="Loading dissertation…" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
      <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: "2rem", fontStyle: "italic", fontWeight: 700, color: "var(--ma-accent, #C4384A)", marginBottom: "12px" }}>
        Oops.
      </div>
      <p className="text-muted-foreground text-sm max-w-xs">{error}</p>
    </div>
  );

  const commentTargetComments = commentTarget
    ? comments.filter(c => c.chapter_id === commentTarget.chapterId && c.paragraph_index === commentTarget.paraIndex)
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: '"Geist", system-ui, sans-serif' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
          <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 700, fontStyle: "italic", fontSize: "1rem", letterSpacing: "-0.01em" }}>
            PAPERSTUDIO
          </span>
          <span className="text-border">·</span>
          <span className="text-[13px] text-muted-foreground truncate flex-1">{project?.title}</span>
          <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Shared view · Read only
          </span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar — chapter list */}
        <aside className="hidden md:flex flex-col w-[200px] flex-shrink-0 gap-1 pt-1">
          <div className="text-[10px] font-extrabold tracking-[0.08em] uppercase text-muted-foreground px-2 mb-1">
            Chapters
          </div>
          {chapters.map(ch => {
            const chCommentCount = comments.filter(c => c.chapter_id === ch.id).length;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterId(ch.id)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-all",
                  ch.id === activeChapterId
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <ChevronRight size={10} className={ch.id === activeChapterId ? "opacity-80" : "opacity-0"} />
                <span className="flex-1 leading-tight truncate">{ch.title}</span>
                {chCommentCount > 0 && (
                  <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {chCommentCount}
                  </span>
                )}
              </button>
            );
          })}
          {chapters.length === 0 && (
            <p className="text-[12px] text-muted-foreground px-2 italic">No completed chapters yet.</p>
          )}
        </aside>

        {/* Mobile chapter tabs */}
        <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto flex gap-2 scrollbar-hide">
          {chapters.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChapterId(ch.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all",
                ch.id === activeChapterId ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              )}
            >
              {ch.title}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {activeChapter ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug" style={{ fontFamily: '"Fraunces", Georgia, serif', fontStyle: "italic" }}>
                  {activeChapter.title}
                </h1>
                {activeChapter.word_count_actual && (
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {activeChapter.word_count_actual.toLocaleString()} words · Click any paragraph to leave a comment
                  </p>
                )}
              </div>

              <div className="space-y-0">
                {paragraphs.map((para, idx) => {
                  const paraComments = comments.filter(c => c.chapter_id === activeChapter.id && c.paragraph_index === idx);
                  const isTarget = commentTarget?.chapterId === activeChapter.id && commentTarget?.paraIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "relative group cursor-pointer rounded-md px-2 -mx-2 py-1 transition-all",
                        isTarget ? "bg-amber-500/8 ring-1 ring-amber-500/30" : "hover:bg-secondary/50"
                      )}
                      onClick={(e) => handleParagraphClick(activeChapter.id, idx, e)}
                    >
                      <div className="prose-academic text-[14px] leading-relaxed text-foreground pointer-events-none">
                        <Markdown remarkPlugins={[remarkGfm]}>{para}</Markdown>
                      </div>
                      {/* Comment indicator */}
                      {paraComments.length > 0 && (
                        <div className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold",
                          "text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/20 rounded-full px-1.5 py-0.5",
                          "group-hover:opacity-100 transition-opacity"
                        )}>
                          <MessageCircle size={10} />
                          {paraComments.length}
                        </div>
                      )}
                      {/* Hover hint */}
                      {paraComments.length === 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageCircle size={13} className="text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-sm">No completed chapters to display yet.</p>
            </div>
          )}
        </main>
      </div>

      {/* Comment popover */}
      {commentTarget && (
        <div
          ref={popoverRef}
          className="fixed z-[200] w-[320px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[400px]"
          style={{
            top: Math.min(commentTarget.rect.bottom + 8, window.innerHeight - 420),
            left: Math.min(commentTarget.rect.left, window.innerWidth - 336),
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-[13px] font-bold text-foreground">Comments</span>
            <button onClick={() => setCommentTarget(null)} className="p-1 rounded-md text-muted-foreground hover:bg-secondary transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Existing comments */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {commentTargetComments.length === 0 ? (
              <p className="text-[12px] text-muted-foreground italic">No comments yet. Be the first.</p>
            ) : (
              commentTargetComments.map(c => (
                <div key={c.id} className="text-[12px]">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-foreground">{c.author_name || "Anonymous"}</span>
                    <span className="text-muted-foreground text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{c.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* New comment form */}
          <div className="border-t border-border px-4 py-3 flex-shrink-0 space-y-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              className="w-full text-[12px] bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/50 transition-colors"
            />
            <div className="flex gap-2">
              <textarea
                placeholder="Leave a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment(); }}
                rows={2}
                className="flex-1 text-[12px] bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/50 transition-colors resize-none"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="self-end flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">⌘↵ to send</p>
          </div>
        </div>
      )}
    </div>
  );
}
