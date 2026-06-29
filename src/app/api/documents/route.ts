import { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-server";
import { listDocumentsForUser, createDocument } from "@/lib/repos/document";
import { createDocumentSchema } from "@/lib/schemas";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) return errorResponse("Unauthorized", 401);
  const docs = await listDocumentsForUser(userId);
  return successResponse({ documents: docs });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();
  if (!userId) return errorResponse("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const doc = await createDocument(userId, parsed.data.title);
  return successResponse({ document: { ...doc, members: [], wordCount: 0, preview: "" } }, 201);
});
