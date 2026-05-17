import { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BookLoader } from "@/components/ui/BookLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CleanedDataProfile } from "@/types/project";

interface DataQualityModalProps {
  open: boolean;
  onClose: () => void;
  rawText: string;
  filename: string;
  onApprove: (profile: CleanedDataProfile) => void;
}

export function DataQualityModal({ open, onClose, rawText, filename, onApprove }: DataQualityModalProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState<CleanedDataProfile | null>(null);
  const [treat999, setTreat999] = useState(false);
  const [keepOutliers, setKeepOutliers] = useState(false);

  const runProfile = async (opts: { treat999AsMissing?: boolean; keepOutliers?: boolean }) => {
    setLoading(true);
    setProgress(8);
    const ramp = setInterval(() => setProgress((p) => (p < 85 ? p + 7 : p)), 220);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyse-dataset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ rawText, filename, options: opts }),
      });
      const data = await resp.json();
      clearInterval(ramp);
      setProgress(100);
      if (!resp.ok) throw new Error(data.error || "Failed to analyse dataset");
      setProfile(data.profile);
    } catch (e: any) {
      clearInterval(ramp);
      toast.error(e.message || "Could not clean dataset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && rawText && !profile) {
      runProfile({ treat999AsMissing: treat999, keepOutliers });
    }
    if (!open) {
      setProfile(null);
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-foreground/30 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-xl max-w-[640px] w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-black text-foreground">Data quality report</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filename}</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <BookLoader progress={progress} label="Cleaning your data…" />
            </div>
          )}

          {!loading && profile && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat label="Rows in" value={profile.rows_in.toLocaleString()} />
                <Stat label="Rows kept" value={profile.rows_out.toLocaleString()} highlight />
                <Stat label="Columns" value={profile.columns.length.toString()} />
              </div>

              {profile.notes.length > 0 && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={12} className="text-amber-700" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Cleaning actions</span>
                  </div>
                  <ul className="text-[12px] text-amber-900 space-y-0.5 list-disc pl-4">
                    {profile.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Column profile</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="bg-secondary/40 text-foreground">
                      <tr>
                        <th className="text-left px-2.5 py-1.5 font-bold">Column</th>
                        <th className="text-left px-2.5 py-1.5 font-bold">Type</th>
                        <th className="text-left px-2.5 py-1.5 font-bold">Missing</th>
                        <th className="text-left px-2.5 py-1.5 font-bold">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.columns.map((c) => (
                        <tr key={c.name} className="border-t border-border">
                          <td className="px-2.5 py-1.5 font-semibold text-foreground">{c.name}</td>
                          <td className="px-2.5 py-1.5 capitalize">{c.type}</td>
                          <td className="px-2.5 py-1.5">{c.missing}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">
                            {c.stats ? `μ=${c.stats.mean} · σ=${c.stats.sd} · [${c.stats.min}, ${c.stats.max}]` : ""}
                            {c.frequencies?.length ? c.frequencies.slice(0, 3).map((f) => `${f.value} (${f.count})`).join(" · ") : ""}
                            {c.outliers ? <span className="ml-1 text-amber-700">· {c.outliers} outliers</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Adjust cleaning</h3>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox checked={treat999} onCheckedChange={(v) => setTreat999(!!v)} />
                  <span>Treat <code className="px-1 bg-secondary rounded text-[11px]">999</code> / <code className="px-1 bg-secondary rounded text-[11px]">-999</code> as missing</span>
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox checked={keepOutliers} onCheckedChange={(v) => setKeepOutliers(!!v)} />
                  <span>Keep IQR outliers (don't drop)</span>
                </label>
                <button
                  onClick={() => runProfile({ treat999AsMissing: treat999, keepOutliers })}
                  className="text-[12px] font-bold text-primary hover:underline">
                  Re-run cleaning with new options →
                </button>
              </div>
            </>
          )}
        </div>

        {!loading && profile && (
          <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
            <button
              onClick={() => { onApprove(profile); onClose(); toast.success("Cleaned data approved · Chapter 4 will use these values."); }}
              className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 size={12} /> Approve & cache
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2.5", highlight ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30")}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-[18px] font-black mt-0.5", highlight ? "text-primary" : "text-foreground")}>{value}</div>
    </div>
  );
}
