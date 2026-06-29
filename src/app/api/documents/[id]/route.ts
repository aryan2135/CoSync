import { NextRequest } from "next/server";
import { getUserId, requireRole } from "@/lib/auth-server";
import { getDocumentForUser, updateDocumentMeta, archiveDocument } from "@/lib/repos/document";
import { updateDocumentMetaSchema } from "@/lib/schemas";
import { bufferToBase64 } from "@/lib/crdt/codec";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getUserId();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const doc = await getDocumentForUser(userId, id);
  if (!doc) return errorResponse("Document not found", 404);
  return successResponse({
    document: {
      id: doc.id, title: doc.title, preview: doc.preview, wordCount: doc.wordCount,
      createdAt: doc.createdAt, updatedAt: doc.updatedAt, ownerId: doc.ownerId,
      state: doc.state ? bufferToBase64(Buffer.from(doc.state)) : null,
      stateVector: doc.stateVector ? bufferToBase64(Buffer.from(doc.stateVector)) : null,
      owner: doc.owner,
      members: doc.members.map((m) => ({ userId: m.userId, role: m.role, user: m.user })),
      myRole: doc.ownerId === userId ? "OWNER" : doc.members.find((m) => m.userId === userId)?.role ?? null,
    },
  });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER", "EDITOR"]);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = updateDocumentMetaSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const doc = await updateDocumentMeta(id, parsed.data.title);
  return successResponse({ document: doc });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER"]);
  if (auth instanceof Response) return auth;
  await archiveDocument(id);
  return successResponse({ ok: true });
});
