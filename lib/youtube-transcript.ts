import {
  YoutubeTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript";

/** Maximum prompt size for one Codex extraction call, not a transcript cap. */
export const TRANSCRIPT_CHUNK_CHARACTERS = 80_000;
export const TRANSCRIPT_CHUNK_OVERLAP_SEGMENTS = 1;

export type TranscriptSegment = {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
};

export type NormalizedTranscriptSegment = TranscriptSegment & {
  timestamp: string;
  timestampSeconds: number;
  line: string;
};

export type YouTubeTranscript = {
  text: string;
  language: string | null;
  segments: NormalizedTranscriptSegment[];
  /** Always false: this pipeline deliberately has no global transcript cap. */
  truncated: false;
  characterCount: number;
};

export type TranscriptChunk = {
  index: number;
  text: string;
  startTimestamp: string;
  endTimestamp: string;
  segments: NormalizedTranscriptSegment[];
};

export type TranscriptChunks = {
  chunks: TranscriptChunk[];
  truncated: false;
};

export const TRANSCRIPT_CONTEXT_RADIUS_SECONDS = 30;
export const TRANSCRIPT_CONTEXT_MAX_CHARACTERS = 1_200;

function parseTimeParameter(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = [...trimmed.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
  if (parts.length === 0 || parts.map((part) => part[0]).join("") !== trimmed) {
    return null;
  }

  return parts.reduce((total, [, amount, unit]) => {
    const multiplier = unit === "h" ? 3_600 : unit === "m" ? 60 : 1;
    return total + Number(amount) * multiplier;
  }, 0);
}

export function parseTimestampStart(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    return parseTimeParameter(url.searchParams.get("t") ?? "") ?? 0;
  } catch {
    return 0;
  }
}

export function filterTranscriptFromTimestamp(
  segments: NormalizedTranscriptSegment[],
  startSeconds: number,
) {
  const start = Math.max(0, Math.floor(startSeconds));
  return segments.filter((segment) => segment.timestampSeconds >= start);
}

export function transcriptContextForTimestamp(
  segments: NormalizedTranscriptSegment[],
  timestampSeconds: number,
  radiusSeconds = TRANSCRIPT_CONTEXT_RADIUS_SECONDS,
  maxCharacters = TRANSCRIPT_CONTEXT_MAX_CHARACTERS,
) {
  const start = Math.max(0, timestampSeconds - radiusSeconds);
  const end = timestampSeconds + radiusSeconds;
  const text = segments
    .filter(
      (segment) =>
        segment.timestampSeconds >= start && segment.timestampSeconds <= end,
    )
    .map((segment) => segment.line)
    .join("\n");

  if (text.length <= maxCharacters) {
    return text;
  }

  const half = Math.floor(maxCharacters / 2);
  return (
    text.slice(0, half) + "\n[...context omitted...]\n" + text.slice(-half)
  );
}

export function formatTimestamp(offsetMilliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(offsetMilliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function transcriptFetch(
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
}

function normalizeSegments(segments: TranscriptSegment[]) {
  return segments
    .map((segment) => {
      const text = segment.text.replace(/\s+/g, " ").trim();
      const timestampSeconds = Math.max(0, Math.floor(segment.offset / 1000));
      const timestamp = formatTimestamp(segment.offset);

      return {
        ...segment,
        text,
        timestamp,
        timestampSeconds,
        line: `${timestamp} | ${text}`,
      } satisfies NormalizedTranscriptSegment;
    })
    .filter((segment) => segment.text.length > 0);
}

export async function getYouTubeTranscript(
  videoUrl: string,
): Promise<YouTubeTranscript> {
  let segments: TranscriptSegment[];

  try {
    segments = await YoutubeTranscript.fetchTranscript(videoUrl, {
      lang: "en",
      fetch: transcriptFetch,
    });
  } catch (error) {
    if (!(error instanceof YoutubeTranscriptNotAvailableLanguageError)) {
      throw error;
    }

    segments = await YoutubeTranscript.fetchTranscript(videoUrl, {
      fetch: transcriptFetch,
    });
  }

  const normalizedSegments = normalizeSegments(segments);
  if (normalizedSegments.length === 0) {
    throw new Error("No captions were available for this video.");
  }
  const text = normalizedSegments.map((segment) => segment.line).join("\n");

  return {
    text,
    language: normalizedSegments[0]?.lang ?? null,
    segments: normalizedSegments,
    truncated: false,
    characterCount: text.length,
  };
}

function splitLongSegment(
  segment: NormalizedTranscriptSegment,
  chunkCharacters: number,
) {
  if (segment.line.length <= chunkCharacters) {
    return [segment];
  }

  const prefix = `${segment.timestamp} | `;
  const maxTextCharacters = Math.max(1, chunkCharacters - prefix.length);
  const pieces: string[] = [];
  let remaining = segment.text;

  while (remaining.length > maxTextCharacters) {
    let splitAt = remaining.lastIndexOf(" ", maxTextCharacters);
    if (splitAt <= 0) {
      splitAt = maxTextCharacters;
    }

    pieces.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) {
    pieces.push(remaining);
  }

  return pieces.map((text) => ({
    ...segment,
    text,
    line: `${prefix}${text}`,
  }));
}

export function chunkTranscript(
  segments: NormalizedTranscriptSegment[],
  chunkCharacters = TRANSCRIPT_CHUNK_CHARACTERS,
): TranscriptChunks {
  const chunkableSegments = segments.flatMap((segment) =>
    splitLongSegment(segment, chunkCharacters),
  );
  const chunks: TranscriptChunk[] = [];
  let startIndex = 0;

  while (startIndex < chunkableSegments.length) {
    const chunkSegments: NormalizedTranscriptSegment[] = [];
    let characterCount = 0;
    let endIndex = startIndex;

    while (endIndex < chunkableSegments.length) {
      const segment = chunkableSegments[endIndex];
      const additionalCharacters =
        segment.line.length + (chunkSegments.length > 0 ? 1 : 0);

      // A single unusually long caption still belongs in the transcript.
      if (
        chunkSegments.length > 0 &&
        characterCount + additionalCharacters > chunkCharacters
      ) {
        break;
      }

      chunkSegments.push(segment);
      characterCount += additionalCharacters;
      endIndex += 1;
    }

    chunks.push({
      index: chunks.length,
      text: chunkSegments.map((segment) => segment.line).join("\n"),
      startTimestamp: chunkSegments[0]?.timestamp ?? "00:00:00",
      endTimestamp:
        chunkSegments[chunkSegments.length - 1]?.timestamp ?? "00:00:00",
      segments: chunkSegments,
    });

    if (endIndex >= chunkableSegments.length) {
      break;
    }

    startIndex = Math.max(
      startIndex + 1,
      endIndex - TRANSCRIPT_CHUNK_OVERLAP_SEGMENTS,
    );
  }

  return { chunks, truncated: false };
}
