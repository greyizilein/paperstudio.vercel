import { useState } from "react";
import { Check, ChevronDown, Info } from "lucide-react";

export interface ClarifyField {
  key: string;
  label: string;
  type: "number" | "text" | "choice" | "checklist" | "gallery";
  options?: string[];
  /** For gallery: array of {id,label,kind?:"table"|"figure"} */
  items?: { id: string; label: string; kind?: "table" | "figure" }[];
  default?: string | number | string[];
  /** Allow a free-text "Other" answer for choice/checklist. Defaults true. */
  allowOther?: boolean;
  /** Optional explanatory text shown in a tiny drawer below the field. */
  info?: string;
}

export interface ClarifySpec {
  title?: string;
  /** Compact = minimal padding, smaller type, no extra chrome (delivery picker etc). */
  compact?: boolean;
  fields: ClarifyField[];
  /** Custom confirm button label. Defaults to "Approve". */
  confirmLabel?: string;
  /** Show a "Review" ghost button alongside Approve. Defaults true for normal popups. */
  allowReview?: boolean;
  /** Optional top-level explanatory drawer attached to the title. */
  info?: string;
}

interface Props {
  spec: ClarifySpec;
  onConfirm: (values: Record<string, unknown>) => void;
  onReview?: (values: Record<string, unknown>) => void;
}

const OTHER = "__other__";

/** Extracts the first ```czar-clarify ... ``` JSON block from text. */
export function extractClarifySpec(content: string): { spec: ClarifySpec | null; rest: string } {
  const m = content.match(/```czar-clarify\s*([\s\S]*?)```/);
  if (!m) return { spec: null, rest: content };
  try {
    const spec = JSON.parse(m[1].trim()) as ClarifySpec;
    if (!spec || !Array.isArray(spec.fields)) return { spec: null, rest: content };
    const rest = (content.slice(0, m.index!) + content.slice(m.index! + m[0].length)).trim();
    return { spec, rest };
  } catch {
    return { spec: null, rest: content };
  }
}

/** Tiny info drawer used on the title or per-field. Closed by default. */
function InfoToggle({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:opacity-80"
        style={{ color: "var(--czar-text-faint)" }}
        aria-label="More info"
      >
        <ChevronDown
          size={11}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
        />
      </button>
      {open && (
        <div
          className="mt-1.5 mb-1 rounded-lg px-2.5 py-1.5 text-[10.5px] leading-snug w-full"
          style={{
            background: "var(--czar-bg)",
            border: "1px solid var(--czar-border)",
            color: "var(--czar-text-dim)",
          }}
        >
          <Info size={10} className="inline mr-1 mb-px opacity-70" />
          {text}
        </div>
      )}
    </>
  );
}

/** A single tick row — used for both choice and checklist options. */
function TickRow({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-60"
      style={{
        background: active
          ? "color-mix(in srgb, var(--czar-accent) 14%, transparent)"
          : "var(--czar-bg)",
        border: `1px solid ${active ? "var(--czar-accent)" : "var(--czar-border)"}`,
        color: "var(--czar-text)",
      }}
    >
      <span
        className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
        style={{
          background: active ? "var(--czar-accent)" : "transparent",
          border: `1.5px solid ${active ? "var(--czar-accent)" : "var(--czar-border)"}`,
          color: "var(--czar-accent-fg)",
        }}
      >
        {active && <Check size={10} strokeWidth={3} />}
      </span>
      <span className="text-[13px] font-medium leading-snug">{label}</span>
    </button>
  );
}

export function CzarClarifyCard({ spec, onConfirm, onReview }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of spec.fields) {
      if (f.type === "gallery") {
        // Default-tick all items unless explicitly defaulted.
        init[f.key] = Array.isArray(f.default) ? f.default : (f.items || []).map((i) => i.id);
      } else {
        init[f.key] = f.default ?? (f.type === "checklist" ? [] : "");
      }
    }
    return init;
  });
  // Track per-field "Other" custom text.
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const set = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));
  const setOther = (k: string, v: string) => setOtherText((p) => ({ ...p, [k]: v }));

  const compact = !!spec.compact;
  const confirmLabel = spec.confirmLabel || "Approve";
  const allowReview = spec.allowReview !== false && !!onReview;

  const buildFinal = (): Record<string, unknown> => {
    const finalValues: Record<string, unknown> = { ...values };
    for (const f of spec.fields) {
      const txt = otherText[f.key]?.trim();
      if (!txt) continue;
      if (f.type === "choice" && finalValues[f.key] === OTHER) {
        finalValues[f.key] = txt;
      } else if (f.type === "checklist" && Array.isArray(finalValues[f.key])) {
        finalValues[f.key] = (finalValues[f.key] as string[])
          .filter((x) => x !== OTHER)
          .concat(txt);
      }
    }
    return finalValues;
  };

  const submit = () => {
    setDone(true);
    onConfirm(buildFinal());
  };

  const review = () => {
    setDone(true);
    onReview?.(buildFinal());
  };

  return (
    <div
      className={`czar-card-in rounded-2xl ${compact ? "p-3 my-1" : "p-4 my-3"}`}
      style={{
        background: "var(--czar-surface)",
        border: "1px solid var(--czar-border)",
      }}
    >
      {spec.title && (
        <div className={`${compact ? "mb-2.5" : "mb-3"}`}>
          <div
            className={`${compact ? "text-[13px]" : "text-[14px]"} font-semibold flex items-center gap-1.5`}
            style={{ color: "var(--czar-text)" }}
          >
            <span className="flex-1">{spec.title}</span>
            {spec.info && <InfoToggle text={spec.info} />}
          </div>
        </div>
      )}

      <div className={compact ? "space-y-3" : "space-y-3.5"}>
        {spec.fields.map((f) => {
          const allowOther = f.allowOther !== false;
          // For multi-field specs, show the field name as a small plain
          // header (no uppercase, no tracking) only if a label is present.
          const showHeader = (spec.fields.length > 1 && !!f.label) || !!f.info;
          return (
            <div key={f.key}>
              {showHeader && (
                <div
                  className="text-[12px] font-medium mb-1.5 flex items-center gap-1.5"
                  style={{ color: "var(--czar-text)" }}
                >
                  <span className="flex-1">{f.label}</span>
                  {f.info && <InfoToggle text={f.info} />}
                </div>
              )}

              {f.type === "text" && (
                <input
                  disabled={done}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                  style={{
                    background: "var(--czar-bg)",
                    border: "1px solid var(--czar-border)",
                    color: "var(--czar-text)",
                  }}
                />
              )}

              {f.type === "number" && (
                <input
                  disabled={done}
                  type="number"
                  value={Number(values[f.key] ?? 0) || ""}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                  style={{
                    background: "var(--czar-bg)",
                    border: "1px solid var(--czar-border)",
                    color: "var(--czar-text)",
                  }}
                />
              )}

              {f.type === "choice" && (
                <div className="flex flex-col gap-1.5">
                  {(f.options || []).map((opt) => (
                    <TickRow
                      key={opt}
                      label={opt}
                      active={values[f.key] === opt}
                      disabled={done}
                      onClick={() => set(f.key, opt)}
                    />
                  ))}
                  {allowOther && (
                    <>
                      <TickRow
                        label="Other"
                        active={values[f.key] === OTHER}
                        disabled={done}
                        onClick={() => set(f.key, OTHER)}
                      />
                      {values[f.key] === OTHER && (
                        <input
                          disabled={done}
                          value={otherText[f.key] || ""}
                          onChange={(e) => setOther(f.key, e.target.value)}
                          placeholder="Type your answer…"
                          className="w-full rounded-xl px-3 py-2 text-[13px] outline-none mt-1"
                          style={{
                            background: "var(--czar-bg)",
                            border: "1px solid var(--czar-accent)",
                            color: "var(--czar-text)",
                          }}
                          autoFocus
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {f.type === "checklist" && (
                <div className="flex flex-col gap-1.5">
                  {(f.options || []).map((opt) => {
                    const arr = (values[f.key] as string[]) || [];
                    const active = arr.includes(opt);
                    return (
                      <TickRow
                        key={opt}
                        label={opt}
                        active={active}
                        disabled={done}
                        onClick={() =>
                          set(
                            f.key,
                            active ? arr.filter((x) => x !== opt) : [...arr, opt],
                          )
                        }
                      />
                    );
                  })}
                  {allowOther && (() => {
                    const arr = (values[f.key] as string[]) || [];
                    const active = arr.includes(OTHER);
                    return (
                      <>
                        <TickRow
                          label="Other"
                          active={active}
                          disabled={done}
                          onClick={() =>
                            set(
                              f.key,
                              active ? arr.filter((x) => x !== OTHER) : [...arr, OTHER],
                            )
                          }
                        />
                        {active && (
                          <input
                            disabled={done}
                            value={otherText[f.key] || ""}
                            onChange={(e) => setOther(f.key, e.target.value)}
                            placeholder="Type your answer…"
                            className="w-full rounded-xl px-3 py-2 text-[13px] outline-none mt-1"
                            style={{
                              background: "var(--czar-bg)",
                              border: "1px solid var(--czar-accent)",
                              color: "var(--czar-text)",
                            }}
                            autoFocus
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {f.type === "gallery" && (() => {
                const arr = (values[f.key] as string[]) || [];
                const tables = (f.items || []).filter((i) => i.kind !== "figure");
                const figures = (f.items || []).filter((i) => i.kind === "figure");
                const renderGroup = (heading: string, items: typeof tables) => (
                  items.length > 0 && (
                    <div className="mb-2">
                      <div
                        className="text-[10.5px] uppercase tracking-wider mb-1.5 px-1"
                        style={{ color: "var(--czar-text-faint)" }}
                      >
                        {heading}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {items.map((it) => {
                          const active = arr.includes(it.id);
                          return (
                            <TickRow
                              key={it.id}
                              label={it.label}
                              active={active}
                              disabled={done}
                              onClick={() =>
                                set(
                                  f.key,
                                  active ? arr.filter((x) => x !== it.id) : [...arr, it.id],
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  )
                );
                return (
                  <div>
                    {renderGroup("Tables", tables)}
                    {renderGroup("Figures", figures)}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div className={`${compact ? "mt-3" : "mt-4"} flex justify-end gap-2`}>
        {allowReview && (
          <button
            disabled={done}
            onClick={review}
            className={`${compact ? "px-3.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[12.5px]"} rounded-full font-medium disabled:opacity-60 hover:opacity-90`}
            style={{
              background: "transparent",
              border: "1px solid var(--czar-border)",
              color: "var(--czar-text-dim)",
            }}
          >
            Review
          </button>
        )}
        <button
          disabled={done}
          onClick={submit}
          className={`${compact ? "px-4 py-1.5 text-[12px]" : "px-4 py-2 text-[12.5px]"} rounded-full font-semibold disabled:opacity-60`}
          style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
        >
          {done ? "Locked in ✓" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
