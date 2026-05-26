import { Document, Packer, Paragraph, TextRun, AlignmentType } from "npm:docx";
import { StyleProfile } from "../_shared/style-extractor.ts";

export async function buildDocument(content: string, profile: StyleProfile): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: profile.margins } },
        children: [
          new Paragraph({
            alignment:
              profile.paragraphAlignment === "justify"
                ? AlignmentType.JUSTIFIED
                : profile.paragraphAlignment === "center"
                ? AlignmentType.CENTER
                : profile.paragraphAlignment === "right"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,
            spacing: { line: Math.round(profile.lineSpacing * 240) },
            children: [
              new TextRun({
                text: content,
                font: profile.fontName,
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
