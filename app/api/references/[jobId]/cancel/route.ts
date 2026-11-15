import { NextResponse } from "next/server";

import { cancelBibliographyJob } from "@/lib/job-manager";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    return NextResponse.json(await cancelBibliographyJob(jobId));
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
      { error: "The bibliography job could not be cancelled." },
      { status: 503 },
    );
  }
}
