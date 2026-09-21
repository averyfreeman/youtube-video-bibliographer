import {
  YoutubeTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript";

export const MAX_TRANSCRIPT_CHARACTERS = 320_000;
export const TRANSCRIPT_CHUNK_CHARACTERS = 40_000;
export const MAX_TRANSCRIPT_CHUNKS = 8;

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
  truncated: boolean;
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
  truncated: boolean;
};

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

function takeWithinLimit(segments: NormalizedTranscriptSegment[]) {
  const selected: NormalizedTranscriptSegment[] = [];
  let characterCount = 0;

  for (const segment of segments) {
    const additionalCharacters =
      segment.line.length + (selected.length > 0 ? 1 : 0);

    if (
      selected.length > 0 &&
      characterCount + additionalCharacters > MAX_TRANSCRIPT_CHARACTERS
    ) {
      break;
    }

    selected.push(segment);
    characterCount += additionalCharacters;
  }

  return selected;
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
  const keptSegments = takeWithinLimit(normalizedSegments);

  return {
    text: keptSegments.map((segment) => segment.line).join("\n"),
    language: keptSegments[0]?.lang ?? normalizedSegments[0]?.lang ?? null,
    segments: keptSegments,
    truncated: keptSegments.length < normalizedSegments.length,
  };
}

export function chunkTranscript(
  segments: NormalizedTranscriptSegment[],
): TranscriptChunks {
  const chunks: TranscriptChunk[] = [];
  let startIndex = 0;
  let nextUnchunkedIndex = 0;

  while (
    startIndex < segments.length &&
    chunks.length < MAX_TRANSCRIPT_CHUNKS
  ) {
    const chunkSegments: NormalizedTranscriptSegment[] = [];
    let characterCount = 0;
    let endIndex = startIndex;

    while (endIndex < segments.length) {
      const segment = segments[endIndex];
      const additionalCharacters =
        segment.line.length + (chunkSegments.length > 0 ? 1 : 0);

      if (
        chunkSegments.length > 0 &&
        characterCount + additionalCharacters > TRANSCRIPT_CHUNK_CHARACTERS
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

    nextUnchunkedIndex = endIndex;
    if (endIndex >= segments.length) {
      break;
    }

    // Keep one line at the boundary so a quote split across chunks remains visible.
    startIndex = Math.max(startIndex + 1, endIndex - 1);
  }

  return {
    chunks,
    truncated: nextUnchunkedIndex < segments.length,
  };
}
