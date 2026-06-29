import { NextRequest } from "next/server";
import { runAI } from "@/lib/ai/context-loader";
import { errorResponse, withErrorHandler } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const limited = rateLimit(req, 20, 60 * 1000, "ai");
  if (limited) return limited;
  const { documentId } = (await req.json().catch(() => ({}))) as { documentId?: string };
  if (!documentId) return errorResponse("Missing documentId", 400);
  return runAI({
    documentId,
    system: "You extract relevant tags/keywords from documents. Respond with a comma-separated list of 5–10 short tags (1–3 words each). No extra commentary.",
    prompt: "Extract tags from this document:\n\n{DOC}",
    temperature: 0.2, maxTokens: 200,
  });
});
