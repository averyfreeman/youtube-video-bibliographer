import { z } from "zod";

import type { HistoricalReference } from "./historical-references.ts";
import { normalizePhraseTitle } from "./phrase-curation.ts";
import {
  transcriptContextForTimestamp,
  type NormalizedTranscriptSegment,
} from "./youtube-transcript.ts";

export const discussionContextParagraphSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_200);

export const discussionContextItemSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    speaker: z.string().trim().min(1).max(200).nullable().default(null),
    discussionContextParagraphs: z
      .array(discussionContextParagraphSchema)
      .max(1)
      .default([]),
  })
  .strict();

export const discussionContextResponseSchema = z
  .object({
    contexts: z.array(discussionContextItemSchema).max(40),
  })
  .strict();

export type DiscussionContextItem = z.infer<typeof discussionContextItemSchema>;
export type DiscussionContextResponse = z.infer<
  typeof discussionContextResponseSchema
>;

export type DiscussionContextInput = {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  videoEvidence: string;
  context: string;
};

export function discussionContextInputs(
  hits: HistoricalReference[],
  segments: NormalizedTranscriptSegment[],
) {
  return hits.map((hit): DiscussionContextInput => ({
    title: hit.title,
    timestamp: hit.timestamp,
    timestampSeconds: hit.timestampSeconds,
    videoEvidence: hit.videoEvidence,
    context: transcriptContextForTimestamp(segments, hit.timestampSeconds),
  }));
}

function participantLookup(participants: string[]) {
  return new Map(
    participants.map((participant) => [
      normalizePhraseTitle(participant),
      participant,
    ]),
  );
}

export function mergeDiscussionContext(
  hits: HistoricalReference[],
  response: DiscussionContextResponse,
  descriptionParticipants: string[],
) {
  const contexts = new Map(
    response.contexts.map((item) => [normalizePhraseTitle(item.title), item]),
  );
  const participants = participantLookup(descriptionParticipants);

  return hits.map((hit) => {
    const item = contexts.get(normalizePhraseTitle(hit.title));
    const speaker = item?.speaker
      ? (participants.get(normalizePhraseTitle(item.speaker)) ?? null)
      : null;

    return {
      ...hit,
      speaker,
      discussionContextParagraphs: item?.discussionContextParagraphs ?? [],
    };
  });
}
