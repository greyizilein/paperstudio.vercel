import { useEffect, useState, useRef, useCallback } from "react";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  user_id: string;
  from_admin: boolean;
  content: string;
  read: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (n: number) => void;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function MessagePanel({ open, onClose, onUnreadChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      onUnreadChange?.(countUnread(msgs));
      // Mark all admin messages as read since panel is open
      const unreadIds = msgs.filter(m => m.from_admin && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages" as any).update({ read: true }).in("id", unreadIds);
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m));
        onUnreadChange?.(0);
      }
    }
  }, [onUnreadChange, countUnread]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!cancelled) setUid(u?.user?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open || !uid) return;
    load(uid);

    // Subscribe to realtime inserts for this user's messages
    const ch = supabase
      .channel(`messages:${uid}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${uid}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.from_admin) {
            // Auto-mark read since panel is open
            supabase.from("messages" as any).update({ read: true }).eq("id", newMsg.id);
            onUnreadChange?.(0);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [open, uid, load, onUnreadChange]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  // Update unread count in sidebar when panel closes
  useEffect(() => {
    if (!open) {
      onUnreadChange?.(0);
    }
  }, [open, onUnreadChange]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || sending) return;
    setSending(true);
    setDraft("");
    const { data, error } = await supabase
      .from("messages" as any)
      .insert({ user_id: uid, from_admin: false, content: text, read: true })
      .select("id, user_id, from_admin, content, read, created_at")
      .single();
    setSending(false);
    if (data && !error) {
      setMessages(prev => [...prev, data as Message]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-foreground" />
            <span className="text-sm font-bold text-foreground">Messages</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
              <MessageSquare size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground/60">Send us a message and we'll get back to you soon.</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    m.from_admin
                      ? "bg-secondary text-foreground rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  {m.from_admin && (
                    <p className="text-[10px] font-semibold opacity-60 mb-0.5">Support</p>
                  )}
                  <p>{m.content}</p>
                  <p className={`text-[10px] mt-1 ${m.from_admin ? "opacity-50" : "opacity-60"}`}>
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={2}
              className="flex-1 resize-none px-3 py-2 rounded-xl border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
