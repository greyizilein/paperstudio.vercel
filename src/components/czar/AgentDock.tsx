import {
  FileText,
  Search,
  PenLine,
  MessageSquare,
  CheckSquare,
  Image,
  Cpu,
  Loader2,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Agent {
  id: string;
  name: string;
  status: "idle" | "starting" | "working" | "done" | "error";
  action?: string;
  detail?: string;
}

interface AgentDockProps {
  agents: Agent[];
  className?: string;
  expanded?: boolean;
}

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "File Reader": FileText,
  "Researcher": Search,
  "Writer": PenLine,
  "Critic": MessageSquare,
  "Editor": CheckSquare,
  "Illustrator": Image,
};

function getAgentIcon(name: string): React.ComponentType<{ className?: string }> {
  return AGENT_ICONS[name] ?? Cpu;
}

interface StatusConfig {
  dot: string;
  label: string;
  icon: React.ReactNode;
}

function getStatusConfig(status: Agent["status"]): StatusConfig {
  switch (status) {
    case "starting":
      return {
        dot: "bg-amber-400",
        label: "Starting",
        icon: <Zap className="w-3 h-3 text-amber-500" />,
      };
    case "working":
      return {
        dot: "bg-blue-400",
        label: "Working",
        icon: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />,
      };
    case "done":
      return {
        dot: "bg-green-400",
        label: "Done",
        icon: <Check className="w-3 h-3 text-green-500" />,
      };
    case "error":
      return {
        dot: "bg-red-400",
        label: "Error",
        icon: <AlertCircle className="w-3 h-3 text-red-500" />,
      };
    default:
      return {
        dot: "bg-muted-foreground/30",
        label: "Idle",
        icon: null,
      };
  }
}

function AgentRow({ agent }: { agent: Agent }) {
  const AgentIcon = getAgentIcon(agent.name);
  const statusConfig = getStatusConfig(agent.status);

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/60 transition-colors">
      {/* Agent icon */}
      <span
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-5 h-5 rounded",
          agent.status === "working" && "text-blue-500",
          agent.status === "done" && "text-green-500",
          agent.status === "starting" && "text-amber-500",
          agent.status === "error" && "text-red-500",
          agent.status === "idle" && "text-muted-foreground/50"
        )}
      >
        <AgentIcon className="w-3.5 h-3.5" />
      </span>

      {/* Name */}
      <span
        className={cn(
          "flex-shrink-0 text-[11px] font-medium",
          agent.status === "idle" ? "text-muted-foreground/60" : "text-foreground"
        )}
      >
        {agent.name}
      </span>

      {/* Status indicator */}
      <span className="flex-shrink-0 flex items-center gap-1">
        {statusConfig.icon}
      </span>

      {/* Action text */}
      {agent.action && agent.status !== "idle" && (
        <span className="text-[11px] text-muted-foreground truncate min-w-0 flex-1">
          {agent.action}
        </span>
      )}

      {/* Status badge for done/error */}
      {(agent.status === "done" || agent.status === "error") && !agent.action && (
        <span
          className={cn(
            "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            agent.status === "done" && "bg-green-500/10 text-green-600",
            agent.status === "error" && "bg-red-500/10 text-red-600"
          )}
        >
          {statusConfig.label}
        </span>
      )}
    </div>
  );
}

export function AgentDock({ agents, className }: AgentDockProps) {
  const activeAgents = agents.filter((a) => a.status !== "idle");

  // Only render when there's at least one non-idle agent
  if (activeAgents.length === 0) return null;

  return (
    <div
      className={cn(
        "animate-in slide-in-from-top-2 fade-in duration-200",
        "border border-border rounded-lg bg-background/95 backdrop-blur-sm shadow-sm",
        "overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border/60 bg-secondary/40">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Agents
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">
          {activeAgents.filter((a) => a.status === "working").length} active
        </span>
      </div>

      {/* Agent rows */}
      <div className="px-1 py-1">
        {activeAgents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
