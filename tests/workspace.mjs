import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { site } from "./helpers/site.mjs";
const server = await site();
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.route(/fonts\./, (route) => route.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.base + "/workspace.html");
  await page.locator("#workspace-root[data-ready=true]").waitFor();
  await page
    .getByRole("heading", { name: "Your workspace", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Manage records", exact: true })
    .click();
  await page.getByRole("table").waitFor();
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 4);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 2);
  await page
    .getByRole("searchbox", { name: "Search records" })
    .fill("missing record");
  await page.getByRole("heading", { name: "No matching records" }).waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("table").waitFor();
  await page.getByText("Demo controls", { exact: true }).click();
  await page.getByLabel("Fail next request", { exact: true }).check();
  await page.getByRole("searchbox").fill("kit");
  await page
    .getByRole("heading", { name: "Records could not be loaded" })
    .waitFor();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("table").waitFor();
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 2);
  await page.getByRole("button", { name: "New record", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "New record", exact: true });
  await editor.getByRole("button", { name: "Save record" }).click();
  assert(await editor.locator("[data-lm-error-summary]").isVisible());
  await expect(editor.getByLabel("Record name", { exact: true })).toBeFocused();
  await editor
    .getByLabel("Record name", { exact: true })
    .fill("Design station");
  await editor.getByLabel("Owner", { exact: true }).fill("Pat Rivera");
  await editor.getByLabel("Quantity", { exact: true }).fill("3");
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Discard record changes?" })
    .getByRole("button", { name: "Keep editing" })
    .click();
  assert.equal(
    await editor.getByLabel("Record name", { exact: true }).inputValue(),
    "Design station",
  );
  await editor.getByRole("button", { name: "Save record" }).click();
  await editor.waitFor({ state: "hidden" });
  await page.getByRole("searchbox").fill("Design station");
  await page
    .getByRole("button", { name: "Open Design station", exact: true })
    .waitFor();
  await page.getByLabel("Fail next request", { exact: true }).check();
  await page
    .getByRole("button", { name: "Open Design station", exact: true })
    .click();
  let detail = page.getByRole("dialog", {
    name: "Design station",
    exact: true,
  });
  await detail.getByRole("button", { name: "Edit record" }).click();
  editor = page.getByRole("dialog", { name: "Edit record", exact: true });
  await editor.getByLabel("Quantity", { exact: true }).fill("5");
  await editor.getByRole("button", { name: "Save record" }).click();
  await expect(editor.locator("[data-lm-form-status]")).toContainText(
    "Connection interrupted",
  );
  assert.equal(
    await editor.getByLabel("Quantity", { exact: true }).inputValue(),
    "5",
  );
  assert(await editor.getByRole("button", { name: "Save record" }).isEnabled());
  await editor.getByRole("button", { name: "Save record" }).click();
  await editor.waitFor({ state: "hidden" });
  await expect(detail).toContainText("5");
  await detail
    .getByRole("button", { name: "Archive record", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Archive this record?" })
    .getByRole("button", { name: "Archive record", exact: true })
    .click();
  await detail.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("table").waitFor();
  await expect(page.locator("tbody tr:not([hidden])")).toContainText("Active");
  await page.getByRole("searchbox").fill("");
  await expect(page.locator("[data-workspace-record-count]")).toHaveText(
    "7 matching records",
  );
  await page.getByLabel("Select visible records", { exact: true }).check();
  await page
    .getByRole("button", { name: "Archive selected (4)", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Archive selected records?" })
    .getByRole("button", { name: "Archive records", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Workspace name", { exact: true })
    .fill("Team Operations");
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Discard unsaved changes?" })
    .getByRole("button", { name: "Keep editing" })
    .click();
  assert.equal(
    await page.getByLabel("Workspace name", { exact: true }).inputValue(),
    "Team Operations",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(
    await page.getByLabel("Workspace name", { exact: true }).inputValue(),
    "Lumen Workspace",
  );
  await page.getByLabel("Primary color", { exact: true }).fill("#b91c1c");
  await page.getByLabel("Corner radius (px)", { exact: true }).fill("18");
  await page.getByLabel("Panel spacing (px)", { exact: true }).fill("28");
  await page
    .getByLabel("Medium control height (px)", { exact: true })
    .fill("52");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator("[data-lm-form-status]")).toHaveText(
    "Settings saved.",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Save settings" })
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(185, 28, 28)",
  );
  assert.equal(
    await page
      .getByLabel("Workspace name", { exact: true })
      .evaluate((n) => n.getBoundingClientRect().height),
    52,
  );
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByLabel("Choose files", { exact: true }).setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Session notes"),
  });
  await page.getByRole("button", { name: "Upload files", exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole("progressbar", { name: "File upload progress" })
        .evaluate((n) => n.value),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Cancel upload", exact: true })
    .click();
  await expect(page.locator("[data-lm-form-status]")).toContainText(
    "cancelled",
  );
  await page.getByRole("button", { name: "Upload files", exact: true }).click();
  await expect(page.locator("[data-workspace-files-list]")).toContainText(
    "notes.txt",
  );
  await expect(
    page.getByRole("progressbar", { name: "File upload progress" }),
  ).toHaveAttribute("value", "100");
  await page.getByLabel("Access", { exact: true }).selectOption("viewer");
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await page.getByRole("table").waitFor();
  assert(
    await page
      .getByRole("button", { name: "New record", exact: true })
      .isDisabled(),
  );
  await expect(
    page.getByText(
      "You have view-only access. Editing actions are unavailable.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Workspace kit", exact: true })
    .click();
  assert(
    await page
      .getByRole("dialog", { name: "Workspace kit", exact: true })
      .getByRole("button", { name: "Edit record" })
      .isDisabled(),
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("Access", { exact: true }).selectOption("editor");
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  let audits = 0;
  for (const view of ["Overview", "Records", "Settings", "Files"])
    for (const mode of ["desktop", "mobile-rtl", "dark"]) {
      await page.setViewportSize(
        mode === "mobile-rtl"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
      );
      await page.evaluate((mode) => {
        document.documentElement.dir = mode === "mobile-rtl" ? "rtl" : "ltr";
      }, mode);
      await page
        .getByLabel("Theme", { exact: true })
        .selectOption(mode === "dark" ? "dark" : "light");
      await page.getByRole("button", { name: view, exact: true }).click();
      if (view === "Records") await page.getByRole("table").waitFor();
      await page.addScriptTag({ content: axe });
      const issues = await page.evaluate(async () => {
        const r = await axe.run(document.getElementById("workspace-root"), {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        });
        return r.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        }));
      });
      assert.deepEqual(issues, [], view + " " + mode + " accessibility");
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        view + " " + mode + " overflow",
      );
      audits++;
    }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await mkdir("/tmp/lumen-app-review", { recursive: true });
  await page.screenshot({ path: "/tmp/lumen-app-review/overview.png" });
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await page.getByRole("table").waitFor();
  await page.screenshot({ path: "/tmp/lumen-app-review/records.png" });
  // The same app survives portable export without network or source-tree dependencies.
  const studio = await context.newPage();
  await studio.goto(server.base + "/studio-preview.html#compositions");
  await studio.waitForFunction(() => window.LumenStudio);
  const html = await studio.evaluate(() =>
    LumenStudio.standalone(
      LumenStudio.catalog.items.find((i) => i.key === "core/workspace"),
      "all",
      true,
    ),
  );
  const portable = await context.newPage();
  await portable.route("**/*", (route) => route.abort());
  await portable.setContent(html);
  await portable.getByRole("button", { name: "Manage records" }).click();
  await portable.getByRole("table").waitFor();
  assert.equal(await portable.locator("tbody tr:not([hidden])").count(), 4);
  await portable.close();
  await studio.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS connected workspace: filtering/paging, request failure/retry, validation, create/edit, save failure/retry, details, bulk archive/undo, dirty navigation/reset, branded settings, upload cancel/retry, permissions, portable app and " +
      audits +
      " WCAG/mobile/RTL/theme audits",
  );
} finally {
  await browser?.close();
  await server.close();
}
