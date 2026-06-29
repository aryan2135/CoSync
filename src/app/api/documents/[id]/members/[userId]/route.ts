import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { updateMemberRoleSchema } from "@/lib/schemas";
import { addMember, removeMember } from "@/lib/repos/document";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) => {
  const { id, userId } = await params;
  const auth = await requireRole(id, ["OWNER"]);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const doc = await db.document.findUnique({ where: { id }, select: { ownerId: true } });
  if (!doc) return errorResponse("Document not found", 404);
  if (doc.ownerId === userId) return errorResponse("Cannot change the owner's role", 400);
  const membership = await addMember(id, userId, parsed.data.role);
  return successResponse({ membership });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) => {
  const { id, userId } = await params;
  const auth = await requireRole(id, ["OWNER"]);
  if (auth instanceof Response) return auth;
  const doc = await db.document.findUnique({ where: { id }, select: { ownerId: true } });
  if (!doc) return errorResponse("Document not found", 404);
  if (doc.ownerId === userId) return errorResponse("Cannot remove the owner", 400);
  try { await removeMember(id, userId); } catch { /* idempotent */ }
  return successResponse({ ok: true });
});
