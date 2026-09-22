import { NextResponse } from "next/server";

import { createBibliographyJob } from "@/lib/job-manager";
import { extractionRequestSchema } from "@/lib/historical-references";
import { createJobResponseSchema } from "@/lib/job-types";

export const runtime = "nodejs";
export const maxDuration = 900;

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
      await createBibliographyJob(input.data.videoUrl),
    );
    return NextResponse.json(response, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: "The local bibliography worker could not be started." },
      { status: 503 },
    );
  }
}
