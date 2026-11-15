import type {
  HistoricalReference,
  SourceQuality,
  VideoOverview,
  VideoSection,
} from "./historical-references.ts";
import { normalizePhraseTitle } from "./phrase-curation.ts";

export const exportFormats = {
  md: {
    extension: "md",
    label: "Markdown",
  },
} as const;

export type ExportFormat = keyof typeof exportFormats;

function sourceQualityLabel(quality: SourceQuality) {
  return quality.replace(/_/g, " ");
}

export function timestampUrl(videoUrl: string, seconds: number) {
  const url = new URL(videoUrl);
  url.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
  url.searchParams.delete("start");
  url.searchParams.delete("end");
  url.searchParams.delete("stop");
  return url.toString();
}

export function timestampWindowUrl(
  videoUrl: string,
  startSeconds: number,
  endSeconds: number | null = null,
) {
  const url = new URL(videoUrl);
  url.searchParams.set("t", `${Math.max(0, Math.floor(startSeconds))}s`);
  url.searchParams.delete("start");
  url.searchParams.delete("stop");
  if (endSeconds !== null) {
    url.searchParams.set(
      "end",
      `${Math.max(Math.floor(startSeconds), Math.floor(endSeconds))}s`,
    );
  } else {
    url.searchParams.delete("end");
  }
  return url.toString();
}

function overviewValue(value: string | null, fallback: string) {
  return value ?? fallback;
}

function renderVideoOverview(overview: VideoOverview | null) {
  if (!overview) {
    return [
      "## About this video",
      "",
      "A short video overview was not available for this run.",
    ].join("\n");
  }

  const dateLabel = overview.dateKind
    ? `${overview.dateKind === "uploaded" ? "Uploaded" : "Published"}: ${overviewValue(overview.date, "Not established")}`
    : `Date: ${overviewValue(overview.date, "Not established")}`;
  const people =
    overview.people.length > 0
      ? overview.people.join(", ")
      : "Not established in the video description";

  return [
    "## About this video",
    "",
    `- Title: ${overviewValue(overview.title, "Not established")}`,
    `- Channel: ${overviewValue(overview.channel, "Not established")}`,
    `- ${dateLabel}`,
    `- Speakers: ${people}`,
    `- Subject: ${overviewValue(overview.theme, "Not established")}`,
    "",
    overviewValue(
      overview.summary,
      "A concise video summary was not available for this run.",
    ),
  ].join("\n");
}

function renderReferenceSection(
  videoUrl: string,
  hit: HistoricalReference,
  index: number,
  headingPrefix: "##" | "###",
) {
  const sourceLines = hit.sources
    .map((source) => {
      const weakSourceNote =
        source.quality === "secondary" ||
        source.quality === "analysis" ||
        source.quality === "culture"
          ? " — secondary/analysis/culture source; verify independently"
          : "";
      const note = source.note ? ` — ${source.note}` : "";
      return `- [${source.title}](${source.url})${note} *(${sourceQualityLabel(source.quality)}${weakSourceNote})*`;
    })
    .join("\n");

  const metaParts = [
    `[${hit.timestamp}](${timestampUrl(videoUrl, hit.timestampSeconds)})`,
    hit.category.replace(/_/g, " "),
    ...(hit.historicalDate ? [`Reference date: ${hit.historicalDate}`] : []),
    ...(hit.speaker ? [`Speaker: ${hit.speaker}`] : []),
  ];

  const auditLines = [
    `- Evidence type: ${hit.evidenceType.replace(/_/g, " ")}`,
    `- Confidence: ${hit.confidence}`,
    `- Confidence reasons: ${hit.confidenceReasons.join("; ")}`,
    `- Verification: ${hit.verificationStatus}`,
    `- Verification note: ${hit.verificationNote}`,
    ...(hit.speaker ? [`- Speaker: ${hit.speaker}`] : []),
  ];

  return [
    `${headingPrefix} ${index + 1}. ${hit.timestamp} — ${hit.title}`,
    "",
    metaParts.join(" · "),
    "",
    `> ${hit.videoEvidence}`,
    "",
    ...(hit.discussionContextParagraphs.length > 0
      ? [
          "### Discussion topic",
          "",
          ...hit.discussionContextParagraphs,
          "",
        ]
      : []),
    "### Why this reference matters",
    "",
    ...hit.analysisParagraphs,
    "",
    "### Sources and further reading",
    "",
    sourceLines ||
      "No trustworthy source was available; verify this reference independently.",
    "",
    "<details>",
    "<summary>Verification & audit</summary>",
    "",
    ...auditLines,
    "",
    "</details>",
  ].join("\n");
}

export function renderBibliographyMarkdown(
  videoUrl: string,
  overview: VideoOverview | null,
  hits: HistoricalReference[],
  sections: VideoSection[] = [],
) {
  let body: string;

  if (hits.length === 0) {
    body = "No strong references were found.";
  } else if (sections.length > 0) {
    const hitIndexByTitle = new Map(
      hits.map((hit, index) => [
        normalizePhraseTitle(hit.title),
        { hit, index },
      ]),
    );
    const assigned = new Set<number>();
    const renderedSections: string[] = [];

    for (const section of sections) {
      const sectionHits = section.hitTitles
        .map((title) => hitIndexByTitle.get(normalizePhraseTitle(title)))
        .filter(
          (entry): entry is { hit: HistoricalReference; index: number } =>
            entry !== undefined && !assigned.has(entry.index),
        );

      if (sectionHits.length === 0) {
        continue;
      }

      for (const entry of sectionHits) {
        assigned.add(entry.index);
      }

      renderedSections.push(
        [
          `## ${section.title}`,
          "",
          section.summary,
          "",
          sectionHits
            .map((entry) =>
              renderReferenceSection(videoUrl, entry.hit, entry.index, "###"),
            )
            .join("\n\n"),
        ].join("\n"),
      );
    }

    const leftovers = hits
      .map((hit, index) => ({ hit, index }))
      .filter((entry) => !assigned.has(entry.index));

    if (leftovers.length > 0) {
      renderedSections.push(
        leftovers
          .map((entry) =>
            renderReferenceSection(videoUrl, entry.hit, entry.index, "###"),
          )
          .join("\n\n"),
      );
    }

    body =
      renderedSections.length > 0
        ? renderedSections.join("\n\n")
        : hits
            .map((hit, index) =>
              renderReferenceSection(videoUrl, hit, index, "##"),
            )
            .join("\n\n");
  } else {
    body = hits
      .map((hit, index) => renderReferenceSection(videoUrl, hit, index, "##"))
      .join("\n\n");
  }

  return [
    "# YouTube Video Bibliography",
    "",
    `Source video: [${videoUrl}](${videoUrl})`,
    "",
    renderVideoOverview(overview),
    "",
    "The references below follow the order in which they appear in the video.",
    "",
    body,
    "",
  ].join("\n");
}

export function renderExport(
  format: ExportFormat,
  videoUrl: string,
  overview: VideoOverview | null,
  hits: HistoricalReference[],
  sections: VideoSection[] = [],
) {
  if (format === "md") {
    return renderBibliographyMarkdown(videoUrl, overview, hits, sections);
  }

  const exhaustiveFormatCheck: never = format;
  return exhaustiveFormatCheck;
}
