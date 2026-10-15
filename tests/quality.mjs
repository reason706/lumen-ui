import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { chromium, expect } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
const root = resolve("."),
  server = createServer(async (req, res) => {
    try {
      const file = resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      assert(file.startsWith(root + "/"));
      res.setHeader(
        "Content-Type",
        {
          ".css": "text/css",
          ".js": "text/javascript",
          ".html": "text/html",
          ".json": "application/json",
          ".svg": "image/svg+xml",
        }[extname(file)] || "text/plain",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let browser;
const update = process.argv.includes("--update");
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await context.route(/fonts\./, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/studio-preview.html#buttons");
  await page.waitForFunction(() => window.LumenStudio);
  await page.locator("#search").fill("IB");
  assert(
    await page.locator('[data-key="buttons/icon-buttons-variants"]').count(),
  );
  await page.locator("#search").fill("soft");
  assert(await page.locator('[data-key="buttons/soft-tinted"]').count());
  await page.evaluate(() =>
    LumenStudio.openInspector(
      LumenStudio.catalog.items.find((i) => i.key === "buttons/solid"),
    ),
  );
  await page.locator("[data-inspect=configure]").click();
  await page.locator("#configure-style").selectOption("tonal");
  await page.locator("#configure-color").selectOption("gradient-ocean");
  await page.locator("#configure-size").selectOption("xl");
  await page.locator("#configure-iconOnly").check();
  await page.locator("#configure-text").fill("Create project");
  await page
    .locator(".variant-preview .btn-icon.size-xl.color-gradient-ocean")
    .waitFor();
  const markup = await page.locator(".variant-code").textContent();
  assert(markup.includes("btn-style-tonal"));
  assert(markup.includes('aria-label="Create project"'));
  assert(markup.includes("<svg"));
  assert(!markup.includes("<use"));
  const configuredURL = await page
    .locator("#standalone-link")
    .getAttribute("href");
  const standalone = await context.newPage();
  await standalone.goto(base + "/" + configuredURL);
  await standalone.getByRole("button", { name: "Create project" }).waitFor();
  assert.equal(
    await standalone
      .locator(".btn")
      .evaluate((n) => n.getBoundingClientRect().width),
    62,
  );
  await standalone.close();
  const portable = await page.evaluate(() =>
    LumenStudio.standalone(
      LumenStudio.catalog.items.find((i) => i.key === "buttons/solid"),
      "all",
      true,
    ),
  );
  assert(!portable.includes('<link rel="stylesheet"'));
  assert(!portable.includes("<script src="));
  assert(portable.includes("color-gradient-ocean"));
  const offline = await context.newPage();
  await offline.route("**/*", (r) => r.abort());
  await offline.setContent(portable);
  await offline.getByRole("button", { name: "Create project" }).waitFor();
  assert.equal(
    await offline
      .locator(".btn")
      .evaluate((n) => n.getBoundingClientRect().height),
    62,
  );
  await offline.close();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-example").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "solid.html");
  await download.delete();
  await page.locator("#inspector-close").click();
  const reference = await page.evaluate(async () => {
    const item = LumenStudio.catalog.items.find((i) => i.source === "forms");
    return {
      linked: await LumenStudio.standalone(item),
      portable: await LumenStudio.standalone(item, "all", true),
    };
  });
  assert(
    reference.linked.includes("lumen-core.css"),
    "Category exports must include shared Foundations",
  );
  assert(
    reference.portable.includes("--lumen-color-primary:"),
    "Portable category exports must embed the palette",
  );
  async function example(id) {
    await page.goto(base + "/example.html?item=core/" + id);
    await page.locator("#example[data-ready=true]").waitFor();
  }
  await example("login");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert.equal(
    await page.locator("[name=email]").getAttribute("aria-invalid"),
    "true",
  );
  assert(await page.locator("#login-email-error").isVisible());
  await page.locator("[name=email]").fill("alex@example.com");
  await page.locator("[name=password]").fill("Password123");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert(
    (await page.locator("[data-lm-form-status]").textContent()).includes(
      "validated",
    ),
  );
  await example("settings");
  await page.locator("[name=email]").fill("bad");
  await page.getByRole("button", { name: "Save settings" }).click();
  assert(await page.locator("#settings-email-error").isVisible());
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  assert(await page.locator("#settings-email-error").isHidden());
  assert.equal(
    await page.locator("[name=email]").inputValue(),
    "alex@example.com",
  );
  await page.evaluate(() => {
    const button = document.querySelector("button[type=submit]");
    window.pending = LumenUI.run(
      button,
      () => new Promise((resolve) => (window.finishTask = resolve)),
    );
  });
  assert.equal(
    await page.locator("button[type=submit]").getAttribute("aria-busy"),
    "true",
  );
  assert(await page.locator("button[type=submit]").isDisabled());
  await page.evaluate(async () => {
    finishTask();
    await pending;
  });
  assert(await page.locator("button[type=submit]").isEnabled());
  assert.equal(
    await page.locator("button[type=submit]").getAttribute("aria-busy"),
    null,
  );
  await page.evaluate(async () => {
    const button = document.querySelector("button[type=submit]");
    try {
      await LumenUI.run(button, () =>
        Promise.reject(Error("Expected failure")),
      );
    } catch {}
  });
  assert(await page.locator("button[type=submit]").isEnabled());
  await example("data-management");
  assert.equal(await page.locator("tbody tr:visible").count(), 3);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert(
    (await page.locator("[data-lm-pagination] output").textContent()).includes(
      "Page 2",
    ),
  );
  await page.getByRole("searchbox").fill("Paid");
  assert.equal(await page.locator("tbody tr:visible").count(), 3);
  assert(
    (await page.locator("[data-lm-pagination] output").textContent()).includes(
      "4 results",
    ),
  );
  await page.getByLabel("Select visible orders").check();
  assert.equal(
    await page.locator("tbody tr:not([hidden]) input:checked").count(),
    3,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(
    await page.locator("tbody tr:not([hidden]) input:checked").count(),
    0,
  );
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download visible rows" }).click();
  const csv = await csvPromise;
  assert.equal(csv.suggestedFilename(), "orders-table.csv");
  await csv.delete();
  await example("table");
  await page.locator("thead input[type=checkbox]").check();
  await page.locator("tbody input[type=checkbox]").first().uncheck();
  assert(
    await page
      .locator("thead input[type=checkbox]")
      .evaluate((n) => n.indeterminate),
    "Unchecking a row updates select-all in a non-paginated table",
  );
  await example("checkout");
  await page.locator("[name=name]").fill("Alex");
  await page.locator("[name=email]").fill("alex@example.com");
  await page.locator("[name=address]").fill("12 Example Street");
  await page.getByRole("button", { name: "Review order" }).click();
  assert(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review order" }),
  ).toBeFocused();
  await example("action-workflows");
  await page.getByRole("button", { name: "Remove draft" }).click();
  assert(await page.locator("#workflow-item").isHidden());
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert(await page.locator("#workflow-item").isVisible());
  // Ready-built files work independently of the source tree and its import graph.
  await page.goto(base + "/dist/index.html");
  await page.getByRole("button", { name: "Try an action" }).click();
  assert(
    await page.getByRole("status").filter({ hasText: "ready" }).isVisible(),
  );
  assert.equal(
    await page.evaluate(() =>
      LumenIcons.create("check", { label: "Completed" }).getAttribute(
        "aria-label",
      ),
    ),
    "Completed",
  );
  // Built full CSS must render the same ordinary DOM as the import-based bundle.
  await example("settings");
  await page.evaluate(
    (url) =>
      new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.id = "distribution-probe";
        link.rel = "stylesheet";
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.append(link);
      }),
    base + "/lumen.css",
  );
  const sourceImage = PNG.sync.read(
    await page.locator("#example").screenshot({ animations: "disabled" }),
  );
  await page.evaluate(
    (url) =>
      new Promise((resolve, reject) => {
        const link = document.getElementById("distribution-probe");
        link.onload = resolve;
        link.onerror = reject;
        link.href = url;
      }),
    base + "/dist/lumen.css",
  );
  const bundleImage = PNG.sync.read(
    await page.locator("#example").screenshot({ animations: "disabled" }),
  );
  assert.equal(bundleImage.width, sourceImage.width);
  assert.equal(bundleImage.height, sourceImage.height);
  assert(
    pixelmatch(
      sourceImage.data,
      bundleImage.data,
      null,
      sourceImage.width,
      sourceImage.height,
      { threshold: 0.15 },
    ) /
      (sourceImage.width * sourceImage.height) <
      0.003,
    "Flattening/deduplication changed component rendering",
  );
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "card";
    probe.id = "foundation-probe";
    probe.innerHTML =
      '<button class="btn">Foundation action</button><strong class="weight-bold">Type weight</strong>';
    document.getElementById("example").append(probe);
    document.documentElement.style.setProperty("--space-5", "2rem");
    document.documentElement.style.setProperty("--font-weight-bold", "800");
    document.documentElement.style.setProperty(
      "--lumen-color-primary",
      "#b91c1c",
    );
  });
  await page.evaluate(() => {
    const reference = document.createElement("div");
    reference.className = "buttons-preview";
    reference.id = "foundation-reference";
    reference.innerHTML = '<button class="btn">Reference action</button>';
    document.getElementById("example").append(reference);
    document.documentElement.style.setProperty("--font-sans", "Georgia, serif");
  });
  assert.equal(
    await page
      .locator("#foundation-reference .btn")
      .evaluate((n) => getComputedStyle(n).fontWeight),
    "800",
  );
  assert(
    (
      await page
        .locator("#foundation-reference .btn")
        .evaluate((n) => getComputedStyle(n).fontFamily)
    ).includes("Georgia"),
  );
  assert.equal(
    await page
      .locator("#foundation-probe")
      .evaluate((n) => getComputedStyle(n).paddingTop),
    "32px",
  );
  assert.equal(
    await page
      .locator("#foundation-probe .btn")
      .evaluate((n) => getComputedStyle(n).paddingInlineStart),
    "32px",
  );
  assert.equal(
    await page
      .locator("#foundation-probe strong")
      .evaluate((n) => getComputedStyle(n).fontWeight),
    "800",
  );
  await expect
    .poll(() =>
      page
        .locator("#foundation-probe .btn")
        .evaluate((n) => getComputedStyle(n).backgroundColor),
    )
    .toBe("rgb(185, 28, 28)");
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  let audits = 0,
    images = 0;
  for (const id of [
    "login",
    "settings",
    "dashboard",
    "checkout",
    "data-management",
    "action-workflows",
  ]) {
    await example(id);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await axe.run(document.getElementById("example"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      }));
    });
    assert.deepEqual(violations, [], id + " accessibility");
    audits++;
  }
  // Every configurator primitive/style is audited in both light and dark themes.
  await example("cards");
  for (const theme of ["light", "dark"])
    for (const type of [
      "btn",
      "card",
      "badge",
      "input",
      "alert",
      "chip",
      "avatar",
      "progress",
    ]) {
      const styles = await page.evaluate(
        (type) =>
          LumenVariants.types[type].length ? LumenVariants.types[type] : [""],
        type,
      );
      for (const style of styles) {
        await page.evaluate(
          ({ theme, type, style }) => {
            document.documentElement.dataset.theme = theme;
            document.getElementById("example").replaceChildren(
              LumenVariants.create({
                type,
                style,
                color: ["input", "progress"].includes(type)
                  ? "blue"
                  : "gradient-violet",
                icon: true,
                text: "Example component",
              }),
            );
          },
          { theme, type, style },
        );
        await page.addScriptTag({ content: axe });
        const violations = await page.evaluate(async () => {
          const r = await axe.run(document.getElementById("example"), {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          });
          return r.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          }));
        });
        assert.deepEqual(
          violations,
          [],
          theme + " configured " + type + " " + style,
        );
        audits++;
      }
    }
  await mkdir("tests/visual", { recursive: true });
  await mkdir("/tmp/lumen-visual-diffs", { recursive: true });
  for (const id of ["dashboard", "settings", "checkout", "data-management"])
    for (const mobile of [false, true]) {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      );
      await example(id);
      if (mobile)
        await page.evaluate(() => (document.documentElement.dir = "rtl"));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        id + " page overflows at " + (mobile ? "mobile RTL" : "desktop"),
      );
      if (id === "dashboard" && mobile) {
        const toggle = page.getByRole("button", { name: "Menu", exact: true });
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        await toggle.click();
        assert(await page.locator("#dashboard-links").isVisible());
        await toggle.click();
      }
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => document.activeElement?.blur());
      const actual = await page
          .locator("#example")
          .screenshot({ animations: "disabled" }),
        file =
          "tests/visual/" + id + (mobile ? "-mobile-rtl" : "-desktop") + ".png";
      if (update) await writeFile(file, actual);
      else {
        const expected = PNG.sync.read(await readFile(file)),
          received = PNG.sync.read(actual);
        assert.equal(received.width, expected.width, file + " width");
        assert.equal(received.height, expected.height, file + " height");
        const diff = new PNG({
            width: received.width,
            height: received.height,
          }),
          changed = pixelmatch(
            expected.data,
            received.data,
            diff.data,
            received.width,
            received.height,
            { threshold: 0.15 },
          );
        if (changed / (received.width * received.height) > 0.003) {
          await writeFile(
            "/tmp/lumen-visual-diffs/" +
              id +
              (mobile ? "-mobile-rtl" : "-desktop") +
              ".png",
            PNG.sync.write(diff),
          );
          assert.fail(
            file + " visual regression: " + changed + " pixels changed",
          );
        }
      }
      images++;
    }
  assert.deepEqual(errors, [], "Uncaught runtime errors");
  console.log(
    `PASS quality: configurator/portable export/downloads, search synonyms, validation/reset, busy success/failure, paged filtering/selection/CSV, dialog focus, undo, distribution, ${audits} accessibility audits and ${images} visual baselines (desktop/mobile RTL)`,
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
