import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { textFromStateB64, clampContext } from "@/lib/ai/document-context";
import { errorResponse } from "@/lib/api";
import { callAI, AINotConfiguredError, isAIEnabled } from "@/lib/ai/provider";

export async function loadDocContext(documentId: string): Promise<[string, null] | [null, Response]> {
  const auth = await requireRole(documentId, ["OWNER", "EDITOR", "VIEWER"]);
  if (auth instanceof Response) return [null, auth];
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { state: true, preview: true },
  });
  if (!doc) return [null, errorResponse("Document not found", 404)];
  const text = textFromStateB64(doc.state ? Buffer.from(doc.state).toString("base64") : null) || doc.preview || "";
  return [clampContext(text), null];
}

export async function runAI(opts: {
  documentId: string;
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<Response> {
  if (!isAIEnabled()) {
    return errorResponse("AI features are not configured. Set AI_PROVIDER in .env to enable.", 503, "ai_not_configured");
  }
  const [text, err] = await loadDocContext(opts.documentId);
  if (err) return err;
  if (!text.trim()) return errorResponse("Document is empty", 400, "empty_document");
  const finalPrompt = opts.prompt.replace("{DOC}", text);
  try {
    const stream = await callAI({
      system: opts.system, prompt: finalPrompt,
      temperature: opts.temperature, maxTokens: opts.maxTokens,
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    if (e instanceof AINotConfiguredError) return errorResponse(e.message, 503, "ai_not_configured");
    console.error("[ai] call failed:", e);
    return errorResponse("AI request failed. Please try again.", 502, "ai_error");
  }
}
