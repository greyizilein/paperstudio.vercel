import { useNavigate } from "react-router-dom";

export function CTABand({ title = "Ready to start?", subtitle = "Chapter 1 is free. No card required." }: { title?: string; subtitle?: string }) {
  const navigate = useNavigate();
  return (
    <section className="bg-primary py-20 px-6 md:px-10 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 70% 50%, #7a3a7b, transparent)' }} />
      <h2 className="font-heading text-[clamp(36px,4vw,64px)] font-black text-white tracking-tight leading-none mb-4 relative z-10 max-w-[700px] mx-auto">{title}</h2>
      <p className="text-lg text-white/60 max-w-[440px] mx-auto mb-9 leading-[1.65] relative z-10">{subtitle}</p>
      <div className="flex gap-3.5 justify-center flex-wrap relative z-10">
        <button onClick={() => navigate('/auth')} className="px-9 py-3.5 rounded-lg text-base font-heading font-black bg-white text-primary hover:bg-primary-light hover:-translate-y-0.5 transition-all">Start writing free →</button>
      </div>
    </section>
  );
}
