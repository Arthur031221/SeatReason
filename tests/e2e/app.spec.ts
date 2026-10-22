import { expect, test, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { serializeProject, emptyProject } from "../../src/core/project.ts";
import type { Rule } from "../../src/core/problem.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const seatOf = (page: Page, name: string) =>
  page.locator(".seat", {
    has: page.locator(".seat-name", { hasText: new RegExp(`^${name}$`) }),
  });

test("a conflict is explained and a repair is previewed, then used", async ({
  page,
}) => {
  await expect(
    page.getByText("These 6 requests cannot all hold"),
  ).toBeVisible();
  await expect(page.locator(".rule.is-conflict")).toHaveCount(6);
  await expect(
    page.locator(".rule", { hasText: "Leo and Zoe" }),
  ).not.toHaveClass(/is-conflict/);

  const card = page.locator(".repair", {
    hasText: "Noor sits in the front row",
  });
  await expect(card).toContainText("Seats changed: 4");
  await card.getByRole("button", { name: "Show this plan" }).click();
  await expect(page.locator(".seat.is-changed")).toHaveCount(4);

  await page
    .getByRole("button", { name: "Use this plan and turn the request off" })
    .click();
  await expect(
    page.getByText("The plan can meet every request (9 switched on)."),
  ).toBeVisible();
  await expect(
    page.getByText("This plan follows every request."),
  ).toBeVisible();
  await expect(page.locator(".rule.is-off")).toContainText(
    "Noor sits in the front row",
  );
  await expect(page.locator(".seat.is-changed")).toHaveCount(0);
});

test("going back from a preview leaves the plan alone", async ({ page }) => {
  const before = await page.locator(".seat-name").allTextContents();
  const card = page.locator(".repair", {
    hasText: "Maya sits in the front row",
  });
  await card.getByRole("button", { name: "Show this plan" }).click();
  await page.getByRole("button", { name: "Back to my plan" }).click();
  expect(await page.locator(".seat-name").allTextContents()).toEqual(before);
  await expect(page.locator(".rule.is-off")).toHaveCount(0);
});

test("a dragged seat is validated and can be undone", async ({ page }) => {
  await page.getByRole("button", { name: "Show this plan" }).first().click();
  await page
    .getByRole("button", { name: "Use this plan and turn the request off" })
    .click();
  await expect(
    page.getByText("This plan follows every request."),
  ).toBeVisible();

  // Ben is pinned to row 5, seat 1. Swap him with Mei, which breaks that request.
  await seatOf(page, "Mei").dragTo(seatOf(page, "Ben"));
  await expect(page.getByText("This plan breaks some requests:")).toBeVisible();
  await expect(page.locator(".violations")).toContainText(
    "Ben sits in row 5, seat 1",
  );
  await expect(page.locator(".seat.is-broken")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByText("This plan follows every request."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByText("This plan breaks some requests:")).toBeVisible();
});

test("click a name, then an empty seat, moves the pupil", async ({ page }) => {
  await page.getByRole("button", { name: "Show this plan" }).first().click();
  await page
    .getByRole("button", { name: "Use this plan and turn the request off" })
    .click();
  const empty = page.locator(".seat.is-empty").first();
  const place = await empty.getAttribute("aria-label");
  await seatOf(page, "Leo").click();
  await expect(page.getByText("Leo selected. Choose a seat.")).toBeVisible();
  await empty.click();
  await expect(page.locator(`.seat[aria-label="${place}: Leo"]`)).toHaveCount(
    1,
  );
  await expect(page.locator(".seat-name", { hasText: /^Leo$/ })).toHaveCount(1);
});

test("save, change the class, then reopen the file", async ({ page }, info) => {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save file" }).click();
  const file = info.outputPath("saved.json");
  await (await download).saveAs(file);
  const saved = JSON.parse(readFileSync(file, "utf8"));
  expect(saved.name).toBe("Class 4B");

  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  await expect(page.getByLabel("Class name")).toHaveValue("Class 3C");
  await page.getByTestId("open-file").setInputFiles(file);
  await expect(page.getByLabel("Class name")).toHaveValue("Class 4B");
  await expect(
    page.getByText("These 6 requests cannot all hold"),
  ).toBeVisible();
});

test("a file that is not a plan is refused with a reason", async ({ page }) => {
  await page.getByTestId("open-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version": 99}'),
  });
  await expect(page.getByRole("alert")).toContainText("not a SeatReason plan");
  await expect(page.getByLabel("Class name")).toHaveValue("Class 4B");
});

test("the plan survives a reload", async ({ page }) => {
  await expect(page.getByLabel("Class name")).toHaveValue("Class 4B");
  await page.getByLabel("Class name").fill("Room 12");
  await page.reload();
  await expect(page.getByLabel("Class name")).toHaveValue("Room 12");
  await expect(page.locator(".seat-name")).toHaveCount(24);
});

test("two pupils with the same name stay separate", async ({ page }) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  await page.getByLabel("Pupils, one name per line").fill("Sam\nSam\nAlex");
  await page.getByRole("button", { name: "Update class" }).click();
  await expect(page.locator(".seat-name")).toHaveCount(3);
  await expect(page.locator(".seat-name", { hasText: "Sam (1)" })).toHaveCount(
    1,
  );
  await expect(page.locator(".seat-name", { hasText: "Sam (2)" })).toHaveCount(
    1,
  );
});

test("more pupils than desks is reported as a capacity problem", async ({
  page,
}) => {
  await page.getByLabel("Seats per row").fill("2");
  await page.getByLabel("Seats per row").press("Enter");
  await page.getByLabel("Rows", { exact: true }).fill("2");
  await page.getByLabel("Rows", { exact: true }).press("Enter");
  await expect(
    page.getByText(/There are not enough desks. Pupils: 24. Desks: 4./),
  ).toBeVisible();
});

test("a request can be added and shows up in the conflict", async ({
  page,
}) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  await expect(
    page.getByText("The plan can meet every request (5 switched on)."),
  ).toBeVisible();
  const form = page.locator(".rule-form");
  await form.getByLabel("Kind of request").selectOption("pin");
  await form.locator("select").nth(1).selectOption({ label: "Zoe" });
  await form.getByLabel("Row", { exact: true }).fill("1");
  await form.getByLabel("Seat", { exact: true }).fill("1");
  await form.getByRole("button", { name: "Add request" }).click();
  // Omar already holds that seat.
  await expect(
    page.getByText("These 2 requests cannot all hold"),
  ).toBeVisible();
});

async function openClique(page: Page, path: string) {
  const project = emptyProject();
  project.room = { rows: 4, cols: 4, blocked: [] };
  project.pupils = Array.from({ length: 9 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Pupil ${i + 1}`,
  }));
  const rules: Rule[] = [];
  for (let a = 1; a <= 9; a++)
    for (let b = a + 1; b <= 9; b++)
      rules.push({
        id: `r${rules.length + 1}`,
        enabled: true,
        kind: "apart",
        a: `p${a}`,
        b: `p${b}`,
      });
  project.rules = rules;
  writeFileSync(path, serializeProject(project));
  await page.getByTestId("open-file").setInputFiles(path);
}

test("a pair asked to sit together and apart is named as a clash", async ({
  page,
}) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  const form = page.locator(".rule-form");
  await form.getByLabel("Kind of request").selectOption("together");
  await form.locator("select").nth(1).selectOption({ label: "Hana" });
  await form.locator("select").nth(2).selectOption({ label: "Lucas" });
  await form.getByRole("button", { name: "Add request" }).click();
  await expect(
    page.getByText("These 2 requests cannot all hold"),
  ).toBeVisible();
  const clash = page.locator(".status");
  await expect(clash).toContainText("Hana and Lucas sit next to each other");
  await expect(clash).toContainText(
    "Hana and Lucas do not sit next to each other",
  );
});

test("a pupil asked for the front and the back row is named as a clash", async ({
  page,
}) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  const form = page.locator(".rule-form");
  await form.getByLabel("Kind of request").selectOption("front");
  await form.locator("select").nth(1).selectOption({ label: "Hana" });
  await form.getByRole("button", { name: "Add request" }).click();
  await form.getByLabel("Kind of request").selectOption("back");
  await form.locator("select").nth(1).selectOption({ label: "Hana" });
  await form.getByRole("button", { name: "Add request" }).click();
  await expect(
    page.getByText("These 2 requests cannot all hold"),
  ).toBeVisible();
  const clash = page.locator(".status");
  await expect(clash).toContainText("Hana sits in the front row");
  await expect(clash).toContainText("Hana sits in the back row");
});

test("a search that is cancelled is not reported as impossible", async ({
  page,
}, info) => {
  await openClique(page, info.outputPath("clique.json"));
  await expect(page.getByText("Checking your requests")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByText("The check was cancelled. Nothing was decided."),
  ).toBeVisible();
  await expect(page.getByText(/cannot all hold/)).toHaveCount(0);
});

test("a search that runs out of time says so and does not claim impossible", async ({
  page,
}, info) => {
  test.setTimeout(40000);
  await openClique(page, info.outputPath("clique.json"));
  await expect(
    page.getByText(/stopped after 8 seconds without an answer/),
  ).toBeVisible({
    timeout: 25000,
  });
  await expect(page.getByText(/cannot all hold/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
});

test("the language can be switched and is remembered", async ({ page }) => {
  await page.locator("select[aria-label='Language']").selectOption("ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 2 }).first()).not.toHaveText(
    "Your class",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
});

test("print sheet lists every pupil and the state of each request", async ({
  page,
}) => {
  await page.emulateMedia({ media: "print" });
  const sheet = page.locator(".print-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(".print-list li")).toHaveCount(24);
  await expect(sheet.locator(".print-rules")).toContainText("not kept");
  await expect(page.locator(".app")).toBeHidden();
});

test("clearing the room size to type a new one keeps the requests", async ({
  page,
}) => {
  const rows = page.getByLabel("Rows", { exact: true });
  await expect(page.locator(".rules .rule")).toHaveCount(10);
  await rows.click();
  await rows.press("Control+a");
  await rows.press("Backspace");
  await expect(page.locator(".seat")).toHaveCount(30);
  await expect(page.locator(".rules .rule")).toHaveCount(10);
  await rows.pressSequentially("4");
  await expect(page.locator(".seat")).toHaveCount(30);
  await rows.press("Enter");
  await expect(page.locator(".seat")).toHaveCount(24);
  await expect(page.locator(".rules .rule")).toHaveCount(9);
  await rows.press("ArrowUp");
  await expect(page.locator(".seat")).toHaveCount(30);
});

test("a seat can be fixed from the plan without typing numbers", async ({
  page,
}) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  const before = await page.locator(".rules .rule").count();
  await seatOf(page, "Zoe").click();
  await page.getByRole("button", { name: "Fix Zoe in this seat" }).click();
  await expect(page.locator(".rules .rule")).toHaveCount(before + 1);
  await expect(
    page.locator(".rule", { hasText: "Zoe sits in row" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Fix Zoe in this seat" }),
  ).toHaveCount(0);
});

test("seats in a conflict say so to a screen reader", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /Maya.*in a conflict/ }),
  ).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the verdict is on the first screen", async ({ page }) => {
    await expect(
      page.getByText("These 6 requests cannot all hold"),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

test("a room size the app has to lower is shown as the real size", async ({
  page,
}) => {
  const rows = page.getByLabel("Rows", { exact: true });
  const cols = page.getByLabel("Seats per row");
  await rows.fill("6");
  await rows.press("Enter");
  await cols.fill("8");
  await cols.press("Enter");
  await expect(page.locator(".seat")).toHaveCount(48);
  await cols.fill("12");
  await cols.press("Enter");
  await expect(page.locator(".seat")).toHaveCount(48);
  await expect(cols).toHaveValue("8");
});

test("fixing a seat again moves the earlier fixed seat of that pupil", async ({
  page,
}) => {
  await page
    .locator("select[aria-label='Example class']")
    .selectOption("ready");
  await seatOf(page, "Zoe").click();
  await page.getByRole("button", { name: "Fix Zoe in this seat" }).click();
  const rules = page.locator(".rule", { hasText: "Zoe sits in row" });
  await expect(rules).toHaveCount(1);
  await seatOf(page, "Ben").click();
  await seatOf(page, "Zoe").click();
  await page.getByRole("button", { name: "Fix Zoe in this seat" }).click();
  await expect(rules).toHaveCount(1);
});

test("the app opens again with the network gone", async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".seat").first()).toBeVisible();
  await page.getByRole("button", { name: /Shuffle/ }).click();
  await context.setOffline(false);
});
