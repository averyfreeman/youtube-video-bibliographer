import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import type { HistoricalReference } from "./historical-references.ts";
import type { JobStore } from "./job-store.ts";

export type StoryboardFormat = {
  format_id?: string;
  format_note?: string;
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  rows?: number;
  columns?: number;
  fragments?: Array<{ url?: string }>;
};

type StoryboardInfo = {
  storyboards?: StoryboardFormat[] | Record<string, StoryboardFormat>;
  formats?: StoryboardFormat[];
};

export type StoryboardTile = {
  sheetIndex: number;
  row: number;
  column: number;
  left: number;
  top: number;
  width: number;
  height: number;
  url: string;
};

function runCommand(
  command: string,
  args: string[],
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      child.kill("SIGTERM");
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`Command '${command}' was cancelled.`));
      }
    };

    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    });
    child.once("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Command '${command}' failed.`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export function selectStoryboardFormat(info: StoryboardInfo) {
  const storyboards = Array.isArray(info.storyboards)
    ? info.storyboards
    : info.storyboards && typeof info.storyboards === "object"
      ? Object.values(info.storyboards)
      : [];
  const formats = [
    ...storyboards,
    ...(Array.isArray(info.formats)
      ? info.formats.filter(
          (format) =>
            format.format_id?.startsWith("sb") ||
            format.format_note?.toLocaleLowerCase().includes("storyboard") ||
            format.url?.includes("storyboard"),
        )
      : []),
  ].filter((format) =>
    Boolean(
      format.url &&
      format.width &&
      format.height &&
      format.rows &&
      format.columns,
    ),
  );

  return formats.sort(
    (left, right) =>
      Math.abs((left.width ?? 320) - 320) -
      Math.abs((right.width ?? 320) - 320),
  )[0] as StoryboardFormat | undefined;
}

export function storyboardTileForTimestamp(
  format: StoryboardFormat,
  timestampSeconds: number,
): StoryboardTile | null {
  const width = format.width ?? 0;
  const height = format.height ?? 0;
  const rows = format.rows ?? 0;
  const columns = format.columns ?? 0;
  const fps = format.fps && format.fps > 0 ? format.fps : 1;
  const baseUrl = format.url;
  if (!baseUrl || !width || !height || !rows || !columns) {
    return null;
  }

  const frameIndex = Math.max(0, Math.floor(timestampSeconds * fps));
  const framesPerSheet = rows * columns;
  const sheetIndex = Math.floor(frameIndex / framesPerSheet);
  const indexInSheet = frameIndex % framesPerSheet;
  const fragment = format.fragments?.[sheetIndex];
  const url = fragment?.url ?? baseUrl;

  return {
    sheetIndex,
    row: Math.floor(indexInSheet / columns),
    column: indexInSheet % columns,
    left: (indexInSheet % columns) * width,
    top: Math.floor(indexInSheet / columns) * height,
    width,
    height,
    url,
  };
}

async function readStoryboardFormat(
  ytdlpPath: string,
  videoUrl: string,
  signal?: AbortSignal,
) {
  const { stdout } = await runCommand(
    ytdlpPath,
    ["--skip-download", "--no-playlist", "--no-warnings", "-J", videoUrl],
    signal,
  );
  return selectStoryboardFormat(JSON.parse(stdout) as StoryboardInfo);
}

async function cropStoryboardTile(
  ffmpegPath: string,
  tile: StoryboardTile,
  directory: string,
  index: number,
  signal?: AbortSignal,
) {
  const response = await fetch(tile.url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Storyboard sheet returned HTTP ${response.status}.`);
  }

  const sheetPath = path.join(directory, `sheet-${index}.jpg`);
  const outputPath = path.join(directory, `tile-${index}.jpg`);
  await writeFile(sheetPath, Buffer.from(await response.arrayBuffer()));
  await runCommand(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      sheetPath,
      "-vf",
      `crop=${tile.width}:${tile.height}:${tile.left}:${tile.top}`,
      "-frames:v",
      "1",
      outputPath,
    ],
    signal,
  );
  return readFile(outputPath);
}

export async function generateStoryboardThumbnails(options: {
  store: JobStore;
  jobId: string;
  videoUrl: string;
  hits: HistoricalReference[];
  ytdlpPath: string;
  ffmpegPath: string;
  enabled: boolean;
  signal?: AbortSignal;
}) {
  const warnings: string[] = [];
  const thumbnailPaths: Record<string, string> = {};

  if (!options.enabled || options.hits.length === 0) {
    return { thumbnailPaths, warnings };
  }

  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "bibliographer-storyboard-"),
  );
  try {
    let storyboard: StoryboardFormat | undefined;
    try {
      storyboard = await readStoryboardFormat(
        options.ytdlpPath,
        options.videoUrl,
        options.signal,
      );
    } catch (error) {
      warnings.push(
        `Storyboard thumbnails were unavailable (${error instanceof Error ? error.message : "yt-dlp failed"}).`,
      );
      return { thumbnailPaths, warnings };
    }

    if (!storyboard) {
      warnings.push(
        "Storyboard thumbnails were unavailable because yt-dlp returned no storyboard format.",
      );
      return { thumbnailPaths, warnings };
    }

    for (const [index, hit] of options.hits.entries()) {
      if (options.signal?.aborted) {
        break;
      }

      const tile = storyboardTileForTimestamp(storyboard, hit.timestampSeconds);
      if (!tile) {
        continue;
      }

      try {
        const image = await cropStoryboardTile(
          options.ffmpegPath,
          tile,
          temporaryDirectory,
          index,
          options.signal,
        );
        await options.store.writeThumbnail(options.jobId, index, image);
        thumbnailPaths[String(index)] = options.store.thumbnailPath(
          options.jobId,
          index,
        );
      } catch (error) {
        warnings.push(
          `Thumbnail ${index + 1} could not be generated (${error instanceof Error ? error.message : "ffmpeg failed"}).`,
        );
      }
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  return { thumbnailPaths, warnings };
}
