import type {
  HistoricalReference,
  SourceQuality,
  VideoOverview,
} from "./historical-references.ts";

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
    `- People in the conversation: ${people}`,
    `- What the video is about: ${overviewValue(overview.theme, "Not established")}`,
    "",
    overviewValue(
      overview.summary,
      "A concise video summary was not available for this run.",
    ),
  ].join("\n");
}

export function renderBibliographyMarkdown(
  videoUrl: string,
  overview: VideoOverview | null,
  hits: HistoricalReference[],
) {
  const sections = hits.map((hit, index) => {
    const sourceLines = hit.sources
      .map((source) => {
        const weakSourceNote =
          source.quality === "secondary" ||
          source.quality === "analysis" ||
          source.quality === "culture"
            ? " — secondary/analysis/culture source; verify independently"
            : "";
        const note = source.note ? ` (${source.note})` : "";
        return `- [${source.title}](${source.url}) — ${sourceQualityLabel(source.quality)}${weakSourceNote}${note}`;
      })
      .join("\n");

    return [
      `## ${index + 1}. ${hit.timestamp} — ${hit.title}`,
      "",
      `- Category: ${hit.category.replace(/_/g, " ")}`,
      `- Evidence type: ${hit.evidenceType.replace(/_/g, " ")}`,
      `- Historical date: ${hit.historicalDate ?? "Not established"}`,
      `- Confidence: ${hit.confidence}`,
      `- Confidence reasons: ${hit.confidenceReasons.join("; ")}`,
      `- Verification: ${hit.verificationStatus}`,
      `- Verification note: ${hit.verificationNote}`,
      `- Speaker: ${hit.speaker ?? "Speaker not established in the video description"}`,
      `- Video timestamp: [${hit.timestamp}](${timestampUrl(videoUrl, hit.timestampSeconds)})`,
      "",
      `> ${hit.videoEvidence}`,
      "",
      ...(hit.discussionContextParagraphs.length > 0
        ? [
            "### What they were discussing",
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
    ].join("\n");
  });

  return [
    "# YouTube Video Bibliography",
    "",
    `Source video: [${videoUrl}](${videoUrl})`,
    "",
    renderVideoOverview(overview),
    "",
    "The references below follow the order in which they appear in the video.",
    "",
    sections.length > 0
      ? sections.join("\n\n")
      : "No strong historical references were found.",
    "",
  ].join("\n");
}

export function renderExport(
  format: ExportFormat,
  videoUrl: string,
  overview: VideoOverview | null,
  hits: HistoricalReference[],
) {
  if (format === "md") {
    return renderBibliographyMarkdown(videoUrl, overview, hits);
  }

  const exhaustiveFormatCheck: never = format;
  return exhaustiveFormatCheck;
}
