import { NextRequest } from "next/server";
import { callAI, AINotConfiguredError, isAIEnabled } from "@/lib/ai/provider";
import { loadDocContext } from "@/lib/ai/context-loader";
import { errorResponse, withErrorHandler } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  documentId: z.string().cuid(),
  selection: z.string().min(1).max(8000),
  instruction: z.string().max(500).optional(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const limited = rateLimit(req, 20, 60 * 1000, "ai");
  if (limited) return limited;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid request", 422, "validation_error");
  const [, err] = await loadDocContext(parsed.data.documentId);
  if (err) return err;
  if (!isAIEnabled()) return errorResponse("AI features are not configured.", 503, "ai_not_configured");
  const instruction = parsed.data.instruction?.trim() || "Improve clarity, grammar, and flow while preserving the original meaning.";
  try {
    const stream = await callAI({
      system: "You are a professional copy editor. Rewrite the user's text according to their instruction. Output ONLY the rewritten text.",
      prompt: `Instruction: ${instruction}\n\nText to improve:\n${parsed.data.selection}`,
      temperature: 0.4, maxTokens: 1500,
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
  } catch (e) {
    if (e instanceof AINotConfiguredError) return errorResponse(e.message, 503, "ai_not_configured");
    console.error("[ai] improve failed:", e);
    return errorResponse("AI request failed.", 502, "ai_error");
  }
});
