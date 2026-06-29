import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { createVersionSchema } from "@/lib/schemas";
import { base64ToBuffer } from "@/lib/crdt/codec";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER", "EDITOR", "VIEWER"]);
  if (auth instanceof Response) return auth;
  const versions = await db.documentVersion.findMany({
    where: { documentId: id },
    select: { id: true, label: true, contentText: true, wordCount: true, charCount: true, createdAt: true, createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return successResponse({ versions });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER", "EDITOR"]);
  if (auth instanceof Response) return auth;
  const { userId } = auth;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const MAX_CONTENT = 500_000;
  if (parsed.data.contentText.length > MAX_CONTENT) return errorResponse("Document too large to snapshot", 413);
  const version = await db.documentVersion.create({
    data: {
      documentId: id, createdById: userId, label: parsed.data.label,
      state: new Uint8Array(base64ToBuffer(parsed.data.state)),
      stateVector: new Uint8Array(base64ToBuffer(parsed.data.stateVector)),
      contentText: parsed.data.contentText, contentHtml: parsed.data.contentHtml,
      wordCount: parsed.data.wordCount, charCount: parsed.data.charCount,
    },
    select: { id: true, createdAt: true },
  });
  return successResponse({ version }, 201);
});
