import * as Y from "yjs";
import { base64ToBytes } from "@/lib/crdt/codec";

export function textFromStateB64(stateB64: string | null | undefined): string {
  if (!stateB64) return "";
  try {
    const bytes = base64ToBytes(stateB64);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bytes);
    const fragment = doc.getXmlFragment("default");
    const text = fragment.toString().replace(/<[^>]+>/g, " ").trim();
    doc.destroy();
    return text;
  } catch {
    return "";
  }
}

export function clampContext(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[…truncated…]";
}
