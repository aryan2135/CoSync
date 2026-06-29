import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signUpSchema } from "@/lib/schemas";
import { errorResponse, successResponse, withErrorHandler, zodErrorResponse } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const limited = rateLimit(req, 5, 15 * 60 * 1000, "signup");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON body", 400);
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { name, email, password } = parsed.data;

  const normalized = email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (existing) return errorResponse("An account with this email already exists", 409, "email_taken");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({ data: { name, email: normalized, passwordHash }, select: { id: true, email: true, name: true } });
  return successResponse({ user }, 201);
});
