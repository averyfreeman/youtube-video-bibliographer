import { z } from "zod";

import {
  videoSectionSchema,
  type HistoricalReference,
  type VideoSection,
} from "./historical-references.ts";
import { normalizePhraseTitle } from "./phrase-curation.ts";
import {
  transcriptContextForTimestamp,
  type NormalizedTranscriptSegment,
} from "./youtube-transcript.ts";

export const editorialSourceNoteSchema = z
  .object({
    url: z.string().trim().min(1),
    note: z.string().trim().min(1).max(500),
  })
  .strict();

export const editorialItemSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    speaker: z.string().trim().min(1).max(200).nullable().default(null),
    whatTheyWereTalkingAbout: z
      .string()
      .trim()
      .min(1)
      .max(1_200)
      .nullable()
      .default(null),
    whyItMatters: z.array(z.string().trim().min(1).max(4_000)).min(1).max(2),
    sourceNotes: z.array(editorialSourceNoteSchema).max(3).default([]),
  })
  .strict();

export const editorialBatchResponseSchema = z
  .object({
    items: z.array(editorialItemSchema).max(40),
  })
  .strict();

export const editorialSectionsResponseSchema = z
  .object({
    sections: z.array(videoSectionSchema).min(1).max(8),
  })
  .strict();

export type EditorialBatchResponse = z.infer<
  typeof editorialBatchResponseSchema
>;
export type EditorialSectionsResponse = z.infer<
  typeof editorialSectionsResponseSchema
>;

export type EditorialHitInput = {
  title: string;
  category: string;
  timestamp: string;
  timestampSeconds: number;
  historicalDate: string | null;
  videoEvidence: string;
  verificationStatus: string;
  existingAnalysis: string[];
  sources: Array<{ title: string; url: string; quality: string }>;
  nearbyTranscript: string;
};

export function buildEditorialInputs(
  hits: HistoricalReference[],
  segments: NormalizedTranscriptSegment[],
): EditorialHitInput[] {
  return hits.map((hit) => ({
    title: hit.title,
    category: hit.category,
    timestamp: hit.timestamp,
    timestampSeconds: hit.timestampSeconds,
    historicalDate: hit.historicalDate,
    videoEvidence: hit.videoEvidence,
    verificationStatus: hit.verificationStatus,
    existingAnalysis: hit.analysisParagraphs,
    sources: hit.sources.map((source) => ({
      title: source.title,
      url: source.url,
      quality: source.quality,
    })),
    nearbyTranscript: transcriptContextForTimestamp(
      segments,
      hit.timestampSeconds,
    ),
  }));
}

export function mergeEditorialBatch(
  hits: HistoricalReference[],
  response: EditorialBatchResponse,
  descriptionParticipants: string[],
): HistoricalReference[] {
  const byTitle = new Map(
    response.items.map((item) => [normalizePhraseTitle(item.title), item]),
  );
  const participantMap = new Map(
    descriptionParticipants.map((person) => [
      normalizePhraseTitle(person),
      person,
    ]),
  );

  return hits.map((hit) => {
    const editorial = byTitle.get(normalizePhraseTitle(hit.title));
    if (!editorial) {
      return hit;
    }

    const speaker = editorial.speaker
      ? (participantMap.get(normalizePhraseTitle(editorial.speaker)) ??
        hit.speaker)
      : hit.speaker;

    const noteByUrl = new Map(
      editorial.sourceNotes.map((entry) => [entry.url.trim(), entry.note]),
    );

    const updatedSources = hit.sources.map((source) => ({
      ...source,
      note: noteByUrl.get(source.url.trim()) ?? source.note,
    }));

    return {
      ...hit,
      speaker,
      discussionContextParagraphs: editorial.whatTheyWereTalkingAbout
        ? [editorial.whatTheyWereTalkingAbout]
        : hit.discussionContextParagraphs,
      analysisParagraphs:
        editorial.whyItMatters.length > 0
          ? editorial.whyItMatters
          : hit.analysisParagraphs,
      sources: updatedSources,
    };
  });
}

export function mergeEditorialSections(
  hits: HistoricalReference[],
  rawSections: VideoSection[],
): VideoSection[] {
  if (hits.length === 0) {
    return [];
  }

  const hitByNormalizedTitle = new Map(
    hits.map((hit) => [normalizePhraseTitle(hit.title), hit]),
  );
  const assigned = new Set<string>();
  const built: Array<{
    title: string;
    summary: string;
    hits: HistoricalReference[];
  }> = [];

  for (const raw of rawSections) {
    const matchedHits: HistoricalReference[] = [];
    for (const rawTitle of raw.hitTitles) {
      const normalized = normalizePhraseTitle(rawTitle);
      const hit = hitByNormalizedTitle.get(normalized);
      if (!hit || assigned.has(normalized)) {
        continue;
      }
      assigned.add(normalized);
      matchedHits.push(hit);
    }

    if (matchedHits.length > 0) {
      built.push({
        title: raw.title,
        summary: raw.summary,
        hits: matchedHits,
      });
    }
  }

  if (built.length === 0) {
    return [
      {
        title: "Part I: Key References & Context",
        summary:
          "Key quotes, research, and real-world references drawn in video order.",
        hitTitles: hits.map((hit) => hit.title),
      },
    ];
  }

  // Ensure zero hits are dropped: fold any unassigned hit into the nearest section by timestamp.
  const sectionMidpoints = built.map((section) => {
    const first = section.hits[0]?.timestampSeconds ?? 0;
    const last = section.hits.at(-1)?.timestampSeconds ?? first;
    return (first + last) / 2;
  });

  for (const hit of hits) {
    const normalized = normalizePhraseTitle(hit.title);
    if (assigned.has(normalized)) {
      continue;
    }
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let idx = 0; idx < sectionMidpoints.length; idx += 1) {
      const dist = Math.abs(hit.timestampSeconds - sectionMidpoints[idx]);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = idx;
      }
    }
    built[bestIndex].hits.push(hit);
    assigned.add(normalized);
  }

  return [...built]
    .sort(
      (left, right) =>
        (left.hits[0]?.timestampSeconds ?? 0) -
        (right.hits[0]?.timestampSeconds ?? 0),
    )
    .map((section) => ({
      title: section.title,
      summary: section.summary,
      hitTitles: [...section.hits]
        .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
        .map((hit) => hit.title),
    }));
}
