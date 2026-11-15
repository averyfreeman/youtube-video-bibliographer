import { NextResponse } from "next/server";
import { z } from "zod";

import { loadBibliographerConfig } from "@/lib/bibliographer-config";
import { getYouTubeMetadata, planVideoChapters } from "@/lib/youtube-metadata";
import {
  getYouTubeTranscript,
  parseTimestampRange,
} from "@/lib/youtube-transcript";

export const runtime = "nodejs";
export const maxDuration = 60;

const inspectRequestSchema = z
  .object({
    videoUrl: z
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
      }, "Only YouTube URLs are supported."),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = inspectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Enter a valid YouTube URL.",
      },
      { status: 400 },
    );
  }

  const config = await loadBibliographerConfig();
  const controller = new AbortController();
  const [metadataResult, transcriptResult] = await Promise.allSettled([
    getYouTubeMetadata(
      parsed.data.videoUrl,
      config.thumbnails.ytdlpPath,
      controller.signal,
    ),
    getYouTubeTranscript(parsed.data.videoUrl),
  ]);

  const metadata =
    metadataResult.status === "fulfilled" ? metadataResult.value : null;
  const metadataWarning =
    metadataResult.status === "rejected"
      ? `Video title and chapter metadata could not be read (${
          metadataResult.reason instanceof Error
            ? metadataResult.reason.message
            : "yt-dlp failed"
        }); duration was estimated from captions.`
      : null;
  const transcript =
    transcriptResult.status === "fulfilled" ? transcriptResult.value : null;

  if (!metadata && !transcript) {
    return NextResponse.json(
      {
        error:
          "Could not inspect video metadata or captions. Verify the URL and try again.",
      },
      { status: 422 },
    );
  }

  const transcriptEndSeconds =
    transcript?.segments.at(-1)?.timestampSeconds ?? 0;
  const durationSeconds =
    metadata?.durationSeconds ?? (transcriptEndSeconds || null);
  const range = parseTimestampRange(parsed.data.videoUrl);
  const effectiveDuration = durationSeconds ?? transcriptEndSeconds;
  const rawChapters = metadata?.chapters ?? [];
  const chapterPlan = planVideoChapters(rawChapters, durationSeconds);

  return NextResponse.json({
    title: metadata?.title ?? null,
    channel: metadata?.channel ?? metadata?.uploader ?? null,
    durationSeconds,
    chapters: rawChapters,
    plannedChapters: chapterPlan.plannedChapters,
    fitsSinglePass: chapterPlan.fitsSinglePass,
    coalescedChapterCount: chapterPlan.coalescedCount,
    autoSplitWindows: chapterPlan.autoSplitWindows,
    metadataWarning,
    transcriptSegmentCount: transcript?.segments.length ?? 0,
    transcriptLanguage: transcript?.language ?? null,
    requestedStartSeconds: range.startSeconds,
    requestedEndSeconds: range.endSeconds,
    exceedsCuratedBudget: effectiveDuration > 45 * 60,
  });
}
