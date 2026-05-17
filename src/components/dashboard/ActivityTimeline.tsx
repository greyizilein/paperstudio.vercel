interface Activity {
  text: string;
  time: string;
  color: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground mb-3">Recent Activity</div>
      {activities.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-foreground leading-snug">{a.text}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
