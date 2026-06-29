import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard JSON error response. */
export function errorResponse(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { error: message, code: code ?? "error" },
    { status },
  );
}

/** Standard JSON success response. */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Handle a Zod parse failure as a 422 with field-level errors. */
export function zodErrorResponse(e: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      code: "validation_error",
      issues: e.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    },
    { status: 422 },
  );
}

/** Wrap an async API handler with uniform error handling. */
export function withErrorHandler<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return errorResponse(message, 500, "internal_error");
    }
  };
}
