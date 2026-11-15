import {
  referenceCategoryLabels,
  type HistoricalReference,
  type ReferenceCategory,
  type VideoSection,
} from "./historical-references.ts";
import type { JobSnapshot, PersistedJob } from "./job-types.ts";
import { renderBibliographyMarkdown, timestampUrl } from "./markdown-export.ts";
import { normalizePhraseTitle } from "./phrase-curation.ts";
import { matchConfidencePercent, selectPrimarySource } from "./presentation.ts";

export type PolicyTimelineItem = {
  date: string;
  title: string;
  summary: string;
  sourceUrl: string;
  videoTimestampUrl: string;
  auditNotes: string;
};

export type PolicyBraintrustExportOptions = {
  categories?: ReferenceCategory[];
  title?: string;
  description?: string;
  sidebarOrder?: number;
};

type JobLike = Pick<
  JobSnapshot | PersistedJob,
  "jobId" | "status" | "videoUrl" | "videoOverview" | "hits" | "markdown"
> & {
  sections?: VideoSection[];
};

export function filterHitsByCategories<T extends HistoricalReference>(
  hits: T[],
  categories?: ReferenceCategory[],
) {
  if (!categories || categories.length === 0) {
    return hits;
  }
  const allowed = new Set(categories);
  return hits.filter((hit) => allowed.has(hit.category));
}

export function toPolicyTimelineItems(
  videoUrl: string,
  hits: HistoricalReference[],
): PolicyTimelineItem[] {
  return hits.map((hit) => {
    const primary = selectPrimarySource(hit.sources);
    const videoTimestampUrl = timestampUrl(videoUrl, hit.timestampSeconds);
    const sourceUrl = primary?.url ?? videoTimestampUrl;
    const confidence = matchConfidencePercent(hit);
    const contextPart =
      hit.discussionContextParagraphs.length > 0
        ? ` Discussion context: ${hit.discussionContextParagraphs.join(" ")}`
        : "";
    const speakerPart = hit.speaker ? ` Speaker: ${hit.speaker}.` : "";
    const extraSources =
      hit.sources.length > 1
        ? ` Additional sources: ${hit.sources
            .slice(1)
            .map((source) => `${source.title} (${source.url})`)
            .join("; ")}.`
        : "";

    return {
      date: hit.historicalDate?.trim() || hit.timestamp,
      title: hit.title,
      summary:
        [
          ...hit.discussionContextParagraphs,
          ...hit.analysisParagraphs,
          ...(primary?.note ? [`Source note: ${primary.note}`] : []),
        ]
          .join(" ")
          .trim() || hit.videoEvidence.trim(),
      sourceUrl,
      videoTimestampUrl,
      auditNotes:
        `[${referenceCategoryLabels[hit.category]} @ ${hit.timestamp}] Status: ${hit.verificationStatus} (${confidence}% match grade).${speakerPart} ${hit.verificationNote}${contextPart}${extraSources}`.trim(),
    };
  });
}

export function buildPolicyBraintrustPayload(
  job: JobLike,
  options: PolicyBraintrustExportOptions = {},
) {
  const hits = filterHitsByCategories(job.hits, options.categories);
  const title =
    options.title?.trim() ||
    job.videoOverview?.title ||
    `Video Research Dossier (${job.jobId.slice(0, 8)})`;
  const description =
    options.description?.trim() ||
    job.videoOverview?.summary ||
    `Timestamped reference dossier extracted from ${job.videoUrl}.`;

  const verifiedCount = hits.filter(
    (hit) => hit.verificationStatus === "verified",
  ).length;
  const needsReviewCount = hits.filter(
    (hit) => hit.verificationStatus === "needs_review",
  ).length;
  const unavailableCount = hits.filter(
    (hit) => hit.verificationStatus === "unavailable",
  ).length;
  const policyAndRegulationCount = hits.filter(
    (hit) => hit.category === "public_policy" || hit.category === "regulation",
  ).length;
  const economicsResearchCount = hits.filter(
    (hit) => hit.category === "economics_research",
  ).length;

  const sections = (job.sections ?? []).filter((section) => {
    const visibleTitles = new Set(
      hits.map((hit) => normalizePhraseTitle(hit.title)),
    );
    return section.hitTitles.some((itemTitle) =>
      visibleTitles.has(normalizePhraseTitle(itemTitle)),
    );
  });

  const markdown =
    options.categories && options.categories.length > 0
      ? renderBibliographyMarkdown(
          job.videoUrl,
          job.videoOverview,
          hits,
          sections,
        )
      : (job.markdown ??
        renderBibliographyMarkdown(
          job.videoUrl,
          job.videoOverview,
          hits,
          sections,
        ));

  return {
    schemaVersion: 1 as const,
    jobId: job.jobId,
    status: job.status,
    videoUrl: job.videoUrl,
    overview: job.videoOverview,
    sections,
    stats: {
      totalReferences: hits.length,
      verifiedCount,
      needsReviewCount,
      unavailableCount,
      policyAndRegulationCount,
      economicsResearchCount,
    },
    hits,
    markdown,
    policyBraintrust: {
      title,
      description,
      timelineItems: toPolicyTimelineItems(job.videoUrl, hits),
    },
  };
}

function yamlEscape(value: string) {
  return JSON.stringify(value.replace(/\r?\n/g, " ").trim());
}

export function renderPolicyBraintrustMdx(
  job: JobLike,
  options: PolicyBraintrustExportOptions = {},
) {
  const payload = buildPolicyBraintrustPayload(job, options);
  const { title, description, timelineItems } = payload.policyBraintrust;
  const { stats, overview } = payload;

  const frontmatter = [
    "---",
    `title: ${yamlEscape(title)}`,
    `description: ${yamlEscape(description)}`,
    ...(options.sidebarOrder !== undefined
      ? ["sidebar:", `  order: ${options.sidebarOrder}`]
      : []),
    "---",
  ].join("\n");

  const metaLine = [
    overview?.channel ? `Channel: ${overview.channel}` : null,
    overview?.date ? `Date: ${overview.date}` : null,
    overview?.people.length
      ? `Participants: ${overview.people.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const statItems = [
    {
      label: "Total References",
      value: String(stats.totalReferences),
      description: "Curated multi-word references in video order",
      badge: payload.status,
      tone: "primary",
    },
    {
      label: "Verified Sources",
      value: String(stats.verifiedCount),
      description: `${stats.needsReviewCount} needs review · ${stats.unavailableCount} unavailable`,
      badge: "Verified",
      tone: "success",
    },
    {
      label: "Policy & Regulation",
      value: String(stats.policyAndRegulationCount),
      description: "Statutes, agency actions, and policy proposals",
      badge: "Policy",
      tone: "info",
    },
    {
      label: "Economics Research",
      value: String(stats.economicsResearchCount),
      description: "Academic studies, datasets, and economic frameworks",
      badge: "Research",
      tone: "warning",
    },
  ];

  const hitByTitle = new Map(
    payload.hits.map((hit) => [normalizePhraseTitle(hit.title), hit]),
  );

  let timelineMdx = "";
  if (payload.sections.length > 0) {
    const blocks = payload.sections
      .map((section) => {
        const sectionHits = section.hitTitles
          .map((itemTitle) => hitByTitle.get(normalizePhraseTitle(itemTitle)))
          .filter((hit): hit is HistoricalReference => hit !== undefined);
        if (sectionHits.length === 0) {
          return null;
        }
        const sectionItems = toPolicyTimelineItems(job.videoUrl, sectionHits);
        return `### ${section.title}\n\n${section.summary}\n\n<PolicyTimeline\n  heading=${JSON.stringify(section.title)}\n  items={${JSON.stringify(sectionItems, null, 2)}}\n/>`;
      })
      .filter((block): block is string => block !== null);

    timelineMdx =
      blocks.length > 0
        ? blocks.join("\n\n")
        : `<PolicyTimeline\n  heading="Chronological Video References"\n  items={${JSON.stringify(timelineItems, null, 2)}}\n/>`;
  } else {
    timelineMdx = `<PolicyTimeline\n  heading="Chronological Video References"\n  items={${JSON.stringify(timelineItems, null, 2)}}\n/>`;
  }

  return `${frontmatter}

import PolicyTimeline from "@/components/user-components/PolicyTimeline.astro";
import PolicyStatGrid from "@/components/user-components/PolicyStatGrid.astro";
import PolicyCallout from "@/components/user-components/PolicyCallout.astro";

${description}

<PolicyCallout title="Source Video & Verification Scope" tone="info">
  Extracted from ${job.videoUrl}${metaLine ? ` (${metaLine})` : ""}. Entries below link directly to primary or best-available sources and exact video timestamps.
</PolicyCallout>

<PolicyStatGrid
  heading="Reference Coverage Snapshot"
  items={${JSON.stringify(statItems, null, 2)}}
/>

## Referenced Sources & Timeline

${timelineMdx}
`;
}
