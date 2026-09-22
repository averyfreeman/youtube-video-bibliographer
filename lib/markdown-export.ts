import type {
  HistoricalReference,
  SourceQuality,
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

export function renderBibliographyMarkdown(
  videoUrl: string,
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
      `- Video timestamp: [${hit.timestamp}](${timestampUrl(videoUrl, hit.timestampSeconds)})`,
      "",
      `> ${hit.videoEvidence}`,
      "",
      "### Analysis",
      "",
      ...hit.analysisParagraphs,
      "",
      "### Further reading",
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
    "The hits below follow the order in which the historical references appear in the video.",
    "",
    sections.length > 0
      ? sections.join("\n\n")
      : "No historical references were found.",
    "",
  ].join("\n");
}

export function renderExport(
  format: ExportFormat,
  videoUrl: string,
  hits: HistoricalReference[],
) {
  if (format === "md") {
    return renderBibliographyMarkdown(videoUrl, hits);
  }

  const exhaustiveFormatCheck: never = format;
  return exhaustiveFormatCheck;
}
