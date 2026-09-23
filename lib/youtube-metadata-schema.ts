import { z } from "zod";

export const youtubeMetadataSchema = z
  .object({
    title: z.string().min(1).max(240).nullable(),
    channel: z.string().min(1).max(240).nullable(),
    uploader: z.string().min(1).max(240).nullable(),
    uploadDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    publishedAt: z.string().datetime().nullable(),
    description: z.string().max(12_000).nullable(),
  })
  .strict();

export type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;
