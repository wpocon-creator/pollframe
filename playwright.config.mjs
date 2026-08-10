import { defineConfig, devices } from "@playwright/test";

const desktop = { viewport: { width: 1440, height: 900 } };
const localChromium = process.env.POLLFRAME_CHROME_PATH
  ? { launchOptions: { executablePath: process.env.POLLFRAME_CHROME_PATH } }
  : {};

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/artifacts",
  timeout: 75_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["html", { outputFolder: "test-results/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: process.env.POLLFRAME_CHROME_PATH ? "off" : "retain-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "npm run preview -- --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], ...desktop, ...localChromium } },
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"], ...desktop } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], ...desktop } },
    { name: "pixel-5", use: { ...devices["Pixel 5"], ...localChromium } },
    { name: "galaxy-s9", use: { ...devices["Galaxy S9+"], ...localChromium } },
    { name: "iphone-se", use: { ...devices["iPhone SE"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
    { name: "iphone-13-chromium", use: { ...devices["iPhone 13"], browserName: "chromium", ...localChromium } },
    { name: "ipad-mini", use: { ...devices["iPad Mini"] } },
    { name: "ipad-mini-chromium", use: { ...devices["iPad Mini"], browserName: "chromium", ...localChromium } },
    {
      name: "phone-landscape",
      use: {
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        ...localChromium,
      },
    },
  ],
});
