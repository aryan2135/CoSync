import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { persistDocumentState } from "@/lib/repos/document";
import { base64ToBuffer, MAX_DOC_STATE_BYTES } from "@/lib/crdt/codec";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api";
import { requireInternalSecret } from "@/lib/internal-auth";
import { z } from "zod";

const persistSchema = z.object({
  documentId: z.string().cuid(),
  state: z.string(),
  stateVector: z.string(),
  preview: z.string(),
  wordCount: z.number().int().min(0),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const authError = requireInternalSecret(req);
  if (authError) return authError;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = persistSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid payload", 422);
  const state = base64ToBuffer(parsed.data.state);
  if (state.length > MAX_DOC_STATE_BYTES) return errorResponse("Document state exceeds maximum size", 413);
  const exists = await db.document.findUnique({ where: { id: parsed.data.documentId }, select: { id: true } });
  if (!exists) return errorResponse("Document not found", 404);
  await persistDocumentState(parsed.data.documentId, {
    state, stateVector: base64ToBuffer(parsed.data.stateVector),
    preview: parsed.data.preview, wordCount: parsed.data.wordCount,
  });
  return successResponse({ ok: true });
});
