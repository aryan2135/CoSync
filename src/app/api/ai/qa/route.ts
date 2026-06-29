import { NextRequest } from "next/server";
import { callAI, AINotConfiguredError, isAIEnabled } from "@/lib/ai/provider";
import { loadDocContext } from "@/lib/ai/context-loader";
import { errorResponse, withErrorHandler } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  documentId: z.string().cuid(),
  question: z.string().min(1).max(2000),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const limited = rateLimit(req, 20, 60 * 1000, "ai");
  if (limited) return limited;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid request", 422, "validation_error");
  const [text, err] = await loadDocContext(parsed.data.documentId);
  if (err) return err;
  if (!text.trim()) return errorResponse("Document is empty", 400, "empty_document");
  if (!isAIEnabled()) return errorResponse("AI features are not configured.", 503, "ai_not_configured");
  try {
    const stream = await callAI({
      system: "You answer questions about the user's document. Answer ONLY using information present in the document. If the answer is not in the document, say so explicitly. Be concise.",
      prompt: `Document:\n${text}\n\nQuestion: ${parsed.data.question}`,
      temperature: 0.2, maxTokens: 800,
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  } catch (e) {
    if (e instanceof AINotConfiguredError) return errorResponse(e.message, 503, "ai_not_configured");
    console.error("[ai] qa failed:", e);
    return errorResponse("AI request failed.", 502, "ai_error");
  }
});
