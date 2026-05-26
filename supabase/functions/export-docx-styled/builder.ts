import { Document, Packer, Paragraph, TextRun, AlignmentType } from "npm:docx";
import { StyleProfile } from "../_shared/style-extractor.ts";

export async function buildDocument(content: string, profile: StyleProfile): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment:
              profile.alignment === "justify"
                ? AlignmentType.JUSTIFIED
                : profile.alignment === "center"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            spacing: { line: Math.round(profile.lineSpacing * 240) },
            children: [
              new TextRun({
                text: content,
                font: profile.font,
                size: profile.fontSize * 2,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
