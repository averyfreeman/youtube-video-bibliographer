import { NextResponse } from "next/server";

import { retryBibliographyJob } from "@/lib/job-manager";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    return NextResponse.json(await retryBibliographyJob(jobId), {
      status: 202,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "Bibliography job not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The job cannot be retried.",
      },
      { status: 409 },
    );
  }
}
