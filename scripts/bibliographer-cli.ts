#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadBibliographerConfig } from "../lib/bibliographer-config.ts";
import {
  extractionRequestSchema,
  modelProviders,
  referenceCategories,
  type ModelProvider,
  type ReferenceCategory,
} from "../lib/historical-references.ts";
import {
  executeBibliographyJob,
  expandBibliographyJobCandidates,
  refreshJobEditorialPresentation,
} from "../lib/job-pipeline.ts";
import { JobStore } from "../lib/job-store.ts";
import { isRetryableJobStatus, type PersistedJob } from "../lib/job-types.ts";
import {
  buildPolicyBraintrustPayload,
  filterHitsByCategories,
  renderPolicyBraintrustMdx,
} from "../lib/policy-braintrust-export.ts";
import {
  renderBibliographyMarkdown,
  timestampWindowUrl,
} from "../lib/markdown-export.ts";
import {
  getYouTubeMetadata,
  planVideoChapters,
} from "../lib/youtube-metadata.ts";
import {
  parseTimeParameter,
  parseTimestampRange,
} from "../lib/youtube-transcript.ts";

export type CliFormat = "json" | "md" | "policy-mdx";

export type ParsedCliArgs = {
  command: "run" | "resume" | "restyle" | "expand" | "export" | "list" | "help";
  target?: string;
  format: CliFormat;
  outPath?: string;
  maxHits?: number;
  softMaxHits?: number;
  maxRuntimeMinutes?: number;
  noLimit: boolean;
  allCandidates: boolean;
  allSections: boolean;
  startSeconds?: number;
  endSeconds?: number;
  includeThumbnails: boolean;
  includeContext: boolean;
  provider?: ModelProvider;
  temperature?: number;
  categories?: ReferenceCategory[];
  focusPrompt?: string;
  title?: string;
  description?: string;
  quiet: boolean;
};

function printHelp() {
  process.stdout.write(`YouTube Video Bibliographer CLI

Usage:
  bibliographer run <youtube-url> [options]
  bibliographer resume <job-id> [options]
  bibliographer expand <job-id> [options]
  bibliographer restyle <job-id> [options]
  bibliographer export <job-id> [options]
  bibliographer list [--format json|md]

Options:
  --format <json|md|policy-mdx>      Output format (default: json; policy-mdx targets ../policy-braintrust)
  --out <path>                       Write formatted output to a file instead of stdout
  --start <time>                     Start timestamp for slicing (e.g. 600, 10m, 00:45:00)
  --end <time>                       Stop timestamp for slicing (e.g. 1800, 30m, 01:15:00)
  --all-candidates                   Verify all extracted candidates (disables 65-hit shortlist cap)
  --all-sections                     Run detected YouTube chapters sequentially into one unified output
  --max-hits <n>                     Hard reference limit for this run
  --soft-max-hits <n>                Soft reference limit for this run
  --max-runtime <minutes>            Runtime budget in minutes
  --no-limit                         Disable hit and runtime caps for full-length extraction
  --provider <auto|agy|codex|gemini> Model provider (default: auto; agy uses Gemini 4 Hydrogen via local Google OAuth; gemini uses GEMINI_API_KEY)
  --temperature <0..2>               Sampling temperature override (applied with Gemini API key mode)
  --categories <a,b,...>             Prioritize & filter categories (${referenceCategories.join(", ")})
  --focus <text>                     Research focus guidance for AI extraction & editorial notes
  --title <text>                     Override title in policy-mdx / json export
  --description <text>               Override description in policy-mdx / json export
  --no-thumbnails                    Skip storyboard thumbnail generation
  --no-context                       Skip editorial narrative and sectioning pass
  --quiet                            Suppress progress output on stderr
  -h, --help                         Show this help message
`);
}

function parsePositiveInt(value: string | undefined, flag: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer.`);
  }
  return parsed;
}

function parseTemperature(value: string | undefined, flag: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
    throw new Error(`${flag} requires a number between 0 and 2.`);
  }
  return parsed;
}

function parseTimestampArg(value: string | undefined, flag: string) {
  const parsed = value ? parseTimeParameter(value) : null;
  if (parsed === null || parsed < 0) {
    throw new Error(
      `${flag} requires a timestamp such as 600, 10m, or 01:15:00.`,
    );
  }
  return Math.floor(parsed);
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const args = [...argv];
  const positional: string[] = [];
  let format: CliFormat = "json";
  let outPath: string | undefined;
  let maxHits: number | undefined;
  let softMaxHits: number | undefined;
  let maxRuntimeMinutes: number | undefined;
  let noLimit = false;
  let allCandidates = false;
  let allSections = false;
  let startSeconds: number | undefined;
  let endSeconds: number | undefined;
  let includeThumbnails = true;
  let includeContext = true;
  let provider: ModelProvider | undefined;
  let temperature: number | undefined;
  let categories: ReferenceCategory[] | undefined;
  let focusPrompt: string | undefined;
  let title: string | undefined;
  let description: string | undefined;
  let quiet = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      return {
        command: "help",
        format,
        noLimit,
        allCandidates,
        allSections,
        includeThumbnails,
        includeContext,
        quiet,
      };
    }
    if (arg === "--format") {
      const value = args[++index];
      if (value !== "json" && value !== "md" && value !== "policy-mdx") {
        throw new Error(`Unsupported --format '${value ?? ""}'.`);
      }
      format = value;
      continue;
    }
    if (arg === "--out") {
      outPath = args[++index];
      if (!outPath) {
        throw new Error("--out requires a file path.");
      }
      continue;
    }
    if (arg === "--max-hits") {
      maxHits = parsePositiveInt(args[++index], "--max-hits");
      continue;
    }
    if (arg === "--soft-max-hits") {
      softMaxHits = parsePositiveInt(args[++index], "--soft-max-hits");
      continue;
    }
    if (arg === "--max-runtime") {
      maxRuntimeMinutes = parsePositiveInt(args[++index], "--max-runtime");
      continue;
    }
    if (arg === "--no-limit") {
      noLimit = true;
      continue;
    }
    if (arg === "--all-candidates") {
      allCandidates = true;
      continue;
    }
    if (arg === "--all-sections") {
      allSections = true;
      continue;
    }
    if (arg === "--start") {
      startSeconds = parseTimestampArg(args[++index], "--start");
      continue;
    }
    if (arg === "--end") {
      endSeconds = parseTimestampArg(args[++index], "--end");
      continue;
    }
    if (arg === "--no-thumbnails") {
      includeThumbnails = false;
      continue;
    }
    if (arg === "--no-context") {
      includeContext = false;
      continue;
    }
    if (arg === "--provider") {
      const value = args[++index];
      if (!value || !modelProviders.includes(value as ModelProvider)) {
        throw new Error(
          `Unsupported --provider '${value ?? ""}'. Expected auto, codex, agy, or gemini.`,
        );
      }
      provider = value as ModelProvider;
      continue;
    }
    if (arg === "--temperature") {
      temperature = parseTemperature(args[++index], "--temperature");
      continue;
    }
    if (arg === "--quiet") {
      quiet = true;
      continue;
    }
    if (arg === "--title") {
      title = args[++index];
      continue;
    }
    if (arg === "--description") {
      description = args[++index];
      continue;
    }
    if (arg === "--categories") {
      const raw = args[++index] ?? "";
      const validSet = new Set<string>(referenceCategories);
      const parsed = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      for (const item of parsed) {
        if (!validSet.has(item)) {
          throw new Error(`Unknown category '${item}'.`);
        }
      }
      categories = parsed as ReferenceCategory[];
      continue;
    }
    if (arg === "--focus") {
      const value = args[++index]?.trim();
      if (!value) {
        throw new Error("--focus requires a prompt.");
      }
      focusPrompt = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option '${arg}'.`);
    }
    positional.push(arg);
  }

  const first = positional[0];
  if (!first) {
    return {
      command: "help",
      format,
      noLimit,
      allCandidates,
      allSections,
      includeThumbnails,
      includeContext,
      quiet,
    };
  }

  if (
    first === "run" ||
    first === "resume" ||
    first === "restyle" ||
    first === "expand" ||
    first === "export" ||
    first === "list"
  ) {
    return {
      command: first,
      target: positional[1],
      format,
      outPath,
      maxHits,
      softMaxHits,
      maxRuntimeMinutes,
      noLimit,
      allCandidates,
      allSections,
      startSeconds,
      endSeconds,
      includeThumbnails,
      includeContext,
      provider,
      temperature,
      categories,
      focusPrompt,
      title,
      description,
      quiet,
    };
  }

  // Convenience: allow passing a YouTube URL directly without "run".
  return {
    command: "run",
    target: first,
    format,
    outPath,
    maxHits,
    softMaxHits,
    maxRuntimeMinutes,
    noLimit,
    allCandidates,
    allSections,
    startSeconds,
    endSeconds,
    includeThumbnails,
    includeContext,
    provider,
    temperature,
    categories,
    focusPrompt,
    title,
    description,
    quiet,
  };
}

function formatOutput(job: PersistedJob, parsed: ParsedCliArgs) {
  const options = {
    categories: parsed.categories,
    title: parsed.title,
    description: parsed.description,
  };

  if (parsed.format === "md") {
    const filtered = filterHitsByCategories(job.hits, parsed.categories);
    return parsed.categories && parsed.categories.length > 0
      ? renderBibliographyMarkdown(
          job.videoUrl,
          job.videoOverview,
          filtered,
          job.sections,
        )
      : (job.markdown ??
          renderBibliographyMarkdown(
            job.videoUrl,
            job.videoOverview,
            filtered,
            job.sections,
          ));
  }

  if (parsed.format === "policy-mdx") {
    return renderPolicyBraintrustMdx(job, options);
  }

  return `${JSON.stringify(buildPolicyBraintrustPayload(job, options), null, 2)}\n`;
}

async function emitOutput(content: string, outPath?: string) {
  if (outPath) {
    const resolved = path.resolve(outPath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
    process.stderr.write(`Wrote output to ${resolved}\n`);
    return;
  }
  process.stdout.write(content);
}

function logProgress(record: PersistedJob, lastMessage: { value: string }) {
  const summary = `[${record.status}] ${record.progress.percent}% (${record.progress.completedChunks}/${record.progress.totalChunks} chunks, ${record.progress.completedSynthesisGroups}/${record.progress.totalSynthesisGroups} verify batches, ${record.hits.length} hits) - ${record.message}`;
  if (summary !== lastMessage.value) {
    lastMessage.value = summary;
    process.stderr.write(`${summary}\n`);
  }
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.command === "help") {
    printHelp();
    return;
  }

  const store = new JobStore();

  if (parsed.command === "list") {
    const jobs = (await store.list()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
    const summaries = jobs.map((record) => store.summary(record));
    if (parsed.format === "json") {
      await emitOutput(
        `${JSON.stringify({ jobs: summaries }, null, 2)}\n`,
        parsed.outPath,
      );
      return;
    }

    const lines = summaries.map(
      (job) =>
        `${job.jobId}  ${job.status.padEnd(10)}  ${String(job.hitCount).padStart(3)} hits  ${job.title ?? job.videoUrl}`,
    );
    await emitOutput(
      lines.length > 0 ? `${lines.join("\n")}\n` : "No saved jobs found.\n",
      parsed.outPath,
    );
    return;
  }

  if (!parsed.target) {
    throw new Error(`Command '${parsed.command}' requires a target argument.`);
  }

  if (parsed.command === "export") {
    const record = await store.read(parsed.target);
    await emitOutput(formatOutput(record, parsed), parsed.outPath);
    return;
  }

  const controller = new AbortController();
  process.on("SIGINT", () => controller.abort());
  process.on("SIGTERM", () => controller.abort());

  if (parsed.command === "restyle") {
    const existing = await store.read(parsed.target);
    if (existing.hits.length === 0) {
      throw new Error(`Job ${existing.jobId} has no saved hits to restyle.`);
    }
    const lastMessage = { value: "" };
    if (!parsed.quiet) {
      process.stderr.write(
        `Refreshing narrative notes & video sections for ${existing.jobId}\n`,
      );
    }
    await refreshJobEditorialPresentation(
      existing.jobId,
      store,
      controller.signal,
      {
        provider: parsed.provider,
        temperature: parsed.temperature,
        onUpdate: (record) => {
          if (!parsed.quiet) {
            logProgress(record, lastMessage);
          }
        },
      },
    );
    const updated = await store.read(existing.jobId);
    await emitOutput(formatOutput(updated, parsed), parsed.outPath);
    return;
  }

  if (parsed.command === "expand") {
    const existing = await store.read(parsed.target);
    const lastMessage = { value: "" };
    if (!parsed.quiet) {
      process.stderr.write(
        `Expanding remaining extracted candidates for ${existing.jobId}\n`,
      );
    }
    await expandBibliographyJobCandidates(
      existing.jobId,
      store,
      controller.signal,
      {
        provider: parsed.provider,
        temperature: parsed.temperature,
        maxRuntimeSeconds: parsed.maxRuntimeMinutes
          ? parsed.maxRuntimeMinutes * 60
          : undefined,
        includeContext: parsed.includeContext,
        onUpdate: (record) => {
          if (!parsed.quiet) {
            logProgress(record, lastMessage);
          }
        },
      },
    );
    const updated = await store.read(existing.jobId);
    await emitOutput(formatOutput(updated, parsed), parsed.outPath);
    return;
  }

  let jobId: string;
  const config = await loadBibliographerConfig();

  let resumeExpansion = false;
  if (parsed.command === "run") {
    const validatedRequest = extractionRequestSchema.parse({
      videoUrl: parsed.target,
      focusPrompt: parsed.focusPrompt,
      targetCategories: parsed.categories,
    });
    const rawUrl = validatedRequest.videoUrl;
    const parsedRange = parseTimestampRange(rawUrl);
    const effectiveStart = parsed.startSeconds ?? parsedRange.startSeconds;
    const effectiveEnd =
      parsed.endSeconds !== undefined
        ? parsed.endSeconds
        : parsedRange.endSeconds;
    const videoUrl =
      parsed.startSeconds !== undefined || parsed.endSeconds !== undefined
        ? timestampWindowUrl(rawUrl, effectiveStart, effectiveEnd)
        : rawUrl;
    let chapterPlan: ReturnType<typeof planVideoChapters>["plannedChapters"] =
      [];
    if (parsed.allSections) {
      try {
        const meta = await getYouTubeMetadata(
          videoUrl,
          config.thumbnails.ytdlpPath,
          controller.signal,
        );
        chapterPlan = planVideoChapters(
          meta.chapters,
          meta.durationSeconds,
        ).plannedChapters;
      } catch {
        chapterPlan = [];
      }
    }
    const created = await store.create(videoUrl, randomUUID(), {
      maxHits: parsed.allCandidates
        ? 500
        : (parsed.maxHits ?? config.processing.maxHits),
      softMaxHits: parsed.allCandidates
        ? 500
        : (parsed.softMaxHits ?? config.processing.softMaxHits),
      tailGraceSeconds: config.processing.tailGraceSeconds,
      maxRuntimeSeconds: parsed.maxRuntimeMinutes
        ? parsed.maxRuntimeMinutes * 60
        : chapterPlan.length > 0
          ? Math.min(4 * 3_600, Math.max(3_600, chapterPlan.length * 1_800))
          : config.processing.maxRuntimeSeconds,
      allowUnlimited: parsed.noLimit || chapterPlan.length > 0,
      includeThumbnails: parsed.includeThumbnails,
      provider: parsed.provider ?? config.llm.provider,
      temperature: parsed.temperature ?? null,
      extractionDepth:
        parsed.allCandidates || parsed.noLimit ? "all" : "curated",
      focusPrompt: validatedRequest.focusPrompt ?? null,
      targetCategories: validatedRequest.targetCategories ?? [],
      processingEndSeconds: effectiveEnd,
      chapterPlan,
    });
    jobId = created.jobId;
    if (!parsed.quiet) {
      process.stderr.write(`Created job ${jobId} for ${videoUrl}\n`);
    }
  } else {
    const existing = await store.read(parsed.target);
    if (!isRetryableJobStatus(existing.status)) {
      throw new Error(
        `Job ${existing.jobId} has status '${existing.status}' and cannot be resumed.`,
      );
    }
    resumeExpansion = Boolean(existing.synthesisByGroup["expand:base"]);
    await store.write({
      ...existing,
      status: "queued",
      phase: "queued",
      message:
        "Resume queued; saved transcript and checkpoints will be reused.",
      error: null,
      cancelRequested: false,
      capReason: null,
      resumeFromSeconds: null,
      resumeUrl: null,
    });
    jobId = existing.jobId;
    if (!parsed.quiet) {
      process.stderr.write(`Resuming job ${jobId} from checkpoint\n`);
    }
  }

  const lastMessage = { value: "" };
  if (resumeExpansion) {
    await expandBibliographyJobCandidates(jobId, store, controller.signal, {
      provider: parsed.provider,
      temperature: parsed.temperature,
      maxRuntimeSeconds: parsed.maxRuntimeMinutes
        ? parsed.maxRuntimeMinutes * 60
        : undefined,
      includeContext: parsed.includeContext,
      onUpdate: (record) => {
        if (!parsed.quiet) {
          logProgress(record, lastMessage);
        }
      },
    });
  } else {
    await executeBibliographyJob(jobId, store, controller.signal, {
      maxHits: parsed.maxHits,
      softMaxHits: parsed.softMaxHits,
      maxRuntimeSeconds: parsed.maxRuntimeMinutes
        ? parsed.maxRuntimeMinutes * 60
        : undefined,
      noLimit: parsed.noLimit,
      includeThumbnails: parsed.includeThumbnails,
      includeContext: parsed.includeContext,
      provider: parsed.provider,
      temperature: parsed.temperature,
      onUpdate: (record) => {
        if (!parsed.quiet) {
          logProgress(record, lastMessage);
        }
      },
    });
  }

  const finalRecord = await store.read(jobId);
  await emitOutput(formatOutput(finalRecord, parsed), parsed.outPath);

  if (finalRecord.status === "failed" || finalRecord.status === "cancelled") {
    process.exitCode = 1;
  }
}

const isEntrypoint =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
