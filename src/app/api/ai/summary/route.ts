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
    system: "You are an expert editor. Produce a concise, faithful summary of the user's document. Use bullet points if helpful. Never invent facts.",
    prompt: "Summarize this document in 5–8 sentences:\n\n{DOC}",
    temperature: 0.3, maxTokens: 600,
  });
});
