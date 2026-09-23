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
import { buildVideoOverview } from "../../lib/video-overview.ts";
import {
  discussionContextInputs,
  mergeDiscussionContext,
} from "../../lib/discussion-context.ts";
import { parseYouTubeMetadata } from "../../lib/youtube-metadata.ts";
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
import {
  deduplicateCandidates,
  preserveSuppliedCandidates,
  preserveSuppliedHits,
} from "../../lib/job-pipeline.ts";
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
  transcriptContextForTimestamp,
  type NormalizedTranscriptSegment,
} from "../../lib/youtube-transcript.ts";
import { getProcessDiagramConfig } from "../../lib/process-diagram.ts";
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

test("parses metadata into a reader-facing video overview", () => {
  const metadata = parseYouTubeMetadata({
    title: "A video title",
    channel: "A channel",
    upload_date: "20260922",
    timestamp: 1_758_528_000,
    description: "A short description.",
  });
  const overview = buildVideoOverview(metadata, {
    people: ["Host", "Guest", "Co-host", "Interviewer", "Mentioned"],
    theme: "Historical discussion",
    summary: "A concise orientation.",
  });

  assert.equal(overview.title, "A video title");
  assert.equal(overview.date, "2026-09-22");
  assert.equal(overview.dateKind, "uploaded");
  assert.deepEqual(overview.people, [
    "Host",
    "Guest",
    "Co-host",
    "Interviewer",
  ]);
});

test("keeps discussion enrichment bounded and exact-title only", () => {
  const hits = [
    {
      title: "A historical quote",
      category: "quote" as const,
      evidenceType: "direct_quote" as const,
      timestamp: "00:00:20",
      timestampSeconds: 20,
      historicalDate: null,
      videoEvidence: "A short quote.",
      speaker: null,
      confidence: "medium" as const,
      confidenceReasons: ["The transcript contains the phrase."],
      verificationStatus: "needs_review" as const,
      verificationNote: "Needs source review.",
      analysisParagraphs: ["Historical analysis."],
      discussionContextParagraphs: [],
      sources: [],
    },
  ];
  const inputs = discussionContextInputs(hits, [
    segment(0, "before"),
    segment(20, "near the quote"),
    segment(100, "far away"),
  ]);
  assert.match(inputs[0]?.context ?? "", /near the quote/);
  assert.doesNotMatch(inputs[0]?.context ?? "", /far away/);

  const merged = mergeDiscussionContext(
    hits,
    {
      contexts: [
        {
          title: "A historical quote",
          speaker: "Guest",
          discussionContextParagraphs: ["The pair were discussing the source."],
        },
        {
          title: "An invented title",
          speaker: "Invented speaker",
          discussionContextParagraphs: ["This must not be added."],
        },
      ],
    },
    ["Host", "Guest"],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.speaker, "Guest");
  assert.deepEqual(merged[0]?.discussionContextParagraphs, [
    "The pair were discussing the source.",
  ]);

  const unsupportedSpeaker = mergeDiscussionContext(
    hits,
    {
      contexts: [
        {
          title: "A historical quote",
          speaker: "Not listed in the description",
          discussionContextParagraphs: ["A concise context."],
        },
      ],
    },
    ["Host", "Guest"],
  );
  assert.equal(unsupportedSpeaker[0]?.speaker, null);
});

test("preserves curated candidates and verified hit order", () => {
  const candidate = {
    title: "A historical event",
    category: "event" as const,
    evidenceType: "reference" as const,
    timestamp: "00:00:10",
    timestampSeconds: 10,
    historicalDate: null,
    videoEvidence: "The event is named.",
  };
  const fallback = preserveSuppliedCandidates([], []);
  assert.deepEqual(fallback, []);

  const retained = preserveSuppliedCandidates([candidate], []);
  assert.equal(retained.length, 1);
  assert.equal(retained[0]?.title, candidate.title);
  assert.equal(retained[0]?.verificationStatus, "needs_review");

  const verified = {
    ...retained[0]!,
    title: "A HISTORICAL EVENT",
    verificationStatus: "verified" as const,
    verificationNote: "Verified against a primary source.",
  };
  const preserved = preserveSuppliedHits(retained, []);
  assert.equal(preserved[0]?.verificationStatus, "needs_review");
  assert.match(preserved[0]?.verificationNote ?? "", /retained for review/);
  assert.equal(
    preserveSuppliedHits(retained, [verified])[0]?.verificationStatus,
    "verified",
  );
  assert.equal(
    preserveSuppliedHits(retained, [verified])[0]?.title,
    candidate.title,
  );
});

test("limits discussion context to the timestamp window", () => {
  const result = transcriptContextForTimestamp(
    [
      segment(0, "outside before"),
      segment(20, "inside context"),
      segment(100, "outside after"),
    ],
    20,
    5,
  );

  assert.match(result, /inside context/);
  assert.doesNotMatch(result, /outside before/);
  assert.doesNotMatch(result, /outside after/);
});

test("keeps the overview fallback factual when evidence is unavailable", () => {
  const overview = buildVideoOverview(null, null);
  assert.equal(overview.title, null);
  assert.deepEqual(overview.people, []);
  assert.equal(overview.summary, null);
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
    candidate_reasoning_effort = "high"
    synthesis_reasoning_effort = "medium"
    overview_reasoning_effort = "xhigh"
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
  assert.equal(config.processing.candidateReasoningEffort, "high");
  assert.equal(config.processing.synthesisReasoningEffort, "medium");
  assert.equal(config.processing.overviewReasoningEffort, "xhigh");
  assert.equal(config.processing.chunkCharacters, 80_000);
  assert.equal(config.processing.maxHits, 40);
  assert.equal(config.processing.maxRuntimeSeconds, 600);

  const boundedConfig = buildBibliographerConfig(
    parseBibliographerToml(`
      [processing]
      max_hits = 80
      max_runtime_minutes = 20
    `),
    "phrase-only",
    "/tmp/bibliographer.config.toml",
    "/tmp/DEFAULT_PROMPT.md",
  );
  assert.equal(boundedConfig.processing.maxHits, 40);
  assert.equal(boundedConfig.processing.maxRuntimeSeconds, 600);
});

test("uses contrasting Mermaid palettes for dark and light themes", () => {
  const dark = getProcessDiagramConfig("dark");
  const light = getProcessDiagramConfig("light");

  assert.equal(dark.theme, "base");
  assert.equal(light.theme, "base");
  assert.equal(dark.themeVariables?.lineColor, "#f4f7fb");
  assert.equal(dark.themeVariables?.edgeLabelBackground, "#2c3644");
  assert.match(dark.themeCSS ?? "", /#f4f7fb/);
  assert.equal(light.themeVariables?.lineColor, "#18212c");
  assert.equal(light.themeVariables?.edgeLabelBackground, "#ffffff");
  assert.match(light.themeCSS ?? "", /#18212c/);
  assert.notEqual(
    dark.themeVariables?.lineColor,
    light.themeVariables?.lineColor,
  );
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
    speaker: "The guest",
    discussionContextParagraphs: [
      "The guest was connecting the quote to a broader discussion of political change.",
    ],
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
    {
      title: "Example video",
      channel: "Example channel",
      date: "2026-09-22",
      dateKind: "uploaded",
      people: ["The host", "The guest"],
      theme: "Historical interpretation",
      summary: "A discussion of historical sources.",
    },
    [hit],
  );

  assert.match(markdown, /00:02:03/);
  assert.match(markdown, /verify independently/);
  assert.match(markdown, /## About this video/);
  assert.match(markdown, /### What they were discussing/);
  assert.match(markdown, /### Why this reference matters/);
  assert.match(markdown, /Speaker: The guest/);
  assert.equal(isWeakSource(hit.sources[0]), true);

  const withoutContext = renderBibliographyMarkdown(
    "https://www.youtube.com/watch?v=example123",
    null,
    [{ ...hit, discussionContextParagraphs: [] }],
  );
  assert.doesNotMatch(withoutContext, /What they were discussing/);
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
      { maxHits: 80, maxRuntimeSeconds: 1_200 },
    );
    assert.equal(created.maxHits, 40);
    assert.equal(created.maxRuntimeSeconds, 600);
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
