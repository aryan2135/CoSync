import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { getUserId, getRoleForDocument } from "@/lib/auth-server";
import { env } from "@/lib/env";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api";

function base64UrlEncode(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function signCollabToken(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", env.COLLAB_JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();
  if (!userId) return errorResponse("Unauthorized", 401);
  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) return errorResponse("Missing documentId", 400);
  const role = await getRoleForDocument(userId, documentId);
  if (!role) return errorResponse("Forbidden", 403);
  const now = Math.floor(Date.now() / 1000);
  const token = signCollabToken({ userId, documentId, role, iat: now, exp: now + 60 * 60 });
  return successResponse({ token, role });
});
