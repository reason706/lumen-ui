import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { chromium, expect } from "@playwright/test";
const root = resolve(".");
const server = createServer(async (req, res) => {
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
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await page.route(/fonts\./, (r) => r.abort());
  async function example(id) {
    await page.goto(base + "/example.html?item=core/" + id);
    await page.locator("#example[data-ready=true]").waitFor();
  }
  await example("dashboard");
  // A narrow preview inside a wide viewport must expose the same state visually and to assistive technology.
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "preview-probe";
    host.style.width = "390px";
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      '<button data-lm-collapse="preview-links" data-lm-responsive aria-expanded="true">Menu</button><nav id="preview-links">Links</nav>';
    window.previewAPI = LumenUI.mount(shadow);
  });
  const toggle = page.locator("#preview-probe button");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert(await page.locator("#preview-links").isHidden());
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert(await page.locator("#preview-links").isVisible());
  await page
    .locator("#preview-probe")
    .evaluate((n) => (n.style.width = "900px"));
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#preview-probe")
    .evaluate((n) => (n.style.width = "390px"));
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.evaluate(() => {
    const shadow = document.getElementById("preview-probe").shadowRoot;
    const button = document.createElement("button");
    button.dataset.lmToggle = "";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Toggle preview";
    window.previewEvents = 0;
    button.addEventListener("lumen:toggle", () => previewEvents++);
    shadow.append(button);
  });
  await page.getByRole("button", { name: "Toggle preview" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Toggle preview" })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.evaluate(() => previewEvents),
    1,
    "Nested mounted roots must handle an action once",
  );
  await page.evaluate(() => previewAPI.destroy());
  // Two copies of a composed form must have independent dialog targets and label references.
  await page.goto(base + "/studio-preview.html#compositions");
  await page.waitForFunction(() => window.LumenStudio);
  const snippets = await page.evaluate(async () => {
    const item = LumenStudio.catalog.items.find(
      (i) => i.key === "core/checkout",
    );
    return [await LumenStudio.markup(item), await LumenStudio.markup(item)];
  });
  await page.goto(base + "/dist/index.html");
  await page.evaluate((snippets) => {
    document.body.innerHTML = '<main class="lumen" id="copies"></main>';
    for (const snippet of snippets)
      document
        .getElementById("copies")
        .insertAdjacentHTML("beforeend", snippet);
    LumenUI.refresh(document);
  }, snippets);
  assert(
    await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((n) => n.id);
      return new Set(ids).size === ids.length;
    }),
  );
  const forms = page.locator("form");
  for (let i = 0; i < 2; i++) {
    const form = forms.nth(i);
    await form.locator("[name=name]").fill("Person " + i);
    await form.locator("[name=email]").fill("person" + i + "@example.com");
    await form.locator("[name=address]").fill("12 Example Street");
    await form.getByRole("button", { name: "Review order" }).click();
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert.equal(
      await page
        .locator("dialog")
        .nth(i)
        .evaluate((n) => n.open),
      true,
    );
    await page.keyboard.press("Escape");
  }
  await page.evaluate(() => {
    const ui = LumenUI.mount(document);
    ui.destroy();
    LumenUI.mount(document);
    LumenUI.mount(document);
  });
  await forms.first().getByRole("button", { name: "Review order" }).click();
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await page.keyboard.press("Escape");
  assert(
    await page.evaluate(() => {
      const html =
        '<svg><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient></defs><rect width="10" height="10" fill="url(#paint)"/></svg>';
      document.body.append(LumenUI.fragment(html), LumenUI.fragment(html));
      const ids = [...document.querySelectorAll("linearGradient")].map(
        (n) => n.id,
      );
      return (
        ids.length === 2 &&
        new Set(ids).size === 2 &&
        [...document.querySelectorAll("rect[fill]")].every((n) =>
          document.getElementById(n.getAttribute("fill").slice(5, -1)),
        )
      );
    }),
    "SVG paint references must follow unique copied IDs",
  );
  await example("multistep-form");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("[name=project]")).toBeFocused();
  assert.equal(
    await page.locator("[name=project]").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("[name=project]").fill("Spring release");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("[name=email]")).toBeFocused();
  await page.locator("[name=email]").fill("alex@example.com");
  await page.evaluate(() =>
    document
      .querySelector("form")
      .addEventListener("lumen:submit", (e) => (window.submitted = e.detail)),
  );
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  assert.deepEqual(await page.evaluate(() => submitted), {
    project: "Spring release",
    email: "alex@example.com",
  });
  await page.getByRole("button", { name: "Start again" }).click();
  assert(await page.locator("[name=project]").isVisible());
  await example("filter-panel");
  await page.getByLabel("Team", { exact: true }).selectOption("Design");
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 2);
  await page.getByRole("searchbox").fill("Sam");
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 1);
  await page.getByLabel("Team", { exact: true }).selectOption("Engineering");
  assert.equal(await page.locator("tbody tr:not([hidden])").count(), 0);
  assert((await page.locator("output").textContent()).includes("0 results"));
  await example("file-upload-workflow");
  const file = page.locator("[type=file]");
  await file.setInputFiles({
    name: "large.txt",
    mimeType: "text/plain",
    buffer: Buffer.alloc(1048577),
  });
  assert.equal(await file.getAttribute("aria-invalid"), "true");
  await page.getByRole("button", { name: "Clear files" }).click();
  assert.equal(await file.evaluate((n) => n.validity.customError), false);
  await file.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Notes"),
  });
  assert(
    (await page.locator("output").first().textContent()).includes("notes.txt"),
  );
  await page.getByRole("button", { name: "Check attachments" }).click();
  assert(
    (await page.locator("[data-lm-form-status]").textContent()).includes(
      "validated",
    ),
  );
  await example("editable-table");
  await page.getByLabel("Kit quantity").fill("-1");
  await page.getByRole("button", { name: "Save inventory" }).click();
  assert.equal(
    await page.getByLabel("Kit quantity").getAttribute("aria-invalid"),
    "true",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(await page.getByLabel("Kit quantity").inputValue(), "12");
  // Every shared-core composition renders identically with optional canonical-only CSS.
  const catalog = JSON.parse(await readFile("catalog/components.json", "utf8"));
  for (const id of catalog.items
    .filter((item) => item.source === "core")
    .map((item) => item.id)) {
    await example(id);
    const before = await page.locator("#example").evaluate((n) =>
      [...n.querySelectorAll("*")].map((e) => {
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return [
          e.tagName,
          r.width,
          r.height,
          s.color,
          s.backgroundColor,
          s.borderRadius,
          s.fontSize,
        ];
      }),
    );
    await page.evaluate(async (url) => {
      document
        .querySelectorAll("link[rel=stylesheet],style")
        .forEach((n) => n.remove());
      await new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.append(link);
      });
    }, base + "/dist/lumen-core-modern.css");
    const after = await page.locator("#example").evaluate((n) =>
      [...n.querySelectorAll("*")].map((e) => {
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return [
          e.tagName,
          r.width,
          r.height,
          s.color,
          s.backgroundColor,
          s.borderRadius,
          s.fontSize,
        ];
      }),
    );
    // example.html has a small host reset; compare component styling, allowing host-driven widths.
    assert.deepEqual(
      after.map((r) => r.slice(3)),
      before.map((r) => r.slice(3)),
      id + " canonical bundle style parity",
    );
  }
  // Representative reference variants keep logical direction and respond to shared tokens.
  await page.goto(base + "/studio-preview.html#buttons");
  await page.waitForFunction(() => window.LumenStudio);
  const group = await page.evaluate(async () => {
    const item = LumenStudio.catalog.items.find(
      (i) => i.key === "buttons/button-groups",
    );
    return LumenStudio.markup(item);
  });
  await page.goto(base + "/dist/index.html");
  await page.addStyleTag({ url: base + "/dist/lumen.css" });
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML("beforeend", html);
    document.documentElement.dir = "rtl";
  }, group);
  const firstGroup = page.locator(".buttons-preview .btn-group").first();
  const corners = await firstGroup
    .locator("button")
    .first()
    .evaluate((n) => ({
      right: getComputedStyle(n).borderTopRightRadius,
      left: getComputedStyle(n).borderTopLeftRadius,
    }));
  assert.equal(corners.right, "12px");
  assert.equal(corners.left, "0px");
  assert(
    await page.evaluate(() =>
      [...document.querySelectorAll("use")].every((n) =>
        document.getElementById(n.getAttribute("href").slice(1)),
      ),
    ),
    "Copied references must carry their icon definitions",
  );
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--lm-control-md", "50px"),
  );
  assert.equal(
    await firstGroup
      .locator("button")
      .first()
      .evaluate((n) => n.getBoundingClientRect().height),
    50,
    "Reference buttons must use shared size tokens",
  );
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  let audits = 0;
  for (const id of [
    "editable-table",
    "status-states",
    "multistep-form",
    "filter-panel",
    "file-upload-workflow",
  ]) {
    await example(id);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => (document.documentElement.dir = "rtl"));
    await page.addScriptTag({ content: axe });
    const issues = await page.evaluate(async () => {
      const r = await axe.run(document.getElementById("example"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      }));
    });
    assert.deepEqual(issues, [], id + " mobile RTL accessibility");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      id + " mobile overflow",
    );
    audits++;
  }
  for (const key of [
    "buttons/button-groups",
    "forms/checkboxes",
    "navigation/navbars",
    "surfaces/pricing-cards",
    "feedback/indeterminate-and-buffer",
    "data/striped-and-bordered",
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base + "/example.html?item=" + key);
    await page.locator("#example[data-ready=true]").waitFor();
    await page.addScriptTag({ content: axe });
    const issues = await page.evaluate(async () => {
      const r = await axe.run(document.getElementById("example"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      }));
    });
    assert.deepEqual(issues, [], key + " reference family accessibility");
    audits++;
    const before = await page.locator("#example").evaluate((n) =>
      [...n.querySelectorAll("*")].map((e) => {
        const s = getComputedStyle(e);
        return [s.color, s.backgroundColor, s.borderRadius, s.fontSize];
      }),
    );
    await page.evaluate(async (url) => {
      document
        .querySelectorAll("link[rel=stylesheet],style")
        .forEach((n) => n.remove());
      await new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.append(link);
      });
    }, base + "/dist/lumen-modern.css");
    const after = await page.locator("#example").evaluate((n) =>
      [...n.querySelectorAll("*")].map((e) => {
        const s = getComputedStyle(e);
        return [s.color, s.backgroundColor, s.borderRadius, s.fontSize];
      }),
    );
    assert.deepEqual(after, before, key + " canonical full bundle parity");
  }
  console.log(
    "PASS improvements: preview host sizing, independent copied instances/remount, multistep validation/data/reset, combined filters, file limits/clear, editable data, canonical bundle parity and " +
      audits +
      " new-composition/reference accessibility audits",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
