import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import { parseCodexJson } from "../../lib/codex.ts";
import {
  isAgyAvailable,
  parseAgyJsonOutput,
  resolveAgyModelName,
} from "../../lib/agy.ts";
import {
  buildBibliographerConfig,
  parseBibliographerToml,
} from "../../lib/bibliographer-config.ts";
import {
  buildGeminiRequestBody,
  extractGeminiResponseText,
  runGeminiJson,
} from "../../lib/gemini.ts";
import {
  mergeEditorialBatch,
  mergeEditorialSections,
} from "../../lib/editorial-synthesis.ts";
import { resolveModelProvider } from "../../lib/model-runner.ts";
import { buildVideoOverview } from "../../lib/video-overview.ts";
import {
  discussionContextInputs,
  mergeDiscussionContext,
} from "../../lib/discussion-context.ts";
import {
  parseChaptersFromDescription,
  parseYouTubeMetadata,
  planVideoChapters,
} from "../../lib/youtube-metadata.ts";
import {
  extractionRequestSchema,
  historicalReferencesSchema,
  isWeakSource,
} from "../../lib/historical-references.ts";
import { JobStore } from "../../lib/job-store.ts";
import {
  isRetryableJobStatus,
  persistedJobSchema,
} from "../../lib/job-types.ts";
import {
  calculateEtaSeconds,
  isTerminalJobStatus,
} from "../../lib/job-types.ts";
import {
  candidatePrompt,
  computeContiguousProcessedUntil,
  computeResumeCursor,
  deduplicateCandidates,
  effectiveHitLimit,
  preserveSuppliedCandidates,
  preserveSuppliedHits,
  selectBalancedCandidates,
} from "../../lib/job-pipeline.ts";
import {
  buildPolicyBraintrustPayload,
  renderPolicyBraintrustMdx,
  toPolicyTimelineItems,
} from "../../lib/policy-braintrust-export.ts";
import { parseCliArgs } from "../../scripts/bibliographer-cli.ts";
import {
  isIntroductionOrShowMetadata,
  isMeaningfulPhrase,
} from "../../lib/phrase-curation.ts";
import {
  renderBibliographyMarkdown,
  timestampUrl,
  timestampWindowUrl,
} from "../../lib/markdown-export.ts";
import {
  chunkTranscript,
  filterTranscriptByRange,
  filterTranscriptFromTimestamp,
  formatTimestamp,
  parseTimeParameter,
  parseTimestampRange,
  parseTimestampStart,
  transcriptContextForTimestamp,
  type NormalizedTranscriptSegment,
} from "../../lib/youtube-transcript.ts";
import { getProcessDiagramConfig } from "../../lib/process-diagram.ts";
import { storyboardTileForTimestamp } from "../../lib/storyboard.ts";
import {
  briefEvidence,
  matchConfidencePercent,
  selectPrimarySource,
} from "../../lib/presentation.ts";

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

test("loads project TOML with thorough bounded retrieval defaults", () => {
  const values = parseBibliographerToml(`
    [prompt]
    file = "DEFAULT_PROMPT.md"
    [processing]
    reasoning_effort = "medium"
    candidate_reasoning_effort = "high"
    synthesis_reasoning_effort = "medium"
    overview_reasoning_effort = "xhigh"
    max_hits = 65
    max_runtime_minutes = 15
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
  assert.equal(config.processing.chunkCharacters, 12_000);
  assert.equal(config.processing.maxCandidatesPerChunk, 16);
  assert.equal(config.processing.softMaxHits, 50);
  assert.equal(config.processing.maxHits, 65);
  assert.equal(config.processing.tailGraceSeconds, 300);
  assert.equal(config.processing.maxRuntimeSeconds, 900);
  assert.equal(config.processing.verificationBatchSize, 8);

  const boundedConfig = buildBibliographerConfig(
    parseBibliographerToml(`
      [processing]
      max_hits = 1000
      max_runtime_minutes = 120
    `),
    "phrase-only",
    "/tmp/bibliographer.config.toml",
    "/tmp/DEFAULT_PROMPT.md",
  );
  assert.equal(boundedConfig.processing.maxHits, 500);
  assert.equal(boundedConfig.processing.softMaxHits, 50);
  assert.equal(boundedConfig.processing.maxRuntimeSeconds, 3_600);
});

test("uses the hard hit ceiling only for the transcript tail", () => {
  assert.equal(effectiveHitLimit(0, 1_000, 40, 52, 300), 40);
  assert.equal(effectiveHitLimit(699, 1_000, 40, 52, 300), 40);
  assert.equal(effectiveHitLimit(700, 1_000, 40, 52, 300), 52);
  assert.equal(effectiveHitLimit(1_000, 1_000, 40, 52, 300), 52);
});

test("builds compact evidence and deterministic source-match grades", () => {
  assert.deepEqual(briefEvidence("The quote remains short."), {
    text: "The quote remains short.",
    isTruncated: false,
  });
  assert.deepEqual(
    briefEvidence(
      "The speaker references the railroad mania bubble and its later collapse.",
    ),
    {
      text: "The speaker references the railroad mania bubble and its…",
      isTruncated: true,
    },
  );

  const sources = [
    {
      title: "Secondary discussion",
      url: "https://example.com/secondary",
      quality: "secondary" as const,
      note: null,
    },
    {
      title: "Primary archive",
      url: "https://example.com/primary",
      quality: "primary" as const,
      note: null,
    },
  ];
  assert.equal(selectPrimarySource(sources)?.title, "Primary archive");
  assert.equal(
    matchConfidencePercent({
      confidence: "high",
      verificationStatus: "verified",
      sources,
    }),
    99.9,
  );
  assert.equal(
    matchConfidencePercent({
      confidence: "medium",
      verificationStatus: "needs_review",
      sources: [],
    }),
    50,
  );
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
  assert.match(markdown, /- Speakers: The host, The guest/);
  assert.match(markdown, /- Subject: Historical interpretation/);
  assert.match(markdown, /### Discussion topic/);
  assert.match(markdown, /### Why this reference matters/);
  assert.match(markdown, /Speaker: The guest/);
  assert.equal(isWeakSource(hit.sources[0]), true);

  const withoutContext = renderBibliographyMarkdown(
    "https://www.youtube.com/watch?v=example123",
    null,
    [{ ...hit, speaker: null, discussionContextParagraphs: [] }],
  );
  assert.doesNotMatch(withoutContext, /Discussion topic/);
  assert.doesNotMatch(withoutContext, /Speaker not established/);
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

    const legacyRecord = { ...created } as unknown as Record<string, unknown>;
    delete legacyRecord.softMaxHits;
    delete legacyRecord.tailGraceSeconds;
    const normalizedLegacy = persistedJobSchema.parse(legacyRecord);
    assert.equal(normalizedLegacy.softMaxHits, 50);
    assert.equal(normalizedLegacy.tailGraceSeconds, 300);
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
      { maxHits: 1_000, maxRuntimeSeconds: 7_200 },
    );
    assert.equal(created.maxHits, 500);
    assert.equal(created.softMaxHits, 50);
    assert.equal(created.tailGraceSeconds, 300);
    assert.equal(created.maxRuntimeSeconds, 3_600);
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
    assert.equal(snapshot.canResume, true);
    assert.equal(snapshot.timing.budgetSeconds, 3_600);
    assert.equal(snapshot.processedUntilSeconds, 599);
    assert.equal(snapshot.resumeFromSeconds, 600);
    assert.equal(snapshot.resumeUrl?.endsWith("t=600s"), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("only failed, cancelled, interrupted, and capped jobs are resumable", () => {
  assert.equal(isRetryableJobStatus("failed"), true);
  assert.equal(isRetryableJobStatus("cancelled"), true);
  assert.equal(isRetryableJobStatus("interrupted"), true);
  assert.equal(isRetryableJobStatus("capped"), true);
  assert.equal(isRetryableJobStatus("completed"), false);
  assert.equal(isRetryableJobStatus("running"), false);
  assert.equal(isTerminalJobStatus("capped"), true);
});

test("accepts public_policy and economics_research categories and balances timeline shortlist", () => {
  const parsed = historicalReferencesSchema.safeParse({
    hits: [
      {
        title: "Affordable Care Act",
        category: "public_policy",
        evidenceType: "reference",
        timestamp: "00:05:10",
        timestampSeconds: 310,
        historicalDate: "2010",
        videoEvidence: "Under the Affordable Care Act medical loss ratio rule.",
        confidence: "high",
        confidenceReasons: ["Named federal statute explicitly discussed."],
        verificationStatus: "verified",
        verificationNote: "Verified against statutory text.",
        analysisParagraphs: ["Established federal MLR thresholds."],
        sources: [],
      },
      {
        title: "RAND Health Insurance Experiment",
        category: "economics_research",
        evidenceType: "reference",
        timestamp: "00:18:45",
        timestampSeconds: 1125,
        historicalDate: "1974-1982",
        videoEvidence:
          "The RAND Health Insurance Experiment found cost-sharing effects.",
        confidence: "high",
        confidenceReasons: ["Landmark empirical health economics study."],
        verificationStatus: "verified",
        verificationNote: "Verified against RAND report.",
        analysisParagraphs: ["Found cost sharing reduced utilization."],
        sources: [],
      },
    ],
  });
  assert.equal(parsed.success, true);

  const manyCandidates = Array.from({ length: 24 }, (_, idx) => ({
    title: `Policy Study ${idx + 1}`,
    category: (idx % 2 === 0 ? "public_policy" : "economics_research") as
      "public_policy" | "economics_research",
    evidenceType: "reference" as const,
    timestamp: formatTimestamp(idx * 100_000),
    timestampSeconds: idx * 100,
    historicalDate: null,
    videoEvidence: `Reference ${idx + 1} in transcript.`,
  }));
  const balanced = selectBalancedCandidates(manyCandidates, 8);
  assert.equal(balanced.length, 8);
  assert.ok(balanced[0]!.timestampSeconds < 600);
  assert.ok(balanced[balanced.length - 1]!.timestampSeconds >= 1_800);
});

test("computes contiguous progress and returns null resume cursor when all chunks finished", () => {
  const chunks = [
    {
      index: 0,
      text: "00:00:00 | a",
      startTimestamp: "00:00:00",
      endTimestamp: "00:05:00",
      segments: [segment(0, "a"), segment(300, "b")],
    },
    {
      index: 1,
      text: "00:05:00 | c",
      startTimestamp: "00:05:00",
      endTimestamp: "00:10:00",
      segments: [segment(300, "c"), segment(600, "d")],
    },
  ];
  const candidate = {
    title: "Policy Item",
    category: "public_policy" as const,
    evidenceType: "reference" as const,
    timestamp: "00:01:00",
    timestampSeconds: 60,
    historicalDate: null,
    videoEvidence: "Policy item evidence.",
  };

  assert.equal(
    computeContiguousProcessedUntil(chunks, { "1": [candidate] }, 0),
    0,
  );
  assert.equal(computeResumeCursor(chunks, { "0": [candidate] }, [], 600), 300);
  assert.equal(
    computeResumeCursor(
      chunks,
      { "0": [candidate], "1": [candidate] },
      [],
      600,
    ),
    null,
  );
});

test("builds policy-braintrust timeline items, MDX dossier, and parses CLI args", () => {
  const hit = {
    title: "Medicare Advantage Risk Adjustment",
    category: "public_policy" as const,
    evidenceType: "reference" as const,
    timestamp: "00:12:30",
    timestampSeconds: 750,
    historicalDate: "2024",
    videoEvidence: "CMS risk adjustment coding rules for Medicare Advantage.",
    speaker: null,
    confidence: "high" as const,
    confidenceReasons: ["Explicitly cited in CMS rule."],
    verificationStatus: "verified" as const,
    verificationNote: "Confirmed in CMS 2024 final rule.",
    analysisParagraphs: ["Explains upcoding incentives in Medicare Advantage."],
    discussionContextParagraphs: [],
    sources: [
      {
        title: "CMS Final Rule",
        url: "https://www.cms.gov/example",
        quality: "primary" as const,
        note: null,
      },
    ],
  };

  const timeline = toPolicyTimelineItems(
    "https://www.youtube.com/watch?v=example123",
    [hit],
  );
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0]?.date, "2024");
  assert.equal(timeline[0]?.sourceUrl, "https://www.cms.gov/example");
  assert.equal(
    timeline[0]?.videoTimestampUrl,
    "https://www.youtube.com/watch?v=example123&t=750s",
  );

  const mdx = renderPolicyBraintrustMdx({
    jobId: "00000000-0000-4000-8000-000000000004",
    status: "completed",
    videoUrl: "https://www.youtube.com/watch?v=example123",
    videoOverview: {
      title: "Policy Briefing",
      channel: "Policy Channel",
      date: "2026-10-01",
      dateKind: "uploaded",
      people: ["Host"],
      theme: "Healthcare policy",
      summary: "Summary of Medicare Advantage policy.",
    },
    hits: [hit],
    markdown: "# Export",
  });
  assert.match(mdx, /PolicyTimeline/);
  assert.match(mdx, /PolicyStatGrid/);
  assert.match(mdx, /Medicare Advantage Risk Adjustment/);

  const payload = buildPolicyBraintrustPayload(
    {
      jobId: "00000000-0000-4000-8000-000000000004",
      status: "completed",
      videoUrl: "https://www.youtube.com/watch?v=example123",
      videoOverview: null,
      hits: [hit],
      markdown: "# Export",
    },
    { categories: ["economics_research"] },
  );
  assert.equal(payload.hits.length, 0);

  const cli = parseCliArgs([
    "run",
    "https://www.youtube.com/watch?v=example123",
    "--format",
    "policy-mdx",
    "--no-limit",
    "--categories",
    "public_policy,economics_research",
  ]);
  assert.equal(cli.command, "run");
  assert.equal(cli.format, "policy-mdx");
  assert.equal(cli.noLimit, true);
  assert.deepEqual(cli.categories, ["public_policy", "economics_research"]);
});

test("supports Gemini request builder, provider resolution, and gpt-6-luna / hydrogen defaults", async () => {
  const cfg = buildBibliographerConfig(
    {},
    "prompt",
    "c.toml",
    "DEFAULT_PROMPT.md",
  );
  assert.equal(cfg.llm.codexModel, "gpt-6-luna");
  assert.equal(cfg.llm.agyModel, "gemini-4-hydrogen");
  assert.equal(cfg.llm.geminiModel, "gemini-4-hydrogen");
  assert.equal(cfg.llm.temperature, 0.15);
  assert.equal(cfg.llm.editorialTemperature, 1.0);

  assert.equal(resolveModelProvider(undefined, "auto", false, false), "codex");
  assert.equal(resolveModelProvider(undefined, "auto", false, true), "agy");
  assert.equal(resolveModelProvider(undefined, "auto", true, true), "gemini");
  assert.equal(resolveModelProvider("agy", "auto", false, true), "agy");
  assert.equal(resolveModelProvider("gemini", "auto", false, true), "agy");
  assert.equal(resolveModelProvider("codex", "auto", true, true), "codex");

  assert.equal(
    resolveAgyModelName("gemini-4-hydrogen", "high"),
    "gemini-4-hydrogen-high",
  );
  assert.equal(
    resolveAgyModelName("gemini-4-hydrogen", "medium"),
    "gemini-4-hydrogen-medium",
  );
  assert.equal(
    resolveAgyModelName("gemini-4-hydrogen", "max"),
    "gemini-4-hydrogen-xhigh",
  );
  assert.equal(
    resolveAgyModelName("gemini-4-argon", "max"),
    "gemini-4-argon-high",
  );
  assert.equal(
    resolveAgyModelName("gemini-3.8-flash-low", "high"),
    "gemini-3.8-flash-low",
  );
  assert.equal(
    isAgyAvailable({ AGY_CLI_PATH: "/definitely/missing/agy-bin" }, "/tmp"),
    false,
  );
  assert.deepEqual(
    parseAgyJsonOutput(
      JSON.stringify({
        status: "SUCCESS",
        structured_output: { sections: [{ title: "Act I" }] },
      }),
    ),
    { sections: [{ title: "Act I" }] },
  );
  assert.deepEqual(
    parseAgyJsonOutput(
      'warning: non-json line\n{"status":"SUCCESS","response":"{\\"ok\\":true}"}',
    ),
    { ok: true },
  );
  assert.throws(
    () =>
      parseAgyJsonOutput(
        JSON.stringify({ status: "ERROR", error: "401 Unauthorized" }),
      ),
    (error: unknown) =>
      error instanceof Error &&
      "kind" in error &&
      (error as { kind: string }).kind === "auth",
  );

  const editorialReq = buildGeminiRequestBody({
    prompt: "hello",
    webSearch: false,
    temperature: 0.85,
    topK: 40,
  });
  assert.deepEqual(editorialReq.generationConfig, {
    temperature: 0.85,
    topK: 40,
    responseMimeType: "application/json",
  });

  const searchReq = buildGeminiRequestBody({
    prompt: "verify",
    webSearch: true,
    temperature: 0.35,
  });
  assert.deepEqual(searchReq.tools, [{ google_search: {} }]);
  assert.equal(
    (searchReq.generationConfig as Record<string, unknown>).responseMimeType,
    undefined,
  );

  const text = extractGeminiResponseText({
    candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
  });
  assert.equal(text, '{"ok":true}');

  let seenUrl = "";
  const parsed = await runGeminiJson({
    prompt: "hello",
    apiKey: "test-key",
    model: "gemini-4-hydrogen",
    temperature: 0.85,
    fetchImpl: (async (url: string | URL | Request) => {
      seenUrl = String(url);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"sections":[]}\n```' }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch,
  });
  assert.match(seenUrl, /gemini-4-hydrogen:generateContent/);
  assert.deepEqual(parsed, { sections: [] });
});

test("merges editorial narrative and folds every hit into chronological sections cleanly", () => {
  const hitA = {
    title: "Glass-Steagall Repeal",
    category: "regulation" as const,
    evidenceType: "reference" as const,
    timestamp: "00:03:01",
    timestampSeconds: 181,
    historicalDate: "1999",
    videoEvidence: "Nobody said a word when Glass-Steagall was repealed.",
    speaker: null,
    confidence: "high" as const,
    confidenceReasons: ["Named federal statute."],
    verificationStatus: "verified" as const,
    verificationNote: "Confirmed.",
    analysisParagraphs: ["Dry initial note."],
    discussionContextParagraphs: [],
    sources: [
      {
        title: "Federal Reserve History",
        url: "https://example.com/fed-glba",
        quality: "primary" as const,
        note: null,
      },
    ],
  };
  const hitB = {
    ...hitA,
    title: "Credit Default Swaps",
    timestamp: "00:07:12",
    timestampSeconds: 432,
    sources: [],
  };

  const merged = mergeEditorialBatch(
    [hitA, hitB],
    {
      items: [
        {
          title: "Glass-Steagall Repeal",
          speaker: "Host One",
          whatTheyWereTalkingAbout:
            "He points out how quiet Congress was right before 2008.",
          whyItMatters: [
            "Tearing down the 1933 wall between commercial and investment banks set the fuse for 2008.",
          ],
          sourceNotes: [
            {
              url: "https://example.com/fed-glba",
              note: "Fed essay breaking down the 1999 Gramm-Leach-Bliley Act.",
            },
            {
              url: "https://invented.example.com/ignored",
              note: "Must be ignored",
            },
          ],
        },
      ],
    },
    ["Host One"],
  );

  assert.equal(merged[0]?.speaker, "Host One");
  assert.match(
    merged[0]?.analysisParagraphs[0] ?? "",
    /1933 wall between commercial and investment banks/,
  );
  assert.equal(merged[0]?.sources.length, 1);
  assert.equal(
    merged[0]?.sources[0]?.note,
    "Fed essay breaking down the 1999 Gramm-Leach-Bliley Act.",
  );

  // Hit B was omitted by the sectioning pass and must be folded in rather than dropped.
  const sections = mergeEditorialSections(merged, [
    {
      title: "Part I: Deregulation & Crises",
      summary: "Why 1990s banking rules blew up in 2008.",
      hitTitles: ["Glass-Steagall Repeal"],
    },
  ]);
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0]?.hitTitles, [
    "Glass-Steagall Repeal",
    "Credit Default Swaps",
  ]);

  const md = renderBibliographyMarkdown(
    "https://www.youtube.com/watch?v=example123",
    null,
    merged,
    sections,
  );
  assert.match(md, /## Part I: Deregulation & Crises/);
  assert.match(md, /Fed essay breaking down the 1999 Gramm-Leach-Bliley Act/);
  assert.match(md, /<summary>Verification & audit<\/summary>/);

  const mdx = renderPolicyBraintrustMdx({
    jobId: "00000000-0000-4000-8000-000000000005",
    status: "completed",
    videoUrl: "https://www.youtube.com/watch?v=example123",
    videoOverview: null,
    hits: merged,
    sections,
    markdown: md,
  });
  assert.match(mdx, /Part I: Deregulation & Crises/);
  assert.match(mdx, /Source note: Fed essay breaking down/);

  const restyleCli = parseCliArgs([
    "restyle",
    "9346afac-a74f-4638-8e26-aa8c638ef446",
    "--provider",
    "gemini",
    "--temperature",
    "0.9",
  ]);
  assert.equal(restyleCli.command, "restyle");
  assert.equal(restyleCli.provider, "gemini");
  assert.equal(restyleCli.temperature, 0.9);
});

test("supports start/end time ranges, chapter detection, unverified candidate counts, and expand CLI", async () => {
  assert.equal(parseTimeParameter("1:05:30"), 3930);
  assert.equal(parseTimeParameter("12:30"), 750);
  assert.equal(parseTimeParameter("1h2m3s"), 3723);
  assert.deepEqual(
    parseTimestampRange(
      "https://www.youtube.com/watch?v=abc123&t=10m&end=25:00",
    ),
    { startSeconds: 600, endSeconds: 1500 },
  );
  assert.deepEqual(
    parseTimestampRange(
      "https://www.youtube.com/watch?v=abc123&start=120&stop=300",
    ),
    { startSeconds: 120, endSeconds: 300 },
  );
  assert.equal(
    timestampWindowUrl(
      "https://www.youtube.com/watch?v=abc123&t=10s&end=99s",
      600,
      1500,
    ),
    "https://www.youtube.com/watch?v=abc123&t=600s&end=1500s",
  );

  const sampleSegments = [
    segment(0, "Zero"),
    segment(60, "Opening"),
    segment(180, "Middle"),
    segment(360, "Closing"),
  ];
  assert.deepEqual(
    filterTranscriptByRange(sampleSegments, 60, 180).map((item) => item.text),
    ["Opening", "Middle"],
  );

  const descriptionChapters = parseChaptersFromDescription(
    [
      "Topics covered:",
      "00:00 Introduction & Framing",
      "14:30 New Deal Banking Rules",
      "01:02:15 2008 Liquidity Crunch",
    ].join("\n"),
    5400,
  );
  assert.equal(descriptionChapters.length, 3);
  assert.deepEqual(descriptionChapters[0], {
    title: "Introduction & Framing",
    startSeconds: 0,
    endSeconds: 869,
  });
  assert.deepEqual(descriptionChapters[2], {
    title: "2008 Liquidity Crunch",
    startSeconds: 3735,
    endSeconds: 5400,
  });

  const metadata = parseYouTubeMetadata({
    title: "Long Lecture",
    channel: "Policy Lab",
    duration: 5400,
    chapters: [
      { title: "Part 1", start_time: 0, end_time: 1800 },
      { title: "Part 2", start_time: 1800, end_time: 5400 },
    ],
  });
  assert.equal(metadata.durationSeconds, 5400);
  assert.equal(metadata.chapters.length, 2);
  assert.equal(metadata.chapters[1]?.title, "Part 2");

  const directory = await mkdtemp(
    path.join(os.tmpdir(), "video-bibliographer-expand-"),
  );
  try {
    const store = new JobStore(directory);
    const created = await store.create(
      "https://www.youtube.com/watch?v=example123&t=600s",
      "00000000-0000-4000-8000-000000000009",
      {
        extractionDepth: "curated",
        processingEndSeconds: 1500,
      },
    );
    const updated = await store.write({
      ...created,
      status: "completed",
      phase: "completed",
      candidatesByChunk: {
        "0": [
          {
            title: "Glass-Steagall Act",
            category: "regulation",
            evidenceType: "reference",
            timestamp: "00:11:00",
            timestampSeconds: 660,
            historicalDate: "1933",
            videoEvidence: "Glass-Steagall separated banking.",
          },
          {
            title: "Bretton Woods Conference",
            category: "event",
            evidenceType: "reference",
            timestamp: "00:18:00",
            timestampSeconds: 1080,
            historicalDate: "1944",
            videoEvidence: "Delegates met at Bretton Woods.",
          },
        ],
      },
      hits: [
        {
          title: "Glass-Steagall Act",
          category: "regulation",
          evidenceType: "reference",
          timestamp: "00:11:00",
          timestampSeconds: 660,
          historicalDate: "1933",
          videoEvidence: "Glass-Steagall separated banking.",
          speaker: null,
          confidence: "high",
          confidenceReasons: ["Explicit statute reference."],
          verificationStatus: "verified",
          verificationNote: "Verified.",
          analysisParagraphs: ["1933 U.S. banking statute."],
          discussionContextParagraphs: [],
          sources: [],
        },
      ],
    });
    const snapshot = store.snapshot(updated);
    assert.equal(snapshot.extractionDepth, "curated");
    assert.equal(snapshot.processingStartSeconds, 600);
    assert.equal(snapshot.processingEndSeconds, 1500);
    assert.equal(snapshot.unverifiedCandidateCount, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const rangeCli = parseCliArgs([
    "run",
    "https://www.youtube.com/watch?v=example123",
    "--start",
    "12:30",
    "--end",
    "1:05:00",
    "--all-candidates",
  ]);
  assert.equal(rangeCli.startSeconds, 750);
  assert.equal(rangeCli.endSeconds, 3900);
  assert.equal(rangeCli.allCandidates, true);

  const expandCli = parseCliArgs([
    "expand",
    "9346afac-a74f-4638-8e26-aa8c638ef446",
    "--provider",
    "codex",
  ]);
  assert.equal(expandCli.command, "expand");
  assert.equal(expandCli.target, "9346afac-a74f-4638-8e26-aa8c638ef446");
  assert.equal(expandCli.provider, "codex");

  const allSectionsCli = parseCliArgs([
    "run",
    "https://www.youtube.com/watch?v=example123",
    "--all-sections",
  ]);
  assert.equal(allSectionsCli.command, "run");
  assert.equal(allSectionsCli.allSections, true);
});

test("coalesces tiny chapters (<3m), collapses short videos into 1 pass, and persists chapter plans", async () => {
  // Video <= 45m fits in 1 pass even with chapters
  const shortPlan = planVideoChapters(
    [
      { title: "Part 1", startSeconds: 0, endSeconds: 1200 },
      { title: "Part 2", startSeconds: 1201, endSeconds: 2400 },
    ],
    2400,
  );
  assert.equal(shortPlan.fitsSinglePass, true);
  assert.deepEqual(shortPlan.plannedChapters, []);

  // 2h30m video with <3m intro, middle bridge, and outro merges short chapters cleanly
  const longPlan = planVideoChapters(
    [
      { title: "Intro", startSeconds: 0, endSeconds: 45 },
      { title: "Chapter 1", startSeconds: 46, endSeconds: 2000 },
      { title: "Quick Ad Break", startSeconds: 2001, endSeconds: 2060 },
      { title: "Chapter 2", startSeconds: 2061, endSeconds: 8899 },
      { title: "Outro", startSeconds: 8900, endSeconds: 9000 },
    ],
    9000,
  );
  assert.equal(longPlan.fitsSinglePass, false);
  assert.equal(longPlan.coalescedCount, 3);
  assert.equal(longPlan.plannedChapters.length, 2);
  assert.equal(longPlan.plannedChapters[0]?.startSeconds, 0);
  assert.equal(
    longPlan.plannedChapters[0]?.title,
    "Intro / Chapter 1 / Quick Ad Break",
  );
  assert.equal(longPlan.plannedChapters[1]?.endSeconds, 9000);
  assert.equal(longPlan.plannedChapters[1]?.title, "Chapter 2 / Outro");

  const directory = await mkdtemp(
    path.join(os.tmpdir(), "video-bibliographer-plan-"),
  );
  try {
    const store = new JobStore(directory);
    const created = await store.create(
      "https://www.youtube.com/watch?v=example123",
      "00000000-0000-4000-8000-000000000010",
      {
        chapterPlan: longPlan.plannedChapters,
        allowUnlimited: true,
        maxRuntimeSeconds: 7200,
      },
    );
    assert.equal(created.chapterPlan.length, 2);
    assert.equal(created.completedChapters, 0);
    assert.equal(created.currentChapterIndex, null);
    const snapshot = store.snapshot(created);
    assert.equal(snapshot.chapterPlan.length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("prioritizes research focus prompt and target categories across prompt, selection, store, and CLI", async () => {
  const defaultConfig = buildBibliographerConfig(
    {},
    "Base bibliographer prompt.",
    "bibliographer.config.toml",
    "DEFAULT_PROMPT.md",
  );
  const chunk = {
    index: 0,
    startSeconds: 0,
    endSeconds: 120,
    startTimestamp: "00:00:00",
    endTimestamp: "00:02:00",
    text: "[00:00:10] Discussion of Sherman Antitrust Act.",
    segments: [],
  };

  const unfocusedPrompt = candidatePrompt(chunk, defaultConfig);
  assert.equal(
    unfocusedPrompt.includes("USER RESEARCH FOCUS & TARGET CRITERIA:"),
    false,
  );

  const focusedPrompt = candidatePrompt(chunk, defaultConfig, {
    focusPrompt: "Focus on FTC merger enforcement and hospital consolidation",
    targetCategories: ["economics_research", "public_policy"],
  });
  assert.match(focusedPrompt, /USER RESEARCH FOCUS & TARGET CRITERIA:/);
  assert.match(focusedPrompt, /Economics research, Public policy/);
  assert.match(
    focusedPrompt,
    /Focus on FTC merger enforcement and hospital consolidation/,
  );

  const candidates = [
    {
      title: "Incidental Event",
      category: "other" as const,
      evidenceType: "reference" as const,
      timestamp: "00:00:10",
      timestampSeconds: 10,
      historicalDate: null,
      videoEvidence: "We went to Chicago last week.",
    },
    {
      title: "Sherman Antitrust Act",
      category: "public_policy" as const,
      evidenceType: "reference" as const,
      timestamp: "00:00:20",
      timestampSeconds: 20,
      historicalDate: "1890",
      videoEvidence: "Under the Sherman Antitrust Act of 1890.",
    },
    {
      title: "Hospital Merger Price Study",
      category: "economics_research" as const,
      evidenceType: "direct_quote" as const,
      timestamp: "00:00:30",
      timestampSeconds: 30,
      historicalDate: null,
      videoEvidence: "Mergers raised prices by 18 percent.",
    },
    {
      title: "Celebrity Cameo",
      category: "other" as const,
      evidenceType: "direct_quote" as const,
      timestamp: "00:00:40",
      timestampSeconds: 40,
      historicalDate: null,
      videoEvidence: "Hello from New York.",
    },
  ];
  const shortlisted = selectBalancedCandidates(candidates, 2, [
    "public_policy",
    "economics_research",
  ]);
  assert.deepEqual(
    shortlisted.map((item) => item.title),
    ["Sherman Antitrust Act", "Hospital Merger Price Study"],
  );

  const validated = extractionRequestSchema.parse({
    videoUrl: "https://www.youtube.com/watch?v=example123",
    focusPrompt: "Focus on antitrust cases",
    targetCategories: ["public_policy", "economics_research"],
  });
  assert.equal(validated.focusPrompt, "Focus on antitrust cases");
  assert.deepEqual(validated.targetCategories, [
    "public_policy",
    "economics_research",
  ]);

  const cliFocus = parseCliArgs([
    "run",
    "https://www.youtube.com/watch?v=example123",
    "--focus",
    "FTC enforcement actions",
    "--categories",
    "public_policy,economics_research",
  ]);
  assert.equal(cliFocus.focusPrompt, "FTC enforcement actions");
  assert.deepEqual(cliFocus.categories, [
    "public_policy",
    "economics_research",
  ]);

  const directory = await mkdtemp(
    path.join(os.tmpdir(), "video-bibliographer-focus-"),
  );
  try {
    const store = new JobStore(directory);
    const created = await store.create(
      "https://www.youtube.com/watch?v=example123",
      "00000000-0000-4000-8000-000000000011",
      {
        focusPrompt: "  FTC enforcement actions  ",
        targetCategories: ["public_policy", "public_policy", "quote"],
      },
    );
    assert.equal(created.focusPrompt, "FTC enforcement actions");
    assert.deepEqual(created.targetCategories, ["public_policy", "quote"]);
    const snapshot = store.snapshot(created);
    assert.equal(snapshot.focusPrompt, "FTC enforcement actions");
    assert.deepEqual(snapshot.targetCategories, ["public_policy", "quote"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("parses bracketed description chapters and auto-splits long unchaptered videos into 30m windows", () => {
  const bracketed = parseChaptersFromDescription(
    "[00:00] Opening Frame\n(15:30) Second Segment\n3. 45:00 Closing Debate",
    3600,
  );
  assert.equal(bracketed.length, 3);
  assert.deepEqual(bracketed[0], {
    title: "Opening Frame",
    startSeconds: 0,
    endSeconds: 929,
  });
  assert.deepEqual(bracketed[1], {
    title: "Second Segment",
    startSeconds: 930,
    endSeconds: 2699,
  });
  assert.deepEqual(bracketed[2], {
    title: "Closing Debate",
    startSeconds: 2700,
    endSeconds: 3600,
  });

  const shortUnchaptered = planVideoChapters([], 1800);
  assert.equal(shortUnchaptered.fitsSinglePass, true);
  assert.equal(shortUnchaptered.autoSplitWindows, false);
  assert.deepEqual(shortUnchaptered.plannedChapters, []);

  const longUnchaptered = planVideoChapters([], 5400);
  assert.equal(longUnchaptered.fitsSinglePass, false);
  assert.equal(longUnchaptered.autoSplitWindows, true);
  assert.equal(longUnchaptered.plannedChapters.length, 3);
  assert.deepEqual(longUnchaptered.plannedChapters[0], {
    title: "Part 1",
    startSeconds: 0,
    endSeconds: 1799,
  });
  assert.deepEqual(longUnchaptered.plannedChapters[1], {
    title: "Part 2",
    startSeconds: 1800,
    endSeconds: 3599,
  });
  assert.deepEqual(longUnchaptered.plannedChapters[2], {
    title: "Part 3",
    startSeconds: 3600,
    endSeconds: 5400,
  });
});
