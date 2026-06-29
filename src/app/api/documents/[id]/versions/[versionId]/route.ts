import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { bufferToBase64 } from "@/lib/crdt/codec";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api";

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) => {
  const { id, versionId } = await params;
  const auth = await requireRole(id, ["OWNER", "EDITOR", "VIEWER"]);
  if (auth instanceof Response) return auth;
  const version = await db.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
    select: { id: true, label: true, contentText: true, contentHtml: true, wordCount: true, charCount: true, createdAt: true, state: true, stateVector: true, createdBy: { select: { id: true, name: true, email: true } } },
  });
  if (!version) return errorResponse("Version not found", 404);
  return successResponse({
    version: {
      id: version.id, label: version.label, contentText: version.contentText, contentHtml: version.contentHtml,
      wordCount: version.wordCount, charCount: version.charCount, createdAt: version.createdAt,
      state: bufferToBase64(Buffer.from(version.state)), stateVector: bufferToBase64(Buffer.from(version.stateVector)),
      createdBy: version.createdBy,
    },
  });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) => {
  const { id, versionId } = await params;
  const auth = await requireRole(id, ["OWNER"]);
  if (auth instanceof Response) return auth;
  await db.documentVersion.deleteMany({ where: { id: versionId, documentId: id } });
  return successResponse({ ok: true });
});
