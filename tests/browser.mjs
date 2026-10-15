import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
const catalog = JSON.parse(await readFile("catalog/components.json", "utf8"));
const server = spawn(
  "python3",
  ["-m", "http.server", "8123", "--bind", "127.0.0.1"],
  { stdio: "ignore" },
);
const base = "http://127.0.0.1:8123";
let browser;
try {
  for (let n = 0; n < 50; n++) {
    try {
      const r = await fetch(base);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/studio-preview.html");
  await page.waitForFunction(() => window.LumenStudio);
  assert.equal(await page.locator("#category-nav a").count(), 12);
  // Every retained template mounts in the same preview renderer, with no ID loss.
  const inventory = await page.evaluate(async () => {
    const target = document.createElement("div");
    document.body.append(target);
    let checked = 0;
    const failures = [];
    for (const item of LumenStudio.catalog.items) {
      try {
        const p = await LumenStudio.preview(item, target);
        if (p.host.dataset.ready !== "true") throw Error("Not ready");
        if (
          !p.shadow.querySelector(
            "button,input,select,textarea,svg,div,span,p,section",
          )
        )
          throw Error("Empty");
        p.destroy();
        checked++;
      } catch (e) {
        failures.push(item.key + ": " + e.message);
      }
    }
    target.remove();
    return { checked, failures };
  });
  assert.deepEqual(inventory.failures, []);
  assert.equal(inventory.checked, catalog.items.length);
  await page.goto(base + "/studio-preview.html#buttons/solid");
  await page.waitForFunction(() => window.LumenStudio);
  await page
    .locator('[data-key="buttons/solid"] .preview-host[data-ready=true]')
    .waitFor();
  assert.equal(
    await page
      .locator('[data-key="buttons/solid"] .preview-host .row button')
      .count(),
    16,
  );
  const paired = await page
    .locator('[data-key="buttons/solid"] .preview-host .row')
    .count();
  assert.equal(paired, 2);
  // Catalog navigation, search, status filtering, and persistence.
  await page.locator("#search").fill("combobox");
  await page.locator('[data-key="core/combobox"]').waitFor();
  assert.equal(await page.locator(".example-card").count(), 1);
  await page.locator('[data-favorite="core/combobox"]').click();
  await page.goto(base + "/studio-preview.html#favorites");
  await page.waitForFunction(() => window.LumenStudio);
  assert.equal(await page.locator('[data-key="core/combobox"]').count(), 1);
  await page.locator('[aria-label="Inspect Searchable combobox"]').click();
  await page.locator("[data-inspect=html]").click();
  await page.locator("#variant-selection").waitFor();
  assert(
    (await page.locator("#inspector-body pre").textContent()).includes(
      'role="combobox"',
    ),
  );
  await page.locator("#inspector-close").click();
  await page.evaluate(() =>
    localStorage.setItem(
      "lumen-studio-recent",
      JSON.stringify([
        "core/buttons-solid",
        "buttons/solid",
        "core/buttons-tonal",
        "buttons/soft-tinted",
      ]),
    ),
  );
  await page.goto(base + "/studio-preview.html#recent");
  await page.waitForFunction(() => window.LumenStudio);
  assert.equal(
    await page.locator(".example-card").count(),
    2,
    "Recent aliases must not reintroduce duplicate cards",
  );
  // Comparison, canonical relocation aliases and responsive preview containers.
  await page.goto(base + "/studio-preview.html#buttons");
  await page.waitForFunction(() => window.LumenStudio);
  await page.locator('[aria-label="Compare Solid"]').click();
  await page.locator('[aria-label="Compare Tonal (soft)"]').click();
  await page.locator("#compare-open").click();
  assert.equal(await page.locator(".example-card").count(), 2);
  await page.goto(
    base + "/studio-preview.html#foundations/badges-solid-soft-outline",
  );
  await page.waitForFunction(() => window.LumenStudio);
  assert.equal(
    await page.locator("#page-title").textContent(),
    "Status & feedback",
  );
  assert.equal(
    await page.locator(".is-selected").getAttribute("data-key"),
    "buttons/badges-solid-soft-outline",
  );
  await page.goto(base + "/studio-preview.html#layout");
  await page.waitForFunction(() => window.LumenStudio);
  await page.locator("#layout-filter").selectOption("list");
  const gridHost = page.locator(
    '[data-key="core/responsive-grid"] .preview-host[data-ready=true]',
  );
  await gridHost.waitFor();
  await page.locator('[data-width="375"]').click();
  assert.equal(
    await gridHost
      .locator(".col-12")
      .first()
      .evaluate((e) => getComputedStyle(e).gridColumn),
    "span 12",
  );
  await page.locator('[data-width="full"]').click();
  assert.equal(
    await gridHost
      .locator(".col-12")
      .first()
      .evaluate((e) => getComputedStyle(e).gridColumn),
    "span 4",
  );
  // Inspect copied HTML for required assets and absence of studio wrappers.
  const exported = await page.evaluate(async () => {
    const item = LumenStudio.catalog.items.find((x) => x.key === "core/dialog");
    return LumenStudio.standalone(item);
  });
  assert(exported.includes("js/components.js"));
  assert(exported.includes("lumen-core.css"));
  assert(!exported.includes("example-card"));
  const reference = await page.evaluate(async () => {
    const item = LumenStudio.catalog.items.find(
      (x) => x.key === "buttons/solid",
    );
    return LumenStudio.standalone(item);
  });
  assert(reference.includes("components/public-buttons.css"));
  assert(!reference.includes('class="demo-heading"'));
  async function example(key) {
    await page.goto(base + "/example.html?item=" + encodeURIComponent(key));
    await page.locator("#example[data-ready=true]").waitFor();
  }
  await example("core/tabs");
  await page.getByRole("tab", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "Security", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert(await page.locator("#panel-profile").isHidden());
  await example("core/dropdown");
  await page.getByRole("button", { name: "Actions" }).click();
  assert(await page.getByRole("menu").isVisible());
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent),
    "Duplicate",
  );
  await page.keyboard.press("Escape");
  assert(await page.getByRole("menu").isHidden());
  await example("core/dialog");
  const opener = page.getByRole("button", { name: "Open modal dialog" });
  await opener.click();
  assert(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  assert(await page.getByRole("dialog").isHidden());
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent),
    "Open modal dialog",
  );
  await example("core/drawer");
  await page.getByRole("button", { name: "Open offcanvas drawer" }).click();
  assert(await page.getByRole("dialog").isVisible());
  await page.getByRole("button", { name: "Close", exact: true }).click();
  assert(await page.getByRole("dialog").isHidden());
  await example("core/combobox");
  const combo = page.getByRole("combobox");
  await combo.fill("sy");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(await combo.inputValue(), "Sydney");
  await example("core/validation");
  await page.getByRole("button", { name: "Validate form" }).click();
  assert.equal(
    await page.locator("#validation-email").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#validation-email").fill("test@example.com");
  await page.locator("#validation-name").fill("Alex");
  await page.getByRole("button", { name: "Validate form" }).click();
  assert.equal(
    await page.locator("#validation-email").getAttribute("aria-invalid"),
    "false",
  );
  assert(await page.getByRole("status").isVisible());
  await example("core/stepper");
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  assert.equal(await page.locator("input").inputValue(), "1");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  assert.equal(await page.locator("input").inputValue(), "2");
  await example("core/range");
  await page.locator("input").fill("73");
  assert.equal(await page.locator("output").textContent(), "73");
  await example("core/table");
  await page.getByRole("button", { name: "Name" }).click();
  assert.equal(
    await page.locator("tbody tr").first().locator("td").nth(1).textContent(),
    "Alex",
  );
  await page.locator("input[type=search]").fill("mina");
  assert.equal(await page.locator("tbody tr:visible").count(), 1);
  await page.locator("input[type=search]").fill("");
  await page.getByRole("checkbox", { name: "Select all members" }).check();
  assert.equal(await page.locator("tbody input:checked").count(), 3);
  await example("core/carousel");
  await page.getByRole("button", { name: "Next slide" }).click();
  assert.equal(
    await page.locator("[data-lm-slide]:visible h3").textContent(),
    "Ocean",
  );
  await example("core/upload");
  await page.locator("input[type=file]").setInputFiles({
    name: "demo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Hello"),
  });
  assert((await page.locator("output").textContent()).includes("demo.txt"));
  await page.getByRole("button", { name: "Clear files" }).click();
  assert.equal(
    await page.locator("input").evaluate((el) => el.files.length),
    0,
  );
  await example("core/alert");
  await page.getByRole("button", { name: "Dismiss alert" }).click();
  assert(await page.locator(".alert").isHidden());
  // Lifecycle must not accumulate duplicate listeners.
  await example("core/pagination");
  await page.getByRole("button", { name: "Page 3", exact: true }).click();
  assert.equal(await page.locator("output").textContent(), "Page 3");
  await example("core/dual-range");
  await page.locator("[data-lm-dual=low]").fill("95");
  assert.equal(await page.locator("[data-lm-dual=low]").inputValue(), "80");
  await example("core/image-comparison");
  await page.locator("input").fill("25");
  assert.equal(
    await page
      .locator(".comparison")
      .evaluate((el) => el.style.getPropertyValue("--lm-compare")),
    "25%",
  );
  await example("core/selection-tree");
  await page.getByRole("checkbox", { name: "Read projects" }).check();
  assert(
    await page
      .locator("[data-lm-tree-parent]")
      .evaluate((e) => e.indeterminate),
  );
  await page.getByRole("checkbox", { name: "All permissions" }).check();
  assert.equal(await page.locator("input:checked").count(), 4);
  await example("core/date-range");
  await page.locator("[data-lm-date-start]").fill("2026-12-10");
  await page.locator("[data-lm-date-start]").dispatchEvent("change");
  assert.equal(
    await page.locator("#range-end").getAttribute("min"),
    "2026-12-10",
  );
  await example("core/chips");
  await page.getByRole("button", { name: "Remove Design" }).click();
  assert.equal(await page.locator(".chip:visible").count(), 2);
  await example("navigation/tabs-underline-live");
  await page.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "Activity" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert(
    await page
      .getByRole("tabpanel")
      .filter({ hasText: "Activity content" })
      .isVisible(),
  );
  await example("data/selectable-rows-live");
  await page.getByRole("checkbox", { name: "All", exact: true }).check();
  assert.equal(await page.locator("tbody input:checked").count(), 3);
  await page.getByRole("button", { name: "Amount" }).click();
  assert(
    (await page.locator("tbody tr").first().textContent()).includes("$180"),
  );
  await example("sliders/slider-basics");
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("88");
  assert.equal(
    await page.locator(".range-value b").first().textContent(),
    "88",
  );
  await example("sliders/number-steppers");
  await page.getByRole("button", { name: "More", exact: true }).first().click();
  assert.equal(
    await page.locator(".stepper-native b").first().textContent(),
    "3",
  );
  await example("core/button-states");
  await page.evaluate(() => {
    const a = LumenUI.mount(document);
    a.destroy();
    LumenUI.mount(document);
    LumenUI.mount(document);
  });
  await page.getByRole("button", { name: "Toggle favorite" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Toggle favorite" })
      .getAttribute("aria-pressed"),
    "true",
  );
  // The exact exported page works without the studio.
  await page.goto(base + "/example.html");
  await page.locator("#example[data-ready=true]").waitFor();
  await page.setContent(exported);
  await page.getByRole("button", { name: "Open modal dialog" }).click();
  assert(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  // Axe on public components; failures are errors rather than a manual checklist.
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  let audits = 0;
  for (const key of [
    "core/tabs",
    "core/dropdown",
    "core/dialog",
    "core/combobox",
    "core/validation",
    "core/table",
    "core/carousel",
    "core/choices",
    "core/rating",
  ]) {
    await example(key);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await axe.run(document.getElementById("example"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
    });
    assert.deepEqual(violations, [], key + " accessibility");
    audits++;
  }
  await page.goto(base + "/studio-preview.html#buttons");
  await page.waitForFunction(() => window.LumenStudio);
  await page
    .locator('[data-key="buttons/solid"] .preview-host[data-ready=true]')
    .waitFor();
  await page.locator("#theme").selectOption("dark");
  const bg = await page
    .locator('[data-key="buttons/solid"] .btn')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert(bg !== "rgba(0, 0, 0, 0)");
  await mkdir("/tmp/lumen-screenshots", { recursive: true });
  await page.screenshot({
    path: "/tmp/lumen-screenshots/buttons.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#theme").selectOption("light");
  assert(await page.locator("#sidebar").evaluate((el) => el.inert));
  await page.locator("#menu-toggle").click();
  assert(!(await page.locator("#sidebar").evaluate((el) => el.inert)));
  await page.keyboard.press("Escape");
  assert(await page.locator("#sidebar").evaluate((el) => el.inert));
  await page.waitForFunction(
    () => document.getElementById("sidebar").getBoundingClientRect().right <= 0,
  );
  await page.screenshot({ path: "/tmp/lumen-screenshots/mobile.png" });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile shell overflow",
  );
  await page.goto(base + "/studio-preview.html");
  await page.waitForFunction(() => window.LumenStudio);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/lumen-screenshots/overview.png" });
  // Reproduce a new catalog paired with a truncated/old button template response.
  const recovery = await context.newPage();
  await recovery.route("**/templates/buttons.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<template id="solid"><section>Outdated buttons</section></template>',
    }),
  );
  await recovery.goto(base + "/studio-preview.html#buttons");
  await recovery.waitForFunction(() => window.LumenStudio);
  const recovered = await recovery.evaluate(async () => {
    const items = LumenStudio.catalog.items.filter(
      (item) => item.template === "templates/buttons.html",
    );
    for (const item of items) {
      const content = await LumenStudio.content(item);
      if (!content.querySelector('section[id="' + CSS.escape(item.id) + '"]'))
        throw Error("Wrong content for " + item.key);
    }
    return items.length;
  });
  assert(
    recovered > 30,
    "All original button templates must recover, not just the first card",
  );
  assert.equal(
    await recovery.locator('script[src$="js/studio-data.js"]').count(),
    1,
    "Share one snapshot across recovered templates",
  );
  for (const id of [
    "on-dark-surfaces",
    "button-groups",
    "overlay-and-select-buttons",
  ]) {
    await recovery.goto(base + "/example.html?item=buttons/" + id);
    await recovery.locator("#example[data-ready=true]").waitFor();
    assert(
      !(await recovery.locator("#example").textContent()).includes(
        "Missing template",
      ),
    );
  }
  await recovery.close();
  assert.deepEqual(errors, [], "Uncaught browser errors");
  console.log(
    `PASS browser: ${inventory.checked} previews, incomplete-template recovery, navigation and export, interactions, lifecycle, ${audits} accessibility audits, mobile layout`,
  );
} finally {
  await browser?.close();
  server.kill();
}
