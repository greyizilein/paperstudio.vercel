import { useEffect, useState, useCallback } from "react";
import { X, Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
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

const TYPE_ICON: Record<string, any> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const TYPE_COLOR: Record<string, string> = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive",
  info: "text-primary",
};

export function NotificationPanel({ open, onClose, onUnreadChange }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    if (data) {
      setNotifications(data as Notification[]);
      const unread = (data as Notification[]).filter(n => !n.read).length;
      onUnreadChange?.(unread);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const unread = notifications.filter(n => n.id !== id && !n.read).length;
    onUnreadChange?.(unread);
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", ids);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange?.(0);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    const remaining = notifications.filter(n => n.id !== id);
    setNotifications(remaining);
    onUnreadChange?.(remaining.filter(n => !n.read).length);
  };

  const unread = notifications.filter(n => !n.read).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-foreground/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-foreground" />
            <span className="text-sm font-bold text-foreground">Inbox</span>
            {unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Mark all read"
              >
                <CheckCheck size={13} />
                All read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
              <Bell size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
              <p className="text-xs text-muted-foreground/60">Updates about your account, referrals, and support will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                const color = TYPE_COLOR[n.type] ?? "text-primary";
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`flex gap-3 px-4 py-3.5 cursor-pointer hover:bg-secondary/50 transition-colors group ${!n.read ? "bg-primary/3" : ""}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] font-semibold leading-tight ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                          {!n.read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1.5 align-middle" />}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {n.message && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/50 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
