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
    system: "You suggest concise, engaging document titles. Respond with exactly 3 alternatives, one per line, numbered 1. 2. 3. No extra commentary.",
    prompt: "Suggest 3 titles for this document:\n\n{DOC}",
    temperature: 0.6, maxTokens: 200,
  });
});
