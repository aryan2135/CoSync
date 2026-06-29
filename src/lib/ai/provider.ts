import { env } from "@/lib/env";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type AIProviderName = "zai" | "groq" | "google" | "openrouter" | "together" | "ollama" | "none";

const PROVIDER_DEFAULTS: Record<Exclude<AIProviderName, "none" | "zai">, { baseUrl: string; model: string; label: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", label: "Groq · Llama 3.3 70B" },
  google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-1.5-flash", label: "Google · Gemini 1.5 Flash" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free", label: "OpenRouter · Llama 3.3 70B (free)" },
  together: { baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", label: "Together · Llama 3.3 70B (free)" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1", label: "Ollama · local" },
};

export function getActiveProvider(): AIProviderName {
  return (env.AI_PROVIDER || "zai") as AIProviderName;
}

export function isAIEnabled(): boolean {
  return getActiveProvider() !== "none";
}

export function getModel(): { model: LanguageModel; label: string } | null {
  const name = getActiveProvider();
  if (name === "none" || name === "zai") return null;
  const defaults = PROVIDER_DEFAULTS[name];
  const baseUrl = env.AI_BASE_URL || defaults.baseUrl;
  const apiKey = env.AI_API_KEY || (name === "ollama" ? "ollama" : "");
  if (!apiKey && name !== "ollama") return null;
  const modelId = env.AI_MODEL || defaults.model;
  const provider = createOpenAICompatible({ name, baseURL: baseUrl, apiKey });
  return { model: provider(modelId), label: defaults.label };
}

export async function callAI(opts: { system: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<ReadableStream<Uint8Array>> {
  const name = getActiveProvider();
  if (name === "zai") return callBuiltInAI(opts);
  const mi = getModel();
  if (!mi) throw new AINotConfiguredError(`AI provider "${name}" is not configured.`);
  const { streamText } = await import("ai");
  const result = streamText({
    model: mi.model, system: opts.system, prompt: opts.prompt,
    temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxTokens ?? 1000,
  });
  const stream = result.textStream;
  return stream as unknown as ReadableStream<Uint8Array>;
}

export class AINotConfiguredError extends Error {
  constructor(message: string) { super(message); this.name = "AINotConfiguredError"; }
}

async function callBuiltInAI(opts: { system: string; prompt: string; maxTokens?: number }): Promise<ReadableStream<Uint8Array>> {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    thinking: { type: "disabled" },
  });
  const content = completion.choices[0]?.message?.content ?? "";
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}
