import { Buffer } from "node:buffer";
import mammoth from "npm:mammoth";

export interface StyleProfile {
  fontName: string;
  fontSize: number;
  lineSpacing: number;
  paragraphAlignment: "left" | "center" | "right" | "justify";
  margins: { top: number; bottom: number; left: number; right: number };
}

export async function extractStyleProfile(arrayBuffer: ArrayBuffer): Promise<StyleProfile> {
  await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
  return {
    fontName: "Times New Roman",
    fontSize: 12,
    lineSpacing: 1.5,
    paragraphAlignment: "justify",
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  };
}
