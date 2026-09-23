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
    theme: "Historical discussion",
    summary: "A discussion of historical sources.",
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
        "The host was establishing the historical timeline before turning to later examples.",
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
        "/api/historical-references/00000000-0000-0000-0000-000000000001/thumbnails/0",
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
        "The guest was connecting the quoted language to the broader historical discussion.",
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
    budgetSeconds: 600,
  },
  startedAt: "2026-09-21T00:00:00.000Z",
  processingStartSeconds: 0,
  processedUntilSeconds: 245,
  capReason: null,
  resumeFromSeconds: null,
  resumeUrl: null,
  maxHits: 40,
  createdAt: "2026-09-21T00:00:00.000Z",
  updatedAt: "2026-09-21T00:00:01.000Z",
};

async function mockBibliographyJob(
  page: Page,
  response: { markdown: string } & Record<
    string,
    unknown
  > = bibliographyResponse,
  options: { transientPollFailures?: number } = {},
) {
  let transientPollFailures = options.transientPollFailures ?? 0;
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith("/api/historical-references")) {
      await route.continue();
      return;
    }
    if (
      requestUrl.pathname === "/api/historical-references" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/historical-references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/historical-references/${jobId}` &&
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
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliographic hits" }),
  ).toBeVisible();
  const cards = page.locator("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("00:01:02");
  await expect(cards.nth(1)).toContainText("00:04:05");
  await expect(
    page.getByRole("heading", { name: "About this video" }),
  ).toBeVisible();
  await expect(page.getByText("Host, Guest")).toBeVisible();
  await expect(cards.nth(1)).toContainText("Speaker: The guest");
  await expect(cards.nth(1)).toContainText("Discussion context");
  await cards.nth(1).locator("details").locator("summary").click();
  await expect(page.getByText("Verify independently.")).toBeVisible();
  await expect(page.getByLabel("Markdown bibliography")).toHaveCount(0);
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
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  const downloadLink = page.getByRole("link", { name: "Download `.md`" });
  await expect(downloadLink).toHaveAttribute(
    "href",
    `/api/historical-references/${jobId}/markdown`,
  );
  await expect(downloadLink).toHaveAttribute(
    "download",
    "youtube-bibliography.md",
  );
  const exactExport = await page.evaluate(async (id) => {
    const response = await fetch(`/api/historical-references/${id}/markdown`);
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

test("shows a capped-run alert with a timestamped continuation action", async ({
  page,
}) => {
  const cappedResponse = {
    ...bibliographyResponse,
    status: "capped",
    phase: "capped",
    message:
      "The run reached its processing limit; continue from the saved timestamp.",
    capReason: "time",
    resumeFromSeconds: 600,
    resumeUrl: `${videoUrl}&t=600s`,
  };
  await mockBibliographyJob(page, cappedResponse);

  await page.goto("/app");
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "ten-minute processing budget" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue from/ }).click();
  await expect(page.getByLabel("YouTube video URL")).toHaveValue(
    `${videoUrl}&t=600s`,
  );
});

test("recovers from a transient polling failure", async ({ page }) => {
  await mockBibliographyJob(page, bibliographyResponse, {
    transientPollFailures: 1,
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliographic hits" }),
  ).toBeVisible({ timeout: 10_000 });
});

test("stops polling when the job no longer exists", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.pathname === "/api/historical-references" &&
      route.request().method() === "POST"
    ) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId,
          status: "queued",
          pollUrl: `/api/historical-references/${jobId}`,
        }),
      });
      return;
    }

    if (
      requestUrl.pathname === `/api/historical-references/${jobId}` &&
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
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Job no longer exists." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Build bibliography" }),
  ).toBeEnabled();
});

test("preserves a job handle after transient polling retries are exhausted", async ({
  page,
}) => {
  await mockBibliographyJob(page, bibliographyResponse, {
    transientPollFailures: 5,
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("button", { name: "Resume status checks" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: "Processing video" }),
  ).toBeDisabled();
});

test("shows API errors without leaving a stale result", async ({ page }) => {
  await page.route(/\/api\/historical-references(?:\/|$)/, async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Captions could not be retrieved." }),
    });
  });

  await page.goto("/app");
  await page.getByLabel("YouTube video URL").fill(videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Captions could not be retrieved." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bibliographic hits" }),
  ).toHaveCount(0);
});

test("defaults to dark mode and persists a light-mode choice", async ({
  page,
}) => {
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
