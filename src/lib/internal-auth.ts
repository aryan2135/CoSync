import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { errorResponse } from "@/lib/api";

/**
 * Service-to-service authentication for internal endpoints.
 * The collab service authenticates via a shared secret in the
 * `x-internal-secret` header. Enforced in ALL environments — no dev bypass.
 */
export function requireInternalSecret(req: NextRequest): Response | null {
  const provided = req.headers.get("x-internal-secret");
  const expected = env.INTERNAL_SECRET;
  if (!expected) {
    console.error("[internal-auth] INTERNAL_SECRET not configured — refusing request");
    return errorResponse("Internal auth not configured", 503, "internal_auth_missing");
  }
  if (!provided || provided !== expected) {
    return errorResponse("Forbidden", 403, "internal_auth_failed");
  }
  return null;
}
