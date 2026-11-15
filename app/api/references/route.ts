import { NextResponse } from "next/server";

import { loadBibliographerConfig } from "@/lib/bibliographer-config";
import { createBibliographyJob, listBibliographyJobs } from "@/lib/job-manager";
import { extractionRequestSchema } from "@/lib/historical-references";
import { createJobResponseSchema } from "@/lib/job-types";
import { getLlmCapabilities } from "@/lib/model-runner";

export const runtime = "nodejs";
export const maxDuration = 900;

export async function GET() {
  try {
    const [jobs, config] = await Promise.all([
      listBibliographyJobs(),
      loadBibliographerConfig(),
    ]);
    return NextResponse.json({
      jobs,
      capabilities: getLlmCapabilities(config),
    });
  } catch {
    return NextResponse.json(
      { error: "Saved bibliography jobs could not be listed." },
      { status: 503 },
    );
  }
}

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

  const input = extractionRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: input.error.issues[0]?.message ?? "Enter a valid YouTube URL." },
      { status: 400 },
    );
  }

  try {
    const response = createJobResponseSchema.parse(
      await createBibliographyJob(input.data.videoUrl, {
        includeThumbnails: input.data.includeThumbnails,
        provider: input.data.provider,
        temperature: input.data.temperature,
        startSeconds: input.data.startSeconds,
        endSeconds: input.data.endSeconds,
        extractionDepth: input.data.extractionDepth,
        focusPrompt: input.data.focusPrompt,
        targetCategories: input.data.targetCategories,
        useChapterPlan: input.data.useChapterPlan,
        chapters: input.data.chapters,
      }),
    );
    return NextResponse.json(response, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: "The local bibliography worker could not be started." },
      { status: 503 },
    );
  }
}
