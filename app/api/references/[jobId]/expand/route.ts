import { NextResponse } from "next/server";
import { z } from "zod";

import { expandBibliographyJob, isKnownJobError } from "@/lib/job-manager";
import { modelProviderSchema } from "@/lib/historical-references";

export const runtime = "nodejs";
export const maxDuration = 900;

const expandRequestSchema = z
  .object({
    provider: modelProviderSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  let options: {
    provider?: z.infer<typeof modelProviderSchema>;
    temperature?: number;
  } = {};
  try {
    const raw = await request.text();
    if (raw.trim()) {
      const parsed = expandRequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ?? "Invalid expand parameters.",
          },
          { status: 400 },
        );
      }
      options = parsed.data;
    }
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await expandBibliographyJob(jobId, options), {
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
        error: isKnownJobError(error)
          ? (error as Error).message
          : "Candidate verification expansion could not be started.",
      },
      { status: isKnownJobError(error) ? 409 : 503 },
    );
  }
}
