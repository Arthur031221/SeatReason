// Captures the real interface in its repair-preview state, then renders
// assets/social-card.html to assets/social-card.png (1200x675).
// Run `npm run build` first.
import { preview } from "vite";
import { chromium } from "@playwright/test";
import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const server = await preview({
  root,
  preview: { host: "127.0.0.1", port: 4178, strictPort: true },
});
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
  });
  const app = await browser.newPage({
    viewport: { width: 1280, height: 1150 },
    colorScheme: "light",
    locale: "en-US",
  });
  await app.goto("http://127.0.0.1:4178/", { waitUntil: "networkidle" });
  await app.getByText("These 6 requests cannot all hold").waitFor();
  await app
    .locator(".repair", { hasText: "Maya and Ravi do not sit" })
    .getByRole("button", { name: "Show this plan" })
    .click();
  await app.locator(".seat.is-changed").first().waitFor();
  await app.waitForTimeout(1500);
  await app.locator(".plan-body").screenshot({
    path: resolve(root, "assets/social-card-capture.png"),
  });
  const card = await browser.newPage({
    viewport: { width: 1200, height: 675 },
    deviceScaleFactor: 1,
  });
  await card.goto(pathToFileURL(resolve(root, "assets/social-card.html")).href);
  await card.waitForTimeout(300);
  const output = resolve(root, "assets/social-card.png");
  await card.screenshot({ path: output });
  await copyFile(output, resolve(root, "public/social-card.png"));
} finally {
  await browser?.close();
  await server.close();
}
