import { NextResponse } from "next/server";

import {
  CodexRunnerError,
  CODEX_CANDIDATE_TIMEOUT_MS,
  CODEX_FINAL_TIMEOUT_MS,
  runCodexJson,
} from "@/lib/codex";
import {
  extractionRequestSchema,
  historicalCandidatesSchema,
  historicalReferencesResponseSchema,
  historicalReferencesSchema,
  type HistoricalCandidate,
  type HistoricalReference,
} from "@/lib/historical-references";
import { renderExport } from "@/lib/markdown-export";
import {
  chunkTranscript,
  getYouTubeTranscript,
  type TranscriptChunk,
} from "@/lib/youtube-transcript";

export const runtime = "nodejs";
export const maxDuration = 600;

const candidatesSchemaPath = "lib/codex-candidates.schema.json";
const finalSchemaPath = "lib/codex-final.schema.json";

function codexFailureStatus(error: unknown) {
  if (!(error instanceof CodexRunnerError)) {
    return 502;
  }

  if (error.kind === "not-found" || error.kind === "auth") {
    return 503;
  }

  if (error.kind === "timeout") {
    return 504;
  }

  return 502;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof CodexRunnerError && error.kind === "auth") {
    return "The local Codex CLI is not authenticated. Run `codex login` and try again.";
  }

  if (error instanceof CodexRunnerError && error.kind === "not-found") {
    return "The Codex CLI was not found. Set CODEX_CLI_PATH or put `codex` on PATH.";
  }

  if (error instanceof CodexRunnerError && error.kind === "timeout") {
    return "Codex took too long to finish this bibliography. Try a shorter video.";
  }

  return "The local model returned an unusable bibliography response.";
}

function isFatalChunkFailure(error: unknown) {
  if (!(error instanceof CodexRunnerError)) {
    return false;
  }

  if (error.kind === "not-found" || error.kind === "auth") {
    return true;
  }

  return /model|unsupported|permission/i.test(
    `${error.message}\n${error.stderr}`,
  );
}

function candidatePrompt(chunk: TranscriptChunk) {
  return `You are the candidate-finding pass of a YouTube historical bibliography pipeline.

Read this timestamped transcript chunk and identify every historically meaningful quote, publication, event, financial crisis, regulation, executive statement, or other historical reference that is actually supported by the spoken text. Do not invent references. Preserve the distinction between a direct quote, a paraphrase, and a general reference. Use the timestamp printed before the relevant transcript line, formatted as HH:MM:SS, and the corresponding integer seconds.

Return only the JSON object required by the supplied schema. An empty candidates array is correct when this chunk contains no meaningful historical reference.

Chunk index: ${chunk.index}
Chunk coverage: ${chunk.startTimestamp} through ${chunk.endTimestamp}

TRANSCRIPT CHUNK
----------------
${chunk.text}`;
}

async function findCandidates(chunk: TranscriptChunk) {
  const prompt = candidatePrompt(chunk);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await runCodexJson({
        prompt,
        schemaPath: candidatesSchemaPath,
        timeoutMs: CODEX_CANDIDATE_TIMEOUT_MS,
      });
      const parsed = historicalCandidatesSchema.safeParse(raw);

      if (!parsed.success) {
        throw new CodexRunnerError(
          "invalid-output",
          "The candidate response did not match its schema.",
          parsed.error.message,
        );
      }

      return parsed.data.candidates;
    } catch (error) {
      lastError = error;
      if (isFatalChunkFailure(error) || attempt === 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Candidate analysis failed.");
}

function synthesisPrompt(videoUrl: string, candidates: HistoricalCandidate[]) {
  return `You are the final research and synthesis pass for a YouTube video bibliography.

The source video is ${videoUrl}.

Using the candidate references below, deduplicate overlapping candidates and return a chronological-by-video list called hits. Keep the order in which the references are spoken in the video, not the historical date order. Include quote, publication, event, financial_crisis, regulation, executive_statement, and other categories as appropriate. A candidate may be a direct quote, a paraphrase, or a reference; preserve that distinction.

Use web search to verify each included hit and provide one or two real URLs for further reading. Prefer primary sources such as original speeches, legislation, court opinions, official records, archival material, or the original publication. Reputable reference sources are acceptable; analysis and culture sources are allowed when they help explain the video's theme, but mark their source quality accordingly. Never fabricate a URL, citation, speaker, quotation, or historical date. Set historicalDate to null when the date cannot be established confidently. Keep analysisParagraphs to one or two concise but detailed paragraphs per hit. The videoEvidence should be a faithful, short excerpt or paraphrase grounded in the transcript.

Return only the JSON object required by the supplied schema. Do not include markdown outside the JSON object.

CANDIDATES
----------
${JSON.stringify(candidates, null, 2)}`;
}

function sortHits(hits: HistoricalReference[]) {
  return [...hits].sort((left, right) => {
    if (left.timestampSeconds !== right.timestampSeconds) {
      return left.timestampSeconds - right.timestampSeconds;
    }

    return left.title.localeCompare(right.title);
  });
}

function transcriptFailureMessage(error: unknown) {
  if (
    error instanceof Error &&
    /caption|transcript|subtitle|video/i.test(error.message)
  ) {
    return "Captions could not be retrieved for this YouTube video.";
  }

  return "YouTube captions could not be retrieved. The video may have captions disabled or may be unavailable.";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const input = extractionRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: input.error.issues[0]?.message ?? "Enter a valid YouTube URL." },
      { status: 400 },
    );
  }

  let transcript;
  try {
    transcript = await getYouTubeTranscript(input.data.videoUrl);
  } catch (error) {
    return NextResponse.json(
      { error: transcriptFailureMessage(error) },
      { status: 422 },
    );
  }

  const transcriptChunks = chunkTranscript(transcript.segments);
  if (transcriptChunks.chunks.length === 0) {
    return NextResponse.json(
      { error: "The video returned no usable caption text." },
      { status: 422 },
    );
  }

  const warnings: string[] = [];
  if (transcript.truncated) {
    warnings.push(
      "The transcript exceeded the safety limit and was truncated.",
    );
  }
  if (transcriptChunks.truncated) {
    warnings.push("Only the first eight transcript chunks were analyzed.");
  }

  const candidates: HistoricalCandidate[] = [];
  const failedChunks: number[] = [];

  // Keep calls sequential to stay predictable with local OAuth and web-search quotas.
  for (const chunk of transcriptChunks.chunks) {
    try {
      candidates.push(...(await findCandidates(chunk)));
    } catch (error) {
      if (isFatalChunkFailure(error)) {
        return NextResponse.json(
          { error: safeErrorMessage(error) },
          { status: codexFailureStatus(error) },
        );
      }
      failedChunks.push(chunk.index + 1);
    }
  }

  if (failedChunks.length > 0) {
    warnings.push(
      `Chunk analysis failed after a retry for chunk${failedChunks.length === 1 ? "" : "s"} ${failedChunks.join(", ")}.`,
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error: "No usable historical references were found in the transcript.",
        warnings,
      },
      { status: 502 },
    );
  }

  let finalReferences;
  try {
    const raw = await runCodexJson({
      prompt: synthesisPrompt(input.data.videoUrl, candidates),
      schemaPath: finalSchemaPath,
      webSearch: true,
      timeoutMs: CODEX_FINAL_TIMEOUT_MS,
    });
    const parsed = historicalReferencesSchema.safeParse(raw);

    if (!parsed.success) {
      throw new CodexRunnerError(
        "invalid-output",
        "The final bibliography response did not match its schema.",
        parsed.error.message,
      );
    }

    finalReferences = sortHits(parsed.data.hits);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: codexFailureStatus(error) },
    );
  }

  const markdown = renderExport("md", input.data.videoUrl, finalReferences);
  const response = historicalReferencesResponseSchema.parse({
    videoUrl: input.data.videoUrl,
    transcriptLanguage: transcript.language,
    transcriptTruncated: transcript.truncated || transcriptChunks.truncated,
    warnings,
    hits: finalReferences,
    markdown,
  });

  return NextResponse.json(response);
}
