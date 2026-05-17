import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHero } from "@/components/firstdraft/PageHero";

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUpgrade = async (tierKey: string) => {
    if (!user) { navigate(`/auth?redirect=/settings?tab=billing`); return; }
    navigate(`/settings?tab=billing&tier=${tierKey}`);
  };

  const plans = [
    { tier: 'Free', amt: '$0', per: 'Forever', desc: 'Try before you pay. Chapter 1 for every project, always free.', features: ['Chapter 1 only (3,000 words)', 'Gemini 2.5 Flash only', 'Harvard & APA 7 only', 'Plain text export'], off: ['Claude Sonnet 4.6', 'Word / PDF export', 'Data analysis & charts', 'Full grammar pipeline'], btnText: 'Start free →', btnClass: 'bg-transparent text-primary border-2 border-primary hover:bg-primary-pale', headBg: 'bg-surface-light', hot: false, dark: false },
    { tier: 'Undergraduate', amt: '$35', per: 'Per project', desc: 'Gemini 2.5 + Gemini 3 + GPT-5.2, with Claude Sonnet 4.6 unlocked at Chapter 4.', features: ['All chapters, up to 15,000 words', 'Gemini 2.5 + Gemini 3 + GPT-5.2', 'Claude Sonnet 4.6 (Chapter 4 only)', '8 quantitative analysis methods', 'All 12 citation styles', 'Word (.docx) + PDF export', '3 revision rounds per chapter'], off: ['Gemini 3 Pro', 'GPT-5 Flagship', 'Claude Opus', 'LaTeX export'], btnText: 'Get started →', btnClass: 'bg-primary text-white hover:bg-primary-dark', headBg: 'bg-surface-light', hot: false, dark: false },
    { tier: 'Masters', amt: '$150', per: 'Per project', desc: 'Gemini 3 Pro, GPT-5.2 + GPT-5 Flagship, Claude Sonnet 4.6 (adaptive) + Opus 4 at Chapter 4.', features: ['All chapters, up to 30,000 words', 'Gemini 3 Pro + GPT-5.2 + GPT-5 Flagship', 'Claude Sonnet 4.6 with adaptive thinking', 'Claude Opus 4 (Chapter 4 only)', 'All 20+ quantitative + 9 qualitative', 'All 5 export formats', '8 revisions + version history', 'Full 7-stage grammar pipeline'], off: ['Claude Opus 4.6'], btnText: 'Get Masters →', btnClass: 'bg-white text-primary hover:bg-primary-light', headBg: 'bg-primary', hot: true, dark: false },
    { tier: 'PhD', amt: '$280', per: 'Per project', desc: 'All Masters models + Claude Opus 4.6 with adaptive thinking at Chapter 4. Publication grade.', features: ['100,000 words, unlimited revisions', 'All Masters models included', 'Claude Opus 4.6 with adaptive thinking (Chapter 4)', 'Gemini 3 Pro + GPT-5 Flagship', 'SEM, meta-analysis, survival analysis', 'LaTeX + PDF/A + SVG 300 DPI', 'Priority 4hr support'], off: [], btnText: 'Get PhD tier →', btnClass: 'bg-transparent text-foreground border-2 border-border hover:border-foreground', headBg: 'bg-foreground', hot: false, dark: true },
  ];

  return (
    <div>
      <PageHero title={<>Pay once.<br /><em className="not-italic text-aqua">Yours forever.</em></>} subtitle="No subscriptions. One project per payment. Revisions based per project tier." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {plans.map(p => (
            <div key={p.tier} className={`rounded-2xl overflow-hidden border-[1.5px] flex flex-col hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,0,0,0.1)] transition-all ${p.hot ? 'border-primary shadow-[0_8px_28px_rgba(74,21,75,0.15)]' : 'border-border'}`}>
              <div className={`p-6 ${p.headBg} relative`}>
                {p.hot && <div className="absolute top-3 right-3 bg-yellow text-foreground px-2.5 py-0.5 rounded-full text-[11px] font-heading font-black">Most popular</div>}
                <div className={`text-xs font-black tracking-[0.12em] uppercase mb-2 ${p.hot || p.dark ? 'text-white/50' : 'text-muted-foreground'}`}>{p.tier}</div>
                <div className={`font-heading text-[42px] font-black tracking-tight leading-none ${p.hot || p.dark ? 'text-white' : 'text-foreground'}`}>{p.amt}</div>
                <div className={`text-[13px] mt-1 ${p.hot || p.dark ? 'text-white/50' : 'text-muted-foreground'}`}>{p.per}</div>
                <div className={`text-sm mt-3 font-semibold leading-[1.5] ${p.hot ? 'text-white/85' : p.dark ? 'text-white/70' : 'text-foreground'}`}>{p.desc}</div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <ul className="flex-1 flex flex-col gap-2.5 mb-5">
                  {p.features.map(f => <li key={f} className="flex items-start gap-2 text-[13px] text-foreground leading-[1.4]"><span className="text-green font-black flex-shrink-0 text-xs mt-0.5">✓</span>{f}</li>)}
                  {p.off.map(f => <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-[1.4]"><span className="text-border flex-shrink-0">—</span>{f}</li>)}
                </ul>
                <button onClick={() => p.tier === 'Free' ? navigate('/auth') : handleUpgrade(p.tier.toLowerCase())} className={`block w-full py-3 rounded-lg text-sm font-heading font-black text-center transition-all ${p.btnClass}`}>{p.btnText}</button>
                {p.tier !== 'Free' && <p className="text-[10px] text-muted-foreground text-center mt-1.5">Charged in NGN at checkout</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 p-8 bg-primary-pale rounded-2xl border border-primary-light text-center">
          <h3 className="font-heading text-[22px] font-black text-primary mb-2">For universities</h3>
          <p className="text-muted-foreground text-base mb-5">Flat-rate institutional licensing for all enrolled students. Custom pricing and white-labelling available.</p>
          <button onClick={() => navigate('/universities')} className="px-6 py-2.5 rounded-md bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors">Contact us about institutional licensing →</button>
        </div>
      </section>
    </div>
  );
}
