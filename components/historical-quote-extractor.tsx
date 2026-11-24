"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  referenceCategoryLabels,
  type ExtractionDepth,
  type ModelProvider,
  type PresentationHistoricalReference,
  type ReferenceCategory,
  type VideoOverview,
  type VideoSection,
} from "@/lib/historical-references";
import {
  isTerminalJobStatus,
  type CreateJobResponse,
  type JobSnapshot,
  type JobSummary,
} from "@/lib/job-types";
import { timestampUrl } from "@/lib/markdown-export";
import { normalizePhraseTitle } from "@/lib/phrase-curation";
import {
  evidenceLabel,
  matchConfidencePercent,
  selectPrimarySource,
  sourceQualityLabel,
} from "@/lib/presentation";
import type { YouTubeChapter } from "@/lib/youtube-metadata-schema";

function readableEvidenceType(value: string) {
  return value.replace(/_/g, " ");
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "Estimating…";
  }

  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const remainder = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parseTimeInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^\d+(?::\d{1,2}){1,2}$/.test(trimmed)) {
    const parts = trimmed.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] * 3_600 + parts[1] * 60 + parts[2];
  }
  const units = [...trimmed.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
  if (units.length === 0 || units.map((part) => part[0]).join("") !== trimmed) {
    return null;
  }
  return Math.floor(
    units.reduce((total, [, amount, unit]) => {
      const multiplier = unit === "h" ? 3_600 : unit === "m" ? 60 : 1;
      return total + Number(amount) * multiplier;
    }, 0),
  );
}

function isJobSnapshot(value: unknown): value is JobSnapshot {
  return Boolean(
    value &&
    typeof value === "object" &&
    "jobId" in value &&
    "status" in value &&
    "progress" in value,
  );
}

function mergeHitsInVideoOrder(
  archived: PresentationHistoricalReference[],
  current: PresentationHistoricalReference[],
) {
  if (archived.length === 0) {
    return current;
  }
  const byKey = new Map<string, PresentationHistoricalReference>();
  for (const hit of archived) {
    byKey.set(`${hit.timestampSeconds}:${hit.title.toLocaleLowerCase()}`, hit);
  }
  for (const hit of current) {
    byKey.set(`${hit.timestampSeconds}:${hit.title.toLocaleLowerCase()}`, hit);
  }
  return Array.from(byKey.values()).sort((left, right) => {
    if (left.timestampSeconds !== right.timestampSeconds) {
      return left.timestampSeconds - right.timestampSeconds;
    }
    return left.title.localeCompare(right.title);
  });
}

function syncJobQueryParam(id: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set("jobId", id);
  } else {
    url.searchParams.delete("jobId");
  }
  window.history.replaceState(null, "", url.toString());
}

type LlmCapabilities = {
  agyConfigured?: boolean;
  geminiConfigured: boolean;
  defaultProvider: "codex" | "agy" | "gemini";
  codexModel: string;
  agyModel?: string;
  geminiModel: string;
};

type VideoInspection = {
  title: string | null;
  channel: string | null;
  durationSeconds: number | null;
  chapters: YouTubeChapter[];
  plannedChapters?: YouTubeChapter[];
  fitsSinglePass?: boolean;
  coalescedChapterCount?: number;
  autoSplitWindows?: boolean;
  metadataWarning?: string | null;
  transcriptSegmentCount: number;
  transcriptLanguage: string | null;
  requestedStartSeconds: number;
  requestedEndSeconds: number | null;
  exceedsCuratedBudget: boolean;
};

const MAX_POLL_FAILURES = 5;

type FocusTopicId =
  | "economics"
  | "public_policy"
  | "events"
  | "historical_context"
  | "politics"
  | "famous_quotes";

const FOCUS_TOPIC_OPTIONS: ReadonlyArray<{
  id: FocusTopicId;
  label: string;
  categories: ReferenceCategory[];
}> = [
  { id: "economics", label: "Economics", categories: ["economics_research"] },
  {
    id: "public_policy",
    label: "Public policy",
    categories: ["public_policy", "regulation"],
  },
  { id: "events", label: "Events", categories: ["event"] },
  {
    id: "historical_context",
    label: "Historical context",
    categories: ["event", "financial_crisis", "publication"],
  },
  {
    id: "politics",
    label: "Politics",
    categories: ["public_policy", "executive_statement"],
  },
  { id: "famous_quotes", label: "Famous quotes", categories: ["quote"] },
];

type PageSizeOption = 10 | 25 | 50 | 100 | "all";

const PAGE_SIZE_OPTIONS: ReadonlyArray<{
  value: PageSizeOption;
  label: string;
}> = [
  { value: 10, label: "10" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: "all", label: "All" },
];

export function HistoricalQuoteExtractor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [extractionDepth, setExtractionDepth] =
    useState<ExtractionDepth>("all");
  const [focusPrompt, setFocusPrompt] = useState("");
  const [selectedFocusTopics, setSelectedFocusTopics] = useState<
    FocusTopicId[]
  >([]);
  const [includeThumbnails, setIncludeThumbnails] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>("auto");
  const [editorialStyle, setEditorialStyle] = useState<
    "default" | "0.85" | "1.1"
  >("default");
  const [capabilities, setCapabilities] = useState<LlmCapabilities | null>(
    null,
  );
  const [inspection, setInspection] = useState<VideoInspection | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [archivedHits, setArchivedHits] = useState<
    PresentationHistoricalReference[]
  >([]);
  const [archivedOverview, setArchivedOverview] =
    useState<VideoOverview | null>(null);
  const [savedJobs, setSavedJobs] = useState<JobSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<
    ReferenceCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<"sections" | "chronological">(
    "sections",
  );
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [auditExpansion, setAuditExpansion] = useState<{
    defaultOpen: boolean;
    overrides: Record<string, boolean>;
  }>({ defaultOpen: false, overrides: {} });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);

  const isLoading =
    isSubmitting ||
    Boolean(job && !isTerminalJobStatus(job.status)) ||
    Boolean(jobId && pollingPaused);
  const jobStatus = job?.status;

  const combinedHits = useMemo(
    () => mergeHitsInVideoOrder(archivedHits, job?.hits ?? []),
    [archivedHits, job?.hits],
  );

  const visibleHits = useMemo(
    () =>
      selectedCategory === "all"
        ? combinedHits
        : combinedHits.filter((hit) => hit.category === selectedCategory),
    [combinedHits, selectedCategory],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<ReferenceCategory, number>();
    for (const hit of combinedHits) {
      counts.set(hit.category, (counts.get(hit.category) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [combinedHits]);

  const jobSections = job?.sections;

  const activeSections = useMemo(() => {
    if (
      viewMode !== "sections" ||
      selectedCategory !== "all" ||
      !jobSections ||
      jobSections.length === 0 ||
      archivedHits.length > 0
    ) {
      return [] as Array<{
        section: VideoSection;
        entries: Array<{
          hit: PresentationHistoricalReference;
          index: number;
        }>;
      }>;
    }

    const hitByTitle = new Map(
      visibleHits.map((hit, index) => [
        normalizePhraseTitle(hit.title),
        { hit, index },
      ]),
    );
    const assigned = new Set<number>();
    const grouped: Array<{
      section: VideoSection;
      entries: Array<{ hit: PresentationHistoricalReference; index: number }>;
    }> = [];

    for (const section of jobSections) {
      const entries = section.hitTitles
        .map((title) => hitByTitle.get(normalizePhraseTitle(title)))
        .filter(
          (
            entry,
          ): entry is { hit: PresentationHistoricalReference; index: number } =>
            entry !== undefined && !assigned.has(entry.index),
        );
      if (entries.length === 0) {
        continue;
      }
      for (const entry of entries) {
        assigned.add(entry.index);
      }
      grouped.push({ section, entries });
    }

    const leftovers = visibleHits
      .map((hit, index) => ({ hit, index }))
      .filter((entry) => !assigned.has(entry.index));

    if (leftovers.length > 0 && grouped.length > 0) {
      grouped.push({
        section: {
          title: "Additional References",
          summary:
            "Additional references preserved from this run in chronological order.",
          hitTitles: leftovers.map((entry) => entry.hit.title),
        },
        entries: leftovers,
      });
    }

    return grouped;
  }, [
    archivedHits.length,
    jobSections,
    selectedCategory,
    viewMode,
    visibleHits,
  ]);

  const orderedHitEntries = useMemo(
    () =>
      activeSections.length > 0
        ? activeSections.flatMap((group) => group.entries)
        : visibleHits.map((hit, index) => ({ hit, index })),
    [activeSections, visibleHits],
  );
  const totalVisibleHits = orderedHitEntries.length;
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(totalVisibleHits / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = pageSize === "all" ? 0 : (safePage - 1) * pageSize;
  const pageEnd =
    pageSize === "all"
      ? totalVisibleHits
      : Math.min(totalVisibleHits, pageStart + pageSize);
  const pagedEntries = useMemo(
    () => orderedHitEntries.slice(pageStart, pageEnd),
    [orderedHitEntries, pageEnd, pageStart],
  );
  const pagedSections = useMemo(() => {
    if (activeSections.length === 0) {
      return [];
    }
    const pageIndexSet = new Set(pagedEntries.map((entry) => entry.index));
    return activeSections
      .map((group) => ({
        section: group.section,
        entries: group.entries.filter((entry) => pageIndexSet.has(entry.index)),
      }))
      .filter((group) => group.entries.length > 0);
  }, [activeSections, pagedEntries]);

  function renderPaginationBar(placement: "top" | "bottom") {
    if (totalVisibleHits === 0 || totalPages <= 1) {
      return null;
    }

    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/50 px-3 py-2 text-sm"
        data-pagination-placement={placement}
      >
        <span className="text-base-content/75">
          Showing {pageStart + 1}–{pageEnd} of {totalVisibleHits} references ·
          Page {safePage} of {totalPages}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm btn-outline join-item"
            disabled={safePage <= 1}
            aria-label="First page"
            onClick={() => setCurrentPage(1)}
          >
            «
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline join-item"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            ‹ Prev
          </button>
          <span className="btn btn-sm btn-ghost join-item pointer-events-none">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline join-item"
            disabled={safePage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
          >
            Next ›
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline join-item"
            disabled={safePage >= totalPages}
            aria-label="Last page"
            onClick={() => setCurrentPage(totalPages)}
          >
            »
          </button>
        </div>
      </div>
    );
  }

  const activeOverview = job?.videoOverview ?? archivedOverview;
  const hasResults =
    combinedHits.length > 0 ||
    job?.status === "completed" ||
    job?.status === "capped";

  const refreshSavedJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/references", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        jobs?: JobSummary[];
        capabilities?: LlmCapabilities;
      };
      if (Array.isArray(payload.jobs)) {
        setSavedJobs(payload.jobs);
      }
      if (payload.capabilities) {
        setCapabilities(payload.capabilities);
      }
    } catch {
      // Listing saved runs is best-effort and must not disrupt the primary workflow.
    }
  }, []);

  const loadSavedJob = useCallback(async (requestedJobId: string) => {
    setError(null);
    setPollingPaused(false);
    setArchivedHits([]);
    setArchivedOverview(null);
    setSelectedCategory("all");
    setCurrentPage(1);
    setAuditExpansion({ defaultOpen: false, overrides: {} });

    try {
      const response = await fetch(`/api/references/${requestedJobId}`, {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isJobSnapshot(payload)) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "The bibliography job could not be loaded.",
        );
      }
      setJob(payload);
      setJobId(payload.jobId);
      setVideoUrl(payload.videoUrl);
      syncJobQueryParam(payload.jobId);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The bibliography job could not be loaded.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const listResponse = await fetch("/api/references", {
          cache: "no-store",
        });
        if (listResponse.ok) {
          const listPayload = (await listResponse.json()) as {
            jobs?: JobSummary[];
            capabilities?: LlmCapabilities;
          };
          if (!cancelled && Array.isArray(listPayload.jobs)) {
            setSavedJobs(listPayload.jobs);
          }
          if (!cancelled && listPayload.capabilities) {
            setCapabilities(listPayload.capabilities);
          }
        }
      } catch {
        // Listing saved runs is best-effort.
      }

      if (typeof window === "undefined") {
        return;
      }
      const initialJobId = new URLSearchParams(window.location.search).get(
        "jobId",
      );
      if (!initialJobId) {
        return;
      }

      try {
        const jobResponse = await fetch(`/api/references/${initialJobId}`, {
          cache: "no-store",
        });
        const jobPayload: unknown = await jobResponse.json();
        if (!cancelled && jobResponse.ok && isJobSnapshot(jobPayload)) {
          setJob(jobPayload);
          setJobId(jobPayload.jobId);
          setVideoUrl(jobPayload.videoUrl);
        }
      } catch {
        // Initial deep-link restore is best-effort.
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !jobId ||
      pollingPaused ||
      (jobStatus && isTerminalJobStatus(jobStatus))
    ) {
      return;
    }

    let stopped = false;
    let timer: number | undefined;
    let consecutiveFailures = 0;

    async function poll() {
      let retryableFailure = true;
      try {
        const response = await fetch(`/api/references/${jobId}`, {
          cache: "no-store",
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          retryableFailure =
            response.status === 408 ||
            response.status === 429 ||
            response.status >= 500;
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "The bibliography job could not be read.",
          );
        }

        if (!isJobSnapshot(payload)) {
          throw new Error("The server returned an invalid job snapshot.");
        }

        if (!stopped) {
          consecutiveFailures = 0;
          setPollingPaused(false);
          setError(null);
          setJob(payload);
          if (!isTerminalJobStatus(payload.status)) {
            timer = window.setTimeout(poll, 1_250);
          } else {
            void refreshSavedJobs();
          }
        }
      } catch (pollError) {
        if (!stopped) {
          const message =
            pollError instanceof Error
              ? pollError.message
              : "The bibliography job could not be read.";
          consecutiveFailures += 1;
          if (retryableFailure && consecutiveFailures < MAX_POLL_FAILURES) {
            setError(message);
            timer = window.setTimeout(poll, 1_250);
          } else if (retryableFailure) {
            setError(
              "Status checks are paused after repeated temporary failures. The job is still running; resume checks or cancel it.",
            );
            setPollingPaused(true);
          } else {
            setError(message);
            setJob(null);
            setJobId(null);
            setPollingPaused(false);
          }
        }
      }
    }

    void poll();
    return () => {
      stopped = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [jobId, jobStatus, pollingPaused, refreshSavedJobs]);

  async function startJob(
    requestedVideoUrl: string,
    options: {
      preserveExistingResults?: boolean;
      useChapterPlan?: boolean;
      chapters?: YouTubeChapter[];
    } = {},
  ) {
    setError(null);
    if (options.preserveExistingResults) {
      setArchivedHits(combinedHits);
      if (activeOverview) {
        setArchivedOverview(activeOverview);
      }
    } else {
      setArchivedHits([]);
      setArchivedOverview(null);
      setSelectedCategory("all");
      setCurrentPage(1);
      setAuditExpansion({ defaultOpen: false, overrides: {} });
    }

    const parsedStart =
      !options.useChapterPlan && startInput.trim()
        ? parseTimeInput(startInput)
        : null;
    if (!options.useChapterPlan && startInput.trim() && parsedStart === null) {
      setError(
        "Start time must be seconds (e.g. 600), 10m, or MM:SS / HH:MM:SS.",
      );
      return;
    }
    const parsedEnd =
      !options.useChapterPlan && endInput.trim()
        ? parseTimeInput(endInput)
        : null;
    if (!options.useChapterPlan && endInput.trim() && parsedEnd === null) {
      setError(
        "End time must be seconds (e.g. 1800), 30m, or MM:SS / HH:MM:SS.",
      );
      return;
    }
    if (parsedStart !== null && parsedEnd !== null && parsedEnd < parsedStart) {
      setError("End time must be greater than or equal to Start time.");
      return;
    }

    if (options.useChapterPlan) {
      setStartInput("");
      setEndInput("");
    }

    setJob(null);
    setJobId(null);
    setPollingPaused(false);
    setIsSubmitting(true);
    setVideoUrl(requestedVideoUrl);

    const trimmedFocusPrompt = focusPrompt.trim();
    const selectedTargetCategories = Array.from(
      new Set(
        selectedFocusTopics.flatMap(
          (topicId) =>
            FOCUS_TOPIC_OPTIONS.find((item) => item.id === topicId)
              ?.categories ?? [],
        ),
      ),
    );

    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: requestedVideoUrl,
          includeThumbnails,
          extractionDepth,
          ...(trimmedFocusPrompt ? { focusPrompt: trimmedFocusPrompt } : {}),
          ...(selectedTargetCategories.length > 0
            ? { targetCategories: selectedTargetCategories }
            : {}),
          ...(options.useChapterPlan
            ? {
                useChapterPlan: true,
                ...(options.chapters ? { chapters: options.chapters } : {}),
              }
            : {}),
          ...(parsedStart !== null ? { startSeconds: parsedStart } : {}),
          ...(parsedEnd !== null ? { endSeconds: parsedEnd } : {}),
          ...(provider !== "auto" ? { provider } : {}),
          ...(editorialStyle !== "default"
            ? { temperature: Number(editorialStyle) }
            : {}),
        }),
      });
      const payload = (await response.json()) as
        CreateJobResponse | { error?: string };

      if (!response.ok || !("jobId" in payload)) {
        throw new Error(
          "error" in payload
            ? (payload.error ?? "The bibliography worker could not be started.")
            : "The bibliography worker returned an incomplete response.",
        );
      }

      setJobId(payload.jobId);
      syncJobQueryParam(payload.jobId);
      void refreshSavedJobs();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The bibliography worker could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startJob(videoUrl);
  }

  async function cancelJob() {
    if (!jobId) {
      return;
    }

    const response = await fetch(`/api/references/${jobId}/cancel`, {
      method: "POST",
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "The job could not be cancelled.")
          : "The job could not be cancelled.",
      );
      return;
    }
    setJob(payload);
    setPollingPaused(false);
    void refreshSavedJobs();
  }

  function resumePolling() {
    setError(null);
    setPollingPaused(false);
  }

  async function retryJob(targetJobId = jobId) {
    if (!targetJobId) {
      return;
    }

    setError(null);
    setPollingPaused(false);
    const response = await fetch(`/api/references/${targetJobId}/retry`, {
      method: "POST",
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "The job could not be resumed.")
          : "The job could not be resumed.",
      );
      return;
    }
    setJob(payload);
    setJobId(payload.jobId);
    setVideoUrl(payload.videoUrl);
    syncJobQueryParam(payload.jobId);
  }

  function continueFromCursor() {
    if (!job?.resumeUrl) {
      return;
    }
    void startJob(job.resumeUrl, { preserveExistingResults: true });
  }

  async function restyleJob(targetJobId = jobId) {
    if (!targetJobId) {
      return;
    }

    setError(null);
    setPollingPaused(false);
    const response = await fetch(`/api/references/${targetJobId}/restyle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(provider !== "auto" ? { provider } : {}),
        ...(editorialStyle !== "default"
          ? { temperature: Number(editorialStyle) }
          : {}),
      }),
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "The narrative could not be refreshed.")
          : "The narrative could not be refreshed.",
      );
      return;
    }
    setJob(payload);
    setJobId(payload.jobId);
  }

  async function inspectVideo() {
    if (!videoUrl.trim()) {
      setError("Enter a YouTube URL first to inspect chapters and length.");
      return;
    }

    setError(null);
    setIsInspecting(true);
    try {
      const response = await fetch("/api/references/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const payload = (await response.json()) as
        VideoInspection | { error?: string };
      if (!response.ok || !("exceedsCuratedBudget" in payload)) {
        throw new Error(
          "error" in payload
            ? (payload.error ?? "Video inspection failed.")
            : "Video inspection returned an invalid response.",
        );
      }
      setInspection(payload);
      if (
        payload.requestedStartSeconds !== null &&
        payload.requestedStartSeconds > 0 &&
        !startInput.trim()
      ) {
        setStartInput(formatDuration(payload.requestedStartSeconds));
      }
      if (payload.requestedEndSeconds !== null && !endInput.trim()) {
        setEndInput(formatDuration(payload.requestedEndSeconds));
      }
    } catch (inspectError) {
      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "Video inspection failed.",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  async function expandJobCandidates(targetJobId = jobId) {
    if (!targetJobId) {
      return;
    }

    setError(null);
    setPollingPaused(false);
    const response = await fetch(`/api/references/${targetJobId}/expand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(provider !== "auto" ? { provider } : {}),
        ...(editorialStyle !== "default"
          ? { temperature: Number(editorialStyle) }
          : {}),
      }),
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "Candidate expansion could not be started.")
          : "Candidate expansion could not be started.",
      );
      return;
    }
    setJob(payload);
    setJobId(payload.jobId);
  }

  function applyChapterRange(chapter: YouTubeChapter) {
    setStartInput(formatDuration(chapter.startSeconds));
    setEndInput(formatDuration(chapter.endSeconds));
  }

  function renderHitCard(hit: PresentationHistoricalReference, index: number) {
    const uniqueSources = Array.from(
      new Map(hit.sources.map((source) => [source.url, source])).values(),
    );
    const primarySource = selectPrimarySource(uniqueSources);
    const extraSources = primarySource
      ? uniqueSources.filter((source) => source.url !== primarySource.url)
      : uniqueSources;
    const sourceVideoUrl = job?.videoUrl ?? videoUrl;
    const auditKey = `${index}:${hit.timestampSeconds}:${hit.title}`;
    const isAuditOpen =
      auditExpansion.overrides[auditKey] ?? auditExpansion.defaultOpen;

    return (
      <article
        className="card card-border bg-base-100 shadow-sm"
        key={`${hit.timestamp}-${hit.title}`}
      >
        {hit.thumbnailUrl ? (
          <figure className="bg-base-300">
            <a
              href={timestampUrl(sourceVideoUrl, hit.timestampSeconds)}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src={hit.thumbnailUrl}
                alt={`Storyboard thumbnail for ${hit.title} at ${hit.timestamp}`}
                width={320}
                height={180}
                className="h-auto w-full object-cover sm:max-h-44"
                loading="lazy"
                unoptimized
              />
            </a>
          </figure>
        ) : null}
        <div className="card-body gap-5">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="badge badge-sm badge-outline">
                {referenceCategoryLabels[hit.category]}
              </span>
            </div>
            <h3 className="text-2xl font-bold leading-tight">
              <span>{index + 1}. </span>
              <a
                className="timestamp-link link link-primary font-mono"
                href={timestampUrl(sourceVideoUrl, hit.timestampSeconds)}
                target="_blank"
                rel="noreferrer"
              >
                {hit.timestamp}
              </a>{" "}
              <span aria-hidden="true">—</span> {hit.title}
            </h3>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
              {evidenceLabel(hit.evidenceType)}
            </h4>
            <blockquote className="border-l-4 border-primary/40 pl-4 text-base-content/85">
              {hit.videoEvidence}
            </blockquote>
          </div>

          {hit.speaker ? (
            <p className="text-sm text-base-content/70">
              <span className="font-semibold">Speaker:</span> {hit.speaker}
            </p>
          ) : null}

          {hit.discussionContextParagraphs.length > 0 ? (
            <div className="space-y-2 text-sm leading-6 text-base-content/80">
              <h4 className="font-semibold text-base-content">
                Discussion topic
              </h4>
              {hit.discussionContextParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          <div>
            <h4 className="mb-2 font-semibold">Bibliographer’s note</h4>
            <div className="bibliographer-prose leading-7 text-base-content/85">
              {hit.analysisParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          {primarySource ? (
            <div className="rounded-box bg-base-200/60 p-3 text-sm space-y-2">
              <div>
                <a
                  className="link link-primary font-semibold"
                  href={primarySource.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {primarySource.quality === "primary"
                    ? "Original source"
                    : "Best available source"}
                  {": "}
                  {primarySource.title}
                </a>
                {primarySource.note ? (
                  <p className="mt-1 text-base-content/75">
                    {primarySource.note}
                  </p>
                ) : null}
              </div>
              {extraSources.length > 0 ? (
                <ul className="space-y-1 border-t border-base-300/80 pt-2">
                  {extraSources.map((source) => (
                    <li key={source.url}>
                      <a
                        className="link link-primary font-medium"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.title}
                      </a>
                      {source.note ? (
                        <span className="text-base-content/70">
                          {" — "}
                          {source.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <details
            open={isAuditOpen}
            className="border-t border-base-300 pt-4 text-sm"
          >
            <summary
              className="cursor-pointer font-semibold"
              onClick={(event) => {
                event.preventDefault();
                setAuditExpansion((current) => ({
                  ...current,
                  overrides: {
                    ...current.overrides,
                    [auditKey]: !(
                      current.overrides[auditKey] ?? current.defaultOpen
                    ),
                  },
                }));
              }}
            >
              Additional information
            </summary>
            <div className="mt-4 space-y-4">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Match confidence
                  </dt>
                  <dd>
                    {matchConfidencePercent(hit)}%{" "}
                    <span className="text-base-content/60">
                      (source-match display grade)
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">Reason</dt>
                  <dd>{hit.confidenceReasons.join("; ")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Quality of source
                  </dt>
                  <dd>
                    {primarySource
                      ? sourceQualityLabel(primarySource.quality)
                      : "No trustworthy source identified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Reference date
                  </dt>
                  <dd>{hit.historicalDate ?? "Not established"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Category
                  </dt>
                  <dd>{referenceCategoryLabels[hit.category]}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Evidence type
                  </dt>
                  <dd>{readableEvidenceType(hit.evidenceType)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-base-content/60">
                    Verification
                  </dt>
                  <dd>{readableEvidenceType(hit.verificationStatus)}</dd>
                </div>
              </dl>
              <div>
                <h5 className="font-semibold">Notes</h5>
                <p className="mt-1 text-base-content/75">
                  {hit.verificationNote}
                </p>
              </div>
              <div>
                <h5 className="font-semibold">Source links</h5>
                {uniqueSources.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {uniqueSources.map((source) => (
                      <li key={source.url}>
                        <a
                          className="link link-primary"
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.title}
                        </a>{" "}
                        <span className="text-base-content/60">
                          ({sourceQualityLabel(source.quality)})
                        </span>
                        {source.note ? (
                          <span className="block text-base-content/60">
                            {source.note}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-base-content/60">
                    No trustworthy source was available yet.
                  </p>
                )}
              </div>
            </div>
          </details>
        </div>
      </article>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="badge badge-outline">Local research helper</div>
            <ThemeSwitcher />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            YouTube Video Bibliographer
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-base-content/75">
            Discover historical, public policy, and economics research
            references—alongside key quotes and events—behind what people are
            discussing.
          </p>
          <ProcessFlowDiagram />
        </header>

        <form
          className="card card-border bg-base-100 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="card-body gap-5">
            <div>
              <label className="label" htmlFor="video-url">
                <span className="label-text font-semibold">
                  YouTube video to explore
                </span>
              </label>
              <input
                id="video-url"
                className="input input-bordered w-full"
                type="url"
                value={videoUrl}
                onChange={(event) => {
                  setVideoUrl(event.target.value);
                  setInspection(null);
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                required
                disabled={isLoading || isInspecting}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="start-time">
                  <span className="label-text text-sm font-medium">
                    Start time (optional)
                  </span>
                </label>
                <input
                  id="start-time"
                  className="input input-bordered input-sm w-full"
                  type="text"
                  value={startInput}
                  onChange={(event) => setStartInput(event.target.value)}
                  placeholder="e.g. 12:30 or 1:05:00"
                  disabled={isLoading || isInspecting}
                />
              </div>
              <div>
                <label className="label" htmlFor="end-time">
                  <span className="label-text text-sm font-medium">
                    End time (optional)
                  </span>
                </label>
                <input
                  id="end-time"
                  className="input input-bordered input-sm w-full"
                  type="text"
                  value={endInput}
                  onChange={(event) => setEndInput(event.target.value)}
                  placeholder="e.g. 28:45 or 1:25:00"
                  disabled={isLoading || isInspecting}
                />
              </div>
              <div>
                <label className="label" htmlFor="extraction-depth">
                  <span className="label-text text-sm font-medium">
                    Verification coverage
                  </span>
                </label>
                <select
                  id="extraction-depth"
                  aria-label="Verification coverage"
                  className="select select-bordered select-sm w-full"
                  value={extractionDepth}
                  onChange={(event) =>
                    setExtractionDepth(event.target.value as ExtractionDepth)
                  }
                  disabled={isLoading}
                >
                  <option value="all">
                    All extracted candidates (default · up to 500 · 60m)
                  </option>
                  <option value="curated">
                    Curated 1-pass (up to 65 hits · 15m)
                  </option>
                </select>
              </div>
            </div>
            <div className="rounded-box border border-base-300 bg-base-200/40 p-3.5 space-y-2.5">
              <div className="space-y-1">
                <label
                  htmlFor="focus-prompt"
                  className="block text-sm font-semibold"
                >
                  What kind of references are you most interested in?
                </label>
                <input
                  id="focus-prompt"
                  className="input input-bordered input-sm w-full"
                  type="text"
                  maxLength={500}
                  placeholder="Optional: e.g. antitrust cases, hospital mergers, or inflation data..."
                  value={focusPrompt}
                  onChange={(event) => setFocusPrompt(event.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Reference topic focus"
              >
                <button
                  type="button"
                  className={`btn btn-xs ${selectedFocusTopics.length === 0 ? "btn-primary" : "btn-outline"}`}
                  aria-pressed={selectedFocusTopics.length === 0}
                  disabled={isLoading}
                  onClick={() => setSelectedFocusTopics([])}
                >
                  Any
                </button>
                {FOCUS_TOPIC_OPTIONS.map((topic) => {
                  const active = selectedFocusTopics.includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className={`btn btn-xs ${active ? "btn-primary" : "btn-outline"}`}
                      aria-pressed={active}
                      disabled={isLoading}
                      onClick={() =>
                        setSelectedFocusTopics((current) =>
                          current.includes(topic.id)
                            ? current.filter((item) => item !== topic.id)
                            : [...current, topic.id],
                        )
                      }
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="label cursor-pointer justify-start gap-2.5 p-0">
                <input
                  id="include-thumbnails"
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={includeThumbnails}
                  onChange={(event) =>
                    setIncludeThumbnails(event.target.checked)
                  }
                  disabled={isLoading}
                />
                <span className="label-text text-sm">
                  Include video thumbnails (uses yt-dlp + ffmpeg)
                </span>
              </label>

              {capabilities?.agyConfigured || capabilities?.geminiConfigured ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-base-content/70">Model:</span>
                    <select
                      aria-label="Model provider"
                      className="select select-bordered select-sm"
                      value={provider}
                      onChange={(event) =>
                        setProvider(event.target.value as ModelProvider)
                      }
                      disabled={isLoading}
                    >
                      <option value="auto">
                        Auto ({capabilities.defaultProvider})
                      </option>
                      {capabilities.agyConfigured ? (
                        <option value="agy">
                          Antigravity OAuth (
                          {capabilities.agyModel ?? "gemini-4-hydrogen"})
                        </option>
                      ) : null}
                      <option value="codex">
                        Codex OAuth ({capabilities.codexModel})
                      </option>
                      {capabilities.geminiConfigured ? (
                        <option value="gemini">
                          Gemini API ({capabilities.geminiModel})
                        </option>
                      ) : null}
                    </select>
                  </label>
                  {capabilities.geminiConfigured &&
                  (provider === "gemini" ||
                    (provider === "auto" &&
                      capabilities.defaultProvider === "gemini")) ? (
                    <label className="flex items-center gap-2">
                      <span className="text-base-content/70">Tone:</span>
                      <select
                        aria-label="Editorial temperature"
                        className="select select-bordered select-sm"
                        value={editorialStyle}
                        onChange={(event) =>
                          setEditorialStyle(
                            event.target.value as "default" | "0.85" | "1.1",
                          )
                        }
                        disabled={isLoading}
                      >
                        <option value="default">Balanced (config)</option>
                        <option value="0.85">Vivid narrative (0.85)</option>
                        <option value="1.1">Expressive (1.1)</option>
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => void inspectVideo()}
                disabled={isLoading || isInspecting || !videoUrl.trim()}
              >
                {isInspecting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : null}
                {isInspecting ? "Inspecting video" : "Inspect video"}
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isLoading || isInspecting}
              >
                {isLoading ? (
                  <span className="loading loading-spinner" />
                ) : null}
                {isLoading ? "Reading the video" : "Collect references"}
              </button>
              <span className="text-sm text-base-content/60">
                {extractionDepth === "all"
                  ? "Verifying all extracted candidates (up to 500) · supports ?t= & ?end= time windows"
                  : "Curated 1-pass · up to 65 references · parallel batch verification"}
              </span>
            </div>

            {inspection
              ? (() => {
                  const hasCreatorChapters = inspection.chapters.length > 0;
                  const selectableSections = hasCreatorChapters
                    ? inspection.chapters
                    : (inspection.plannedChapters ?? []);
                  const chainedCount =
                    inspection.plannedChapters?.length ??
                    selectableSections.length;

                  return (
                    <div
                      className={`alert ${
                        inspection.exceedsCuratedBudget
                          ? "alert-warning alert-soft"
                          : "alert-info alert-soft"
                      }`}
                      role="status"
                    >
                      <div className="w-full space-y-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <span className="font-semibold">
                              {inspection.title ?? "Video inspected"}
                            </span>
                            {inspection.durationSeconds !== null ? (
                              <span className="ml-2 text-sm opacity-80">
                                Duration:{" "}
                                {formatDuration(inspection.durationSeconds)}
                              </span>
                            ) : null}
                            <span className="ml-2 text-sm opacity-80">
                              · {inspection.transcriptSegmentCount} caption
                              segments
                              {inspection.transcriptLanguage
                                ? ` (${inspection.transcriptLanguage})`
                                : ""}
                            </span>
                          </div>
                        </div>
                        {inspection.metadataWarning ? (
                          <p className="text-sm font-medium opacity-90">
                            {inspection.metadataWarning}
                          </p>
                        ) : null}
                        {inspection.exceedsCuratedBudget ? (
                          selectableSections.length > 0 ? (
                            <p className="text-sm">
                              {hasCreatorChapters ? (
                                <>
                                  This video is longer than a 45-minute single
                                  window. Click a chapter chip to slice one
                                  section, or click{" "}
                                  <strong>All sections</strong> to chain{" "}
                                  {chainedCount > 0
                                    ? `${chainedCount} sections`
                                    : "detected chapters"}{" "}
                                  into one unified bibliography
                                  {inspection.coalescedChapterCount
                                    ? ` (auto-merged ${inspection.coalescedChapterCount} <3m segment${inspection.coalescedChapterCount === 1 ? "" : "s"})`
                                    : ""}
                                  .
                                </>
                              ) : (
                                <>
                                  This video is longer than a 45-minute single
                                  window and has no creator chapters —
                                  auto-split into {chainedCount} ~30-minute
                                  windows below. Click any part to slice one
                                  section, or click{" "}
                                  <strong>All sections</strong> to chain all{" "}
                                  {chainedCount} parts into one unified
                                  bibliography.
                                </>
                              )}
                            </p>
                          ) : (
                            <p className="text-sm">
                              This video is longer than a 45-minute single
                              window and no chapters were found. Enter a custom
                              Start / End time above to slice a section, or
                              click <strong>Collect references</strong>{" "}
                              directly.
                            </p>
                          )
                        ) : (
                          <p className="text-sm">
                            {hasCreatorChapters ? (
                              <>
                                This video fits cleanly in one pass — click{" "}
                                <strong>Collect references</strong> directly to
                                save turns, or choose a chapter chip below for a
                                targeted slice.
                              </>
                            ) : (
                              <>
                                No creator chapters found — this video fits
                                cleanly in one pass. Click{" "}
                                <strong>Collect references</strong> directly
                                {inspection.durationSeconds !== null
                                  ? ", or click Default below to prefill Start & End"
                                  : ""}
                                .
                              </>
                            )}
                          </p>
                        )}
                        {selectableSections.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                              {hasCreatorChapters
                                ? `Detected chapters (${inspection.chapters.length})`
                                : `No creator chapters — Auto-split 30m windows (${selectableSections.length})`}{" "}
                              — click to set Start &amp; End
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectableSections.map((chapter, index) => (
                                <button
                                  key={`${chapter.startSeconds}-${chapter.title}`}
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  onClick={() => applyChapterRange(chapter)}
                                >
                                  {index + 1}. {chapter.title} (
                                  {formatDuration(chapter.startSeconds)}–
                                  {chapter.endSeconds !== null
                                    ? formatDuration(chapter.endSeconds)
                                    : "end"}
                                  )
                                </button>
                              ))}
                              {!inspection.fitsSinglePass &&
                              chainedCount >= 2 ? (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-primary"
                                  disabled={isLoading || isInspecting}
                                  onClick={() =>
                                    void startJob(videoUrl, {
                                      useChapterPlan: true,
                                      chapters: hasCreatorChapters
                                        ? inspection.chapters
                                        : inspection.plannedChapters,
                                    })
                                  }
                                >
                                  All sections ({chainedCount} chained)
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : inspection.durationSeconds !== null ? (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                              No creator chapters found — full timeline
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={() =>
                                  applyChapterRange({
                                    title: "Default",
                                    startSeconds: 0,
                                    endSeconds: inspection.durationSeconds!,
                                  })
                                }
                              >
                                Default (0:00–
                                {formatDuration(inspection.durationSeconds)})
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              : null}

            {job && !isTerminalJobStatus(job.status) ? (
              <div className="space-y-3" role="status" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>{job.message}</span>
                  <span className="font-mono tabular-nums">
                    {job.chapterPlan &&
                    job.chapterPlan.length > 0 &&
                    job.currentChapterIndex !== null
                      ? `Section ${job.currentChapterIndex + 1}/${job.chapterPlan.length} · `
                      : ""}
                    {job.progress.percent}%
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={job.progress.percent}
                  max="100"
                />
                <div className="grid gap-2 text-xs text-base-content/65 sm:grid-cols-2 lg:grid-cols-4">
                  <span>
                    Elapsed: {formatDuration(job.timing.elapsedSeconds)}
                  </span>
                  <span>
                    Approx. remaining:{" "}
                    {formatDuration(job.timing.estimatedRemainingSeconds)}
                  </span>
                  <span>
                    Budget: {formatDuration(job.timing.budgetSeconds)}
                  </span>
                  <span>
                    Caption sections: {job.progress.completedChunks}/
                    {job.progress.totalChunks || "…"}
                  </span>
                  <span>
                    Possible references: {job.progress.candidateCount}
                  </span>
                  <span>
                    Verification batches:{" "}
                    {job.progress.completedSynthesisGroups}/
                    {job.progress.totalSynthesisGroups || "…"}
                  </span>
                  <span>
                    References kept: {combinedHits.length} (target{" "}
                    {job.softMaxHits ?? Math.min(job.maxHits, 50)})
                  </span>
                  <span>Job: {job.jobId.slice(0, 8)}</span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  type="button"
                  onClick={cancelJob}
                >
                  Cancel job
                </button>
              </div>
            ) : null}
          </div>
        </form>

        {savedJobs.length > 0 ? (
          <details className="collapse collapse-arrow card-border bg-base-100 mt-6">
            <summary className="collapse-title text-sm font-semibold">
              Saved runs ({savedJobs.length})
            </summary>
            <div className="collapse-content space-y-2">
              {savedJobs.slice(0, 10).map((saved) => (
                <div
                  key={saved.jobId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {saved.title ?? saved.videoUrl}
                    </div>
                    <div className="text-xs text-base-content/65">
                      {saved.status} · {saved.hitCount} references ·{" "}
                      {saved.jobId.slice(0, 8)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-xs btn-outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => void loadSavedJob(saved.jobId)}
                    >
                      Load
                    </button>
                    {saved.canResume ? (
                      <button
                        className="btn btn-xs btn-primary"
                        type="button"
                        disabled={isLoading}
                        onClick={() => void retryJob(saved.jobId)}
                      >
                        Resume
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {error ? (
          <div className="alert alert-error mt-6" role="alert">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {pollingPaused && jobId ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={resumePolling}
                  >
                    Resume status checks
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    type="button"
                    onClick={cancelJob}
                  >
                    Cancel job
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {job?.status === "failed" || job?.status === "cancelled" ? (
          <div className="alert alert-warning mt-6" role="status">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <span>{job.error ?? job.message}</span>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => void retryJob()}
              >
                Resume from checkpoint
              </button>
            </div>
          </div>
        ) : null}

        {job?.status === "capped" ? (
          <div className="alert alert-warning mt-6" role="alert">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  This run paused at its limit.
                </div>
                <p className="text-sm">
                  {job.capReason === "hits"
                    ? "The " +
                      (job.softMaxHits ?? Math.min(job.maxHits, 50)) +
                      "-reference limit was reached."
                    : "The processing budget was reached."}{" "}
                  Your {combinedHits.length} saved references remain displayed
                  below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {job.canResume ? (
                  <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    onClick={() => void retryJob()}
                  >
                    Resume from checkpoint
                  </button>
                ) : null}
                {job.resumeUrl ? (
                  <button
                    className="btn btn-sm btn-outline"
                    type="button"
                    onClick={continueFromCursor}
                  >
                    Continue from {formatDuration(job.resumeFromSeconds)}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {job &&
        isTerminalJobStatus(job.status) &&
        ((job.unverifiedCandidateCount ?? 0) > 0 ||
          (job.chapters?.length ?? 0) > 0) ? (
          <div className="mt-6 space-y-3">
            {(job.unverifiedCandidateCount ?? 0) > 0 ? (
              <div className="alert alert-info alert-soft">
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {job.unverifiedCandidateCount} extracted candidates remain
                      unverified
                    </div>
                    <p className="text-sm opacity-85">
                      {job.progress.candidateCount} candidates were extracted
                      and {combinedHits.length} references are currently
                      verified. Verify the remaining candidates in place without
                      re-reading the transcript.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={isLoading}
                    onClick={() => void expandJobCandidates(job.jobId)}
                  >
                    Verify remaining {job.unverifiedCandidateCount} candidates
                  </button>
                </div>
              </div>
            ) : null}

            {job.chapters && job.chapters.length > 0 ? (
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
                  Video chapters ({job.chapters.length}) — click to prefill
                  Start &amp; End for a targeted pass
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {job.chapters.map((chapter, index) => (
                    <button
                      key={`${chapter.startSeconds}-${chapter.title}`}
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => applyChapterRange(chapter)}
                    >
                      {index + 1}. {chapter.title} (
                      {formatDuration(chapter.startSeconds)}–
                      {chapter.endSeconds !== null
                        ? formatDuration(chapter.endSeconds)
                        : "end"}
                      )
                    </button>
                  ))}
                  {job.chapters.length >= 2 &&
                  (job.durationSeconds ??
                    (job.chapters.at(-1)?.endSeconds ?? 0) -
                      (job.chapters[0]?.startSeconds ?? 0)) >
                    45 * 60 ? (
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      disabled={isLoading || isInspecting}
                      onClick={() =>
                        void startJob(job.videoUrl, {
                          useChapterPlan: true,
                          chapters: job.chapters,
                        })
                      }
                    >
                      All sections
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasResults && (job || combinedHits.length > 0) ? (
          <section className="mt-10 space-y-6" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="badge badge-outline mb-3">
                  {job?.status === "completed"
                    ? "Reading list ready"
                    : "Saved partial reading list"}
                </div>
                <h2 className="text-3xl font-bold">
                  Bibliographical breakdown
                </h2>
                <p className="mt-2 text-base-content/70">
                  {visibleHits.length}
                  {selectedCategory !== "all"
                    ? ` of ${combinedHits.length}`
                    : ""}{" "}
                  reference
                  {visibleHits.length === 1 ? "" : "s"} in video order
                  {job?.transcriptLanguage
                    ? ` · captions: ${job.transcriptLanguage}`
                    : ""}
                </p>
              </div>
              {job?.videoUrl ? (
                <a
                  className="link link-primary break-all text-sm"
                  href={job.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source video
                </a>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/60 p-3">
              {categoryCounts.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`btn btn-xs ${selectedCategory === "all" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => {
                      setSelectedCategory("all");
                      setCurrentPage(1);
                    }}
                  >
                    All ({combinedHits.length})
                  </button>
                  {categoryCounts.map(([category, count]) => (
                    <button
                      key={category}
                      type="button"
                      className={`btn btn-xs ${selectedCategory === category ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentPage(1);
                      }}
                    >
                      {referenceCategoryLabels[category]} ({count})
                    </button>
                  ))}
                </div>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {visibleHits.length > 0 ? (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/75">
                    <span>Results:</span>
                    <select
                      aria-label="Results per page"
                      className="select select-bordered select-sm w-auto"
                      value={String(pageSize)}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setPageSize(
                          raw === "all"
                            ? "all"
                            : (Number(raw) as 10 | 25 | 50 | 100),
                        );
                        setCurrentPage(1);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option
                          key={String(option.value)}
                          value={String(option.value)}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {visibleHits.length > 0 ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() =>
                      setAuditExpansion((current) => ({
                        defaultOpen: !(
                          current.defaultOpen &&
                          Object.keys(current.overrides).length === 0
                        ),
                        overrides: {},
                      }))
                    }
                  >
                    {auditExpansion.defaultOpen &&
                    Object.keys(auditExpansion.overrides).length === 0
                      ? "Hide All Information"
                      : "Show All Information"}
                  </button>
                ) : null}

                {job?.sections &&
                job.sections.length > 0 &&
                selectedCategory === "all" &&
                archivedHits.length === 0 ? (
                  <div className="join">
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${viewMode === "sections" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setViewMode("sections");
                        setCurrentPage(1);
                      }}
                    >
                      By video sections
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${viewMode === "chronological" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setViewMode("chronological");
                        setCurrentPage(1);
                      }}
                    >
                      Chronological
                    </button>
                  </div>
                ) : null}

                {job &&
                isTerminalJobStatus(job.status) &&
                combinedHits.length > 0 ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={isLoading}
                    onClick={() => void restyleJob(job.jobId)}
                  >
                    Refresh narrative &amp; sections
                  </button>
                ) : null}
              </div>
            </div>

            {job && job.warnings.length > 0 ? (
              <div className="alert alert-warning" role="status">
                <div>
                  <div className="font-semibold">A few notes</div>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {job.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {activeOverview ? (
              <div className="card card-border bg-base-100 shadow-sm">
                <div className="card-body gap-3">
                  <h3 className="text-xl font-bold">About this video</h3>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-base-content/60">
                        Title
                      </dt>
                      <dd>{activeOverview.title ?? "Not established"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-base-content/60">
                        Channel
                      </dt>
                      <dd>{activeOverview.channel ?? "Not established"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-base-content/60">
                        {activeOverview.dateKind === "uploaded"
                          ? "Uploaded"
                          : activeOverview.dateKind === "published"
                            ? "Published"
                            : "Date"}
                      </dt>
                      <dd>{activeOverview.date ?? "Not established"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-base-content/60">
                        Speakers
                      </dt>
                      <dd>
                        {activeOverview.people.length
                          ? activeOverview.people.join(", ")
                          : "Not established in the video description"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-base-content/60">
                        Subject
                      </dt>
                      <dd>{activeOverview.theme ?? "Not established"}</dd>
                    </div>
                  </dl>
                  <p className="max-w-4xl leading-7 text-base-content/80">
                    {activeOverview.summary ??
                      "A concise video summary was not available for this run."}
                  </p>
                </div>
              </div>
            ) : null}

            {visibleHits.length === 0 ? (
              <div className="card card-border bg-base-100">
                <div className="card-body">
                  <p className="text-base-content/70">
                    No strong references surfaced before the run stopped.
                  </p>
                </div>
              </div>
            ) : null}

            {renderPaginationBar("top")}

            {pagedSections.length > 0 ? (
              <div className="space-y-10">
                {pagedSections.map(({ section, entries }) => (
                  <div key={section.title} className="space-y-4">
                    <div className="border-b border-base-300 pb-3">
                      <h3 className="text-2xl font-bold">{section.title}</h3>
                      <p className="mt-1 max-w-3xl text-base-content/75">
                        {section.summary}
                      </p>
                    </div>
                    <div className="space-y-5">
                      {entries.map(({ hit, index }) =>
                        renderHitCard(hit, index),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {pagedEntries.map(({ hit, index }) =>
                  renderHitCard(hit, index),
                )}
              </div>
            )}

            {renderPaginationBar("bottom")}

            {job?.markdown ? (
              <div className="card card-border bg-base-100">
                <div className="card-body flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">Downloadable Markdown</h3>
                    <p className="text-sm text-base-content/70">
                      Open the full code block on its own page or download the
                      exact generated file.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="btn btn-sm btn-outline"
                      href={`/app/jobs/${job.jobId}/markdown`}
                    >
                      View Markdown
                    </Link>
                    <a
                      className="btn btn-sm btn-primary"
                      download="youtube-bibliography.md"
                      href={`/api/references/${job.jobId}/markdown`}
                    >
                      Download `.md`
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
