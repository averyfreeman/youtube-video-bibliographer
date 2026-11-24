import { expect, test, type Page } from "@playwright/test";

const jobId = "00000000-0000-0000-0000-000000000001";
const videoUrl = "https://www.youtube.com/watch?v=example123";

const bibliographyResponse = {
  jobId,
  status: "completed",
  phase: "completed",
  progress: {
    completedChunks: 2,
    totalChunks: 2,
    candidateCount: 2,
    completedSynthesisGroups: 1,
    totalSynthesisGroups: 1,
    percent: 100,
  },
  message: "Bibliography ready.",
  videoUrl,
  transcriptLanguage: "en",
  transcriptTruncated: false,
  videoOverview: {
    title: "Example video",
    channel: "Example channel",
    date: "2026-09-22",
    dateKind: "uploaded",
    people: ["Host", "Guest"],
    theme: "Public policy and historical discussion",
    summary: "A discussion of historical and policy sources.",
  },
  warnings: [],
  hits: [
    {
      title: "Earlier event",
      category: "event",
      evidenceType: "reference",
      timestamp: "00:01:02",
      timestampSeconds: 62,
      historicalDate: "1914",
      videoEvidence: "The speaker refers to the earlier event.",
      confidence: "high",
      confidenceReasons: [
        "The event is explicitly named and supported by a primary archive.",
      ],
      verificationStatus: "verified",
      verificationNote: "The event and date match the primary archive.",
      speaker: "The host",
      discussionContextParagraphs: [
        "The host was establishing the timeline before turning to later examples.",
      ],
      analysisParagraphs: ["The first event establishes the timeline."],
      sources: [
        {
          title: "Primary archive",
          url: "https://example.com/primary",
          quality: "primary",
          note: null,
        },
      ],
      thumbnailUrl:
        "/api/references/00000000-0000-0000-0000-000000000001/thumbnails/0",
    },
    {
      title: "Later quote",
      category: "quote",
      evidenceType: "direct_quote",
      timestamp: "00:04:05",
      timestampSeconds: 245,
      historicalDate: "1968",
      videoEvidence: "The speaker quotes a later source.",
      confidence: "medium",
      confidenceReasons: [
        "The wording is recognizable, but attribution needs review.",
      ],
      verificationStatus: "needs_review",
      verificationNote:
        "The quote is plausible but should be checked against the original publication.",
      speaker: "The guest",
      discussionContextParagraphs: [
        "The guest was connecting the quoted language to the broader discussion.",
      ],
      analysisParagraphs: ["This quote is contextualized here."],
      sources: [
        {
          title: "Culture analysis",
          url: "https://example.com/analysis",
          quality: "culture",
          note: null,
        },
      ],
    },
  ],
  markdown: "# YouTube Video Bibliography\n\n## 1. Earlier event",
  error: null,
  timing: {
    elapsedSeconds: 68,
    estimatedRemainingSeconds: 0,
    budgetSeconds: 900,
  },
  startedAt: "2026-09-21T00:00:00.000Z",
  processingStartSeconds: 0,
  processedUntilSeconds: 245,
  capReason: null,
  resumeFromSeconds: null,
  resumeUrl: null,
  canResume: false,
  maxHits: 65,
  softMaxHits: 50,
  tailGraceSeconds: 300,
  createdAt: "2026-09-21T00:00:00.000Z",
  updatedAt: "2026-09-21T00:00:01.000Z",
};

async function mockBibliographyJob(
  page: Page,
  response: { markdown: string } & Record<
    string,
    unknown
  > = bibliographyResponse,
  options: { transientPollFailures?: number; savedJobs?: unknown[] } = {},
) {
  let transientPollFailures = options.transientPollFailures ?? 0;
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith("/api/references")) {
      await route.continue();
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobs: options.savedJobs ?? [] }),
      });
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}` &&
      route.request().method() === "GET" &&
      transientPollFailures > 0
    ) {
      transientPollFailures -= 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary worker read failure." }),
      });
      return;
    }

    if (requestUrl.pathname.endsWith("/markdown")) {
      await route.fulfill({
        status: 200,
        contentType: "text/markdown",
        headers: {
          "Content-Disposition":
            'attachment; filename="youtube-bibliography.md"',
        },
        body: response.markdown,
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

test("builds the bibliography and preserves video order", async ({ page }) => {
  await mockBibliographyJob(page);

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliographical breakdown" }),
  ).toBeVisible();
  const cards = page.locator("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("00:01:02");
  await expect(cards.nth(0)).toContainText("1. 00:01:02 — Earlier event");
  await expect(cards.nth(1)).toContainText("00:04:05");
  await expect(
    cards
      .nth(0)
      .getByRole("link", { name: "Original source: Primary archive" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "About this video" }),
  ).toBeVisible();
  await expect(page.getByText("Host, Guest")).toBeVisible();
  await expect(cards.nth(1)).toContainText("Speaker: The guest");
  await expect(cards.nth(1)).toContainText("Discussion topic");
  await cards.nth(1).locator("details").locator("summary").click();
  await expect(cards.nth(1).locator("details summary")).toHaveText(
    "Additional information",
  );
  await expect(cards.nth(1).getByText("Match confidence")).toBeVisible();
  await expect(cards.nth(1).getByText("Reference date")).toBeVisible();
  await expect(cards.nth(1).getByText("Source links")).toBeVisible();
  await expect(page.getByLabel("Markdown bibliography")).toHaveCount(0);
  await expect(page.locator("pre")).toHaveCount(0);
  await expect(page.getByText("Text description of the process")).toBeVisible();
  await expect(page.locator("img[alt^='Storyboard thumbnail']")).toHaveCount(1);
  const markdownLink = page.getByRole("link", { name: "View Markdown" });
  await expect(markdownLink).toBeVisible();
  await expect(markdownLink).toHaveAttribute(
    "href",
    `/app/jobs/${jobId}/markdown`,
  );
});

test("downloads the rendered Markdown bibliography", async ({ page }) => {
  await mockBibliographyJob(page);

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  const downloadLink = page.getByRole("link", { name: "Download `.md`" });
  await expect(downloadLink).toHaveAttribute(
    "href",
    `/api/references/${jobId}/markdown`,
  );
  await expect(downloadLink).toHaveAttribute(
    "download",
    "youtube-bibliography.md",
  );
  const exactExport = await page.evaluate(async (id) => {
    const response = await fetch(`/api/references/${id}/markdown`);
    return {
      body: await response.text(),
      contentDisposition: response.headers.get("content-disposition"),
      contentType: response.headers.get("content-type"),
      status: response.status,
    };
  }, jobId);
  expect(exactExport.status).toBe(200);
  expect(exactExport.body).toBe(bibliographyResponse.markdown);
  expect(exactExport.contentType).toContain("text/markdown");
  expect(exactExport.contentDisposition).toContain("youtube-bibliography.md");
});

test("shows a capped-run alert and keeps existing hits when continuing or resuming", async ({
  page,
}) => {
  const continuationJobId = "00000000-0000-0000-0000-000000000002";
  const cappedResponse = {
    ...bibliographyResponse,
    status: "capped",
    phase: "capped",
    message:
      "This run reached its limit; your saved references are preserved and ready to resume.",
    capReason: "time",
    canResume: true,
    resumeFromSeconds: 600,
    resumeUrl: `${videoUrl}&t=600s`,
  };
  const continuedResponse = {
    ...bibliographyResponse,
    jobId: continuationJobId,
    videoUrl: `${videoUrl}&t=600s`,
    hits: [
      {
        title: "Third policy reference",
        category: "public_policy",
        evidenceType: "reference",
        timestamp: "00:11:00",
        timestampSeconds: 660,
        historicalDate: "2024",
        videoEvidence: "Discusses federal policy reform.",
        confidence: "high",
        confidenceReasons: ["Named federal statute."],
        verificationStatus: "verified",
        verificationNote: "Verified against statutory text.",
        speaker: null,
        discussionContextParagraphs: [],
        analysisParagraphs: ["Explains the policy impact."],
        sources: [],
      },
    ],
  };

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith("/api/references")) {
      await route.continue();
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: true,
            geminiConfigured: false,
            defaultProvider: "agy",
            codexModel: "gpt-6-luna",
            agyModel: "gemini-4-hydrogen",
            geminiModel: "gemini-4-hydrogen",
          },
        }),
      });
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      const body = route.request().postDataJSON() as { videoUrl?: string };
      const isCont = Boolean(body.videoUrl?.includes("t=600s"));
      const nextId = isCont ? continuationJobId : jobId;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId: nextId,
          status: "queued",
          pollUrl: `/api/references/${nextId}`,
        }),
      });
      return;
    }
    if (requestUrl.pathname === `/api/references/${continuationJobId}`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(continuedResponse),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(cappedResponse),
    });
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "processing budget" }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(2);

  await page.getByRole("button", { name: /Continue from/ }).click();
  await expect(page.getByLabel("YouTube video to explore")).toHaveValue(
    `${videoUrl}&t=600s`,
  );
  // Existing 2 hits are preserved and merged with the 3rd hit!
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page.locator("article").nth(0)).toContainText("Earlier event");
  await expect(page.locator("article").nth(2)).toContainText(
    "Third policy reference",
  );
});

test("loads a saved job from Saved runs without re-running", async ({
  page,
}) => {
  await mockBibliographyJob(page, bibliographyResponse, {
    savedJobs: [
      {
        jobId,
        videoUrl,
        title: "Saved Policy Run",
        status: "capped",
        phase: "capped",
        hitCount: 2,
        candidateCount: 2,
        percent: 84,
        capReason: "time",
        canResume: true,
        resumeUrl: null,
        createdAt: "2026-09-21T00:00:00.000Z",
        updatedAt: "2026-09-21T00:10:00.000Z",
      },
    ],
  });

  await page.goto("/app");
  await page.getByText("Saved runs (1)").click();
  await page.getByRole("button", { name: "Load" }).click();

  await expect(page.locator("article")).toHaveCount(2);
  await expect(page).toHaveURL(new RegExp(`jobId=${jobId}`));
});

test("keeps thumbnails unchecked by default, groups hits by video sections, and restyles in place", async ({
  page,
}) => {
  const postedPayloads: Array<Record<string, unknown>> = [];
  let restyleTriggered = false;

  const sectionedResponse = {
    ...bibliographyResponse,
    sections: [
      {
        title: "Part I: Setting the Stage",
        summary: "How the conversation opened with the historical backdrop.",
        hitTitles: ["Earlier event"],
      },
      {
        title: "Part II: Modern Stakes",
        summary: "Connecting that history to the policy quote.",
        hitTitles: ["Later quote"],
      },
    ],
  };
  const restyledResponse = {
    ...sectionedResponse,
    sections: [
      {
        title: "Part I: Refreshed Opening Arc",
        summary: "Updated conversational framing across the whole episode.",
        hitTitles: ["Earlier event", "Later quote"],
      },
    ],
  };

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith("/api/references")) {
      await route.continue();
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: true,
            geminiConfigured: false,
            defaultProvider: "agy",
            codexModel: "gpt-6-luna",
            agyModel: "gemini-4-hydrogen",
            geminiModel: "gemini-4-hydrogen",
          },
        }),
      });
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      postedPayloads.push(
        route.request().postDataJSON() as Record<string, unknown>,
      );
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }
    if (requestUrl.pathname === `/api/references/${jobId}/restyle`) {
      restyleTriggered = true;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify(restyledResponse),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        restyleTriggered ? restyledResponse : sectionedResponse,
      ),
    });
  });

  await page.goto("/app");
  const thumbCheckbox = page.getByLabel(/Include video thumbnails/);
  await expect(thumbCheckbox).not.toBeChecked();

  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(page.getByText("Part I: Setting the Stage")).toBeVisible();
  await expect(page.getByText("Part II: Modern Stakes")).toBeVisible();
  expect(postedPayloads[0]?.includeThumbnails).toBe(false);

  // Switch between Chronological and By video sections
  await page.getByRole("button", { name: "Chronological" }).click();
  await expect(page.getByText("Part I: Setting the Stage")).toHaveCount(0);
  await page.getByRole("button", { name: "By video sections" }).click();
  await expect(page.getByText("Part I: Setting the Stage")).toBeVisible();

  // Trigger Refresh narrative & sections without losing hits
  await page
    .getByRole("button", { name: "Refresh narrative & sections" })
    .click();
  await expect(page.getByText("Part I: Refreshed Opening Arc")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(2);

  // Check thumbnails opt-in and Antigravity OAuth selection
  await expect(page.getByLabel("Editorial temperature")).toHaveCount(0);
  await page.getByLabel("Model provider").selectOption("agy");
  await thumbCheckbox.check();
  await page.getByRole("button", { name: "Collect references" }).click();
  await expect.poll(() => postedPayloads.length).toBe(2);
  expect(postedPayloads[1]?.includeThumbnails).toBe(true);
  expect(postedPayloads[1]?.provider).toBe("agy");
});

test("recovers from a transient polling failure", async ({ page }) => {
  await mockBibliographyJob(page, bibliographyResponse, {
    transientPollFailures: 1,
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliographical breakdown" }),
  ).toBeVisible({ timeout: 10_000 });
});

test("stops polling when the job no longer exists", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: true,
            geminiConfigured: false,
            defaultProvider: "agy",
            codexModel: "gpt-6-luna",
            agyModel: "gemini-4-hydrogen",
            geminiModel: "gemini-4-hydrogen",
          },
        }),
      });
      return;
    }
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}` &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Job no longer exists." }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Job no longer exists." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Collect references" }),
  ).toBeEnabled();
});

test("preserves a job handle after transient polling retries are exhausted", async ({
  page,
}) => {
  await mockBibliographyJob(page, bibliographyResponse, {
    transientPollFailures: 5,
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page.getByRole("button", { name: "Resume status checks" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: "Reading the video" }),
  ).toBeDisabled();
});

test("shows API errors without leaving a stale result", async ({ page }) => {
  await page.route(/\/api\/references(?:\/|$)/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobs: [] }),
      });
      return;
    }
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Captions could not be retrieved." }),
    });
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Captions could not be retrieved." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bibliographical breakdown" }),
  ).toHaveCount(0);
});

test("defaults to dark mode and persists a light-mode choice", async ({
  page,
}) => {
  await mockBibliographyJob(page);
  await page.goto("/app");

  await expect(page.getByLabel("Color mode")).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const diagram = page.getByLabel("Bibliography processing flowchart");
  await expect(diagram.locator("svg")).toBeVisible();
  await expect(
    diagram.locator("text").filter({ hasText: "limit" }).first(),
  ).toBeVisible();
  const darkConnector = await diagram
    .locator("path.flowchart-link")
    .first()
    .evaluate((element) => ({
      stroke: getComputedStyle(element).stroke,
      width: element.getBoundingClientRect().width,
    }));
  expect(darkConnector.stroke).toBe("rgb(244, 247, 251)");
  expect(darkConnector.width).toBeGreaterThan(0);
  const darkEdgeLabel = await diagram
    .locator("g.edgeLabel text")
    .first()
    .evaluate((element) => getComputedStyle(element).fill);
  expect(darkEdgeLabel).toBe("rgb(244, 247, 251)");

  await page.getByLabel("Color mode").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(diagram.locator("svg")).toBeVisible();
  await expect
    .poll(async () =>
      diagram
        .locator("path.flowchart-link")
        .first()
        .evaluate((element) => getComputedStyle(element).stroke),
    )
    .toBe("rgb(24, 33, 44)");
  await expect(
    diagram.locator("text").filter({ hasText: "limit" }).first(),
  ).toBeVisible();
  const lightConnector = await diagram
    .locator("path.flowchart-link")
    .first()
    .evaluate((element) => ({
      stroke: getComputedStyle(element).stroke,
      width: element.getBoundingClientRect().width,
    }));
  expect(lightConnector.stroke).toBe("rgb(24, 33, 44)");
  expect(lightConnector.width).toBeGreaterThan(0);
  const lightEdgeLabel = await diagram
    .locator("g.edgeLabel text")
    .first()
    .evaluate((element) => getComputedStyle(element).fill);
  expect(lightEdgeLabel).toBe("rgb(24, 33, 44)");

  await page.reload();
  await expect(page.getByLabel("Color mode")).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const reloadedDiagram = page.getByLabel("Bibliography processing flowchart");
  await expect
    .poll(async () =>
      reloadedDiagram
        .locator("path.flowchart-link")
        .first()
        .evaluate((element) => getComputedStyle(element).stroke),
    )
    .toBe("rgb(24, 33, 44)");
});

test("expands/collapses all audit details, inspects chapters into start/end, and verifies remaining candidates", async ({
  page,
}) => {
  const postedPayloads: Array<Record<string, unknown>> = [];
  let expandedTriggered = false;

  const initialResponse = {
    ...bibliographyResponse,
    extractionDepth: "curated",
    durationSeconds: 5400,
    chapters: [
      { title: "Opening Framing", startSeconds: 0, endSeconds: 900 },
      { title: "Deep Dive", startSeconds: 900, endSeconds: 2100 },
    ],
    unverifiedCandidateCount: 1,
    progress: {
      completedChunks: 2,
      totalChunks: 2,
      candidateCount: 3,
      completedSynthesisGroups: 1,
      totalSynthesisGroups: 1,
      percent: 100,
    },
  };

  const expandedResponse = {
    ...initialResponse,
    unverifiedCandidateCount: 0,
    hits: [
      ...initialResponse.hits,
      {
        title: "Newly Verified Reference",
        category: "public_policy",
        evidenceType: "study_report",
        timestamp: "00:05:10",
        timestampSeconds: 310,
        historicalDate: "1974",
        videoEvidence: "Mentions the third extracted candidate.",
        confidence: "high",
        confidenceReasons: ["Verified during expansion pass."],
        verificationStatus: "verified",
        verificationNote: "Verified in-place.",
        speaker: "Host",
        discussionContextParagraphs: [
          "The host introduced this report while expanding the segment.",
        ],
        analysisParagraphs: ["Expanded in-place without re-reading captions."],
        sources: [
          {
            title: "Policy Report",
            url: "https://example.com/report",
            quality: "secondary",
            note: "Background policy report.",
          },
        ],
        thumbnailUrl: null,
      },
    ],
  };

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: false,
            geminiConfigured: false,
            defaultProvider: "codex",
            codexModel: "gpt-6-luna",
            agyModel: null,
            geminiModel: "gemini-4-hydrogen",
          },
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === "/api/references/inspect" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          videoUrl,
          title: "Long Policy Lecture",
          channel: "Policy Lab",
          durationSeconds: 5400,
          chapters: initialResponse.chapters,
          plannedChapters: initialResponse.chapters,
          fitsSinglePass: false,
          coalescedChapterCount: 1,
          transcriptSegmentCount: 420,
          transcriptLanguage: "en",
          requestedStartSeconds: null,
          requestedEndSeconds: null,
          exceedsCuratedBudget: true,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      postedPayloads.push(
        route.request().postDataJSON() as Record<string, unknown>,
      );
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}/expand` &&
      route.request().method() === "POST"
    ) {
      expandedTriggered = true;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          ...initialResponse,
          status: "verifying",
          phase: "verifying",
          message: "Verifying remaining extracted candidates…",
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}` &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          expandedTriggered ? expandedResponse : initialResponse,
        ),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/app");
  await expect(page.getByLabel("Verification coverage")).toHaveValue("all");

  // Inspect video appears before Collect references in button order.
  const actionButtons = page.locator("form button");
  const buttonTexts = await actionButtons.allInnerTexts();
  const inspectPos = buttonTexts.findIndex((text) =>
    text.includes("Inspect video"),
  );
  const collectPos = buttonTexts.findIndex((text) =>
    text.includes("Collect references"),
  );
  expect(inspectPos).toBeGreaterThanOrEqual(0);
  expect(collectPos).toBeGreaterThan(inspectPos);

  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Inspect video" }).click();
  await expect(page.getByText("Long Policy Lecture")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /All sections \(2 chained\)/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /2\. Deep Dive/ }).click();

  await expect(page.getByLabel(/Start time/)).toHaveValue("15:00");
  await expect(page.getByLabel(/End time/)).toHaveValue("35:00");

  await page.getByLabel("Verification coverage").selectOption("curated");
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect(page.locator("article")).toHaveCount(2);
  expect(postedPayloads[0]?.extractionDepth).toBe("curated");
  expect(postedPayloads[0]?.startSeconds).toBe(900);
  expect(postedPayloads[0]?.endSeconds).toBe(2100);

  // Show All Information opens every card's details, then Hide All Information closes them.
  await page.getByRole("button", { name: "Show All Information" }).click();
  for (const card of await page.locator("article details").all()) {
    await expect(card).toHaveAttribute("open", "");
  }
  await page.getByRole("button", { name: "Hide All Information" }).click();
  for (const card of await page.locator("article details").all()) {
    await expect(card).not.toHaveAttribute("open", "");
  }

  // Individual details still toggle cleanly after global toggle.
  await page.locator("article details summary").first().click();
  await expect(page.locator("article details").first()).toHaveAttribute(
    "open",
    "",
  );

  // Expand remaining unverified candidates in place.
  await page
    .getByRole("button", { name: "Verify remaining 1 candidates" })
    .click();
  await expect(page.getByText("Newly Verified Reference")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);

  // Trigger unified All sections chained run from detected chapters.
  await page.getByRole("button", { name: "All sections", exact: true }).click();
  await expect.poll(() => postedPayloads.length).toBe(2);
  expect(postedPayloads[1]?.useChapterPlan).toBe(true);
  expect(Array.isArray(postedPayloads[1]?.chapters)).toBe(true);
});

test("sends research focus prompt and topic selectors and paginates long lists across views", async ({
  page,
}) => {
  const jobId = "44444444-4444-4444-8444-444444444444";
  const videoUrl = "https://www.youtube.com/watch?v=pagination123";
  const postedPayloads: Array<Record<string, unknown>> = [];

  const manyHits = Array.from({ length: 32 }, (_, index) => {
    const num = index + 1;
    const timestampSeconds = num * 30;
    const minutes = String(Math.floor(timestampSeconds / 60)).padStart(2, "0");
    const seconds = String(timestampSeconds % 60).padStart(2, "0");
    return {
      title: `Policy Reference ${String(num).padStart(2, "0")}`,
      category: num % 2 === 0 ? "public_policy" : "economics_research",
      evidenceType: "reference",
      timestamp: `00:${minutes}:${seconds}`,
      timestampSeconds,
      historicalDate: "2024-01-15",
      videoEvidence: `Discussion point #${num} around policy and market impact.`,
      confidence: "high",
      confidenceReasons: ["Explicit policy reference in transcript."],
      verificationStatus: "verified",
      verificationNote: "Verified against source.",
      speaker: null,
      discussionContextParagraphs: [
        `They were weighing real-world stakes around item #${num}.`,
      ],
      analysisParagraphs: [
        `Item #${num} connects historical policy shifts to everyday household bills.`,
      ],
      sources: [
        {
          title: `Source #${num}`,
          url: `https://example.org/ref/${num}`,
          quality: "primary",
          note: "Official background record.",
        },
      ],
      thumbnailUrl: null,
    };
  });

  const sections = [
    {
      title: "Opening Thesis",
      summary: "Sets up the economic framing.",
      hitTitles: manyHits.slice(0, 12).map((hit) => hit.title),
    },
    {
      title: "Market Evidence",
      summary: "Empirical data and mergers.",
      hitTitles: manyHits.slice(12, 24).map((hit) => hit.title),
    },
    {
      title: "Policy Fallout",
      summary: "Enforcement and closing examples.",
      hitTitles: manyHits.slice(24).map((hit) => hit.title),
    },
  ];

  const completedResponse = {
    jobId,
    status: "completed",
    phase: "completed",
    progress: {
      percent: 100,
      completedChunks: 4,
      totalChunks: 4,
      candidateCount: 32,
      completedSynthesisGroups: 4,
      totalSynthesisGroups: 4,
    },
    message: "Bibliography ready.",
    videoUrl,
    transcriptLanguage: "en",
    transcriptTruncated: false,
    videoOverview: {
      title: "Long Antitrust Documentary",
      channel: "Policy Desk",
      date: "2025-05-01",
      dateKind: "published",
      people: ["Host"],
      theme: "Consolidation & market power",
      summary: "Covers 32 cited benchmarks across 3 thematic chapters.",
    },
    sections,
    warnings: [],
    hits: manyHits,
    markdown: "# Full Markdown Export\n\nAll 32 items.\n",
    error: null,
    timing: {
      elapsedSeconds: 42,
      estimatedRemainingSeconds: 0,
      budgetSeconds: 3600,
    },
    startedAt: "2026-11-14T22:00:00.000Z",
    processingStartSeconds: 0,
    processingEndSeconds: null,
    processedUntilSeconds: 960,
    capReason: null,
    resumeFromSeconds: null,
    resumeUrl: null,
    canResume: false,
    extractionDepth: "all",
    focusPrompt: "Antitrust and executive statements",
    targetCategories: ["public_policy", "executive_statement", "quote"],
    durationSeconds: 1800,
    chapters: [],
    chapterPlan: [],
    completedChapters: 0,
    currentChapterIndex: null,
    unverifiedCandidateCount: 0,
    includeThumbnails: false,
    provider: "auto",
    temperature: null,
    maxHits: 500,
    softMaxHits: 500,
    tailGraceSeconds: 45,
    createdAt: "2026-11-14T22:00:00.000Z",
    updatedAt: "2026-11-14T22:01:00.000Z",
  };

  await page.route("**/api/references**", async (route) => {
    const requestUrl = new URL(route.request().url());

    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: false,
            geminiConfigured: false,
            defaultProvider: "codex",
            codexModel: "gpt-6-luna",
          },
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      postedPayloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}` &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(completedResponse),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/app");

  // Research focus prompt and mutually exclusive "Any" + 6 topic pills.
  await expect(
    page.getByText("What kind of references are you most interested in?"),
  ).toBeVisible();
  const topicGroup = page.getByRole("group", { name: "Reference topic focus" });
  const anyButton = topicGroup.getByRole("button", {
    name: "Any",
    exact: true,
  });
  await expect(anyButton).toHaveAttribute("aria-pressed", "true");

  const economicsButton = topicGroup.getByRole("button", {
    name: "Economics",
    exact: true,
  });
  await economicsButton.click();
  await expect(anyButton).toHaveAttribute("aria-pressed", "false");
  await expect(economicsButton).toHaveAttribute("aria-pressed", "true");

  await anyButton.click();
  await expect(anyButton).toHaveAttribute("aria-pressed", "true");
  await expect(economicsButton).toHaveAttribute("aria-pressed", "false");

  await topicGroup
    .getByRole("button", { name: "Politics", exact: true })
    .click();
  await topicGroup
    .getByRole("button", { name: "Famous quotes", exact: true })
    .click();
  await page
    .getByLabel("What kind of references are you most interested in?")
    .fill("Antitrust and executive statements");

  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Collect references" }).click();

  await expect.poll(() => postedPayloads.length).toBe(1);
  expect(postedPayloads[0]?.focusPrompt).toBe(
    "Antitrust and executive statements",
  );
  expect(postedPayloads[0]?.targetCategories).toEqual([
    "public_policy",
    "executive_statement",
    "quote",
  ]);

  // Default 25 per page in sections view.
  const pageSizeSelect = page.getByLabel("Results per page");
  await expect(pageSizeSelect).toHaveValue("25");
  await expect(page.locator("article")).toHaveCount(25);
  await expect(
    page.getByText("Showing 1–25 of 32 references · Page 1 of 2").first(),
  ).toBeVisible();

  // Next page shows items 26..32 while preserving global card numbering ("26.").
  await page.getByRole("button", { name: "Next ›" }).first().click();
  await expect(page.locator("article")).toHaveCount(7);
  await expect(page.locator("article h3").first()).toContainText("26.");
  await expect(page.locator("article h3").first()).toContainText(
    "Policy Reference 26",
  );
  await expect(page.getByText("Policy Fallout")).toBeVisible();

  // Change dropdown to 10 -> resets to page 1.
  await pageSizeSelect.selectOption("10");
  await expect(page.locator("article")).toHaveCount(10);
  await expect(
    page.getByText("Showing 1–10 of 32 references · Page 1 of 4").first(),
  ).toBeVisible();

  // Switch view mode to Chronological & choose All -> displays all 32 references.
  await page.getByRole("button", { name: "Chronological" }).click();
  await pageSizeSelect.selectOption("all");
  await expect(page.locator("article")).toHaveCount(32);
});

test("displays metadata warning and auto-split 30m windows when an inspected >45m video has no creator chapters", async ({
  page,
}) => {
  const jobId = "55555555-5555-4555-8555-555555555555";
  const videoUrl = "https://www.youtube.com/watch?v=nochapters75m";
  const postedPayloads: Array<Record<string, unknown>> = [];
  const autoSplitParts = [
    { title: "Part 1", startSeconds: 0, endSeconds: 1799 },
    { title: "Part 2", startSeconds: 1800, endSeconds: 4500 },
  ];

  await page.route("**/api/references**", async (route) => {
    const requestUrl = new URL(route.request().url());

    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          capabilities: {
            agyConfigured: false,
            geminiConfigured: false,
            defaultProvider: "codex",
            codexModel: "gpt-6-luna",
          },
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === "/api/references/inspect" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: null,
          channel: null,
          durationSeconds: 4500,
          chapters: [],
          plannedChapters: autoSplitParts,
          fitsSinglePass: false,
          coalescedChapterCount: 0,
          autoSplitWindows: true,
          metadataWarning:
            "Video title and chapter metadata could not be read (yt-dlp timed out); duration was estimated from captions.",
          transcriptSegmentCount: 610,
          transcriptLanguage: "en",
          requestedStartSeconds: 0,
          requestedEndSeconds: null,
          exceedsCuratedBudget: true,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === "/api/references" &&
      route.request().method() === "POST"
    ) {
      postedPayloads.push(
        route.request().postDataJSON() as Record<string, unknown>,
      );
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/references/${jobId}` &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...bibliographyResponse,
          jobId,
          videoUrl,
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video to explore").fill(videoUrl);
  await page.getByRole("button", { name: "Inspect video" }).click();

  await expect(
    page.getByText(/Video title and chapter metadata could not be read/),
  ).toBeVisible();
  await expect(
    page.getByText(/No creator chapters — Auto-split 30m windows \(2\)/),
  ).toBeVisible();

  await page.getByRole("button", { name: /1\. Part 1/ }).click();
  await expect(page.getByLabel(/Start time/)).toHaveValue("0:00");
  await expect(page.getByLabel(/End time/)).toHaveValue("29:59");

  await page.getByRole("button", { name: "All sections (2 chained)" }).click();
  await expect.poll(() => postedPayloads.length).toBe(1);
  expect(postedPayloads[0]?.useChapterPlan).toBe(true);
  expect(postedPayloads[0]?.chapters).toEqual(autoSplitParts);
});
