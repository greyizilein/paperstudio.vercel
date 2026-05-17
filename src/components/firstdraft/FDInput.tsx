import { cn } from "@/lib/utils";

export const FDInput = ({ label, value, onChange, placeholder, type = "text", className, autoComplete, name, id }: any) => (
  <div className="flex flex-col gap-2">
    {label && <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>}
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={cn(
        "bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
        className
      )}
    />
  </div>
);

export const FDTextArea = ({ label, value, onChange, placeholder, rows = 4, className }: any) => (
  <div className="flex flex-col gap-2">
    {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
    <textarea
      rows={rows}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none",
        className
      )}
    />
  </div>
);

export const FDSelect = ({ label, value, onChange, options, className }: any) => (
  <div className="flex flex-col gap-2">
    {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={cn(
        "bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none",
        className
      )}
    >
      {options.map((o: any) => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  </div>
);
