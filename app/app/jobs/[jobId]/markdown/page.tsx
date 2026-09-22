import Link from "next/link";
import { notFound } from "next/navigation";

import { getBibliographyJob } from "@/lib/job-manager";

export const dynamic = "force-dynamic";

export default async function MarkdownPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  let job;

  try {
    job = await getBibliographyJob(jobId);
  } catch {
    notFound();
  }

  if (!job || !job.markdown) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="badge badge-outline mb-3">Markdown export</div>
            <h1 className="text-3xl font-bold">YouTube Video Bibliography</h1>
            <p className="mt-2 text-base-content/70">
              The exact Markdown generated for this bibliography run.
            </p>
          </div>
          <Link className="btn btn-sm btn-outline" href="/app">
            New bibliography
          </Link>
        </div>

        <div className="mockup-code overflow-hidden">
          <pre className="markdown-output max-h-none p-4 text-sm">
            <code>{job.markdown}</code>
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            className="btn btn-primary"
            download="youtube-bibliography.md"
            href={`/api/historical-references/${job.jobId}/markdown`}
          >
            Download Markdown
          </a>
          <Link className="btn btn-ghost" href="/app">
            Back to bibliographer
          </Link>
        </div>
      </div>
    </main>
  );
}
