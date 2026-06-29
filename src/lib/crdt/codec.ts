import * as Y from "yjs";

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

export function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function encodeStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

export function extractPreview(doc: Y.Doc): { text: string; wordCount: number } {
  const fragment = doc.getXmlFragment("default");
  const text = fragment.toString().replace(/<[^>]+>/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return { text, wordCount: words };
}

export const MAX_UPDATE_BYTES = 1 * 1024 * 1024;
export const MAX_DOC_STATE_BYTES = 10 * 1024 * 1024;
export const MAX_OPS_PER_SECOND = 30;
