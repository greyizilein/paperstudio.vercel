import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  user_id: string;
  from_admin: boolean;
  content: string;
  read: boolean;
  created_at: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const [nudged, setNudged] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id ?? null;
      setUid(userId);
      setIsAuth(!!userId);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id ?? null);
      setIsAuth(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Show nudge animation after 8s if not yet opened
  useEffect(() => {
    const t = setTimeout(() => setNudged(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const countUnread = useCallback((msgs: Message[]) => {
    return msgs.filter(m => m.from_admin && !m.read).length;
  }, []);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("messages" as any)
      .select("id, user_id, from_admin, content, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    setLoading(false);
    if (data) {
      const msgs = data as Message[];
      setMessages(msgs);
      const n = countUnread(msgs);
      setUnread(n);
    }
  }, [countUnread]);

  // Load + subscribe when open
  useEffect(() => {
    if (!open || !uid) return;
    load(uid);

    // Mark admin messages as read
    supabase.from("messages" as any).update({ read: true }).eq("user_id", uid).eq("from_admin", true).eq("read", false);
    setUnread(0);

    const ch = supabase
      .channel(`floating-chat:${uid}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${uid}` },
        (payload: any) => {
          const msg = payload.new as Message;
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.from_admin) {
            supabase.from("messages" as any).update({ read: true }).eq("id", msg.id);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); channelRef.current = null; };
  }, [open, uid, load]);

  // Poll unread count while closed
  useEffect(() => {
    if (!uid || open) return;
    const check = async () => {
      const { data } = await supabase
        .from("messages" as any)
        .select("id")
        .eq("user_id", uid)
        .eq("from_admin", true)
        .eq("read", false)
        .limit(99);
      setUnread((data as any[])?.length ?? 0);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [uid, open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || sending) return;
    setSending(true);
    setDraft("");
    const { data } = await supabase
      .from("messages" as any)
      .insert({ user_id: uid, from_admin: false, content: text, read: true })
      .select("id, user_id, from_admin, content, read, created_at")
      .single();
    setSending(false);
    if (data) setMessages(prev => [...prev, data as Message]);
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-[9000] w-[340px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ background: "var(--ma-surface, #fff)", border: "1px solid var(--ma-border, #e5e7eb)", maxHeight: "480px" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "var(--ma-accent, #c4384a)", color: "#fff" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={15} />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight">PaperStudio Support</p>
                <p className="text-[10px] opacity-70 leading-tight">We typically reply within a few hours</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ minHeight: "200px" }}>
            {!isAuth ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
                <MessageSquare size={28} style={{ color: "var(--ma-accent, #c4384a)", opacity: 0.4 }} />
                <p className="text-[13px] font-semibold" style={{ color: "var(--ma-text, #1a1a1a)" }}>Sign in to message us</p>
                <p className="text-[11.5px]" style={{ color: "var(--ma-text-muted, #666)" }}>Create a free account and chat directly with our support team.</p>
                <a
                  href="/auth?tab=signup"
                  className="mt-1 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--ma-accent, #c4384a)" }}
                >
                  Get started free
                </a>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--ma-text-muted, #999)" }} />
              </div>
            ) : (
              <>
                {/* Welcome bubble if no messages */}
                {messages.length === 0 && (
                  <div className="flex justify-start">
                    <div
                      className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tl-sm text-[12.5px] leading-relaxed"
                      style={{ background: "var(--ma-surface-2, #f3f4f6)", color: "var(--ma-text, #1a1a1a)" }}
                    >
                      <p className="text-[10px] font-semibold mb-1" style={{ opacity: 0.5 }}>Support</p>
                      <p>Hi! 👋 How can we help you today?</p>
                    </div>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                    <div
                      className="max-w-[85%] px-3 py-2 text-[12.5px] leading-relaxed"
                      style={{
                        borderRadius: m.from_admin ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                        background: m.from_admin ? "var(--ma-surface-2, #f3f4f6)" : "var(--ma-accent, #c4384a)",
                        color: m.from_admin ? "var(--ma-text, #1a1a1a)" : "#fff",
                      }}
                    >
                      {m.from_admin && <p className="text-[10px] font-semibold mb-0.5" style={{ opacity: 0.5 }}>Support</p>}
                      <p>{m.content}</p>
                      <p className="text-[10px] mt-1" style={{ opacity: 0.5 }}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Composer — only shown when authenticated */}
          {isAuth && (
            <div className="flex gap-2 items-end px-3 py-2.5 flex-shrink-0" style={{ borderTop: "1px solid var(--ma-border, #e5e7eb)" }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none px-3 py-2 rounded-xl text-[12.5px] focus:outline-none"
                style={{
                  background: "var(--ma-surface-2, #f3f4f6)",
                  border: "1px solid var(--ma-border, #e5e7eb)",
                  color: "var(--ma-text, #1a1a1a)",
                  maxHeight: "80px",
                }}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-opacity disabled:opacity-40"
                style={{ background: "var(--ma-accent, #c4384a)", color: "#fff" }}
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); setNudged(false); }}
        className="fixed bottom-5 right-5 z-[9001] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--ma-accent, #c4384a)" }}
        aria-label="Open chat"
      >
        <style>{`
          @keyframes chat-nudge {
            0%, 100% { transform: scale(1) rotate(0deg); }
            20%       { transform: scale(1.15) rotate(-8deg); }
            40%       { transform: scale(1.15) rotate(8deg); }
            60%       { transform: scale(1.1) rotate(-4deg); }
            80%       { transform: scale(1.05) rotate(0deg); }
          }
          @keyframes badge-pop {
            0%   { transform: scale(0); }
            60%  { transform: scale(1.3); }
            100% { transform: scale(1); }
          }
          .chat-btn-inner { animation: ${nudged && !open ? "chat-nudge 0.7s ease-in-out" : "none"}; }
          .chat-badge { animation: badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        `}</style>
        <span className="chat-btn-inner flex items-center justify-center w-full h-full">
          {open ? <X size={22} color="#fff" /> : <MessageSquare size={22} color="#fff" />}
        </span>
        {!open && unread > 0 && (
          <span
            className="chat-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: "#ef4444" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {!open && unread === 0 && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#22c55e" }} />
        )}
      </button>
    </>
  );
}
