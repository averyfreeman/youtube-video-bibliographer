import { NextResponse } from "next/server";

import { getBibliographyJob } from "@/lib/job-manager";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    const job = await getBibliographyJob(jobId);
    if (!job.markdown) {
      return NextResponse.json(
        { error: "Markdown is not available until the job has results." },
        { status: 409 },
      );
    }

    return new NextResponse(job.markdown, {
      headers: {
        "Content-Disposition": 'attachment; filename="youtube-bibliography.md"',
        "Content-Type": "text/markdown; charset=utf-8",
      },
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
      { error: "The Markdown export could not be read." },
      { status: 503 },
    );
  }
}
