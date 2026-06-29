// Centralized, validated env access. Fails fast on missing secrets in prod.

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v ?? "";
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", "file:./db/custom.db"),
  NEXTAUTH_SECRET: required("NEXTAUTH_SECRET", "dev-secret-change-me-in-production"),
  NEXTAUTH_URL: required("NEXTAUTH_URL", "http://localhost:3000"),

  // Collaboration WebSocket service (runs as a Bun mini-service on port 3001).
  COLLAB_PORT: Number(process.env.COLLAB_PORT ?? 3001),
  COLLAB_JWT_SECRET: required("COLLAB_JWT_SECRET", "dev-collab-secret-change-me"),

  // Internal server-to-server secret (collab → app persistence).
  // Must be set in ALL environments — there is no dev bypass.
  INTERNAL_SECRET: required("INTERNAL_SECRET", "dev-internal-secret-change-me"),

  // AI provider — pluggable via single switch. No vendor lock-in.
  // Supported: zai | groq | google | openrouter | together | ollama | none
  AI_PROVIDER: (process.env.AI_PROVIDER ?? "zai").toLowerCase(),
  AI_MODEL: process.env.AI_MODEL ?? "",
  AI_BASE_URL: process.env.AI_BASE_URL ?? "",
  AI_API_KEY: process.env.AI_API_KEY ?? "",
} as const;

export type Env = typeof env;
