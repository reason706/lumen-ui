import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { site } from "./helpers/site.mjs";
const name = process.env.LUMEN_BROWSER || "chromium",
  engine = { chromium, firefox, webkit }[name];
if (!engine) throw Error("Unsupported LUMEN_BROWSER: " + name);
const server = await site();
let browser;
try {
  const launch = { headless: true };
  if (name === "chromium") {
    launch.args = ["--no-sandbox"];
    if (process.env.CHROMIUM_PATH || existsSync("/usr/bin/chromium"))
      launch.executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
  }
  browser = await engine.launch(launch);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await context.route(/fonts\./, (route) => route.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.base + "/example.html?item=core/dropdown");
  await page.locator("#example[data-ready=true]").waitFor();
  await page.locator("[data-lm-menu-toggle]").click();
  await expect(page.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem").last()).toBeFocused();
  await page.keyboard.press("Escape");
  assert(await page.getByRole("menu").isHidden());
  await page.goto(server.base + "/example.html?item=core/login");
  await page.locator("#example[data-ready=true]").waitFor();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert(await page.locator("[data-lm-error-summary]").isVisible());
  await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password123");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("[data-lm-form-status]")).toContainText(
    "validated",
  );
  await page.goto(server.base + "/workspace.html");
  await page.locator("#workspace-root[data-ready=true]").waitFor();
  await page.getByRole("button", { name: "Manage records" }).click();
  await page.getByRole("table").waitFor();
  await page.getByRole("button", { name: "New record", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New record", exact: true });
  await editor
    .getByLabel("Record name", { exact: true })
    .fill("Cross browser record");
  await editor.getByLabel("Owner", { exact: true }).fill("Alex");
  await editor.getByRole("button", { name: "Save record" }).click();
  await editor.waitFor({ state: "hidden" });
  await page.getByRole("searchbox").fill("Cross browser record");
  await page
    .getByRole("button", { name: "Open Cross browser record" })
    .waitFor();
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  let checks = 0;
  for (const width of [1280, 390, 320])
    for (const dir of ["ltr", "rtl"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((dir) => (document.documentElement.dir = dir), dir);
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => {
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
      assert.deepEqual(
        violations,
        [],
        name + " " + width + " " + dir + " accessibility",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        name + " " + width + " " + dir + " reflow",
      );
      checks++;
    }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    name + " 200% text and 320px reflow",
  );
  await page.evaluate(() =>
    document.documentElement.style.removeProperty("font-size"),
  );
  if (name === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await page.getByRole("button", { name: "Records", exact: true }).click();
    await page.getByRole("table").waitFor();
    assert(
      await page
        .getByRole("button", { name: "New record", exact: true })
        .evaluate((n) => getComputedStyle(n).backgroundImage === "none"),
    );
    await page.keyboard.press("Tab");
    await page.getByRole("button", { name: "New record", exact: true }).focus();
    assert(
      await page
        .getByRole("button", { name: "New record", exact: true })
        .evaluate((n) => getComputedStyle(n).outlineStyle === "solid"),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS " +
      name +
      " compatibility: native forms, top-layer keyboard menus, connected CRUD, " +
      checks +
      " WCAG 2.2/LTR/RTL layouts, 320px reflow and 200% text" +
      (name === "chromium" ? ", forced colors" : ""),
  );
} finally {
  await browser?.close();
  await server.close();
}
