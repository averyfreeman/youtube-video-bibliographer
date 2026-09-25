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
import {
  discussionContextInputs,
  discussionContextResponseSchema,
} from "../lib/discussion-context.ts";
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

Benchmark the thorough bounded extraction contract. Return every defensible multi-word historical, current, or recent reference supported by this transcript, including named publications, events, regulations, and public or executive statements. Exclude single words, introductions, metadata, and generic restatements. Return the JSON object required by the candidate schema.

TRANSCRIPT
----------
${text}`;
}

function synthesisPrompt(
  prompt: string,
  videoUrl: string,
  candidates: unknown,
  hitLimit: number,
) {
  return `${prompt}

Benchmark the bounded synthesis contract. Deduplicate the supplied candidates, keep only their supplied titles, and return a concise JSON result with no more than ${hitLimit} hits. Do not use web search for this local benchmark and do not add a new title.
Keep analysisParagraphs focused on historical significance. Speaker and discussion context are optional post-verification enrichment fields and are not part of this benchmark's historical pass.

Source video: ${videoUrl}
SUPPLIED CANDIDATES
------------------
${JSON.stringify(candidates, null, 2)}`;
}

function contextPrompt(
  prompt: string,
  videoUrl: string,
  inputs: ReturnType<typeof discussionContextInputs>,
) {
  return `${prompt}

Benchmark the isolated context-enrichment contract. Return only exact supplied titles, with at most one short discussionContextParagraph per title. Do not add, remove, rename, reorder, or verify historical references. Set speaker to null because this fixture has no description-derived participant list. Do not use web search.

Source video: ${videoUrl}
SUPPLIED CONTEXT WINDOWS
------------------------
${JSON.stringify(inputs, null, 2)}`;
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
    let contextCalls = 0;
    const contextWarnings: string[] = [];
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
          prompt: synthesisPrompt(
            config.prompt,
            videoUrl,
            uniqueCandidates,
            config.processing.maxHits,
          ),
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
        const retainedHits = deduplicateHits(parsed.data.hits).slice(
          0,
          config.processing.maxHits,
        );
        finalHits = retainedHits.length;
        if (retainedHits.length > 0) {
          codexCalls += 1;
          contextCalls += 1;
          try {
            const rawContext = await runCodexJson({
              prompt: contextPrompt(
                config.prompt,
                videoUrl,
                discussionContextInputs(retainedHits, transcript.segments),
              ),
              schemaPath: "lib/codex-context.schema.json",
              reasoningEffort: effort,
              timeoutMs: 90_000,
            });
            const parsedContext =
              discussionContextResponseSchema.safeParse(rawContext);
            if (!parsedContext.success) {
              throw new Error(
                "Context benchmark output failed schema validation.",
              );
            }
          } catch (error) {
            contextWarnings.push(
              error instanceof Error
                ? error.message
                : "Context benchmark unavailable.",
            );
          }
        }
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
      contextCalls,
      candidates: candidateCount,
      finalHits,
      capReason: null,
      resumeCursor: null,
      warnings,
      contextWarnings,
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
      maxCandidatesPerChunk: config.processing.maxCandidatesPerChunk,
      softMaxHits: config.processing.softMaxHits,
      maxHits: config.processing.maxHits,
      tailGraceSeconds: config.processing.tailGraceSeconds,
      maxRuntimeSeconds: config.processing.maxRuntimeSeconds,
    },
    runs,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote benchmark report to ${outputPath}`);
}

await main();
