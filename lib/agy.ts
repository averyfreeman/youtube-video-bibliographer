import { spawn } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CodexRunnerError,
  CODEX_CANDIDATE_TIMEOUT_MS,
  CODEX_REASONING_EFFORT,
  parseCodexJson,
} from "./codex.ts";

export const DEFAULT_AGY_MODEL = "gemini-4-hydrogen";
export const MAX_AGY_PROMPT_BYTES = 110_000;

export type RunAgyJsonOptions = {
  prompt: string;
  schemaPath: string;
  webSearch?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  reasoningEffort?: string;
  model?: string;
};

function commandName() {
  return process.env.AGY_CLI_PATH?.trim() || "agy";
}

function isExecutable(filePath: string) {
  try {
    accessSync(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function isAgyAvailable(
  env: Record<string, string | undefined> = process.env,
  homeDir = os.homedir(),
): boolean {
  const configured = env.AGY_CLI_PATH?.trim();
  if (configured) {
    if (configured.includes(path.sep) || configured.startsWith(".")) {
      return isExecutable(path.resolve(configured));
    }
    const pathEntries = (env.PATH ?? "").split(path.delimiter).filter(Boolean);
    return pathEntries.some((entry) =>
      isExecutable(path.join(entry, configured)),
    );
  }

  const candidates = [
    ...(env.PATH ?? "")
      .split(path.delimiter)
      .filter(Boolean)
      .map((entry) => path.join(entry, "agy")),
    path.join(homeDir, ".local", "bin", "agy"),
  ];

  return candidates.some((candidate) => isExecutable(candidate));
}

function agyEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  // Enforce Google OAuth credentials in Antigravity CLI without leaking API keys.
  delete environment.GEMINI_API_KEY;
  delete environment.GOOGLE_API_KEY;
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAPI_API_KEY;
  delete environment.CODEX_API_KEY;
  return environment;
}

function looksLikeAgyAuthFailure(output: string) {
  return /(not logged|log in|login|unauthori[sz]ed|authentication required|re-?authenticate|401|403|oauth)/i.test(
    output,
  );
}

export function resolveAgyModelName(
  baseModel = DEFAULT_AGY_MODEL,
  reasoningEffort: string = CODEX_REASONING_EFFORT,
): string {
  const trimmed = baseModel.trim() || DEFAULT_AGY_MODEL;
  if (/-(?:low|medium|high|xhigh|pro)$/i.test(trimmed)) {
    return trimmed;
  }

  const normalizedEffort = reasoningEffort.trim().toLowerCase();
  if (normalizedEffort === "low") {
    return `${trimmed}-low`;
  }
  if (normalizedEffort === "high") {
    return `${trimmed}-high`;
  }
  if (normalizedEffort === "xhigh" || normalizedEffort === "max") {
    return trimmed === "gemini-4-hydrogen"
      ? `${trimmed}-xhigh`
      : `${trimmed}-high`;
  }
  return `${trimmed}-medium`;
}

export function buildAgyPrompt(prompt: string, webSearch = false): string {
  if (webSearch) {
    return prompt;
  }
  return [
    "Do not run shell commands, read files, inspect directories, or browse the web.",
    "Answer strictly from the supplied text and emit ONLY valid JSON matching the schema.",
    "",
    prompt,
  ].join("\n");
}

function tryParseJsonLine(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of [...lines].reverse()) {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Ignore leading non-JSON CLI warnings.
      }
    }
  }

  return undefined;
}

export function parseAgyJsonOutput(stdout: string, stderr = ""): unknown {
  const envelope = tryParseJsonLine(stdout);
  if (envelope) {
    const status =
      typeof envelope.status === "string" ? envelope.status : undefined;
    const errorMessage =
      typeof envelope.error === "string" ? envelope.error : undefined;

    if (status === "ERROR" || errorMessage) {
      const message =
        errorMessage || "Antigravity CLI reported an execution error.";
      throw new CodexRunnerError(
        looksLikeAgyAuthFailure(`${message}\n${stderr}`) ? "auth" : "failed",
        message,
        stderr,
      );
    }

    if (
      envelope.structured_output !== undefined &&
      envelope.structured_output !== null
    ) {
      return envelope.structured_output;
    }

    if (typeof envelope.response === "string" && envelope.response.trim()) {
      return parseCodexJson(envelope.response);
    }
  }

  return parseCodexJson(stdout);
}

export function runAgyJson({
  prompt,
  schemaPath,
  webSearch = false,
  timeoutMs = CODEX_CANDIDATE_TIMEOUT_MS,
  signal,
  reasoningEffort = CODEX_REASONING_EFFORT,
  model = process.env.AGY_MODEL?.trim() || DEFAULT_AGY_MODEL,
}: RunAgyJsonOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new CodexRunnerError(
          "cancelled",
          "The Antigravity CLI request was cancelled.",
        ),
      );
      return;
    }

    const effectivePrompt = buildAgyPrompt(prompt, webSearch);
    if (Buffer.byteLength(effectivePrompt, "utf8") > MAX_AGY_PROMPT_BYTES) {
      reject(
        new CodexRunnerError(
          "failed",
          "Prompt exceeds the Antigravity CLI command-line length budget.",
        ),
      );
      return;
    }

    const outputSchemaPath = path.resolve(process.cwd(), schemaPath);
    const resolvedModel = resolveAgyModelName(model, reasoningEffort);
    const printTimeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1_000));
    const args = [
      `--print=${effectivePrompt}`,
      "--output-format",
      "json",
      "--json-schema",
      outputSchemaPath,
      "--model",
      resolvedModel,
      "--effort",
      reasoningEffort,
      "--disable-slash-commands",
      "--print-timeout",
      `${printTimeoutSeconds}s`,
    ];

    const child = spawn(commandName(), args, {
      cwd: os.tmpdir(),
      env: agyEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortChild);
      callback();
    };

    const abortChild = () => {
      child.kill("SIGTERM");
      finish(() =>
        reject(
          new CodexRunnerError(
            "cancelled",
            "The Antigravity CLI subprocess was cancelled.",
            stderr,
          ),
        ),
      );
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() =>
        reject(
          new CodexRunnerError(
            "timeout",
            `Antigravity CLI timed out after ${Math.round(timeoutMs / 1_000)} seconds.`,
            stderr,
          ),
        ),
      );
    }, timeoutMs);

    signal?.addEventListener("abort", abortChild, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            new CodexRunnerError(
              "not-found",
              "Antigravity CLI (agy) was not found. Install agy or switch to Codex OAuth.",
              stderr,
            ),
          );
          return;
        }
        reject(
          new CodexRunnerError(
            "failed",
            error.message || "Failed to launch Antigravity CLI.",
            stderr,
          ),
        );
      });
    });

    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          const combined = `${stderr}\n${stdout}`;
          if (looksLikeAgyAuthFailure(combined)) {
            reject(
              new CodexRunnerError(
                "auth",
                "Antigravity CLI is not authenticated. Run `agy` in a terminal to complete Google OAuth login.",
                stderr,
              ),
            );
            return;
          }
          reject(
            new CodexRunnerError(
              "failed",
              stderr.trim() ||
                `Antigravity CLI exited with status ${code ?? "unknown"}.`,
              stderr,
            ),
          );
          return;
        }

        try {
          resolve(parseAgyJsonOutput(stdout, stderr));
        } catch (error) {
          if (error instanceof CodexRunnerError) {
            reject(error);
            return;
          }
          reject(
            new CodexRunnerError(
              "invalid-output",
              error instanceof Error
                ? error.message
                : "Antigravity CLI returned invalid JSON output.",
              stderr,
            ),
          );
        }
      });
    });
  });
}
