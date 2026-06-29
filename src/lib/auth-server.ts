import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

/** Returns the authenticated user id, or null. */
export async function getUserId(): Promise<string | null> {
  const s = await getSession();
  return s?.user?.id ?? null;
}

/**
 * Resolve the caller's role for a document. Returns null if they have no access.
 * This is the single source of truth for authorization on documents and is
 * enforced on every API route and the WS handshake.
 */
export async function getRoleForDocument(
  userId: string,
  documentId: string,
): Promise<Role | null> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });
  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";
  const m = await db.membership.findUnique({
    where: { userId_documentId: { userId, documentId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

/** Returns a 403 Response if the user lacks one of the allowed roles. */
export async function requireRole(
  documentId: string,
  allowed: Role[],
): Promise<{ userId: string; role: Role } | Response> {
  const userId = await getUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const role = await getRoleForDocument(userId, documentId);
  if (!role || !allowed.includes(role)) {
    return new Response("Forbidden", { status: 403 });
  }
  return { userId, role };
}
