export function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="font-heading text-[26px] font-black text-foreground mb-3.5 tracking-tight">{title}</h2>
      <p className="text-base text-muted-foreground leading-[1.8]">{children}</p>
    </div>
  );
}
