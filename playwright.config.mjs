import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 35_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server.js",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    // The test server never sends mail and uses Cloudflare's documented
    // always-pass Turnstile secret; production sets the real one on Railway.
    env: {
      CONTACT_DRY_RUN: "1",
      CONTACT_POW_BITS: process.env.CONTACT_POW_BITS || "12",
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA",
    },
    timeout: 20_000,
  },
});
