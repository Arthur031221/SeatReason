// Records the real interface in headless Chrome and writes assets/demo.gif.
// Needs ffmpeg on the PATH. Run `npm run build` first.
import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "assets/demo.gif");
const temp = await mkdtemp(join(tmpdir(), "seatreason-demo-"));
const server = await preview({
  root,
  preview: { host: "127.0.0.1", port: 4177, strictPort: true },
});
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
  });
  const size = { width: 1280, height: 1150 };
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    recordVideo: { dir: temp, size },
  });
  // A visible pointer, since video capture does not draw one.
  await context.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const dot = document.createElement("div");
      dot.style.cssText =
        "position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgb(37 86 184 / 35%);border:2px solid #2456b8;pointer-events:none;left:-40px;top:-40px;transition:transform .1s";
      document.body.append(dot);
      addEventListener("mousemove", (e) => {
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
      });
      addEventListener("mousedown", () => (dot.style.transform = "scale(.7)"));
      addEventListener("mouseup", () => (dot.style.transform = ""));
    });
  });
  const page = await context.newPage();
  const glide = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 28,
    });
    await page.waitForTimeout(250);
  };

  await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
  await page.getByText("These 6 requests cannot all hold").waitFor();
  await page.waitForTimeout(2800);

  const repair = page.locator(".repair", {
    hasText: "Maya and Ravi do not sit",
  });
  const show = repair.getByRole("button", { name: "Show this plan" });
  await glide(show);
  await show.click();
  await page.locator(".seat.is-changed").first().waitFor();
  await page.waitForTimeout(2800);

  const use = page.getByRole("button", {
    name: "Use this plan and turn the request off",
  });
  await glide(use);
  await use.click();
  await page.getByText("This plan follows every request.").waitFor();
  await page.waitForTimeout(2200);

  // Break a fixed seat by hand and let the page say so.
  const seatOf = (name) =>
    page.locator(".seat", {
      has: page.locator(".seat-name", { hasText: new RegExp(`^${name}$`) }),
    });
  await glide(seatOf("Mei"));
  await seatOf("Mei").dragTo(seatOf("Ben"), { steps: 24 });
  await page.locator(".violations").waitFor();
  await page.waitForTimeout(2600);
  const undo = page.getByRole("button", { name: "Undo" });
  await glide(undo);
  await undo.click();
  await page.getByText("This plan follows every request.").waitFor();
  await page.waitForTimeout(1800);

  await context.close();
  await browser.close();
  browser = undefined;

  const recording = (await readdir(temp)).find((name) =>
    name.endsWith(".webm"),
  );
  if (!recording) throw new Error("Browser did not write a video recording");
  const converted = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      "0.6",
      "-i",
      join(temp, recording),
      "-t",
      "20",
      "-filter_complex",
      "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
      output,
    ],
    { stdio: "inherit" },
  );
  if (converted.status !== 0) throw new Error("ffmpeg GIF conversion failed");
  const info = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size",
      "-of",
      "default=noprint_wrappers=1",
      output,
    ],
    { encoding: "utf8" },
  );
  if (info.status !== 0) throw new Error("ffprobe could not inspect the GIF");
  const values = Object.fromEntries(
    info.stdout
      .trim()
      .split("\n")
      .map((line) => line.split("=")),
  );
  const bytes = Number(values.size);
  if (bytes >= 10 * 1024 * 1024) throw new Error("GIF exceeds 10 MB");
  console.log(
    `Wrote ${output} (${Number(values.duration).toFixed(2)} seconds, ${bytes} bytes).`,
  );
} finally {
  if (browser) await browser.close();
  await server.close();
  await rm(temp, { recursive: true, force: true });
}
