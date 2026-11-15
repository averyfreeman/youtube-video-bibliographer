import { spawn } from "node:child_process";
import os from "node:os";
import {
  youtubeMetadataSchema,
  type YouTubeChapter,
  type YouTubeMetadata,
} from "./youtube-metadata-schema.ts";

export { youtubeMetadataSchema };
export type { YouTubeChapter, YouTubeMetadata };

type RawYouTubeMetadata = Record<string, unknown>;

function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function uploadDateValue(value: unknown) {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) {
    return null;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function publishedAtValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const date = new Date(value * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function durationValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

function parseClockToSeconds(clock: string) {
  const parts = clock.split(":").map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3_600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export function parseChaptersFromDescription(
  description: string | null,
  durationSeconds: number | null,
): YouTubeChapter[] {
  if (!description) {
    return [];
  }

  const rawEntries: Array<{ startSeconds: number; title: string }> = [];
  for (const line of description.split(/\r?\n/)) {
    const match = line
      .trim()
      .match(
        /^(?:[-*•]\s*|\d+\.\s*)?[\[(]?(\d{1,2}:\d{2}(?::\d{2})?)[\])]?\s*(?:[-–—|:]\s*|\s+)(.+)$/,
      );
    if (!match) {
      continue;
    }
    const startSeconds = parseClockToSeconds(match[1]);
    const title = match[2].trim().slice(0, 200);
    if (startSeconds === null || !title) {
      continue;
    }
    const previous = rawEntries.at(-1);
    if (previous && startSeconds <= previous.startSeconds) {
      continue;
    }
    rawEntries.push({ startSeconds, title });
  }

  if (rawEntries.length < 2) {
    return [];
  }

  return rawEntries.map((entry, index) => {
    const nextStart = rawEntries[index + 1]?.startSeconds;
    const fallbackEnd =
      durationSeconds !== null
        ? Math.max(entry.startSeconds, durationSeconds)
        : entry.startSeconds;
    const endSeconds =
      nextStart !== undefined
        ? Math.max(entry.startSeconds, nextStart - 1)
        : fallbackEnd;
    return {
      title: entry.title,
      startSeconds: entry.startSeconds,
      endSeconds,
    };
  });
}

function parseNativeChapters(
  value: unknown,
  durationSeconds: number | null,
): YouTubeChapter[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const chapters: YouTubeChapter[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const title = stringValue(record.title, 200);
    const start =
      typeof record.start_time === "number" &&
      Number.isFinite(record.start_time)
        ? Math.max(0, Math.floor(record.start_time))
        : null;
    const endRaw =
      typeof record.end_time === "number" && Number.isFinite(record.end_time)
        ? Math.max(0, Math.floor(record.end_time))
        : durationSeconds;
    if (!title || start === null || endRaw === null) {
      continue;
    }
    chapters.push({
      title,
      startSeconds: start,
      endSeconds: Math.max(start, endRaw),
    });
  }
  return chapters;
}

export type ChapterPlanResult = {
  plannedChapters: YouTubeChapter[];
  fitsSinglePass: boolean;
  coalescedCount: number;
  autoSplitWindows: boolean;
};

export const DEFAULT_MIN_CHAPTER_SECONDS = 180;
export const DEFAULT_SINGLE_PASS_MAX_SECONDS = 45 * 60;
export const DEFAULT_FALLBACK_WINDOW_SECONDS = 30 * 60;

function buildFallbackTimeWindows(
  durationSeconds: number,
  windowSeconds = DEFAULT_FALLBACK_WINDOW_SECONDS,
  minChapterSeconds = DEFAULT_MIN_CHAPTER_SECONDS,
): YouTubeChapter[] {
  const total = Math.max(0, Math.floor(durationSeconds));
  const windows: YouTubeChapter[] = [];
  for (let start = 0; start <= total; start += windowSeconds) {
    const end = Math.min(total, start + windowSeconds - 1);
    const span = end - start + 1;
    if (span < minChapterSeconds && windows.length > 0) {
      windows[windows.length - 1] = {
        ...windows[windows.length - 1],
        endSeconds: total,
      };
      break;
    }
    windows.push({
      title: `Part ${windows.length + 1}`,
      startSeconds: start,
      endSeconds: end,
    });
    if (end >= total) {
      break;
    }
  }
  return windows;
}

function chapterSpanSeconds(chapter: YouTubeChapter) {
  return Math.max(1, chapter.endSeconds - chapter.startSeconds + 1);
}

function combineChapterPair(
  first: YouTubeChapter,
  second: YouTubeChapter,
): YouTubeChapter {
  const combinedTitle =
    first.title.toLowerCase() === second.title.toLowerCase()
      ? first.title
      : `${first.title} / ${second.title}`;
  return {
    title: combinedTitle.slice(0, 200),
    startSeconds: Math.min(first.startSeconds, second.startSeconds),
    endSeconds: Math.max(first.endSeconds, second.endSeconds),
  };
}

/**
 * Coalesce adjacent short (<3m) chapters with neighbors and detect when a video
 * fits in a single pass rather than needing a multi-chapter sequential plan.
 */
export function planVideoChapters(
  chapters: YouTubeChapter[],
  durationSeconds: number | null = null,
  options: {
    minChapterSeconds?: number;
    singlePassMaxSeconds?: number;
  } = {},
): ChapterPlanResult {
  const minChapterSeconds =
    options.minChapterSeconds ?? DEFAULT_MIN_CHAPTER_SECONDS;
  const singlePassMaxSeconds =
    options.singlePassMaxSeconds ?? DEFAULT_SINGLE_PASS_MAX_SECONDS;

  if (chapters.length === 0) {
    if (durationSeconds !== null && durationSeconds > singlePassMaxSeconds) {
      const fallbackWindows = buildFallbackTimeWindows(
        durationSeconds,
        DEFAULT_FALLBACK_WINDOW_SECONDS,
        minChapterSeconds,
      );
      if (fallbackWindows.length >= 2) {
        return {
          plannedChapters: fallbackWindows,
          fitsSinglePass: false,
          coalescedCount: 0,
          autoSplitWindows: true,
        };
      }
    }
    return {
      plannedChapters: [],
      fitsSinglePass: true,
      coalescedCount: 0,
      autoSplitWindows: false,
    };
  }

  const ordered = [...chapters]
    .map((chapter) => ({
      title: chapter.title.trim().slice(0, 200),
      startSeconds: Math.max(0, Math.floor(chapter.startSeconds)),
      endSeconds: Math.max(
        Math.floor(chapter.startSeconds),
        Math.floor(chapter.endSeconds),
      ),
    }))
    .sort((left, right) => left.startSeconds - right.startSeconds);

  const totalSpanSeconds =
    durationSeconds ??
    Math.max(
      0,
      (ordered.at(-1)?.endSeconds ?? 0) - (ordered[0]?.startSeconds ?? 0),
    );

  if (totalSpanSeconds <= singlePassMaxSeconds || ordered.length < 2) {
    if (ordered.length === 1 && totalSpanSeconds > singlePassMaxSeconds) {
      const fallbackWindows = buildFallbackTimeWindows(
        totalSpanSeconds,
        DEFAULT_FALLBACK_WINDOW_SECONDS,
        minChapterSeconds,
      );
      if (fallbackWindows.length >= 2) {
        return {
          plannedChapters: fallbackWindows,
          fitsSinglePass: false,
          coalescedCount: 0,
          autoSplitWindows: true,
        };
      }
    }
    return {
      plannedChapters: [],
      fitsSinglePass: true,
      coalescedCount: 0,
      autoSplitWindows: false,
    };
  }

  const merged: YouTubeChapter[] = [];
  let pending: YouTubeChapter | null = null;

  for (let index = 0; index < ordered.length; index += 1) {
    const current: YouTubeChapter = pending
      ? combineChapterPair(pending, ordered[index])
      : ordered[index];
    pending = null;

    if (chapterSpanSeconds(current) < minChapterSeconds) {
      const next = ordered[index + 1];
      const previous = merged.at(-1);
      if (
        next &&
        (!previous || chapterSpanSeconds(next) <= chapterSpanSeconds(previous))
      ) {
        pending = current;
      } else if (previous) {
        merged[merged.length - 1] = combineChapterPair(previous, current);
      } else {
        merged.push(current);
      }
      continue;
    }

    merged.push(current);
  }

  if (pending) {
    const previous = merged.at(-1);
    if (previous) {
      merged[merged.length - 1] = combineChapterPair(previous, pending);
    } else {
      merged.push(pending);
    }
  }

  if (merged.length < 2) {
    return {
      plannedChapters: [],
      fitsSinglePass: true,
      coalescedCount: Math.max(0, ordered.length - 1),
      autoSplitWindows: false,
    };
  }

  return {
    plannedChapters: merged,
    fitsSinglePass: false,
    coalescedCount: Math.max(0, ordered.length - merged.length),
    autoSplitWindows: false,
  };
}

export function parseYouTubeMetadata(value: unknown): YouTubeMetadata {
  const metadata = (
    value && typeof value === "object" ? value : {}
  ) as RawYouTubeMetadata;
  const durationSeconds = durationValue(metadata.duration);
  const description = stringValue(metadata.description, 12_000);
  const nativeChapters = parseNativeChapters(
    metadata.chapters,
    durationSeconds,
  );
  const chapters =
    nativeChapters.length > 0
      ? nativeChapters
      : parseChaptersFromDescription(description, durationSeconds);

  return youtubeMetadataSchema.parse({
    title: stringValue(metadata.title, 240),
    channel: stringValue(metadata.channel, 240),
    uploader: stringValue(metadata.uploader, 240),
    uploadDate: uploadDateValue(metadata.upload_date),
    publishedAt: publishedAtValue(
      metadata.release_timestamp ?? metadata.timestamp,
    ),
    description,
    durationSeconds,
    chapters,
  });
}

function metadataCommandError(command: string, detail: string) {
  return new Error(`yt-dlp metadata command '${command}' failed: ${detail}`);
}

export async function getYouTubeMetadata(
  videoUrl: string,
  ytdlpPath: string,
  signal?: AbortSignal,
): Promise<YouTubeMetadata> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ytdlpPath,
      [
        "--dump-single-json",
        "--skip-download",
        "--no-playlist",
        "--no-warnings",
        "--ignore-config",
        "--",
        videoUrl,
      ],
      {
        cwd: os.tmpdir(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() =>
        reject(
          metadataCommandError(ytdlpPath, "the metadata request timed out"),
        ),
      );
    }, 25_000);

    const abortChild = () => {
      child.kill("SIGTERM");
      finish(() => reject(new Error("Metadata retrieval was cancelled.")));
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortChild);
      callback();
    };

    if (signal?.aborted) {
      abortChild();
      return;
    }
    signal?.addEventListener("abort", abortChild, { once: true });

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      finish(() =>
        reject(
          metadataCommandError(
            ytdlpPath,
            error.code === "ENOENT" ? "command not found" : error.message,
          ),
        ),
      );
    });
    child.once("close", (code) => {
      finish(() => {
        if (code !== 0) {
          reject(
            metadataCommandError(
              ytdlpPath,
              stderr.trim().slice(0, 320) || `exit code ${code ?? "unknown"}`,
            ),
          );
          return;
        }

        try {
          resolve(parseYouTubeMetadata(JSON.parse(stdout)));
        } catch (error) {
          reject(
            metadataCommandError(
              ytdlpPath,
              error instanceof Error ? error.message : "invalid JSON output",
            ),
          );
        }
      });
    });
  });
}
