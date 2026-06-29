import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bufferToBase64 } from "@/lib/crdt/codec";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api";
import { requireInternalSecret } from "@/lib/internal-auth";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const authError = requireInternalSecret(req);
  if (authError) return authError;
  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) return errorResponse("Missing documentId", 400);
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { state: true, stateVector: true, ownerId: true, members: { select: { userId: true } } },
  });
  if (!doc) return errorResponse("Document not found", 404);
  return successResponse({
    state: doc.state ? bufferToBase64(Buffer.from(doc.state)) : null,
    stateVector: doc.stateVector ? bufferToBase64(Buffer.from(doc.stateVector)) : null,
  });
});
