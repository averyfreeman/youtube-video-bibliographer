import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  loadBibliographerConfig,
  type CodexReasoningEffort,
} from "../lib/bibliographer-config.ts";
import { parseCodexJson, runCodexJson } from "../lib/codex.ts";
import {
  historicalCandidatesSchema,
  historicalReferencesSchema,
} from "../lib/historical-references.ts";
import { deduplicateCandidates, deduplicateHits } from "../lib/job-pipeline.ts";
import { filterMeaningfulPhrases } from "../lib/phrase-curation.ts";
import {
  chunkTranscript,
  type YouTubeTranscript,
} from "../lib/youtube-transcript.ts";

const efforts: CodexReasoningEffort[] = ["medium", "high", "max"];
const defaultTranscriptPath = path.join(
  process.cwd(),
  "benchmarks",
  "fixtures",
  "benchmark-transcript.json",
);

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function extractionPrompt(prompt: string, text: string) {
  return `${prompt}

Benchmark the compact extraction contract. Return only meaningful multi-word historical phrases supported by this transcript. Exclude single words, introductions, metadata, and generic restatements. Return the JSON object required by the candidate schema.

TRANSCRIPT
----------
${text}`;
}

function synthesisPrompt(
  prompt: string,
  videoUrl: string,
  candidates: unknown,
) {
  return `${prompt}

Benchmark the compact synthesis contract. Deduplicate the supplied candidates, keep only their supplied titles, and return a concise JSON result with no more than 40 hits. Do not use web search for this local benchmark and do not add a new title.
For each retained hit, set speaker to null when the local benchmark does not establish attribution and provide one concise discussionContextParagraph based on the supplied evidence. Keep analysisParagraphs focused on historical significance.

Source video: ${videoUrl}
SUPPLIED CANDIDATES
------------------
${JSON.stringify(candidates, null, 2)}`;
}

async function main() {
  const transcriptPath = path.resolve(
    argument("--transcript") ?? defaultTranscriptPath,
  );
  const outputPath = path.resolve(
    argument("--output") ??
      path.join(
        process.cwd(),
        "docs",
        "benchmarks",
        "reasoning-ab-latest.json",
      ),
  );
  const videoUrl =
    argument("--video-url") ?? "https://www.youtube.com/watch?v=benchmark";
  const transcript = JSON.parse(
    await readFile(transcriptPath, "utf8"),
  ) as YouTubeTranscript;
  const config = await loadBibliographerConfig();
  const chunks = chunkTranscript(
    transcript.segments,
    config.processing.chunkCharacters,
  ).chunks;
  const runs = [];

  for (const effort of efforts) {
    const started = performance.now();
    let codexCalls = 0;
    let candidateCount = 0;
    let finalHits = 0;
    let synthesisGroups = 0;
    const warnings = [...config.warnings];

    try {
      const candidates = [];
      for (const chunk of chunks) {
        codexCalls += 1;
        const raw = await runCodexJson({
          prompt: extractionPrompt(config.prompt, chunk.text),
          schemaPath: "lib/codex-candidates.schema.json",
          reasoningEffort: effort,
          timeoutMs: 150_000,
        });
        const parsed = historicalCandidatesSchema.safeParse(
          parseCodexJson(JSON.stringify(raw)),
        );
        if (!parsed.success) {
          throw new Error(
            "Candidate benchmark output failed schema validation.",
          );
        }
        candidates.push(...filterMeaningfulPhrases(parsed.data.candidates));
      }

      const uniqueCandidates = deduplicateCandidates(candidates).slice(
        0,
        config.processing.maxHits,
      );
      candidateCount = uniqueCandidates.length;
      if (uniqueCandidates.length > 0) {
        synthesisGroups = 1;
        codexCalls += 1;
        const raw = await runCodexJson({
          prompt: synthesisPrompt(config.prompt, videoUrl, uniqueCandidates),
          schemaPath: "lib/codex-final.schema.json",
          reasoningEffort: effort,
          timeoutMs: 180_000,
        });
        const parsed = historicalReferencesSchema.safeParse(
          parseCodexJson(JSON.stringify(raw)),
        );
        if (!parsed.success) {
          throw new Error(
            "Synthesis benchmark output failed schema validation.",
          );
        }
        finalHits = deduplicateHits(parsed.data.hits).length;
      }
    } catch (error) {
      warnings.push(
        `${effort} benchmark unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }

    runs.push({
      reasoningEffort: effort,
      elapsedMs: Math.round(performance.now() - started),
      codexCalls,
      chunks: chunks.length,
      synthesisGroups,
      candidates: candidateCount,
      finalHits,
      capReason: null,
      resumeCursor: null,
      warnings,
      manualQualityNotes:
        "Review title precision, phrase-only rejection, and source grounding manually; elapsed time alone is not a quality score.",
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    transcriptPath,
    videoUrl,
    sameTranscript: true,
    config: {
      chunkCharacters: config.processing.chunkCharacters,
      reasoningEffort: config.processing.reasoningEffort,
      candidateReasoningEffort: config.processing.candidateReasoningEffort,
      synthesisReasoningEffort: config.processing.synthesisReasoningEffort,
      overviewReasoningEffort: config.processing.overviewReasoningEffort,
      maxHits: config.processing.maxHits,
      maxRuntimeSeconds: config.processing.maxRuntimeSeconds,
    },
    runs,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote benchmark report to ${outputPath}`);
}

await main();
