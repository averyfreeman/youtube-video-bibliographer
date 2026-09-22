import { z } from "zod";

export const referenceCategories = [
  "quote",
  "publication",
  "event",
  "financial_crisis",
  "regulation",
  "executive_statement",
  "other",
] as const;

export const referenceCategoryLabels: Record<ReferenceCategory, string> = {
  quote: "Quote",
  publication: "Publication",
  event: "Event",
  financial_crisis: "Financial crisis",
  regulation: "Regulation",
  executive_statement: "Executive statement",
  other: "Other",
};

export const evidenceTypes = [
  "direct_quote",
  "paraphrase",
  "reference",
] as const;

export const sourceQualities = [
  "primary",
  "reputable",
  "secondary",
  "analysis",
  "culture",
] as const;

export const confidenceLevels = ["high", "medium", "low"] as const;
export const verificationStatuses = [
  "verified",
  "needs_review",
  "unavailable",
] as const;

export const referenceCategorySchema = z.enum(referenceCategories);
export const evidenceTypeSchema = z.enum(evidenceTypes);
export const sourceQualitySchema = z.enum(sourceQualities);
export const confidenceSchema = z.enum(confidenceLevels);
export const verificationStatusSchema = z.enum(verificationStatuses);

export type ReferenceCategory = z.infer<typeof referenceCategorySchema>;
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;
export type SourceQuality = z.infer<typeof sourceQualitySchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

const youtubeUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid YouTube URL.")
  .refine((value) => {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    );
  }, "Only YouTube URLs are supported.");

export const extractionRequestSchema = z
  .object({
    videoUrl: youtubeUrlSchema,
  })
  .strict();

export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;

const timestampSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/);

const baseReferenceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  category: referenceCategorySchema,
  evidenceType: evidenceTypeSchema,
  timestamp: timestampSchema,
  timestampSeconds: z.number().int().nonnegative(),
  historicalDate: z.string().trim().max(160).nullable(),
  videoEvidence: z.string().trim().min(1).max(2_000),
});

export const historicalCandidateSchema = baseReferenceSchema.strict();

export const historicalCandidatesSchema = z
  .object({
    candidates: z.array(historicalCandidateSchema),
  })
  .strict();

export type HistoricalCandidate = z.infer<typeof historicalCandidateSchema>;
export type HistoricalCandidates = z.infer<typeof historicalCandidatesSchema>;

export const historicalSourceSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    url: z.string().url(),
    quality: sourceQualitySchema,
    note: z.string().trim().max(500).nullable(),
  })
  .strict();

export type HistoricalSource = z.infer<typeof historicalSourceSchema>;

export const historicalReferenceSchema = baseReferenceSchema
  .extend({
    confidence: confidenceSchema,
    confidenceReasons: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
    verificationStatus: verificationStatusSchema,
    verificationNote: z.string().trim().min(1).max(1_000),
    analysisParagraphs: z
      .array(z.string().trim().min(1).max(4_000))
      .min(1)
      .max(2),
    sources: z.array(historicalSourceSchema).max(3),
  })
  .strict();

export const historicalReferencesSchema = z
  .object({
    hits: z.array(historicalReferenceSchema),
  })
  .strict();

export type HistoricalReference = z.infer<typeof historicalReferenceSchema>;
export type HistoricalReferences = z.infer<typeof historicalReferencesSchema>;

export const presentationHistoricalReferenceSchema = historicalReferenceSchema
  .extend({
    thumbnailUrl: z.string().min(1).nullable(),
  })
  .strict();

export type PresentationHistoricalReference = z.infer<
  typeof presentationHistoricalReferenceSchema
>;

export const historicalReferencesResponseSchema = z
  .object({
    videoUrl: z.string().url(),
    transcriptLanguage: z.string().nullable(),
    transcriptTruncated: z.boolean(),
    warnings: z.array(z.string()),
    hits: z.array(historicalReferenceSchema),
    markdown: z.string().min(1),
  })
  .strict();

export type HistoricalReferencesResponse = z.infer<
  typeof historicalReferencesResponseSchema
>;

export function isWeakSource(source: HistoricalSource) {
  return (
    source.quality === "secondary" ||
    source.quality === "analysis" ||
    source.quality === "culture"
  );
}
