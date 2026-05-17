export function PageHero({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="bg-primary py-20 md:py-[70px] px-6 md:px-20 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(107,45,108,0.6), transparent)' }} />
      <h1 className="font-heading text-[clamp(40px,5vw,72px)] font-black text-white tracking-tight leading-[1.0] mb-4 relative z-10">{title}</h1>
      <p className="text-xl text-white/70 max-w-[560px] mx-auto leading-[1.65] relative z-10">{subtitle}</p>
    </div>
  );
}
