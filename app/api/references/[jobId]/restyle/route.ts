import { NextResponse } from "next/server";
import { z } from "zod";

import { restyleBibliographyJob } from "@/lib/job-manager";
import { modelProviderSchema } from "@/lib/historical-references";

export const runtime = "nodejs";
export const maxDuration = 900;

const restyleRequestSchema = z
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
      const parsed = restyleRequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ?? "Invalid restyle parameters.",
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
    return NextResponse.json(await restyleBibliographyJob(jobId, options), {
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
          error instanceof Error
            ? error.message
            : "The job narrative could not be refreshed.",
      },
      { status: 409 },
    );
  }
}
