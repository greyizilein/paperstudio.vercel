import { PenLine, Download, SpellCheck, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  activeProjectId?: string;
  activeChapterTitle?: string;
}

export function QuickActions({ activeProjectId, activeChapterTitle }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <PenLine size={16} />,
      title: "Continue writing",
      desc: activeChapterTitle ? `${activeChapterTitle} active` : "Resume your draft",
      onClick: () => activeProjectId && navigate(`/writer/${activeProjectId}`),
    },
    {
      icon: <Download size={16} />,
      title: "Export chapter",
      desc: "Download + reference list",
      onClick: () => activeProjectId && navigate(`/writer/${activeProjectId}`),
    },
    {
      icon: <SpellCheck size={16} />,
      title: "Grammar check",
      desc: "Review all chapters",
      onClick: () => activeProjectId && navigate(`/writer/${activeProjectId}`),
    },
    {
      icon: <MessageCircle size={16} />,
      title: "Support",
      desc: "Email response within 12h",
      onClick: () => navigate("/help"),
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground mb-3">Quick Actions</div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className="flex flex-col items-start gap-1 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left cursor-pointer"
          >
            <div className="text-primary">{a.icon}</div>
            <div className="text-[11px] font-bold text-foreground">{a.title}</div>
            <div className="text-[9px] text-muted-foreground leading-tight">{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
