import { DEFAULT_AGY_MODEL, isAgyAvailable, runAgyJson } from "./agy.ts";
import type { BibliographerConfig } from "./bibliographer-config.ts";
import { runCodexJson } from "./codex.ts";
import { getGeminiApiKey, runGeminiJson } from "./gemini.ts";
import type { ModelProvider } from "./historical-references.ts";

export type ResolvedModelProvider = "codex" | "agy" | "gemini";

export type RunModelJsonOptions = {
  prompt: string;
  schemaPath: string;
  webSearch?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  reasoningEffort?: string;
  provider?: ModelProvider;
  temperature?: number;
  topK?: number;
  codexModel?: string;
  agyModel?: string;
  geminiModel?: string;
};

export function resolveModelProvider(
  requestedProvider: ModelProvider | undefined,
  configProvider: ModelProvider = "auto",
  geminiConfigured = Boolean(getGeminiApiKey()),
  agyConfigured = isAgyAvailable(),
): ResolvedModelProvider {
  const effective = requestedProvider ?? configProvider;
  if (effective === "codex") {
    return "codex";
  }
  if (effective === "agy") {
    return "agy";
  }
  if (effective === "gemini") {
    return geminiConfigured || !agyConfigured ? "gemini" : "agy";
  }
  if (geminiConfigured) {
    return "gemini";
  }
  if (agyConfigured) {
    return "agy";
  }
  return "codex";
}

export function getLlmCapabilities(config?: BibliographerConfig) {
  const geminiConfigured = Boolean(getGeminiApiKey());
  const agyConfigured = isAgyAvailable();
  return {
    agyConfigured,
    geminiConfigured,
    defaultProvider: resolveModelProvider(
      undefined,
      config?.llm.provider ?? "auto",
      geminiConfigured,
      agyConfigured,
    ),
    codexModel: config?.llm.codexModel ?? "gpt-6-luna",
    agyModel: config?.llm.agyModel ?? DEFAULT_AGY_MODEL,
    geminiModel: config?.llm.geminiModel ?? "gemini-4-hydrogen",
  };
}

export async function runStructuredModelJson({
  prompt,
  schemaPath,
  webSearch = false,
  timeoutMs,
  signal,
  reasoningEffort,
  provider,
  temperature,
  topK,
  codexModel,
  agyModel,
  geminiModel,
}: RunModelJsonOptions): Promise<unknown> {
  const resolved = resolveModelProvider(provider, "auto");
  if (resolved === "gemini") {
    return runGeminiJson({
      prompt,
      model: geminiModel,
      webSearch,
      temperature,
      topK,
      timeoutMs,
      signal,
    });
  }

  if (resolved === "agy") {
    return runAgyJson({
      prompt,
      schemaPath,
      webSearch,
      timeoutMs,
      signal,
      reasoningEffort,
      model: agyModel,
    });
  }

  return runCodexJson({
    prompt,
    schemaPath,
    webSearch,
    timeoutMs,
    signal,
    reasoningEffort,
    model: codexModel,
  });
}
