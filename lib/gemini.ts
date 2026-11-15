import {
  CodexRunnerError,
  CODEX_CANDIDATE_TIMEOUT_MS,
  parseCodexJson,
} from "./codex.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export type RunGeminiJsonOptions = {
  prompt: string;
  model?: string;
  apiKey?: string;
  webSearch?: boolean;
  temperature?: number;
  topK?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

export function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  );
}

export function buildGeminiRequestBody({
  prompt,
  webSearch = false,
  temperature,
  topK,
}: {
  prompt: string;
  webSearch?: boolean;
  temperature?: number;
  topK?: number;
}) {
  const generationConfig: Record<string, unknown> = {};
  if (typeof temperature === "number" && Number.isFinite(temperature)) {
    generationConfig.temperature = temperature;
  }
  if (typeof topK === "number" && Number.isInteger(topK) && topK > 0) {
    generationConfig.topK = topK;
  }
  if (!webSearch) {
    generationConfig.responseMimeType = "application/json";
  }

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    ...(webSearch ? { tools: [{ google_search: {} }] } : {}),
  };
}

export function extractGeminiResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new CodexRunnerError(
      "invalid-output",
      "Gemini returned an empty or non-object response.",
    );
  }

  const record = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };

  if (record.error?.message) {
    throw new CodexRunnerError("failed", record.error.message);
  }

  const text = (record.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    const reason =
      record.promptFeedback?.blockReason ??
      record.candidates?.[0]?.finishReason ??
      "empty response";
    throw new CodexRunnerError(
      "invalid-output",
      `Gemini returned no text output (${reason}).`,
    );
  }

  return text;
}

export async function runGeminiJson({
  prompt,
  model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  apiKey = getGeminiApiKey(),
  webSearch = false,
  temperature,
  topK,
  timeoutMs = CODEX_CANDIDATE_TIMEOUT_MS,
  signal,
  fetchImpl = fetch,
}: RunGeminiJsonOptions): Promise<unknown> {
  if (!apiKey) {
    throw new CodexRunnerError(
      "auth",
      "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY or switch the provider to Codex OAuth.",
    );
  }

  if (signal?.aborted) {
    throw new CodexRunnerError(
      "cancelled",
      "The Gemini request was cancelled.",
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(
        buildGeminiRequestBody({ prompt, webSearch, temperature, topK }),
      ),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 400);
      if (response.status === 401 || response.status === 403) {
        throw new CodexRunnerError(
          "auth",
          `Gemini authentication failed (${response.status}): ${errorText}`,
        );
      }
      throw new CodexRunnerError(
        "failed",
        `Gemini API request failed (${response.status}): ${errorText}`,
      );
    }

    const payload: unknown = await response.json();
    const text = extractGeminiResponseText(payload);
    return parseCodexJson(text);
  } catch (error) {
    if (error instanceof CodexRunnerError) {
      throw error;
    }
    if (timedOut) {
      throw new CodexRunnerError(
        "timeout",
        `Gemini did not finish within ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }
    if (signal?.aborted) {
      throw new CodexRunnerError(
        "cancelled",
        "The Gemini request was cancelled.",
      );
    }
    throw new CodexRunnerError(
      "failed",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
