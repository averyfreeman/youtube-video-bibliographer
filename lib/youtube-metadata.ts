import { spawn } from "node:child_process";
import os from "node:os";
import {
  youtubeMetadataSchema,
  type YouTubeMetadata,
} from "./youtube-metadata-schema.ts";

export { youtubeMetadataSchema };
export type { YouTubeMetadata };

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

export function parseYouTubeMetadata(value: unknown): YouTubeMetadata {
  const metadata = (
    value && typeof value === "object" ? value : {}
  ) as RawYouTubeMetadata;

  return youtubeMetadataSchema.parse({
    title: stringValue(metadata.title, 240),
    channel: stringValue(metadata.channel, 240),
    uploader: stringValue(metadata.uploader, 240),
    uploadDate: uploadDateValue(metadata.upload_date),
    publishedAt: publishedAtValue(
      metadata.release_timestamp ?? metadata.timestamp,
    ),
    description: stringValue(metadata.description, 12_000),
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
    }, 15_000);

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
