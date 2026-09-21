import { spawn } from "node:child_process";

export const CODEX_MODEL = "gpt-5.6-luna";
export const CODEX_REASONING_EFFORT = "max";
export const CODEX_CANDIDATE_TIMEOUT_MS = 180_000;
export const CODEX_FINAL_TIMEOUT_MS = 300_000;

export type CodexRunnerErrorKind =
  "not-found" | "auth" | "timeout" | "failed" | "invalid-output";

export class CodexRunnerError extends Error {
  readonly kind: CodexRunnerErrorKind;
  readonly stderr: string;

  constructor(kind: CodexRunnerErrorKind, message: string, stderr = "") {
    super(message);
    this.name = "CodexRunnerError";
    this.kind = kind;
    this.stderr = stderr;
  }
}

export type RunCodexJsonOptions = {
  prompt: string;
  schemaPath: string;
  webSearch?: boolean;
  timeoutMs?: number;
};

function commandName() {
  return process.env.CODEX_CLI_PATH?.trim() || "codex";
}

function codexEnvironment() {
  const environment = { ...process.env };

  // Keep OAuth state in CODEX_HOME, but never pass API-key credentials through.
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAPI_API_KEY;
  delete environment.CODEX_API_KEY;

  return environment;
}

function looksLikeAuthFailure(output: string) {
  return /(not logged|log in|login|oauth|unauthori[sz]ed|authentication|401)/i.test(
    output,
  );
}

function parseJsonValue(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (withoutFence !== trimmed) {
      try {
        return JSON.parse(withoutFence) as unknown;
      } catch {
        // Continue to the bounded extraction below.
      }
    }
  }

  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  const objectEnd = trimmed.lastIndexOf("}");
  const arrayEnd = trimmed.lastIndexOf("]");
  const end = Math.max(objectEnd, arrayEnd);

  if (start < 0 || end <= start) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  } catch {
    return undefined;
  }
}

function unwrapCodexEvent(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const event = value as Record<string, unknown>;
  const item = event.item as Record<string, unknown> | undefined;
  const text =
    typeof event.text === "string"
      ? event.text
      : item && typeof item.text === "string"
        ? item.text
        : undefined;

  return text ? parseJsonValue(text) : undefined;
}

export function parseCodexJson(output: string): unknown {
  const directValue = parseJsonValue(output);
  if (directValue !== undefined) {
    return unwrapCodexEvent(directValue) ?? directValue;
  }

  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of [...lines].reverse()) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const value = unwrapCodexEvent(event);
      if (value !== undefined) {
        return value;
      }
    } catch {
      // Non-JSON progress lines are expected from some CLI versions.
    }
  }

  throw new CodexRunnerError(
    "invalid-output",
    "Codex returned no parseable JSON response.",
  );
}

export function runCodexJson({
  prompt,
  schemaPath,
  webSearch = false,
  timeoutMs = CODEX_CANDIDATE_TIMEOUT_MS,
}: RunCodexJsonOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [
      ...(webSearch ? ["--search"] : []),
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--model",
      CODEX_MODEL,
      "--config",
      `model_reasoning_effort=${CODEX_REASONING_EFFORT}`,
      "--output-schema",
      schemaPath,
      "-",
    ];

    const child = spawn(commandName(), args, {
      cwd: process.cwd(),
      env: codexEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
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
      callback();
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() =>
        reject(
          new CodexRunnerError(
            "timeout",
            `Codex did not finish within ${Math.round(timeoutMs / 1000)} seconds.`,
            stderr,
          ),
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.once("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            new CodexRunnerError(
              "not-found",
              `Could not find Codex CLI command '${commandName()}'.`,
              stderr,
            ),
          );
          return;
        }

        reject(new CodexRunnerError("failed", error.message, stderr));
      });
    });

    child.once("close", (code, signal) => {
      finish(() => {
        if (code !== 0) {
          const details =
            stderr.trim() || `Process exited with code ${code ?? "unknown"}.`;
          const kind = looksLikeAuthFailure(details) ? "auth" : "failed";
          reject(new CodexRunnerError(kind, details, stderr));
          return;
        }

        try {
          resolve(parseCodexJson(stdout));
        } catch (error) {
          if (error instanceof CodexRunnerError) {
            reject(error);
            return;
          }

          reject(
            new CodexRunnerError(
              "invalid-output",
              `Codex exited successfully but its response could not be read${signal ? ` (${signal})` : ""}.`,
              stderr,
            ),
          );
        }
      });
    });

    child.stdin.end(prompt);
  });
}
