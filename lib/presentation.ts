import type {
  HistoricalReference,
  HistoricalSource,
  SourceQuality,
} from "./historical-references.ts";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

const SOURCE_QUALITY_RANK: Record<SourceQuality, number> = {
  culture: 1,
  analysis: 2,
  secondary: 3,
  reputable: 4,
  primary: 5,
};

const CONFIDENCE_DISPLAY_BANDS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 99.9,
] as const;

export function briefEvidence(value: string, maxWords = 9) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const matches = Array.from(normalized.matchAll(WORD_PATTERN));

  if (matches.length <= maxWords) {
    return { text: normalized, isTruncated: false };
  }

  const lastMatch = matches[maxWords - 1];
  const end = (lastMatch?.index ?? 0) + (lastMatch?.[0].length ?? 0);

  return {
    text: `${normalized.slice(0, end).trim()}…`,
    isTruncated: true,
  };
}

export function evidenceLabel(
  evidenceType: HistoricalReference["evidenceType"],
) {
  return evidenceType === "direct_quote"
    ? "Quote in video"
    : "Reference in video";
}

export function selectPrimarySource(
  sources: HistoricalSource[],
): HistoricalSource | null {
  return (
    [...sources].sort(
      (left, right) =>
        SOURCE_QUALITY_RANK[right.quality] - SOURCE_QUALITY_RANK[left.quality],
    )[0] ?? null
  );
}

export function sourceQualityLabel(quality: SourceQuality) {
  const label = quality.replace(/_/g, " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function matchConfidencePercent(
  hit: Pick<
    HistoricalReference,
    "confidence" | "verificationStatus" | "sources"
  >,
) {
  const baseByStatus = {
    verified: { low: 70, medium: 80, high: 90 },
    needs_review: { low: 40, medium: 50, high: 60 },
    unavailable: { low: 10, medium: 20, high: 30 },
  } as const;
  const base = baseByStatus[hit.verificationStatus][hit.confidence];
  const withPrimarySource = hit.sources.some(
    (source) => source.quality === "primary",
  )
    ? Math.min(99.9, base + 10)
    : base;

  return withPrimarySource as (typeof CONFIDENCE_DISPLAY_BANDS)[number];
}

export { CONFIDENCE_DISPLAY_BANDS };
