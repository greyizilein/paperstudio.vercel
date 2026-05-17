import { motion } from "framer-motion";

const DA_FONTS = {
  headline: '"Fraunces", "Playfair Display", Georgia, serif',
  body: '"Geist", system-ui, sans-serif',
};

const features = [
  {
    title: "Chapter-by-chapter structure",
    description: "Every project gets a canonical outline — Introduction through Conclusion — with word targets, frameworks, and section logic locked in from the start.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="3" rx="1.5" fill="#C4384A" />
        <rect x="3" y="9" width="14" height="2" rx="1" fill="#C4384A" fillOpacity="0.55" />
        <rect x="3" y="13" width="16" height="2" rx="1" fill="#C4384A" fillOpacity="0.4" />
        <rect x="3" y="17" width="11" height="2" rx="1" fill="#C4384A" fillOpacity="0.3" />
        <path d="M19 15 L22 18 L19 21" stroke="#B89A5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    title: "Real citations (APA / Harvard / MLA)",
    description: "12 citation styles, verifiable references, hanging-indent reference lists. Citations are woven into prose — not appended as an afterthought.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 4 C6 4, 4 6, 4 9 C4 11 5.5 12 7 12 C8.5 12 10 11 10 9 C10 7 8.5 6 7 6" stroke="#B89A5A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M14 4 C14 4, 12 6, 12 9 C12 11 13.5 12 15 12 C16.5 12 18 11 18 9 C18 7 16.5 6 15 6" stroke="#B89A5A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M4 16 L20 16 M4 19 L16 19" stroke="#C4384A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "AI that writes like an academic",
    description: "Argument-driven paragraphs with transitions, hedging language, discipline-appropriate register, and supervisor-friendly critical analysis.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 C7 3, 3 6.5, 3 11 C3 14.5, 5.5 17.5, 9 18.7 L9 21 L12 19.5 L15 21 L15 18.7 C18.5 17.5, 21 14.5, 21 11 C21 6.5 17 3 12 3Z" stroke="#C4384A" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        <path d="M9 11 L11 13 L15 9" stroke="#B89A5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Export to .docx instantly",
    description: "Title page, table of contents, formatted body, appendices, and a hanging-indent reference list — all in one .docx ready for submission.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="#C4384A" strokeWidth="1.5" fill="none" />
        <path d="M14 2 L20 8 L20 22 L8 22 L8 18" stroke="#C4384A" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M14 2 L14 8 L20 8" stroke="#C4384A" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M10 13 L10 17 M8 15 L12 15" stroke="#B89A5A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "CZAR AI research assistant",
    description: "Ask CZAR anything about your project — gap analysis, source recommendations, argument testing, inline rewrites. Your second author, always available.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 3 C14 5, 11 8, 10 12 C9.5 14.5, 9.5 17, 10 19 L11.5 19 C12 17, 13 15, 14.5 13 C16.5 10.5, 18.5 8, 19.5 5.5 C20 4.5, 19.5 3, 18 3Z" fill="#C4384A" fillOpacity="0.7" />
        <path d="M17 5.5 C14.5 8, 12.5 11, 11 17" stroke="rgba(14,12,8,0.4)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
        <path d="M10 19 L11.5 19 L10.5 22Z" fill="#C4384A" fillOpacity="0.7" />
        <circle cx="10.5" cy="22.2" r="0.6" fill="#C4384A" fillOpacity="0.7" />
        <path d="M5 20 C8 18.5, 12 21, 17 19.5" stroke="#B89A5A" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    title: "Plagiarism-conscious writing",
    description: "The 3-layer Humaniser brings AI detection scores below 10% without dulling your argument. Original synthesis, not paraphrased sources.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="#4A7A38" strokeWidth="1.5" fill="none" />
        <path d="M8 12 L11 15 L16 9" stroke="#4A7A38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3 L12 1 M21 12 L23 12 M12 21 L12 23 M3 12 L1 12" stroke="#4A7A38" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export const FeaturesSection = () => (
  <section
    id="features-section"
    style={{ background: "#0E0C08", padding: "96px 0 112px" }}
  >
    <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", marginBottom: "72px" }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: DA_FONTS.body,
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#B89A5A",
            marginBottom: "16px",
          }}
        >
          Built for academic depth
        </span>
        <h2
          style={{
            fontFamily: DA_FONTS.headline,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
            color: "#E8DFC8",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Everything you need to finish your thesis
        </h2>
        <p
          style={{
            marginTop: "18px",
            fontFamily: DA_FONTS.body,
            fontSize: "1.05rem",
            color: "#8A7A62",
            maxWidth: "520px",
            margin: "18px auto 0",
            lineHeight: 1.65,
          }}
        >
          Not a chatbot. A structured academic writing engine built around how dissertations actually work.
        </p>
      </motion.div>

      {/* 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            style={{
              background: "#1A160E",
              border: "1px solid rgba(232,223,200,0.08)",
              borderRadius: "16px",
              padding: "28px 28px 30px",
              cursor: "default",
              transition: "border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
            }}
            whileHover={{
              borderColor: "rgba(232,223,200,0.18)",
              y: -2,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(196,56,74,0.08)",
                border: "1px solid rgba(196,56,74,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              {feature.icon}
            </div>

            {/* Title */}
            <h3
              style={{
                fontFamily: DA_FONTS.headline,
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "1.15rem",
                color: "#E8DFC8",
                margin: "0 0 10px",
                lineHeight: 1.25,
              }}
            >
              {feature.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontFamily: DA_FONTS.body,
                fontSize: "0.875rem",
                color: "#8A7A62",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
