import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const CHAPTERS = [
  {c:"The relationship between vaccination hesitancy and socioeconomic determinants has been extensively documented in the literature. Smith and Johnson (2021) argue that structural barriers, including healthcare access, educational attainment, and income inequality, function as primary mediators of vaccine uptake behaviour across diverse populations.\n\n2.2 The Role of Social Media\n\nContrary to earlier frameworks positioning hesitancy as primarily a knowledge deficit problem (Larson et al., 2014), more recent scholarship emphasises information ecosystems. Williams et al. (2023) demonstrate that exposure to misinformation on social media increases hesitancy by a factor of 2.7, independent of education level.\n\n2.3 Cultural and Contextual Factors\n\nAdeyemi and colleagues (2022) identify trust in healthcare workers as the single strongest predictor of vaccine acceptance among low-income urban populations, accounting for 41% of variance in uptake behaviour (p < 0.001, 95% CI: 0.38-0.44)."},
  {c:"This study adopts a post-positivist ontological stance, acknowledging that while an objective social reality exists, it can only be partially and probabilistically known through empirical investigation (Creswell, 2018).\n\n3.2 Research Design Justification\n\nA mixed-methods sequential explanatory design was selected as most appropriate. Phase one involves quantitative survey data collection from n = 340 participants across three hospital trusts, followed by qualitative semi-structured interviews with a purposive subsample of n = 24 (Creswell and Plano Clark, 2018).\n\n3.3 Data Collection Instruments\n\nThe primary instrument is an adapted version of the Vaccine Hesitancy Scale (VHS-9), originally developed by Larson et al. (2015). Internal consistency was confirmed through a pilot study (n = 45, Cronbach alpha = 0.84)."}
];
const CITES = ['Smith and Johnson (2021)','WHO (2022)','Williams et al. (2023)','Adeyemi et al. (2022)','Creswell (2018)'];

function renderWriting(text: string): string {
  let h = '';
  for (const l of text.split('\n')) {
    if (/^\d+\.\d+/.test(l)) h += `<span class="text-white font-bold text-sm block my-3">${l}</span>`;
    else h += l.replace(/\(([^)]+\d{4}[^)]+)\)/g,'(<span class="text-aqua font-semibold">$1</span>)') + ' ';
  }
  return h + '<span class="cursor-blink"></span>';
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    el.querySelectorAll('.reveal').forEach(child => obs.observe(child));
    return () => obs.disconnect();
  }, []);
  return ref;
}

function AnimatedCounter({ target, suffix = '', className }: { target: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('0');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        const isFloat = String(target).includes('.');
        const dur = 1600, t0 = performance.now();
        function tick(now: number) {
          const p = Math.min((now - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 3), cur = target * ease;
          setValue((isFloat ? cur.toFixed(1) : Math.round(cur).toLocaleString()) + suffix);
          if (p < 1) requestAnimationFrame(tick);
          else setValue((isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix]);
  return <div ref={ref} className={className}>{value}</div>;
}

export function Landing({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate();
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroWcRef = useRef<HTMLSpanElement>(null);
  const heroBarRef = useRef<HTMLDivElement>(null);
  const heroPctRef = useRef<HTMLSpanElement>(null);
  const heroCiteRef = useRef<HTMLSpanElement>(null);
  const revealRef = useReveal();

  useEffect(() => {
    let hIdx = 0, hChar = 0;
    const iv = setInterval(() => {
      const ft = CHAPTERS[hIdx].c;
      hChar = Math.min(hChar + Math.floor(Math.random() * 5) + 2, ft.length);
      if (heroTextRef.current) heroTextRef.current.innerHTML = renderWriting(ft.slice(0, hChar));
      const wc = Math.round((hChar / ft.length) * 3800 * 0.55);
      const pct = Math.min(Math.round(wc / 3800 * 100), 100);
      if (heroWcRef.current) heroWcRef.current.innerHTML = `<b>${wc.toLocaleString()}</b> / 3,800w`;
      if (heroBarRef.current) heroBarRef.current.style.width = pct + '%';
      if (heroPctRef.current) heroPctRef.current.textContent = pct + '%';
      if (hChar % 180 < 6 && heroCiteRef.current) heroCiteRef.current.textContent = 'Citing: ' + CITES[Math.floor(Math.random() * CITES.length)];
      if (hChar >= ft.length) { hChar = 0; hIdx = (hIdx + 1) % CHAPTERS.length; if (heroTextRef.current) heroTextRef.current.innerHTML = '<span class="cursor-blink"></span>'; }
    }, 30);
    return () => clearInterval(iv);
  }, []);

  const goTo = (path: string) => navigate(path);

  return (
    <div ref={revealRef}>
      {/* HERO */}
      <section className="hero-gradient min-h-[88vh] flex flex-col items-center text-center pt-20 pb-0 px-6 md:px-12 relative">
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(107,45,108,0.6) 0%, transparent 70%)', animation: 'glowPulse 4s ease-in-out infinite' }} />
        
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-[13px] font-bold text-white/90 mb-7 relative z-10" style={{ animation: 'fadeDown 0.6s ease both' }}>
          <span className="live-dot" /> Now with Gemini 3.1 Pro for PhD
        </div>

        <h1 className="font-heading text-[clamp(52px,7.5vw,94px)] font-black leading-[1.0] text-white tracking-tight max-w-[920px] mb-6 relative z-10" style={{ animation: 'fadeDown 0.6s 0.1s ease both' }}>
          Your dissertation.<br /><span className="text-aqua">Powered by PAPERSTUDIO.</span>
        </h1>

        <p className="text-[clamp(16px,1.8vw,21px)] text-white/70 max-w-[560px] leading-[1.7] mb-10 relative z-10" style={{ animation: 'fadeDown 0.6s 0.2s ease both' }}>
          AI that writes publication-quality chapters — structured for your degree, methodology, and institution. Start Chapter 1 free.
        </p>

        <div className="flex gap-3 justify-center flex-wrap mb-12 relative z-10" style={{ animation: 'fadeDown 0.6s 0.3s ease both' }}>
          <button onClick={onStart} className="px-9 py-3.5 rounded-lg text-base font-heading font-black bg-white text-primary hover:bg-primary-light hover:-translate-y-0.5 transition-all">
            Start writing — it's free
          </button>
          <button onClick={() => goTo('/how-it-works')} className="px-8 py-3.5 rounded-lg text-[15px] font-bold bg-transparent text-white border-[1.5px] border-white/35 hover:bg-white/10 hover:border-white/70 transition-all">
            See how it works ↓
          </button>
        </div>

        <p className="text-white/40 text-xs font-bold tracking-[0.1em] uppercase mb-4 relative z-10">Trusted by students at</p>
        <div className="flex gap-10 justify-center flex-wrap mb-14 relative z-10" style={{ animation: 'fadeDown 0.6s 0.4s ease both' }}>
          {['UCL', 'UniLagos', 'Edinburgh', 'Ghana', 'Birmingham', 'Ibadan'].map(u => (
            <span key={u} className="font-heading text-sm font-extrabold text-white/45 tracking-wide hover:text-white/80 transition-colors cursor-default">{u}</span>
          ))}
        </div>

        {/* Hero Board */}
        <div className="max-w-[1060px] w-full relative z-10" style={{ transform: 'perspective(1600px) rotateX(5deg)', transformOrigin: '50% 100%', animation: 'boardRise 1s 0.5s ease both' }}>
          <div className="bg-[#111827] rounded-t-[14px] border border-white/10 shadow-[0_-24px_80px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Shell bar */}
            <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-3.5 border-b border-white/[0.07]">
              <div className="flex gap-1.5">
                <i className="w-3 h-3 rounded-full bg-[#FF5F57] block" />
                <i className="w-3 h-3 rounded-full bg-[#FFBD2E] block" />
                <i className="w-3 h-3 rounded-full bg-[#28CA41] block" />
              </div>
              <div className="font-mono text-xs text-white/35 flex-1 text-center tracking-wide hidden md:block">PAPERSTUDIO — MSc Public Health · Literature Review · Harvard · UK English</div>
              <div className="flex gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-primary/50 text-primary-light">CHAPTER 2/6</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-green/15 text-green">WRITING…</span>
              </div>
            </div>
            {/* Shell body */}
            <div className="flex h-[440px]">
              {/* Sidebar - hidden on mobile */}
              <div className="w-[220px] flex-shrink-0 bg-[#161b22] border-r border-white/[0.06] py-3.5 overflow-hidden hidden lg:block">
                <div className="flex items-center gap-2.5 px-4 pb-3.5 border-b border-white/[0.06] mb-2.5">
                  <div className="w-[34px] h-[34px] rounded-lg bg-primary flex items-center justify-center font-heading text-sm font-black text-white">PS</div>
                  <span className="font-heading text-sm font-extrabold text-white tracking-tight">PAPERSTUDIO</span>
                </div>
                <div className="text-[11px] font-bold text-white/25 uppercase tracking-wider px-4 py-2">Projects</div>
                <div className="flex items-center gap-2 px-4 py-1.5 text-[13px] text-white border-l-2 border-primary-mid bg-primary/25 cursor-pointer">
                  <span className="text-xs text-white/25">#</span> MSc Public Health
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 text-[13px] text-white/50 border-l-2 border-transparent cursor-pointer hover:bg-primary/25 hover:text-white">
                  <span className="text-xs text-white/25">#</span> BSc Psychology <span className="w-1.5 h-1.5 rounded-full bg-aqua ml-auto" />
                </div>
                <div className="text-[11px] font-bold text-white/25 uppercase tracking-wider px-4 py-2 mt-1">Chapters</div>
                {[
                  { icon: '✓', name: 'Abstract', dot: 'bg-green' },
                  { icon: '✓', name: 'Introduction', dot: 'bg-green' },
                  { icon: '✍', name: 'Literature Review', dot: 'bg-aqua', active: true },
                  { icon: '○', name: 'Methodology', dot: '' },
                  { icon: '○', name: 'Findings', dot: '' },
                  { icon: '○', name: 'Conclusion', dot: '' },
                ].map(ch => (
                  <div key={ch.name} className={`flex items-center gap-2 px-4 py-1.5 text-[13px] cursor-pointer border-l-2 transition-all ${ch.active ? 'text-white border-primary-mid bg-primary/25' : 'text-white/50 border-transparent hover:bg-primary/25 hover:text-white'}`}>
                    <span className="text-xs text-white/25">{ch.icon}</span> {ch.name}
                    {ch.dot && <span className={`w-1.5 h-1.5 rounded-full ${ch.dot} ml-auto`} />}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col bg-[#1c2030]">
                <div className="px-6 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-heading text-base font-extrabold text-white tracking-tight">Chapter 2: Literature Review</span>
                      <span className="bg-aqua/12 text-aqua px-2.5 py-0.5 rounded text-[10px] font-bold font-mono inline-flex items-center gap-1.5">
                        <span className="live-dot" style={{ width: 5, height: 5 }} />&nbsp;WRITING
                      </span>
                    </div>
                    <div className="text-xs text-white/30 mt-0.5">Target: 3,800 words · Harvard · Formality: Standard · PICO framework</div>
                  </div>
                </div>
                <div className="flex-1 px-7 py-5 overflow-hidden relative">
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#1c2030] to-transparent pointer-events-none z-10" />
                  <div ref={heroTextRef} className="text-[13px] leading-[1.9] text-white/75">
                    <span className="cursor-blink" />
                  </div>
                </div>
                <div className="px-6 py-2.5 border-t border-white/[0.06] flex items-center gap-3.5">
                  <span ref={heroWcRef} className="text-[11px] font-mono text-white/40"><b>0</b> / 3,800w</span>
                  <div className="flex-1 h-[3px] bg-white/[0.08] rounded-sm overflow-hidden">
                    <div ref={heroBarRef} className="h-full rounded-sm transition-all duration-500" style={{ background: 'linear-gradient(90deg, hsl(var(--primary-mid)), hsl(var(--aqua)))', width: '0%' }} />
                  </div>
                  <span ref={heroPctRef} className="text-[11px] font-mono text-green font-bold">0%</span>
                </div>
                <div className="px-6 py-3 border-t border-white/[0.06] flex gap-2 items-center">
                  <button className="px-4 py-2 rounded-md text-xs font-bold bg-white/[0.07] text-white/65 border border-white/10">✎ Add notes</button>
                  <button className="px-4 py-2 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-colors">✓ Accept chapter</button>
                  <span ref={heroCiteRef} className="ml-auto text-[11px] font-mono text-white/30">Citing: —</span>
                </div>
              </div>

              {/* Right panel - hidden on mobile */}
              <div className="w-[260px] flex-shrink-0 bg-[#141820] border-l border-white/[0.06] flex-col hidden xl:flex">
                <div className="flex border-b border-white/[0.06]">
                  {['Progress', 'Chapters', 'Export'].map((t, i) => (
                    <button key={t} className={`flex-1 py-2.5 text-center text-xs font-bold border-b-2 transition-all ${i === 0 ? 'text-white border-primary-mid' : 'text-white/35 border-transparent'}`}>{t}</button>
                  ))}
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <div className="mb-3.5">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className="text-white/40 uppercase tracking-wider">Overall</span><b className="text-white">33%</b></div>
                    <div className="h-1 rounded-sm bg-white/[0.08] overflow-hidden"><div className="h-full rounded-sm bg-green" style={{ width: '33%' }} /></div>
                  </div>
                  <div className="mb-3.5">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className="text-white/40 uppercase tracking-wider">Words</span><b className="text-white">4,112 / 12,000</b></div>
                    <div className="h-1 rounded-sm bg-white/[0.08] overflow-hidden"><div className="h-full rounded-sm bg-aqua" style={{ width: '34%' }} /></div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2.5">
                    {[
                      { num: '00', name: 'Abstract', dot: 'bg-green' },
                      { num: '01', name: 'Introduction', dot: 'bg-green' },
                      { num: '02', name: 'Literature Review', dot: 'bg-aqua', active: true },
                      { num: '03', name: 'Methodology', dot: 'bg-white/15' },
                      { num: '04', name: 'Findings', dot: 'bg-white/15' },
                      { num: '05', name: 'Conclusion', dot: 'bg-white/15' },
                    ].map(ch => (
                      <div key={ch.num} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${ch.active ? 'bg-primary/20' : 'bg-white/[0.03] hover:bg-primary/20'}`}>
                        <span className="text-[10px] font-mono text-white/25 w-4">{ch.num}</span>
                        <span className={`flex-1 text-xs font-semibold ${ch.active ? 'text-white' : 'text-white/60'}`}>{ch.name}</span>
                        <span className={`w-[7px] h-[7px] rounded-full ${ch.dot}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS STRIP */}
      <div className="bg-white border-b border-border flex justify-center gap-1.5 px-6 md:px-10 py-3.5 sticky top-[60px] z-[150] overflow-x-auto">
        {['Write chapters', 'Research frameworks', 'Data analysis', 'Export formats', 'Grammar engine'].map((t, i) => (
          <button key={t} className={`px-5 py-2 rounded-full text-sm font-bold border-[1.5px] transition-all whitespace-nowrap ${i === 0 ? 'bg-primary-pale text-primary border-primary-light' : 'bg-transparent text-muted-foreground border-transparent hover:bg-primary-pale hover:text-primary hover:border-primary-light'}`}>{t}</button>
        ))}
      </div>

      {/* FEATURE ROW 1 — Writing Engine */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-20 items-center py-[90px] px-6 md:px-20 max-w-[1280px] mx-auto">
        <div>
          <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Writing Engine</div>
          <h2 className="font-heading text-[clamp(28px,3vw,44px)] font-black tracking-tight leading-[1.1] text-foreground mb-4">
            AI that writes like <em className="not-italic text-primary">YOU.</em>
          </h2>
          <p className="text-[17px] text-muted-foreground leading-[1.75] mb-4">Every chapter passes through a seven-stage quality pipeline. Banned phrases, passive voice ratios, sentence variety, citation density — all checked before you see a single word.</p>
          <p className="text-[17px] text-muted-foreground leading-[1.75] mb-4">Set your formality, hedging intensity, language, framework, and citation style. The AI adjusts everything to match.</p>
          <a onClick={() => goTo('/features')} className="inline-flex items-center gap-1.5 text-sm font-heading font-black text-primary cursor-pointer hover:gap-3 transition-all">See all writing controls →</a>
        </div>
        <div className="space-y-4">
          {/* Writing board */}
          <div className="rounded-[14px] overflow-hidden border border-border shadow-[0_16px_48px_rgba(74,21,75,0.1)]">
            <div className="bg-foreground px-4 py-3 flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-primary/50 text-primary-light">LIVE WRITING</span>
              <span className="text-[13px] font-bold text-white/50 flex-1">Chapter 3: Research Methodology</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-aqua/12 text-aqua">WRITING…</span>
            </div>
            <div className="p-5 bg-white min-h-[200px] text-sm leading-[1.9] text-foreground">
              <span className="font-heading text-[15px] font-extrabold text-foreground block mb-2">3.1 Research Philosophy</span>
              This study adopts a post-positivist ontological stance, acknowledging that while an objective social reality exists, it can only be partially known through empirical investigation (<span className="text-primary font-bold">Creswell, 2018</span>).
              <span className="cursor-blink" style={{ background: 'hsl(var(--primary))' }} />
            </div>
            <div className="bg-surface-light px-4 py-2.5 border-t border-border flex items-center gap-2.5">
              <span className="text-xs font-mono text-muted-foreground"><b className="text-green font-bold">847</b> / 2,400w</span>
              <div className="flex-1 h-[3px] rounded-sm bg-border overflow-hidden"><div className="h-full rounded-sm" style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--aqua)))', width: '35%' }} /></div>
              <button className="px-3.5 py-1.5 rounded-md text-[11px] font-bold bg-primary text-white">✓ Accept</button>
            </div>
          </div>
          {/* Settings board */}
          <div className="rounded-[14px] overflow-hidden border border-border shadow-[0_16px_48px_rgba(74,21,75,0.1)]">
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-white">Chapter Settings</span>
              <div className="flex gap-1">
                {['UK English', 'US English', 'NG English'].map((l, i) => (
                  <button key={l} className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${i === 0 ? 'bg-white text-primary' : 'bg-white/12 text-white/65'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 bg-white">
              {[
                { label: 'Citation Style', value: 'Harvard (UK)', dotColor: 'bg-primary' },
                { label: 'Framework', value: 'PICO', dotColor: 'bg-aqua' },
                { label: 'Degree', value: 'MSc', dotColor: 'bg-green' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-surface-light last:border-b-0">
                  <span className="text-[13px] font-bold text-foreground">{s.label}</span>
                  <span className="flex items-center gap-2 text-[13px] font-bold text-primary">
                    <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />{s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE ROW 2 — Analysis */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-20 items-center py-[90px] px-6 md:px-20 max-w-full bg-surface-light" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>
          <div className="rounded-[14px] overflow-hidden border border-border shadow-[0_16px_48px_rgba(74,21,75,0.1)]">
            <div className="bg-foreground px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-white">Select Analysis Methods</span>
              <span className="text-[11px] text-white/35">Auto-generates charts</span>
            </div>
            <div className="p-3.5 bg-white space-y-1.5">
              {[
                { emoji: '📊', name: 'Descriptive Statistics', desc: 'Mean, SD, frequency tables → Bar chart', on: true },
                { emoji: '📈', name: 'Multiple Regression', desc: 'R², coefficients, VIF → Coefficient plot', on: true },
                { emoji: '🔬', name: 'Thematic Analysis', desc: 'Braun & Clarke 6-phase → Theme table', on: false },
                { emoji: '⚗️', name: "Cronbach's Alpha", desc: 'Scale reliability → Item reliability chart', on: false },
              ].map(a => (
                <div key={a.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-[1.5px] cursor-pointer transition-all ${a.on ? 'border-primary bg-primary-pale' : 'border-border hover:border-primary hover:bg-primary-pale'}`}>
                  <div className="w-[34px] h-[34px] rounded-[7px] flex items-center justify-center text-lg flex-shrink-0 bg-primary-pale">{a.emoji}</div>
                  <div>
                    <div className={`text-[13px] font-bold ${a.on ? 'text-primary font-extrabold' : 'text-foreground'}`}>{a.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
                  </div>
                  {a.on && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto flex-shrink-0"><span className="text-[11px] text-white font-black">✓</span></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ direction: 'ltr' }}>
          <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Data Analysis</div>
          <h2 className="font-heading text-[clamp(28px,3vw,44px)] font-black tracking-tight leading-[1.1] text-foreground mb-4">
            Select your analysis.<br />We <em className="not-italic text-primary">write the results.</em>
          </h2>
          <p className="text-[17px] text-muted-foreground leading-[1.75] mb-4">Choose from 20 quantitative and 9 qualitative methods. PAPERSTUDIO writes the full findings chapter — correct statistical notation, labelled outputs, verbal interpretation, and the right chart type automatically selected.</p>
          <a onClick={() => goTo('/analysis')} className="inline-flex items-center gap-1.5 text-sm font-heading font-black text-primary cursor-pointer hover:gap-3 transition-all">Explore all 29 methods →</a>
        </div>
      </div>

      {/* STATS BAND */}
      <section className="reveal bg-foreground py-20 px-6 md:px-10">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { count: 20, suffix: '+', label: 'Analysis methods', sub: 'from ANOVA to meta-analysis', color: 'text-primary-light' },
            { count: 15, suffix: '', label: 'Research frameworks', sub: 'PICO to CIMO and beyond', color: 'text-green' },
            { count: 12, suffix: '', label: 'Citation styles', sub: 'Harvard, APA, Vancouver…', color: 'text-aqua' },
            { count: 5, suffix: '', label: 'Export formats', sub: '.docx, PDF, LaTeX, .md, .txt', color: 'text-yellow' },
          ].map(s => (
            <div key={s.label} className="py-7 px-6 md:px-10 text-center">
              <AnimatedCounter target={s.count} suffix={s.suffix} className={`font-heading text-[clamp(40px,5vw,70px)] font-black leading-none mb-2 tracking-tight ${s.color}`} />
              <div className="text-[15px] text-white/45 leading-[1.5]">
                <b className="text-white/75 font-bold">{s.label}</b><br />{s.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="reveal py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">How it works</div>
        <h2 className="font-heading text-[clamp(36px,4vw,58px)] font-black tracking-tight leading-[1.05] text-foreground mb-4">
          From blank page to<br /><em className="not-italic text-primary">submitted dissertation.</em>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mt-14">
          {[
            { step: '1', title: 'Tell us about your dissertation', desc: 'Enter your title, degree, university, methodology, and word count. Pick your research framework — PICO, PEO, SPIDER, or 12 others. We generate objectives and research questions.' },
            { step: '2', title: 'Generate chapter by chapter', desc: 'Each chapter is written on demand. Add notes, choose analysis methods, set chart preferences. The AI writes to your exact word count and citation density.' },
            { step: '3', title: 'Review, revise, export', desc: 'Accept chapters or request revisions with specific feedback. The grammar engine checks everything. Export in your preferred format — submission-ready.' },
          ].map(s => (
            <div key={s.step} className="reveal p-8 rounded-2xl bg-surface-light border-[1.5px] border-border relative overflow-hidden group hover:border-primary hover:-translate-y-1.5 hover:shadow-[0_16px_44px_rgba(74,21,75,0.12)] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-pale to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-[42px] h-[42px] rounded-[10px] bg-primary flex items-center justify-center font-heading text-xl font-black text-white mb-5 relative z-10">{s.step}</div>
              <h3 className="font-heading text-[19px] font-extrabold text-foreground mb-2.5 tracking-tight relative z-10">{s.title}</h3>
              <p className="text-[15px] text-muted-foreground leading-[1.7] relative z-10">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE ROW 3 — Export */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-20 items-center py-[90px] px-6 md:px-20 max-w-[1280px] mx-auto">
        <div>
          <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Export System</div>
          <h2 className="font-heading text-[clamp(28px,3vw,44px)] font-black tracking-tight leading-[1.1] text-foreground mb-4">
            Five formats.<br /><em className="not-italic text-primary">Submit anywhere.</em>
          </h2>
          <p className="text-[17px] text-muted-foreground leading-[1.75] mb-4">Word, PDF, LaTeX with .bib file, Markdown, or plain text. Every format includes your title page, table of contents, list of figures, and reference list.</p>
          <a onClick={() => goTo('/export')} className="inline-flex items-center gap-1.5 text-sm font-heading font-black text-primary cursor-pointer hover:gap-3 transition-all">See all export options →</a>
        </div>
        <div className="rounded-[14px] overflow-hidden border border-border shadow-[0_16px_48px_rgba(74,21,75,0.1)]">
          <div className="bg-foreground px-4 py-3 flex items-center gap-2.5">
            <span className="text-lg">📄</span>
            <span className="text-[13px] font-bold text-white flex-1">Export Dissertation</span>
            <span className="text-xs text-green font-bold">✓ 6/6 complete</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-4">
            {[
              { ico: '📝', nm: 'Word (.docx)', ds: 'Full formatting, ToC, charts', on: true },
              { ico: '📕', nm: 'PDF', ds: 'Print-ready, hyperlinked', on: false },
              { ico: '⌨️', nm: 'LaTeX (.tex)', ds: '.tex + .bib, compilable', on: false },
              { ico: '📋', nm: 'Markdown', ds: 'YAML frontmatter, GFM', on: false },
            ].map(f => (
              <div key={f.nm} className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${f.on ? 'border-primary bg-primary-pale' : 'border-border hover:border-primary hover:bg-primary-pale'}`}>
                <div className="text-[22px] mb-1.5">{f.ico}</div>
                <div className="text-[13px] font-heading font-extrabold text-foreground mb-0.5">{f.nm}</div>
                <div className="text-[11px] text-muted-foreground">{f.ds}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Word count</span><b className="text-foreground">11,892 words</b></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>References</span><b className="text-foreground">74 sources</b></div>
          </div>
          <div className="px-4 pb-4 pt-2">
            <button className="w-full py-3 rounded-lg bg-primary text-white text-sm font-heading font-black hover:bg-primary-dark transition-colors">Download as Word Document ↓</button>
          </div>
        </div>
      </div>

      {/* FEATURE ROW 4 — Grammar */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-20 items-center py-[90px] px-6 md:px-20 max-w-full bg-primary-pale" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>
          <div className="rounded-[14px] overflow-hidden border border-border shadow-[0_16px_48px_rgba(74,21,75,0.1)]">
            <div className="bg-primary px-4 py-3 flex items-center gap-2.5">
              <span>🛡</span>
              <span className="text-[13px] font-bold text-white">Quality Pipeline — 7 Stages</span>
            </div>
            <div className="p-4 bg-white space-y-2">
              <div className="border border-green/30 rounded-lg p-3">
                <div className="text-[10px] font-black tracking-wider uppercase text-green mb-1.5">Stage 1 — Banned Phrases ✓ Passed</div>
                <div className="text-[13px] text-foreground">Checked 16 patterns — <span className="text-green font-bold">None found</span></div>
              </div>
              <div className="border border-green/30 rounded-lg p-3">
                <div className="text-[10px] font-black tracking-wider uppercase text-green mb-1.5">Stage 2 — Sentence Variety ✓ Passed</div>
                <div className="text-[13px] text-foreground">Std deviation: <span className="text-green font-bold">8.2 words</span> (target &gt;5)</div>
              </div>
              <div className="border border-yellow/30 rounded-lg p-3">
                <div className="text-[10px] font-black tracking-wider uppercase text-yellow mb-1.5">Stage 3 — Passive Voice ⚠ Warning</div>
                <div className="text-[13px] text-foreground">Ratio: <span className="text-yellow font-bold">34%</span> — within limit (35%)</div>
              </div>
              <div className="border border-primary-light rounded-lg p-3" style={{ animation: 'stagePulse 1.5s ease-in-out infinite' }}>
                <div className="text-[10px] font-black tracking-wider uppercase text-primary mb-1.5">Stage 5 — AI-Pattern Score</div>
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="flex-1 h-1.5 rounded-sm bg-border overflow-hidden"><div className="h-full rounded-sm" style={{ background: 'linear-gradient(90deg, hsl(var(--primary-mid)), hsl(var(--green)))', width: '84%' }} /></div>
                  <span className="text-[15px] font-heading font-black text-green">8.4</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 py-2.5 rounded-[7px] bg-primary text-white text-[13px] font-heading font-black">Fix Grammar</button>
                <button className="flex-1 py-2.5 rounded-[7px] bg-surface-light text-primary border-[1.5px] border-primary-light text-[13px] font-heading font-black">Strengthen</button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ direction: 'ltr' }}>
          <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Quality Control</div>
          <h2 className="font-heading text-[clamp(28px,3vw,44px)] font-black tracking-tight leading-[1.1] text-foreground mb-4">
            Seven stages.<br /><em className="not-italic text-primary">Before you see it.</em>
          </h2>
          <p className="text-[17px] text-muted-foreground leading-[1.75] mb-4">Every generated chapter passes through a pipeline checking banned phrases, sentence variety, passive voice ratio, word count precision, grammar, citation density, and AI-pattern scores.</p>
          <a onClick={() => goTo('/features')} className="inline-flex items-center gap-1.5 text-sm font-heading font-black text-primary cursor-pointer hover:gap-3 transition-all">Learn about quality checks →</a>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section className="reveal bg-primary-pale py-[100px] px-6 md:px-20">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Student stories</div>
            <h2 className="font-heading text-[clamp(36px,4vw,58px)] font-black tracking-tight leading-[1.05] text-foreground max-w-[560px] mx-auto">
              The dissertation that got <em className="not-italic text-primary">submitted.</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14">
            {[
              { stars: '★★★★★', quote: 'Two weeks left, six chapters to write. PAPERSTUDIO wrote my entire <em>MSc methodology chapter</em> in 40 minutes. My supervisor said it was one of the clearest she\'d reviewed all year.', name: 'MSc Student', role: 'Public Health · West Africa', color: 'bg-primary' },
              { stars: '★★★★★', quote: 'The PICO framework integration is brilliant. It structured my <em>systematic review</em> perfectly and the literature review wrote itself with proper criteria already in there.', name: 'MSc Student', role: 'Nursing · United Kingdom', color: 'bg-green' },
              { stars: '★★★★★', quote: 'PhD tier for my <em>80,000-word thesis</em>. The LaTeX export was flawless. Submission portal accepted it first attempt. Worth every penny and then some.', name: 'PhD Student', role: 'Economics · United Kingdom', color: 'bg-foreground' },
            ].map(t => (
              <div key={`${t.name}-${t.role}`} className="reveal p-7 bg-white rounded-2xl border border-border hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(74,21,75,0.12)] hover:border-primary-light transition-all">
                <div className="text-yellow text-[15px] mb-3.5">{t.stars}</div>
                <p className="text-[15px] text-foreground leading-[1.75] mb-5" dangerouslySetInnerHTML={{ __html: t.quote.replace(/<em>/g, '<em class="not-italic text-primary font-bold">') }} />
                <div className="flex items-center gap-3">
                  <div className={`w-[42px] h-[42px] rounded-full ${t.color} flex items-center justify-center font-heading text-[15px] font-black text-white`}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-heading font-extrabold text-foreground tracking-tight">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SP STRIP */}
      <section className="reveal bg-foreground py-16 px-6 md:px-10 text-center">
        <div className="text-xs font-black tracking-[0.12em] uppercase text-white/30 mb-9">By the numbers</div>
        <div className="flex justify-center flex-wrap">
          {[
            { count: 29, suffix: '', label: 'analysis methods' },
            { count: 15, suffix: '', label: 'research frameworks' },
            { count: 3.8, suffix: '×', label: 'faster than solo writing' },
            { count: 5, suffix: '', label: 'export formats' },
          ].map((s, i) => (
            <div key={s.label} className={`px-8 md:px-16 text-center ${i < 3 ? 'border-r border-white/[0.08]' : ''}`}>
              <AnimatedCounter target={s.count} suffix={s.suffix} className="font-heading text-[clamp(36px,5vw,60px)] font-black text-white tracking-tight leading-none mb-1.5" />
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="reveal py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="text-xs font-black tracking-[0.12em] uppercase text-primary mb-3.5">Pricing</div>
        <h2 className="font-heading text-[clamp(36px,4vw,58px)] font-black tracking-tight leading-[1.05] text-foreground mb-4">
          Pay once. <em className="not-italic text-primary">Yours forever.</em>
        </h2>
        <p className="text-lg text-muted-foreground leading-[1.7] max-w-[540px] mb-9">One subscription. One project. One payment. Tier-level revisions.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-14">
          {[
            { tier: 'Free', tierSlug: 'free', amt: '$0', per: 'Forever', desc: 'Try Chapter 1 for free', features: ['Chapter 1 only (3,000 words)', 'Harvard & APA only', 'UK & US English', 'Plain text export'], off: ['Word / PDF export', 'Data analysis', 'Grammar pipeline'], btnText: 'Start free →', btnClass: 'bg-transparent text-primary border-2 border-primary hover:bg-primary-pale', headBg: 'bg-surface-light', hot: false, dark: false },
            { tier: 'Undergraduate', tierSlug: 'undergraduate', amt: '$35', per: 'Per project', desc: 'First-class undergraduate work.', features: ['All chapters, 15,000 words', '8 analysis methods', 'All 12 citation styles', 'Word + PDF export', '3 revision rounds', '8 chart types'], off: ['LaTeX export'], btnText: 'Get started →', btnClass: 'bg-primary text-white hover:bg-primary-dark', headBg: 'bg-surface-light', hot: false, dark: false },
            { tier: 'Masters', tierSlug: 'masters', amt: '$150', per: 'Per project', desc: 'Full-depth MSc / MA / MBA dissertations.', features: ['All chapters, 30,000 words', 'All 20+ analysis methods', 'All research frameworks', 'All 5 export formats', '8 revisions + version history', 'All 17 chart types', 'ToC + List of Figures'], off: [], btnText: 'Most popular →', btnClass: 'bg-white text-primary hover:bg-primary-light', headBg: 'bg-primary', hot: true, dark: false },
            { tier: 'PhD', tierSlug: 'phd', amt: '$280', per: 'Per project', desc: 'All AI models. Up to 100,000 words.', features: ['100,000 words, unlimited revisions', 'Gemini 3 Pro + GPT-5 Flagship + Claude Opus 4.6', 'Adaptive thinking on Chapter 4', 'SEM, meta-analysis, survival analysis', 'LaTeX + PDF/A + SVG 300 DPI', 'Parallel chapter generation', 'Priority 4hr support', 'Systematic review structure'], off: [], btnText: 'Get PhD tier →', btnClass: 'bg-transparent text-foreground border-2 border-border hover:border-foreground', headBg: 'bg-foreground', hot: false, dark: true },
          ].map(p => (
            <div key={p.tier} className={`rounded-2xl overflow-hidden border-[1.5px] flex flex-col hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,0,0,0.1)] transition-all ${p.hot ? 'border-primary shadow-[0_8px_28px_rgba(74,21,75,0.15)]' : 'border-border'}`}>
              <div className={`p-6 ${p.headBg} ${p.hot || p.dark ? 'text-white' : ''} relative`}>
                {p.hot && <div className="absolute top-3 right-3 bg-yellow text-foreground px-2.5 py-0.5 rounded-full text-[11px] font-heading font-black">Most popular</div>}
                <div className={`text-xs font-black tracking-[0.12em] uppercase mb-2 ${p.hot || p.dark ? 'text-white/50' : 'text-muted-foreground'}`}>{p.tier}</div>
                <div className={`font-heading text-[42px] font-black tracking-tight leading-none ${p.hot || p.dark ? 'text-white' : 'text-foreground'}`}>{p.amt}</div>
                <div className={`text-[13px] mt-1 ${p.hot || p.dark ? 'text-white/50' : 'text-muted-foreground'}`}>{p.per}</div>
                <div className={`text-sm mt-3 font-semibold leading-[1.5] ${p.hot ? 'text-white/85' : p.dark ? 'text-white/70' : 'text-foreground'}`}>{p.desc}</div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <ul className="flex-1 flex flex-col gap-2.5 mb-5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-foreground leading-[1.4]">
                      <span className="text-green font-black flex-shrink-0 text-xs mt-0.5">✓</span>{f}
                    </li>
                  ))}
                  {p.off.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-[1.4]">
                      <span className="text-border flex-shrink-0">—</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    if (p.tierSlug === 'free') { onStart(); }
                    else { navigate(`/settings?tab=billing&tier=${p.tierSlug}`); }
                  }}
                  className={`block w-full py-3 rounded-lg text-sm font-heading font-black text-center transition-all ${p.btnClass}`}
                >{p.btnText}</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="hero-gradient py-20 px-6 md:px-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 70% 50%, #7a3a7b, transparent)' }} />
        <h2 className="font-heading text-[clamp(36px,4vw,64px)] font-black text-white tracking-tight leading-none mb-4 relative z-10 max-w-[700px] mx-auto">Your dissertation is waiting.</h2>
        <p className="text-lg text-white/60 max-w-[440px] mx-auto mb-9 leading-[1.65] relative z-10">Chapter 1 is free. No card required. Start writing in two minutes.</p>
        <div className="flex gap-3.5 justify-center flex-wrap relative z-10">
          <button onClick={onStart} className="px-9 py-3.5 rounded-lg text-base font-heading font-black bg-white text-primary hover:bg-primary-light hover:-translate-y-0.5 transition-all">Start free — no card needed</button>
          <button onClick={() => goTo('/features')} className="px-8 py-3.5 rounded-lg text-[15px] font-bold bg-transparent text-white border-[1.5px] border-white/35 hover:bg-white/10 hover:border-white/70 transition-all">See all features →</button>
        </div>
      </section>
    </div>
  );
}
