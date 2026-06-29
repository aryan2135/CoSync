import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-server";
import { addMemberSchema } from "@/lib/schemas";
import { addMember, listMembers } from "@/lib/repos/document";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER", "EDITOR", "VIEWER"]);
  if (auth instanceof Response) return auth;
  const members = await listMembers(id);
  return successResponse({ members });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const auth = await requireRole(id, ["OWNER"]);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const target = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!target) return errorResponse("No user found with that email. Ask them to sign up first.", 404, "user_not_found");
  const doc = await db.document.findUnique({ where: { id }, select: { ownerId: true } });
  if (doc?.ownerId === target.id) return errorResponse("Cannot change the owner's role", 400);
  const membership = await addMember(id, target.id, parsed.data.role);
  return successResponse({ membership }, 201);
});
