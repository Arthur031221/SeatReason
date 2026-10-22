import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4176",
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
  webServer: {
    command:
      "npm run build && npx vite preview --port 4176 --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
