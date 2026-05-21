-- Full CMS seed: all editable sections across all pages
-- Uses INSERT ... ON CONFLICT DO NOTHING so existing data is preserved

INSERT INTO public.site_content (page, section, content) VALUES

-- Landing page
('landing', 'hero_headline',     '{"text": "Write your dissertation. Finally."}'),
('landing', 'hero_cta_primary',  '{"text": "Start writing free"}'),
('landing', 'hero_cta_secondary','{"text": "Watch demo →"}'),
('landing', 'hero_stats',        '{"items": [{"value": "12,000+", "label": "students"}, {"value": "98%", "label": "on-time submissions"}, {"value": "4.9/5", "label": "average rating"}]}'),
('landing', 'features_headline', '{"text": "Everything you need to write your best work."}'),
('landing', 'features_items',    '{"items": [{"icon": "BookOpen", "title": "AI-Powered Writing", "description": "CZAR generates academic content calibrated to your level and citation style."}, {"icon": "FileText", "title": "Chapter Management", "description": "Organise your dissertation by chapter with real-time word counts and progress tracking."}, {"icon": "Download", "title": "Professional Export", "description": "Download perfectly formatted .docx files with cover page, references, and appendices."}]}'),
('landing', 'social_proof_headline', '{"text": "Trusted by thousands of students worldwide."}'),
('landing', 'testimonials',      '{"items": [{"name": "Sarah K.", "role": "PhD Candidate, UCL", "text": "PaperStudio cut my dissertation writing time in half. The citations are always accurate.", "avatar": ""}, {"name": "James M.", "role": "MSc Student, Edinburgh", "text": "Finally an AI that understands academic writing. My supervisor was impressed.", "avatar": ""}, {"name": "Amara O.", "role": "Undergraduate, Lagos", "text": "The CZAR agent wrote my entire literature review chapter overnight.", "avatar": ""}]}'),
('landing', 'announcement_banner', '{"text": "", "active": false, "type": "info"}'),

-- Pricing page
('pricing', 'intro_headline',    '{"text": "Simple, honest pricing."}'),
('pricing', 'faq_items',         '{"items": [{"q": "What counts as a word?", "a": "Every word CZAR generates counts toward your monthly limit. Your own edits do not count."}, {"q": "Can I upgrade or downgrade?", "a": "Yes — changes take effect immediately and your remaining balance is prorated."}, {"q": "Is my data private?", "a": "Yes. Your documents and conversations are never used to train AI models."}, {"q": "What citation styles are supported?", "a": "Harvard, APA 7th, Chicago Author-Date, Vancouver, and IEEE — with more coming soon."}]}'),

-- Help page
('help', 'hero_headline',        '{"text": "How can we help?"}'),
('help', 'faq_items',            '{"items": [{"q": "How do I get started?", "a": "Sign up for a free account and you''ll receive 3,000 words to try CZAR immediately."}, {"q": "How do I export my work?", "a": "Use the Export button in the editor toolbar. Your document downloads as a .docx file."}, {"q": "What is CZAR?", "a": "CZAR is PaperStudio''s AI writing engine. It has four modes: Chat, Plan, Build, and Agent."}, {"q": "Can I use my own sources?", "a": "Yes — upload PDFs or paste text and CZAR will cite them correctly in your chosen style."}]}'),

-- How It Works page
('how-it-works', 'hero_headline', '{"text": "From brief to dissertation in four steps."}'),
('how-it-works', 'steps',        '{"items": [{"number": "01", "title": "Upload your brief", "description": "Paste your assignment instructions or upload a PDF. CZAR reads and understands your requirements."}, {"number": "02", "title": "Review the plan", "description": "CZAR drafts a structured outline — sections, sources, approach. Approve or refine before writing starts."}, {"number": "03", "title": "Watch it write", "description": "CZAR writes chapter by chapter, adding citations, tables, and figures as it goes."}, {"number": "04", "title": "Download and submit", "description": "Export a fully formatted .docx with cover page, table of contents, references, and appendices."}]}'),

-- Global
('global', 'site_name',          '{"text": "PaperStudio"}'),
('global', 'footer_tagline',     '{"text": "Academic writing, elevated."}'),
('global', 'contact_email',      '{"text": "support@paperstudio.dev"}'),
('global', 'maintenance_mode',   '{"active": false, "message": "We''re upgrading PaperStudio. Back shortly."}')

ON CONFLICT (page, section) DO NOTHING;
