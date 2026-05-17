// PPTX generation for CZAR using pptxgenjs (Deno via npm:).
// Returns a base64 string of the .pptx file. Callers upload it to storage
// and stream a signed URL back to the user.
//
// Palettes ported from Grey LLC universal pptx skill.

import PptxGenJS from "npm:pptxgenjs@3.12.0";

export interface PptxSlideSpec {
  type?: "title" | "section" | "bullets" | "two_column" | "image" | "stat" | "quote" | "table";
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  left?: string[];     // two_column
  right?: string[];    // two_column
  image_data_url?: string; // image | also for any slide as figure
  stat?: string;       // big number, e.g. "87%"
  stat_label?: string;
  quote?: string;
  attribution?: string;
  table?: { headers: string[]; rows: string[][] };
  notes?: string;
}

export interface PptxSpec {
  filename?: string;
  title?: string;
  author?: string;
  palette?: keyof typeof PALETTES | "auto";
  font_heading?: string;
  font_body?: string;
  slides: PptxSlideSpec[];
}

export const PALETTES = {
  midnight_executive: { bg: "1E2761", title: "FFFFFF", body: "CADCFC", accent: "F0A500", muted: "8FA1D9" },
  grey_llc:           { bg: "1A1A1A", title: "FFFFFF", body: "EAEAEA", accent: "FF4500", muted: "AAAAAA" },
  coral_energy:       { bg: "2F3C7E", title: "F9E795", body: "FFFFFF", accent: "F96167", muted: "B7BEDD" },
  forest_moss:        { bg: "2C5F2D", title: "F5F5F5", body: "EFEFEF", accent: "97BC62", muted: "B7C9A4" },
  ocean_gradient:     { bg: "065A82", title: "FFFFFF", body: "E6F0F7", accent: "21295C", muted: "9CC1D6" },
  charcoal_minimal:   { bg: "F2F2F2", title: "212121", body: "36454F", accent: "FF4500", muted: "8A8A8A" },
  clean_white:        { bg: "FFFFFF", title: "1A1A1A", body: "333333", accent: "0057D9", muted: "777777" },
  academic_navy:      { bg: "0B1F3A", title: "FFFFFF", body: "DCE5F2", accent: "F4B400", muted: "8FA0BD" },
  berry_cream:        { bg: "ECE2D0", title: "6D2E46", body: "3E2A33", accent: "A26769", muted: "8B7868" },
  teal_trust:         { bg: "FFFFFF", title: "028090", body: "1F2D2E", accent: "02C39A", muted: "5C7878" },
} as const;

function pickPalette(p?: string): typeof PALETTES[keyof typeof PALETTES] {
  if (p && p !== "auto" && (PALETTES as any)[p]) return (PALETTES as any)[p];
  // Default: academic navy (works for most professional use).
  return PALETTES.academic_navy;
}

export async function buildPptxBase64(spec: PptxSpec): Promise<string> {
  const pal = pickPalette(spec.palette);
  const fontHead = spec.font_heading || "Calibri";
  const fontBody = spec.font_body || "Calibri";

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches
  pres.author = spec.author || "CZAR";
  pres.title = spec.title || "Presentation";

  // Master with bg + footer accent rule.
  pres.defineSlideMaster({
    title: "CZAR_MASTER",
    background: { color: pal.bg },
    objects: [
      { rect: { x: 0, y: 7.30, w: 13.33, h: 0.05, fill: { color: pal.accent } } },
      { text: {
          text: spec.title || "",
          options: { x: 0.5, y: 7.05, w: 12, h: 0.25, fontSize: 9, color: pal.muted, fontFace: fontBody },
      }},
    ],
  });

  for (const s of spec.slides) {
    const slide = pres.addSlide({ masterName: "CZAR_MASTER" });
    const t = s.type || "bullets";

    if (t === "title") {
      slide.addText(s.title || spec.title || "", {
        x: 0.7, y: 2.6, w: 12, h: 1.6, fontSize: 54, bold: true, color: pal.title,
        fontFace: fontHead, align: "left",
      });
      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 0.7, y: 4.2, w: 12, h: 0.8, fontSize: 22, color: pal.body, fontFace: fontBody, align: "left",
        });
      }
      // accent bar
      slide.addShape("rect", { x: 0.7, y: 2.4, w: 1.2, h: 0.08, fill: { color: pal.accent }, line: { color: pal.accent } });

    } else if (t === "section") {
      slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: pal.accent }, line: { color: pal.accent } });
      slide.addText(s.title || "", {
        x: 0.7, y: 3.0, w: 12, h: 1.5, fontSize: 48, bold: true, color: "FFFFFF",
        fontFace: fontHead, align: "left",
      });
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.7, y: 4.4, w: 12, h: 0.6, fontSize: 18, color: "FFFFFFCC", fontFace: fontBody });

    } else if (t === "stat") {
      slide.addText(s.title || "", { x: 0.7, y: 0.5, w: 12, h: 0.6, fontSize: 22, bold: true, color: pal.title, fontFace: fontHead });
      slide.addText(s.stat || "", {
        x: 0.7, y: 1.8, w: 12, h: 3.2, fontSize: 180, bold: true, color: pal.accent, fontFace: fontHead, align: "left",
      });
      if (s.stat_label) slide.addText(s.stat_label, { x: 0.7, y: 5.2, w: 12, h: 0.8, fontSize: 22, color: pal.body, fontFace: fontBody });
      if (s.body) slide.addText(s.body, { x: 0.7, y: 6.0, w: 12, h: 0.9, fontSize: 14, color: pal.muted, fontFace: fontBody });

    } else if (t === "quote") {
      slide.addText(`“${s.quote || ""}”`, {
        x: 1.0, y: 2.2, w: 11.3, h: 3.0, fontSize: 36, italic: true, color: pal.title, fontFace: fontHead, align: "left",
      });
      if (s.attribution) slide.addText(`— ${s.attribution}`, {
        x: 1.0, y: 5.4, w: 11.3, h: 0.6, fontSize: 18, color: pal.accent, fontFace: fontBody,
      });

    } else if (t === "image") {
      slide.addText(s.title || "", { x: 0.5, y: 0.4, w: 12.3, h: 0.6, fontSize: 22, bold: true, color: pal.title, fontFace: fontHead });
      if (s.image_data_url) {
        slide.addImage({ data: s.image_data_url, x: 0.5, y: 1.2, w: 12.3, h: 5.6, sizing: { type: "contain", w: 12.3, h: 5.6 } });
      }
      if (s.body) slide.addText(s.body, { x: 0.5, y: 6.55, w: 12.3, h: 0.4, fontSize: 12, color: pal.muted, fontFace: fontBody, italic: true });

    } else if (t === "two_column") {
      slide.addText(s.title || "", { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: pal.title, fontFace: fontHead });
      slide.addShape("rect", { x: 0.5, y: 1.05, w: 1.0, h: 0.06, fill: { color: pal.accent }, line: { color: pal.accent } });
      const left = s.left || [];
      const right = s.right || [];
      slide.addText(left.map((b) => ({ text: b, options: { bullet: true, color: pal.body, fontFace: fontBody, fontSize: 16, paraSpaceAfter: 8 } })) as any,
        { x: 0.5, y: 1.4, w: 6.0, h: 5.5 });
      slide.addText(right.map((b) => ({ text: b, options: { bullet: true, color: pal.body, fontFace: fontBody, fontSize: 16, paraSpaceAfter: 8 } })) as any,
        { x: 6.8, y: 1.4, w: 6.0, h: 5.5 });

    } else if (t === "table") {
      slide.addText(s.title || "", { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: pal.title, fontFace: fontHead });
      const headers = s.table?.headers || [];
      const rows = s.table?.rows || [];
      const tableData: any[][] = [
        headers.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: pal.accent }, fontFace: fontHead, fontSize: 14 } })),
        ...rows.map((r) => r.map((c) => ({ text: c, options: { color: pal.body, fontFace: fontBody, fontSize: 12 } }))),
      ];
      slide.addTable(tableData, {
        x: 0.5, y: 1.3, w: 12.3, colW: headers.length ? Array(headers.length).fill(12.3 / headers.length) : undefined,
        border: { type: "solid", pt: 1, color: pal.muted },
      });

    } else {
      // bullets (default)
      slide.addText(s.title || "", { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 28, bold: true, color: pal.title, fontFace: fontHead });
      slide.addShape("rect", { x: 0.5, y: 1.05, w: 1.0, h: 0.06, fill: { color: pal.accent }, line: { color: pal.accent } });
      const bullets = s.bullets && s.bullets.length ? s.bullets : (s.body ? [s.body] : []);
      if (bullets.length) {
        slide.addText(bullets.map((b) => ({ text: b, options: { bullet: { code: "25A0" }, color: pal.body, fontFace: fontBody, fontSize: 18, paraSpaceAfter: 10 } })) as any,
          { x: 0.5, y: 1.4, w: 12.3, h: 5.5, valign: "top" });
      }
      if (s.image_data_url) {
        slide.addImage({ data: s.image_data_url, x: 7.5, y: 1.4, w: 5.3, h: 5.3, sizing: { type: "contain", w: 5.3, h: 5.3 } });
      }
    }

    if (s.notes) slide.addNotes(s.notes);
  }

  // pptxgenjs in Deno: write returns a base64 string when outputType="base64".
  const b64 = await pres.write({ outputType: "base64" });
  return b64 as string;
}
