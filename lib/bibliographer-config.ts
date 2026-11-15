import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_SOFT_MAX_HITS,
  DEFAULT_TAIL_GRACE_SECONDS,
} from "./job-policy.ts";
import type { ModelProvider } from "./historical-references.ts";

export const DEFAULT_CHUNK_CHARACTERS = 12_000;
export const DEFAULT_MAX_CANDIDATES_PER_CHUNK = 16;
export const DEFAULT_MAX_HITS = 65;
export const DEFAULT_MAX_RUNTIME_SECONDS = 15 * 60;
export const DEFAULT_VERIFICATION_BATCH_SIZE = 8;
export const MAX_HITS_LIMIT = 500;
export const MAX_RUNTIME_SECONDS_LIMIT = 60 * 60;
export const DEFAULT_CODEX_MODEL = "gpt-6-luna";
export const DEFAULT_AGY_MODEL = "gemini-4-hydrogen";
export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";
export const DEFAULT_TEMPERATURE = 0.15;
export const DEFAULT_EDITORIAL_TEMPERATURE = 1.0;
export const DEFAULT_TOP_K = 40;

export type CodexReasoningEffort = "medium" | "high" | "xhigh" | "max";

export type BibliographerConfig = {
  configPath: string;
  promptPath: string;
  prompt: string;
  processing: {
    reasoningEffort: CodexReasoningEffort;
    candidateReasoningEffort: CodexReasoningEffort;
    synthesisReasoningEffort: CodexReasoningEffort;
    overviewReasoningEffort: CodexReasoningEffort;
    chunkCharacters: number;
    candidateConcurrency: number;
    synthesisConcurrency: number;
    verificationConcurrency: number;
    verificationBatchSize: number;
    maxCandidatesPerChunk: number;
    softMaxHits: number;
    maxHits: number;
    tailGraceSeconds: number;
    maxRuntimeSeconds: number;
  };
  thumbnails: {
    enabled: boolean;
    ytdlpPath: string;
    ffmpegPath: string;
  };
  llm: {
    provider: ModelProvider;
    codexModel: string;
    agyModel: string;
    geminiModel: string;
    temperature: number;
    editorialTemperature: number;
    topK: number;
  };
};

type FlatToml = Record<string, string | number | boolean>;

function parseTomlValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  throw new Error(`Unsupported TOML value: ${trimmed}`);
}

export function parseBibliographerToml(source: string): FlatToml {
  let section = "";
  const values: FlatToml = {};

  for (const [lineNumber, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const sectionMatch = line.match(/^\[([A-Za-z0-9_-]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }

    const assignment = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!assignment) {
      throw new Error(`Invalid TOML assignment on line ${lineNumber + 1}.`);
    }

    const [, key, rawValue] = assignment;
    values[`${section}.${key}`] = parseTomlValue(rawValue);
  }

  return values;
}

function asString(values: FlatToml, key: string, fallback: string) {
  const value = values[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asPositiveInteger(values: FlatToml, key: string, fallback: number) {
  const value = values[key];
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function asBoolean(values: FlatToml, key: string, fallback: boolean) {
  return typeof values[key] === "boolean" ? values[key] : fallback;
}

function asReasoningEffort(
  values: FlatToml,
  key: string,
  fallback: CodexReasoningEffort,
): CodexReasoningEffort {
  const value = asString(values, key, fallback);
  return value === "medium" ||
    value === "high" ||
    value === "xhigh" ||
    value === "max"
    ? value
    : fallback;
}

function asModelProvider(
  values: FlatToml,
  key: string,
  fallback: ModelProvider,
): ModelProvider {
  const value = asString(values, key, fallback);
  return value === "auto" || value === "codex" || value === "gemini"
    ? value
    : fallback;
}

function asNumberInRange(
  values: FlatToml,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = values[key];
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : fallback;
}

export function buildBibliographerConfig(
  values: FlatToml,
  prompt: string,
  configPath: string,
  promptPath: string,
): BibliographerConfig {
  const reasoningEffort = asReasoningEffort(
    values,
    "processing.reasoning_effort",
    "medium",
  );
  const maxHits = Math.min(
    MAX_HITS_LIMIT,
    asPositiveInteger(values, "processing.max_hits", DEFAULT_MAX_HITS),
  );
  const softMaxHits = Math.min(
    maxHits,
    asPositiveInteger(
      values,
      "processing.soft_max_hits",
      DEFAULT_SOFT_MAX_HITS,
    ),
  );

  return {
    configPath,
    promptPath,
    prompt,
    processing: {
      reasoningEffort,
      candidateReasoningEffort: asReasoningEffort(
        values,
        "processing.candidate_reasoning_effort",
        reasoningEffort,
      ),
      synthesisReasoningEffort: asReasoningEffort(
        values,
        "processing.synthesis_reasoning_effort",
        reasoningEffort,
      ),
      overviewReasoningEffort: asReasoningEffort(
        values,
        "processing.overview_reasoning_effort",
        reasoningEffort,
      ),
      chunkCharacters: asPositiveInteger(
        values,
        "processing.chunk_characters",
        DEFAULT_CHUNK_CHARACTERS,
      ),
      candidateConcurrency: asPositiveInteger(
        values,
        "processing.candidate_concurrency",
        3,
      ),
      synthesisConcurrency: asPositiveInteger(
        values,
        "processing.synthesis_concurrency",
        3,
      ),
      verificationConcurrency: asPositiveInteger(
        values,
        "processing.verification_concurrency",
        3,
      ),
      verificationBatchSize: asPositiveInteger(
        values,
        "processing.verification_batch_size",
        DEFAULT_VERIFICATION_BATCH_SIZE,
      ),
      maxCandidatesPerChunk: asPositiveInteger(
        values,
        "processing.max_candidates_per_chunk",
        DEFAULT_MAX_CANDIDATES_PER_CHUNK,
      ),
      maxHits,
      softMaxHits,
      tailGraceSeconds: asPositiveInteger(
        values,
        "processing.tail_grace_seconds",
        DEFAULT_TAIL_GRACE_SECONDS,
      ),
      maxRuntimeSeconds: Math.min(
        MAX_RUNTIME_SECONDS_LIMIT,
        asPositiveInteger(
          values,
          "processing.max_runtime_minutes",
          DEFAULT_MAX_RUNTIME_SECONDS / 60,
        ) * 60,
      ),
    },
    thumbnails: {
      enabled: asBoolean(values, "thumbnails.enabled", true),
      ytdlpPath: asString(values, "thumbnails.ytdlp_path", "yt-dlp"),
      ffmpegPath: asString(values, "thumbnails.ffmpeg_path", "ffmpeg"),
    },
    llm: {
      provider: asModelProvider(values, "llm.provider", "auto"),
      codexModel: asString(values, "llm.codex_model", DEFAULT_CODEX_MODEL),
      agyModel:
        process.env.AGY_MODEL?.trim() ||
        asString(values, "llm.agy_model", DEFAULT_AGY_MODEL),
      geminiModel:
        process.env.GEMINI_MODEL?.trim() ||
        asString(values, "llm.gemini_model", DEFAULT_GEMINI_MODEL),
      temperature: asNumberInRange(
        values,
        "llm.temperature",
        DEFAULT_TEMPERATURE,
        0,
        2,
      ),
      editorialTemperature: asNumberInRange(
        values,
        "llm.editorial_temperature",
        DEFAULT_EDITORIAL_TEMPERATURE,
        0,
        2,
      ),
      topK: asPositiveInteger(values, "llm.top_k", DEFAULT_TOP_K),
    },
  };
}

export async function loadBibliographerConfig(
  projectRoot = process.cwd(),
): Promise<BibliographerConfig & { warnings: string[] }> {
  const configPath =
    process.env.BIBLIOGRAPHER_CONFIG_PATH?.trim() ||
    path.join(projectRoot, "bibliographer.config.toml");
  const warnings: string[] = [];
  let values: FlatToml = {};

  try {
    values = parseBibliographerToml(await readFile(configPath, "utf8"));
  } catch (error) {
    warnings.push(
      `Project configuration could not be loaded; defaults were used (${error instanceof Error ? error.message : "unknown error"}).`,
    );
  }

  const promptPath = path.resolve(
    path.dirname(configPath),
    asString(values, "prompt.file", "DEFAULT_PROMPT.md"),
  );
  let prompt = "";

  try {
    prompt = await readFile(promptPath, "utf8");
  } catch (error) {
    warnings.push(
      `Project prompt could not be loaded; the built-in extraction rules were used (${error instanceof Error ? error.message : "unknown error"}).`,
    );
  }

  return {
    ...buildBibliographerConfig(values, prompt, configPath, promptPath),
    warnings,
  };
}
