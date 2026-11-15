import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, defineConfig, devices } from "@playwright/test";

function resolveChromiumExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  if (existsSync(chromium.executablePath())) {
    return undefined;
  }
  const cacheDir = path.join(os.homedir(), ".cache", "ms-playwright");
  if (!existsSync(cacheDir)) {
    return undefined;
  }
  const shells = readdirSync(cacheDir)
    .filter((entry) => entry.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();
  for (const dir of shells) {
    const candidate = path.join(
      cacheDir,
      dir,
      "chrome-headless-shell-linux64",
      "chrome-headless-shell",
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

const executablePath = resolveChromiumExecutablePath();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/app",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
