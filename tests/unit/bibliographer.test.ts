import assert from "node:assert/strict";
import test from "node:test";

import { parseCodexJson } from "../../lib/codex.ts";
import {
  historicalReferencesSchema,
  isWeakSource,
} from "../../lib/historical-references.ts";
import {
  renderBibliographyMarkdown,
  timestampUrl,
} from "../../lib/markdown-export.ts";
import {
  chunkTranscript,
  formatTimestamp,
  type NormalizedTranscriptSegment,
} from "../../lib/youtube-transcript.ts";

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

test("adds timestamp seconds to YouTube links", () => {
  assert.equal(
    timestampUrl("https://youtu.be/example123", 245),
    "https://youtu.be/example123?t=245s",
  );
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
