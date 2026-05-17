import { useNavigate } from "react-router-dom";
import { PageHero } from "@/components/firstdraft/PageHero";
import { useState } from "react";

export default function ContactPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  return (
    <div>
      <PageHero title={<>Get in touch.</>} subtitle="Have a question, need help, or want to discuss institutional licensing? We're here." />
      <section className="py-[100px] px-6 md:px-20 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="font-heading text-[28px] font-black text-foreground mb-6 tracking-tight">Send us a message</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[13px] font-bold text-foreground block mb-1.5">First name</label><input className="w-full px-4 py-3 rounded-lg border-[1.5px] border-border text-[15px] outline-none focus:border-primary transition-colors" placeholder="Adaeze" /></div>
                <div><label className="text-[13px] font-bold text-foreground block mb-1.5">Last name</label><input className="w-full px-4 py-3 rounded-lg border-[1.5px] border-border text-[15px] outline-none focus:border-primary transition-colors" placeholder="Okonkwo" /></div>
              </div>
              <div><label className="text-[13px] font-bold text-foreground block mb-1.5">Email</label><input type="email" className="w-full px-4 py-3 rounded-lg border-[1.5px] border-border text-[15px] outline-none focus:border-primary transition-colors" placeholder="you@university.ac.uk" /></div>
              <div><label className="text-[13px] font-bold text-foreground block mb-1.5">Topic</label><select className="w-full px-4 py-3 rounded-lg border-[1.5px] border-border text-[15px] outline-none bg-white focus:border-primary"><option>General question</option><option>Billing / payment</option><option>Technical issue</option><option>Institutional licensing</option></select></div>
              <div><label className="text-[13px] font-bold text-foreground block mb-1.5">Message</label><textarea rows={6} className="w-full px-4 py-3 rounded-lg border-[1.5px] border-border text-[15px] outline-none resize-y focus:border-primary transition-colors" placeholder="Tell us what you need…" /></div>
              <button onClick={() => setSent(true)} className={`px-7 py-3.5 rounded-lg text-base font-heading font-black text-white transition-colors ${sent ? 'bg-green' : 'bg-primary hover:bg-primary-dark'}`}>
                {sent ? "Message sent! We'll reply to your email within 24 hours." : 'Send message →'}
              </button>
            </div>
          </div>
          <div>
            <h2 className="font-heading text-[28px] font-black text-foreground mb-6 tracking-tight">Other ways to reach us</h2>
            <div className="space-y-5">
              <div className="p-6 bg-surface-light rounded-xl border border-border">
                <div className="text-2xl mb-2">📧</div>
                <div className="font-heading font-extrabold text-foreground mb-1">Email support</div>
                <div className="text-sm text-muted-foreground">xeros.opinion@gmail.com — we reply within 24 hours</div>
              </div>
              <div className="p-6 bg-surface-light rounded-xl border border-border">
                <div className="text-2xl mb-2">⏱️</div>
                <div className="font-heading font-extrabold text-foreground mb-1">Priority support</div>
                <div className="text-sm text-muted-foreground">Masters and PhD users receive priority email responses within 12 hours.</div>
              </div>
              <div className="p-6 bg-primary-pale rounded-xl border-[1.5px] border-primary-light">
                <div className="text-2xl mb-2">🏫</div>
                <div className="font-heading font-extrabold text-primary mb-1">University partnerships</div>
                <div className="text-sm text-primary-mid">Institutional licensing for your entire student body. <a onClick={() => navigate('/universities')} className="text-primary font-bold cursor-pointer">Learn more →</a></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
