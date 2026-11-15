import { NextResponse } from "next/server";

import { getBibliographyJob } from "@/lib/job-manager";

export const runtime = "nodejs";

function isMissingJob(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    return NextResponse.json(await getBibliographyJob(jobId));
  } catch (error) {
    if (isMissingJob(error)) {
      return NextResponse.json(
        { error: "Bibliography job not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "The bibliography job could not be read." },
      { status: 503 },
    );
  }
}
