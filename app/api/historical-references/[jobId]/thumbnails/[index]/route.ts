import { NextResponse } from "next/server";

import { getBibliographyThumbnail } from "@/lib/job-manager";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; index: string }> },
) {
  const { jobId, index: rawIndex } = await params;
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json(
      { error: "Invalid thumbnail index." },
      { status: 400 },
    );
  }

  try {
    const image = await getBibliographyThumbnail(jobId, index);
    return new NextResponse(image, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "Thumbnail not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "The thumbnail could not be read." },
      { status: 503 },
    );
  }
}
