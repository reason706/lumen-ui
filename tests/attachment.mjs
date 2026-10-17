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
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.route(/fonts\./, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const open = async (key) => {
    await page.goto(server.base + "/example.html?item=core/" + key);
    await page.locator("#example[data-ready=true]").waitFor();
  };
  await page.goto(server.base + "/example.html?item=buttons/soft-tinted");
  await page.locator("#example[data-ready=true]").waitFor();
  const primary = page.getByRole("button", { name: "Primary", exact: true });
  assert.equal(
    await primary.evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(224, 231, 255)",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Secondary", exact: true })
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(226, 232, 240)",
  );
  const violet = page.getByRole("button", { name: "Violet", exact: true });
  assert(
    await violet
      .locator(".btn-label")
      .evaluate((n) =>
        getComputedStyle(n).backgroundImage.includes("99, 102, 241"),
      ),
  );
  assert.equal(
    await violet
      .locator(".btn-label")
      .evaluate((n) => getComputedStyle(n).webkitTextFillColor),
    "rgba(0, 0, 0, 0)",
  );
  assert(
    await violet.evaluate((n) =>
      getComputedStyle(n).backgroundImage.includes("0.16"),
    ),
  );
  await violet.hover();
  await expect
    .poll(() =>
      violet
        .locator(".btn-label")
        .evaluate((n) => getComputedStyle(n).webkitTextFillColor),
    )
    .not.toBe("rgba(0, 0, 0, 0)");
  await violet.evaluate((n) => (n.disabled = true));
  await page.mouse.move(0, 0);
  const rest = await violet.evaluate(
    (n) => getComputedStyle(n).backgroundImage,
  );
  await violet.hover();
  assert.equal(
    await violet.evaluate((n) => getComputedStyle(n).backgroundImage),
    rest,
  );
  await page.goto(
    server.base + "/example.html?item=buttons/icon-buttons-variants",
  );
  await page.locator("#example[data-ready=true]").waitFor();
  const icon = page
    .locator(".btn-icon.btn-style-outline.color-gradient-ocean")
    .first();
  assert(
    await icon
      .locator("svg")
      .evaluate((n) => getComputedStyle(n).stroke.startsWith("url(")),
  );
  assert.equal(
    await icon
      .locator("stop")
      .first()
      .evaluate((n) => getComputedStyle(n).stopColor),
    "rgb(14, 165, 233)",
  );
  const ids = await page
    .locator("linearGradient[id]")
    .evaluateAll((ns) => ns.map((n) => n.id));
  assert.equal(new Set(ids).size, ids.length);
  await icon.hover();
  await expect
    .poll(() => icon.locator("svg").evaluate((n) => getComputedStyle(n).stroke))
    .not.toMatch(/^url\(/);
  await open("character-counter");
  await page.getByLabel("Short description").fill("a".repeat(80));
  await expect(
    page.getByRole("status").filter({ hasText: "Character limit reached" }),
  ).toBeVisible();
  await expect(page.locator("output")).toHaveText("80 / 80");
  await open("color-field");
  await page.getByLabel("Hex color").fill("#10B981");
  await expect(page.getByLabel("Pick a color")).toHaveValue("#10b981");
  await page.getByLabel("Hex color").fill("invalid");
  assert(
    await page.getByLabel("Hex color").evaluate((n) => !n.checkValidity()),
  );
  await page.getByLabel("Pick a color").fill("#e11d48");
  await expect(page.getByLabel("Hex color")).toHaveValue("#E11D48");
  assert(await page.getByLabel("Hex color").evaluate((n) => n.checkValidity()));
  await open("payment-preview");
  for (const theme of [
    "light",
    "dark",
    "oled",
    "cyberpunk",
    "obsidian",
    "arctic",
    "sport",
    "luxury",
  ]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const gradient = await page
      .locator(".payment-preview")
      .evaluate((n) => getComputedStyle(n).backgroundImage);
    assert(
      gradient.includes("67, 56, 202") && gradient.includes("124, 58, 237"),
      theme + " payment preview matches the supplied brand ramp",
    );
  }
  await page.getByLabel("Card number").fill("4242424242424242");
  await expect(page.locator("[data-card-number]")).toHaveText(
    "4242 4242 4242 4242",
  );
  await page.getByLabel("Name on card").fill("Alex Morgan");
  await expect(page.locator("[data-card-name]")).toHaveText("Alex Morgan");
  await page.getByLabel("Expiry date").fill("1228");
  await expect(page.locator("[data-card-expiry]")).toHaveText("12/28");
  await open("input-masks");
  await page.getByLabel("US phone number").fill("5551234567");
  await expect(page.getByLabel("US phone number")).toHaveValue(
    "(555) 123-4567",
  );
  await page.getByLabel("Amount in USD").fill("1234.5");
  await page.getByLabel("US phone number").focus();
  await expect(page.getByLabel("Amount in USD")).toHaveValue("$1,234.50");
  await open("poll-card");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("output")).toContainText("Vote recorded for Dark");
  assert.equal(await page.locator("meter:not([hidden])").count(), 3);
  assert(
    await page.getByRole("button", { name: "Light", exact: true }).isDisabled(),
  );
  await page.getByRole("button", { name: "Reset poll" }).click();
  assert(
    await page.getByRole("button", { name: "Light", exact: true }).isEnabled(),
  );
  await open("quiz-card");
  await page.getByRole("button", { name: "A fixed pixel size" }).click();
  await expect(page.locator("output")).toContainText("Incorrect");
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "The root font size" }).click();
  await expect(page.locator("output")).toContainText("Correct");
  await open("card-deck");
  await page.getByRole("button", { name: "Next card" }).click();
  await expect(page.locator("output")).toHaveText("Card 2 of 3");
  assert.equal(
    await page.locator(".card-deck-items>.card:not([inert])").count(),
    1,
  );
  await page.getByRole("button", { name: "Previous card" }).click();
  await expect(page.locator("output")).toHaveText("Card 1 of 3");
  await open("mixer-faders");
  for (const slider of await page.getByRole("slider").all()) {
    const size = await slider.boundingBox();
    assert(
      size.height >= 170 && size.width <= 48,
      "faders retain a vertical track and touch width",
    );
  }
  await open("knob");
  await page.getByRole("slider", { name: "Gain", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("output")).toHaveText("51%");
  await open("xy-pad");
  await page.getByRole("group", { name: "Position plane" }).focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.getByLabel("X position", { exact: true })).toHaveValue(
    "60",
  );
  const plane = await page.locator(".xy-pad-plane").boundingBox();
  await page.mouse.click(
    plane.x + plane.width * 0.25,
    plane.y + plane.height * 0.75,
  );
  await expect(page.getByLabel("X position", { exact: true })).toHaveValue(
    "25",
  );
  await expect(page.getByLabel("Y position", { exact: true })).toHaveValue(
    "75",
  );
  await open("direction-pad");
  await page.getByRole("button", { name: "Center", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("button", { name: "Up", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("output")).toHaveText("Up");
  await open("signature-pad");
  await page.getByLabel("Typed signature").fill("Alex");
  assert.equal(
    (await page.locator("input[type=hidden]").inputValue()).includes("Alex"),
    true,
  );
  await page.getByRole("button", { name: "Clear signature" }).click();
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y + 60, { steps: 4 });
  await page.mouse.up();
  assert(
    JSON.parse(await page.locator("input[type=hidden]").inputValue()).paths[0]
      .length >= 4,
  );
  const drawingBeforeTheme = await page
    .locator("canvas")
    .evaluate((n) => n.toDataURL());
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await expect
    .poll(() => page.locator("canvas").evaluate((n) => n.toDataURL()))
    .not.toBe(drawingBeforeTheme);
  const signatureBefore = await page.locator("input[type=hidden]").inputValue();
  await page.evaluate(() => {
    LumenUI.mount(document).destroy();
    LumenUI.mount(document);
  });
  assert.equal(
    await page.locator("input[type=hidden]").inputValue(),
    signatureBefore,
    "remount preserves drawn form data",
  );
  await page.evaluate(() => {
    LumenUI.refresh(document);
    LumenUI.refresh(document);
  });
  await page.getByRole("button", { name: "Clear signature" }).click();
  assert.equal(
    JSON.parse(await page.locator("input[type=hidden]").inputValue()).paths
      .length,
    0,
  );
  await open("image-magnifier");
  await page.getByRole("button", { name: "Toggle magnifier" }).click();
  await expect(
    page.getByRole("button", { name: "Toggle magnifier" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("slider", { name: "Magnification", exact: true })
    .fill("3");
  await expect(page.locator("output")).toHaveText("3×");
  assert(
    await page
      .locator(".magnifier-lens")
      .evaluate(
        (n) =>
          Math.abs(
            parseFloat(getComputedStyle(n).backgroundSize) /
              n.parentElement.getBoundingClientRect().width -
              3,
          ) < 0.01,
      ),
    "magnification is relative to the displayed image, not the lens diameter",
  );

  await page.getByRole("group", { name: "Magnifier position" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .locator("[data-lm-magnifier]")
      .evaluate((n) => n.style.getPropertyValue("--lens-x")),
    "55%",
  );
  const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8"),
    catalog = JSON.parse(await readFile("catalog/components.json", "utf8"));
  let audits = 0;
  for (const item of catalog.items.filter(
    (i) => i.template === "templates/enhancements.html",
  )) {
    await open(item.id);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await axe.run(document.querySelector("#example"), {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      return r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
        summary: v.nodes.map((n) => n.failureSummary),
      }));
    });
    assert.deepEqual(violations, [], item.key);
    audits++;
    await page.setViewportSize({ width: 320, height: 850 });
    await page.evaluate(() => (document.documentElement.dir = "rtl"));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      item.key + " narrow RTL",
    );
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  await page.goto(server.base + "/studio-preview.html#forms");
  await page.waitForFunction(() => window.LumenStudio);
  const portable = await page.evaluate(() =>
    LumenStudio.standalone(
      LumenStudio.catalog.items.find((i) => i.key === "core/color-field"),
      "all",
      true,
    ),
  );
  const exported = await context.newPage();
  await exported.route("**/*", (r) => r.abort());
  await exported.setContent(portable);
  await exported.getByLabel("Hex color").fill("#A855F7");
  await expect(exported.getByLabel("Pick a color")).toHaveValue("#a855f7");
  await exported.close();
  const iconExport = await page.evaluate(() =>
    LumenStudio.standalone(
      LumenStudio.catalog.items.find(
        (i) => i.key === "buttons/icon-buttons-variants",
      ),
      "all",
      true,
    ),
  );
  const copied = await context.newPage();
  await copied.route("**/*", (r) => r.abort());
  await copied.setContent(iconExport);
  const copiedIcon = copied
    .locator(".btn-icon.btn-style-outline.color-gradient-ocean")
    .first();
  assert(
    await copiedIcon.locator("svg").evaluate((n) => {
      const id = n.style
        .getPropertyValue("--lm-icon-gradient")
        .match(/#([^)]*)/)[1];
      return (
        !!n.querySelector('[id="' + id + '"]') &&
        getComputedStyle(n).stroke.startsWith("url(")
      );
    }),
    "portable gradient icons retain local paint references",
  );
  await copied.close();

  await mkdir("/tmp/lumen-34-review", { recursive: true });
  await page.goto(server.base + "/example.html?item=buttons/soft-tinted");
  await page.locator("#example[data-ready=true]").waitFor();
  await page.screenshot({
    path: "/tmp/lumen-34-review/tonal.png",
    fullPage: true,
  });
  await open("card-effects");
  await page.screenshot({
    path: "/tmp/lumen-34-review/cards.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS attachment: matched palette, gradient labels/icons/states, independent SVG IDs, all new workflows, repeat refresh, portable widgets, " +
      audits +
      " WCAG audits and 320px RTL layouts",
  );
} finally {
  await browser?.close();
  await server.close();
}
