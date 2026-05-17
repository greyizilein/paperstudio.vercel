import { useNavigate } from "react-router-dom";
import { PageHero } from "@/components/firstdraft/PageHero";
import { useState } from "react";

const FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1.5px solid var(--ma-border)",
  background: "var(--ma-bg)",
  color: "var(--ma-text)",
  fontFamily: FONTS.body,
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONTS.body,
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--ma-text-muted)",
  marginBottom: "6px",
};

export default function ContactPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  return (
    <div>
      <PageHero
        title={<>Get in touch.</>}
        subtitle="Have a question, need help, or want to discuss institutional licensing? We're here."
      />
      <section style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <style>{`
          .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
          @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; gap: 48px; } }
          .contact-name-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @media (max-width: 480px) { .contact-name-grid { grid-template-columns: 1fr; } }
          .contact-input:focus { border-color: var(--ma-accent) !important; }
        `}</style>
        <div className="contact-grid">
          <div>
            <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "1.75rem", color: "var(--ma-text)", marginBottom: "24px", letterSpacing: "-0.01em" }}>
              Send us a message
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="contact-name-grid">
                <div>
                  <label style={labelStyle}>First name</label>
                  <input className="contact-input" style={inputStyle} placeholder="Adaeze" />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input className="contact-input" style={inputStyle} placeholder="Okonkwo" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" className="contact-input" style={inputStyle} placeholder="you@university.ac.uk" />
              </div>
              <div>
                <label style={labelStyle}>Topic</label>
                <select
                  className="contact-input"
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option>General question</option>
                  <option>Billing / payment</option>
                  <option>Technical issue</option>
                  <option>Institutional licensing</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  rows={6}
                  className="contact-input"
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Tell us what you need…"
                />
              </div>
              <button
                onClick={() => setSent(true)}
                style={{
                  padding: "14px 28px",
                  borderRadius: "8px",
                  background: sent ? "#4A7A38" : "var(--ma-accent)",
                  color: "#FFFFFF",
                  fontFamily: FONTS.body,
                  fontWeight: 700,
                  fontSize: "1rem",
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                {sent ? "Message sent! We'll reply within 24 hours." : 'Send message →'}
              </button>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 700, fontSize: "1.75rem", color: "var(--ma-text)", marginBottom: "24px", letterSpacing: "-0.01em" }}>
              Other ways to reach us
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { ico: '📧', title: 'Email support', desc: 'xeros.opinion@gmail.com — we reply within 24 hours', accent: false },
                { ico: '⏱️', title: 'Priority support', desc: 'Masters and PhD users receive priority email responses within 12 hours.', accent: false },
              ].map(item => (
                <div
                  key={item.title}
                  style={{
                    padding: "24px",
                    background: "var(--ma-surface)",
                    borderRadius: "12px",
                    border: "1px solid var(--ma-border)",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>{item.ico}</div>
                  <div style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 600, fontSize: "1.05rem", color: "var(--ma-text)", marginBottom: "4px" }}>{item.title}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: "14px", color: "var(--ma-text-muted)" }}>{item.desc}</div>
                </div>
              ))}
              <div
                style={{
                  padding: "24px",
                  background: "rgba(196,56,74,0.06)",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(196,56,74,0.25)",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏫</div>
                <div style={{ fontFamily: FONTS.headline, fontStyle: "italic", fontWeight: 600, fontSize: "1.05rem", color: "var(--ma-accent)", marginBottom: "4px" }}>University partnerships</div>
                <div style={{ fontFamily: FONTS.body, fontSize: "14px", color: "var(--ma-text-muted)" }}>
                  Institutional licensing for your entire student body.{" "}
                  <span
                    onClick={() => navigate('/universities')}
                    style={{ color: "var(--ma-accent)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Learn more →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
