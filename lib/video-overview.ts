import { z } from "zod";

import {
  videoOverviewSchema,
  type VideoOverview,
} from "./historical-references.ts";
import type { YouTubeMetadata } from "./youtube-metadata.ts";
import type { NormalizedTranscriptSegment } from "./youtube-transcript.ts";

export const overviewContentSchema = z
  .object({
    people: z.array(z.string().trim().min(1).max(200)).max(8),
    theme: z.string().trim().min(1).max(500).nullable(),
    summary: z.string().trim().min(1).max(1_200).nullable(),
  })
  .strict();

export const overviewResponseSchema = z
  .object({
    overview: overviewContentSchema,
  })
  .strict();

export type OverviewContent = z.infer<typeof overviewContentSchema>;

export function buildVideoOverview(
  metadata: YouTubeMetadata | null,
  content: OverviewContent | null,
): VideoOverview {
  const uploadDate = metadata?.uploadDate ?? null;
  const publishedAt = metadata?.publishedAt ?? null;

  return videoOverviewSchema.parse({
    title: metadata?.title ?? null,
    channel: metadata?.channel ?? metadata?.uploader ?? null,
    date: uploadDate ?? publishedAt,
    dateKind: uploadDate ? "uploaded" : publishedAt ? "published" : null,
    people: content?.people ?? [],
    theme: content?.theme ?? null,
    summary: content?.summary ?? null,
  });
}

export function orientationTranscript(
  segments: NormalizedTranscriptSegment[],
  maxCharacters = 12_000,
) {
  const lines = segments.map((segment) => segment.line);
  const fullText = lines.join("\n");
  if (fullText.length <= maxCharacters) {
    return fullText;
  }

  const firstLength = Math.floor(maxCharacters * 0.7);
  const lastLength = maxCharacters - firstLength;
  return [
    fullText.slice(0, firstLength),
    "[...middle of transcript omitted...]",
    fullText.slice(-lastLength),
  ].join("\n");
}
