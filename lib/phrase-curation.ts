import type {
  HistoricalCandidate,
  HistoricalReference,
} from "./historical-references.ts";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function countPhraseWords(value: string) {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

function normalized(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isIntroductionOrShowMetadata(
  value: Pick<HistoricalCandidate, "title" | "videoEvidence">,
) {
  const text = normalized(`${value.title} ${value.videoEvidence}`);
  return [
    /\b(?:welcome|hello|hi)\b/,
    /\b(?:i am|im|my name is|this is)\b.*\b(?:host|guest|show|podcast)\b/,
    /\b(?:host|guest)\s+(?:introduces|introducing|introduction|joins)\b/,
    /\b(?:joined by|our guest|the guest today|today's guest|the host|the guest)\b/,
    /\b(?:the|this)\s+(?:show|podcast|episode|channel)\b/,
    /\b(?:like and subscribe|subscribe to the channel|sponsor message)\b/,
  ].some((pattern) => pattern.test(text));
}

export function isGenericRestatement(
  value: Pick<HistoricalCandidate, "title" | "videoEvidence">,
) {
  const text = normalized(`${value.title} ${value.videoEvidence}`);
  return [
    /^(?:a|an|the)\s+(?:historical|important|notable)\s+(?:event|reference|quote|statement)\b/,
    /\bthe speaker (?:talks|speaks|discusses|mentions)\b/,
    /\bthis (?:video|conversation|discussion)\b/,
  ].some((pattern) => pattern.test(text));
}

export function isMeaningfulPhrase(
  value: Pick<HistoricalCandidate, "title" | "videoEvidence">,
) {
  return (
    countPhraseWords(value.title) >= 2 &&
    !isIntroductionOrShowMetadata(value) &&
    !isGenericRestatement(value)
  );
}

export function normalizePhraseTitle(value: string) {
  return normalized(value).replace(/\s+/g, " ");
}

export function filterMeaningfulPhrases<
  T extends HistoricalCandidate | HistoricalReference,
>(values: T[]) {
  return values.filter((value) => isMeaningfulPhrase(value));
}

export function deduplicatePhraseValues<
  T extends HistoricalCandidate | HistoricalReference,
>(values: T[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizePhraseTitle(value.title);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
