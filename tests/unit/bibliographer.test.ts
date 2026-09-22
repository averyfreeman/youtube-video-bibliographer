import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import { parseCodexJson } from "../../lib/codex.ts";
import {
  buildBibliographerConfig,
  parseBibliographerToml,
} from "../../lib/bibliographer-config.ts";
import {
  historicalReferencesSchema,
  isWeakSource,
} from "../../lib/historical-references.ts";
import { JobStore } from "../../lib/job-store.ts";
import { isRetryableJobStatus } from "../../lib/job-types.ts";
import {
  calculateEtaSeconds,
  isTerminalJobStatus,
} from "../../lib/job-types.ts";
import { deduplicateCandidates } from "../../lib/job-pipeline.ts";
import {
  isIntroductionOrShowMetadata,
  isMeaningfulPhrase,
} from "../../lib/phrase-curation.ts";
import {
  renderBibliographyMarkdown,
  timestampUrl,
} from "../../lib/markdown-export.ts";
import {
  chunkTranscript,
  filterTranscriptFromTimestamp,
  formatTimestamp,
  parseTimestampStart,
  type NormalizedTranscriptSegment,
} from "../../lib/youtube-transcript.ts";
import { storyboardTileForTimestamp } from "../../lib/storyboard.ts";

function segment(
  timestampSeconds: number,
  text: string,
): NormalizedTranscriptSegment {
  const timestamp = formatTimestamp(timestampSeconds * 1000);
  return {
    text,
    offset: timestampSeconds * 1000,
    duration: 1_000,
    lang: "en",
    timestamp,
    timestampSeconds,
    line: `${timestamp} | ${text}`,
  };
}

test("formats every timestamp with hours", () => {
  assert.equal(formatTimestamp(0), "00:00:00");
  assert.equal(formatTimestamp(3_723_000), "01:02:03");
});

test("keeps transcript segments available for chunking", () => {
  const result = chunkTranscript([
    segment(0, "first"),
    segment(1, "second"),
    segment(2, "third"),
  ]);

  assert.equal(result.chunks.length, 1);
  assert.equal(result.chunks[0]?.segments[1]?.text, "second");
  assert.equal(result.truncated, false);
});

test("processes every segment without a global chunk cap", () => {
  const segments = Array.from({ length: 24 }, (_, index) =>
    segment(index * 10, `historical reference ${index}`),
  );

  const result = chunkTranscript(segments, 80);
  const coveredTimestamps = new Set(
    result.chunks.flatMap((chunk) =>
      chunk.segments.map((transcriptSegment) => transcriptSegment.timestamp),
    ),
  );

  assert.ok(result.chunks.length > 8);
  assert.equal(coveredTimestamps.size, segments.length);
  assert.equal(result.truncated, false);
});

test("splits an oversized caption line without dropping its text", () => {
  const sourceText = "reference ".repeat(80).trim();
  const result = chunkTranscript([segment(0, sourceText)], 80);
  const chunkText = result.chunks
    .flatMap((chunk) =>
      chunk.segments.map((transcriptSegment) => transcriptSegment.text),
    )
    .join(" ");

  assert.ok(result.chunks.every((chunk) => chunk.text.length <= 80));
  assert.match(chunkText, /^reference reference/);
  assert.match(chunkText, /reference$/);
  assert.equal(result.truncated, false);
});

test("adds timestamp seconds to YouTube links", () => {
  assert.equal(
    timestampUrl("https://youtu.be/example123", 245),
    "https://youtu.be/example123?t=245s",
  );
});

test("keeps only meaningful multi-word phrases and rejects introductions", () => {
  assert.equal(
    isMeaningfulPhrase({
      title: "Oligarchy",
      videoEvidence: "The speaker defines the concept.",
    }),
    false,
  );
  assert.equal(
    isMeaningfulPhrase({
      title: "Russian oligarchs",
      videoEvidence:
        "The speaker names a historical class of Russian oligarchs.",
    }),
    true,
  );
  assert.equal(
    isIntroductionOrShowMetadata({
      title: "Guest introduction",
      videoEvidence:
        "Welcome to the show; I am the host and our guest is here.",
    }),
    true,
  );
});

test("deduplicates phrases globally before verification", () => {
  const base = {
    category: "event" as const,
    evidenceType: "reference" as const,
    historicalDate: null,
    videoEvidence: "The event is named in the transcript.",
  };
  const result = deduplicateCandidates([
    {
      ...base,
      title: "The New Deal",
      timestamp: "00:01:00",
      timestampSeconds: 60,
    },
    {
      ...base,
      title: "The New Deal",
      timestamp: "00:02:00",
      timestampSeconds: 120,
    },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.timestampSeconds, 60);
});

test("loads project TOML with medium reasoning and ten-minute defaults", () => {
  const values = parseBibliographerToml(`
    [prompt]
    file = "DEFAULT_PROMPT.md"
    [processing]
    reasoning_effort = "medium"
    max_hits = 40
    max_runtime_minutes = 10
  `);
  const config = buildBibliographerConfig(
    values,
    "phrase-only",
    "/tmp/bibliographer.config.toml",
    "/tmp/DEFAULT_PROMPT.md",
  );
  assert.equal(config.processing.reasoningEffort, "medium");
  assert.equal(config.processing.chunkCharacters, 80_000);
  assert.equal(config.processing.maxHits, 40);
  assert.equal(config.processing.maxRuntimeSeconds, 600);
});

test("parses a continuation timestamp and filters earlier captions", () => {
  const videoUrl = "https://www.youtube.com/watch?v=example123&t=4m5s";
  const segments = [segment(240, "before"), segment(245, "at cursor")];
  assert.equal(parseTimestampStart(videoUrl), 245);
  assert.deepEqual(
    filterTranscriptFromTimestamp(segments, parseTimestampStart(videoUrl)).map(
      (item) => item.text,
    ),
    ["at cursor"],
  );
});

test("calculates an approximate remaining time from completed work", () => {
  assert.equal(calculateEtaSeconds(30, 2, 10), 120);
  assert.equal(calculateEtaSeconds(30, 10, 10), 0);
  assert.equal(calculateEtaSeconds(0, 0, 10), null);
});

test("maps storyboard timestamps to 320 by 180 tile crops", () => {
  const tile = storyboardTileForTimestamp(
    {
      url: "https://example.com/sheet.jpg",
      width: 320,
      height: 180,
      fps: 0.5,
      rows: 5,
      columns: 5,
      fragments: [
        { url: "https://example.com/sheet-0.jpg" },
        { url: "https://example.com/sheet-1.jpg" },
      ],
    },
    22,
  );
  assert.deepEqual(tile, {
    sheetIndex: 0,
    row: 2,
    column: 1,
    left: 320,
    top: 360,
    width: 320,
    height: 180,
    url: "https://example.com/sheet-0.jpg",
  });
});

test("renders ordered Markdown and labels weak sources", () => {
  const hit = {
    title: "A historical quote",
    category: "quote" as const,
    evidenceType: "direct_quote" as const,
    timestamp: "00:02:03",
    timestampSeconds: 123,
    historicalDate: "1968",
    videoEvidence: "A short quoted line.",
    confidence: "medium" as const,
    confidenceReasons: [
      "The wording and timestamp align with the supplied transcript.",
    ],
    verificationStatus: "needs_review" as const,
    verificationNote:
      "The secondary source should be checked against a primary record.",
    analysisParagraphs: ["The quote matters in context."],
    sources: [
      {
        title: "Culture source",
        url: "https://example.com/culture",
        quality: "culture" as const,
        note: null,
      },
    ],
  };

  const markdown = renderBibliographyMarkdown(
    "https://www.youtube.com/watch?v=example123",
    [hit],
  );

  assert.match(markdown, /00:02:03/);
  assert.match(markdown, /verify independently/);
  assert.equal(isWeakSource(hit.sources[0]), true);
});

test("parses direct Codex output", () => {
  assert.deepEqual(parseCodexJson('{"hits":[]}'), { hits: [] });
});

test("unwraps JSONL agent-message output", () => {
  const output = JSON.stringify({
    type: "item.completed",
    item: {
      type: "agent_message",
      text: JSON.stringify({ hits: [] }),
    },
  });

  assert.deepEqual(parseCodexJson(output), { hits: [] });
});

test("accepts one analysis paragraph and one source minimum", () => {
  const result = historicalReferencesSchema.safeParse({
    hits: [
      {
        title: "Event",
        category: "event",
        evidenceType: "reference",
        timestamp: "00:00:01",
        timestampSeconds: 1,
        historicalDate: null,
        videoEvidence: "An event is referenced.",
        confidence: "low",
        confidenceReasons: [
          "The transcript supports the reference, but attribution is uncertain.",
        ],
        verificationStatus: "needs_review",
        verificationNote: "The source requires independent review.",
        analysisParagraphs: ["One paragraph."],
        sources: [
          {
            title: "Reference",
            url: "https://example.com/reference",
            quality: "reputable",
            note: null,
          },
        ],
      },
    ],
  });

  assert.equal(result.success, true);
});

test("represents an unavailable source without fabricating a citation", () => {
  const result = historicalReferencesSchema.safeParse({
    hits: [
      {
        title: "Unresolved reference",
        category: "other",
        evidenceType: "reference",
        timestamp: "00:00:01",
        timestampSeconds: 1,
        historicalDate: null,
        videoEvidence: "The speaker makes an uncertain reference.",
        confidence: "low",
        confidenceReasons: [
          "The transcript does not identify the subject clearly.",
        ],
        verificationStatus: "unavailable",
        verificationNote: "No trustworthy source could be established.",
        analysisParagraphs: ["The reference remains unresolved."],
        sources: [],
      },
    ],
  });

  assert.equal(result.success, true);
});

test("persists and reloads a job snapshot from the filesystem", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "video-bibliographer-"),
  );

  try {
    const store = new JobStore(directory);
    const created = await store.create(
      "https://www.youtube.com/watch?v=example123",
      "00000000-0000-4000-8000-000000000002",
    );
    const interrupted = await store.write({
      ...created,
      status: "interrupted",
      message: "Recoverable checkpoint",
      checkpoint: "transcript",
    });
    const loaded = await store.read(created.jobId);

    assert.equal(loaded.status, "interrupted");
    assert.equal(loaded.checkpoint, "transcript");
    assert.equal(store.snapshot(interrupted).jobId, created.jobId);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("persists capped state, timing budget, and continuation metadata", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "video-bibliographer-cap-"),
  );

  try {
    const store = new JobStore(directory);
    const created = await store.create(
      "https://www.youtube.com/watch?v=example123",
      "00000000-0000-4000-8000-000000000003",
      { maxHits: 40, maxRuntimeSeconds: 600 },
    );
    const capped = await store.write({
      ...created,
      status: "capped",
      phase: "capped",
      processedUntilSeconds: 599,
      capReason: "time",
      resumeFromSeconds: 600,
      resumeUrl: "https://www.youtube.com/watch?v=example123&t=600s",
      startedAt: "2026-09-22T00:00:00.000Z",
      message: "Capped",
    });
    const snapshot = store.snapshot(capped);

    assert.equal(snapshot.status, "capped");
    assert.equal(snapshot.timing.budgetSeconds, 600);
    assert.equal(snapshot.processedUntilSeconds, 599);
    assert.equal(snapshot.resumeFromSeconds, 600);
    assert.equal(snapshot.resumeUrl?.endsWith("t=600s"), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("only failed, cancelled, and interrupted jobs are retryable", () => {
  assert.equal(isRetryableJobStatus("failed"), true);
  assert.equal(isRetryableJobStatus("cancelled"), true);
  assert.equal(isRetryableJobStatus("interrupted"), true);
  assert.equal(isRetryableJobStatus("completed"), false);
  assert.equal(isRetryableJobStatus("capped"), false);
  assert.equal(isRetryableJobStatus("running"), false);
  assert.equal(isTerminalJobStatus("capped"), true);
});
