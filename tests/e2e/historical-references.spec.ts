import { expect, test } from "@playwright/test";

const bibliographyResponse = {
  videoUrl: "https://www.youtube.com/watch?v=example123",
  transcriptLanguage: "en",
  transcriptTruncated: false,
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
      analysisParagraphs: ["The first event establishes the timeline."],
      sources: [
        {
          title: "Primary archive",
          url: "https://example.com/primary",
          quality: "primary",
          note: null,
        },
      ],
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
};

test("builds the bibliography and preserves video order", async ({ page }) => {
  await page.route("**/api/historical-references", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bibliographyResponse),
    });
  });

  await page.goto("/app");
  await page
    .getByLabel("YouTube video URL")
    .fill(bibliographyResponse.videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  await expect(
    page.getByRole("heading", { name: "Bibliographic hits" }),
  ).toBeVisible();
  const cards = page.locator("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("00:01:02");
  await expect(cards.nth(1)).toContainText("00:04:05");
  await expect(page.getByText("Verify independently.")).toBeVisible();
  await expect(page.getByLabel("Markdown bibliography")).toContainText(
    "# YouTube Video Bibliography",
  );
});

test("downloads the rendered Markdown bibliography", async ({ page }) => {
  await page.route("**/api/historical-references", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bibliographyResponse),
    });
  });

  await page.goto("/app");
  await page
    .getByLabel("YouTube video URL")
    .fill(bibliographyResponse.videoUrl);
  await page.getByRole("button", { name: "Build bibliography" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download `.md`" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("youtube-bibliography.md");
});

test("shows API errors without leaving a stale result", async ({ page }) => {
  await page.route("**/api/historical-references", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Captions could not be retrieved." }),
    });
  });

  await page.goto("/app");
  await page
    .getByLabel("YouTube video URL")
    .fill(bibliographyResponse.videoUrl);
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
