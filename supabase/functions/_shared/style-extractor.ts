import { JSZip } from "https://esm.sh/jszip@3.10.1";

export interface StyleProfile {
  font: string;
  fontSize: number;
  lineSpacing: number;
  alignment: "left" | "center" | "justify";
}

export async function extractStyleFromDocx(arrayBuffer: ArrayBuffer): Promise<StyleProfile> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const stylesXml = await zip.file("word/styles.xml")?.async("string");

  const fontSizeMatch = stylesXml?.match(/<w:sz w:val="(\d+)"\/>/);
  const fontMatch = stylesXml?.match(/<w:ascii w:val="([^"]+)"\/>/);

  return {
    font: fontMatch ? fontMatch[1] : "Times New Roman",
    fontSize: fontSizeMatch ? parseInt(fontSizeMatch[1]) / 2 : 12,
    lineSpacing: 1.5,
    alignment: "justify",
  };
}
