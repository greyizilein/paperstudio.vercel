// Tiny ZIP builder shared between batch image generation and any future
// bulk-export use case. Pure function — accepts files, returns base64 ZIP.
// Implements stored (no-compression) ZIP entries with CRC32 — sufficient
// for PNG payloads which compress poorly anyway.

import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

export interface ZipFile {
  filename: string;
  data: Uint8Array;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function buildZipBase64(rawFiles: ZipFile[]): string {
  const enc = new TextEncoder();
  const files = rawFiles.map((f) => ({ name: enc.encode(f.filename), data: f.data }));

  const zipParts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const fileCrc = crc32(file.data);

    const header = new Uint8Array(30 + file.name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, fileCrc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, file.name.length, true);
    view.setUint16(28, 0, true);
    header.set(file.name, 30);

    const cdEntry = new Uint8Array(46 + file.name.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, fileCrc, true);
    cdView.setUint32(20, file.data.length, true);
    cdView.setUint32(24, file.data.length, true);
    cdView.setUint16(28, file.name.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cdEntry.set(file.name, 46);

    zipParts.push(header);
    zipParts.push(file.data);
    centralDir.push(cdEntry);
    offset += header.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) {
    zipParts.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  eocdView.setUint16(20, 0, true);
  zipParts.push(eocd);

  const totalLen = zipParts.reduce((s, p) => s + p.length, 0);
  const zipBuffer = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of zipParts) {
    zipBuffer.set(part, pos);
    pos += part.length;
  }

  return base64Encode(zipBuffer.buffer as ArrayBuffer);
}
