import { z } from "zod";

export const youtubeChapterSchema = z
  .object({
    title: z.string().min(1).max(200),
    startSeconds: z.number().int().nonnegative(),
    endSeconds: z.number().int().nonnegative(),
  })
  .strict();

export type YouTubeChapter = z.infer<typeof youtubeChapterSchema>;

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
    durationSeconds: z.number().int().nonnegative().nullable().default(null),
    chapters: z.array(youtubeChapterSchema).default([]),
  })
  .strict();

export type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;
