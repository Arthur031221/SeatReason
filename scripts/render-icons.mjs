import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const svg = readFileSync("assets/logo.svg", "utf8");
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
});
for (const size of [192, 512]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`,
  );
  await page.screenshot({
    path: `public/icon-${size}.png`,
    omitBackground: true,
  });
  await page.close();
}
await browser.close();
