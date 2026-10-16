import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.base + "/dist/index.html");
  await page.evaluate(() =>
    document.body.insertAdjacentHTML(
      "beforeend",
      '<section class="lumen" id="foundation-scope" style="--lumen-color-primary:#b91c1c;--lumen-radius-md:18px;--lm-control-md:52px;--space-5:32px;--elevation-2:none"><article class="card radius-md shadow-md"><h2 class="heading-md">Foundation settings</h2><button class="btn">Save</button><button class="btn size-md">Save medium</button><button class="btn btn-icon" aria-label="Add">+</button><label class="field"><span class="input-label">Default field</span><input class="input"></label><label class="field"><span class="input-label">Medium field</span><input class="input size-md"></label></article></section>',
    ),
  );
  const scope = page.locator("#foundation-scope");
  assert.equal(
    await scope
      .locator(".btn")
      .first()
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(185, 28, 28)",
  );
  for (const selector of [
    ".btn",
    ".btn.size-md",
    ".btn-icon",
    ".input",
    ".input.size-md",
  ])
    assert.equal(
      await scope
        .locator(selector)
        .first()
        .evaluate((n) => n.getBoundingClientRect().height),
      52,
      selector + " shared medium control",
    );
  assert.equal(
    await scope
      .locator(".card")
      .evaluate((n) => getComputedStyle(n).borderRadius),
    "18px",
  );
  assert.equal(
    await scope
      .locator(".card")
      .evaluate((n) => getComputedStyle(n).paddingTop),
    "32px",
  );
  assert.equal(
    await scope.locator(".card").evaluate((n) => getComputedStyle(n).boxShadow),
    "none",
  );
  assert.equal(
    await scope
      .locator(".btn")
      .first()
      .evaluate((n) => getComputedStyle(n).borderRadius),
    "18px",
  );
  assert(
    await page.evaluate(() => {
      const progress = document.createElement("progress");
      progress.className = "progress color-red";
      progress.value = 50;
      progress.max = 100;
      document.querySelector("#foundation-scope").append(progress);
      return getComputedStyle(progress).accentColor === "rgb(239, 68, 68)";
    }),
    "progress shares the selected color modifier",
  );
  // Default and explicit medium must have identical style metrics for every size-contract family.
  const schema = JSON.parse(
    await readFile("tokens/design-tokens.json", "utf8"),
  );
  const fixtures = {
    input: '<input class="input" aria-label="Field">',
    check: '<label class="check"><input type="checkbox">Check</label>',
    range: '<input class="range" type="range" aria-label="Value">',
    badge: '<span class="badge">Ready</span>',
    avatar: '<span class="avatar">AB</span>',
    spinner: '<span class="spinner" aria-label="Loading"></span>',
    progress:
      '<progress class="progress" max="100" value="50" aria-label="Progress"></progress>',
    card: '<article class="card">Card</article>',
    panel: '<section class="panel">Panel</section>',
    alert: '<div class="alert">Message</div>',
    toast: '<div class="toast">Notice</div>',
    menu: '<div class="menu">Menu</div>',
    popover: '<div class="popover">Popover</div>',
    dialog: '<dialog open class="dialog">Dialog</dialog>',
    drawer: '<dialog open class="drawer">Drawer</dialog>',
    nav: '<nav class="nav">Navigation</nav>',
    tabs: '<div class="tabs">Tabs</div>',
    steps: '<ol class="steps"><li>Step</li></ol>',
    list: '<ul class="list"><li>Item</li></ul>',
    accordion:
      '<details class="accordion"><summary>Summary</summary></details>',
    table: '<table class="table"><tbody><tr><td>Cell</td></tr></tbody></table>',
    chip: '<span class="chip">Design</span>',
  };
  for (const component of Object.keys(schema.componentSizes)) {
    const metrics = await page.evaluate(
      ({ component, html }) => {
        const host = document.createElement("div");
        host.className = "lumen";
        host.style.width = "400px";
        host.innerHTML = html;
        document.body.append(host);
        const node = host.firstElementChild;
        const read = () => {
          const c = getComputedStyle(node);
          return [
            "fontSize",
            "lineHeight",
            "padding",
            "minHeight",
            "width",
            "height",
            "borderRadius",
          ].map((k) => c[k]);
        };
        const before = read();
        node.classList.add("size-md");
        const after = read();
        host.remove();
        return { before, after };
      },
      { component, html: fixtures[component] },
    );
    assert.deepEqual(
      metrics.after,
      metrics.before,
      component + " default must equal size-md",
    );
  }
  // Theme islands reset semantic roles and native color-scheme, even inside another theme.
  await page.evaluate(() =>
    document.body.insertAdjacentHTML(
      "beforeend",
      '<section class="lumen" data-theme="dark" id="theme-dark"><div class="lumen" data-theme="light" id="theme-light"><article class="card">Light island<input class="input" aria-label="Light field"><span class="input-error">Error</span></article><div class="lumen" data-theme="dark" id="theme-inner-dark"><article class="card">Dark again</article></div></div></section>',
    ),
  );
  assert.equal(
    await page
      .locator("#theme-light")
      .evaluate((n) => getComputedStyle(n).colorScheme),
    "light",
  );
  assert.equal(
    await page
      .locator("#theme-inner-dark")
      .evaluate((n) => getComputedStyle(n).colorScheme),
    "dark",
  );
  assert.equal(
    await page
      .locator("#theme-light>.card")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(255, 255, 255)",
  );
  assert.equal(
    await page
      .locator("#theme-light .input-error")
      .evaluate((n) => getComputedStyle(n).color),
    "rgb(190, 18, 60)",
  );
  assert.equal(
    await page
      .locator("#theme-inner-dark>.card")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(23, 32, 54)",
  );
  // A request that completes out of order must never overwrite the latest result.
  const resource = await page.evaluate(async () => {
    const resolves = [],
      states = [];
    const resource = LumenUI.resource({
      load: () => new Promise((resolve) => resolves.push(resolve)),
      onState: (s) => states.push(s.status),
    });
    const one = resource.refresh();
    const two = resource.refresh();
    resolves[1](["new"]);
    await two;
    resolves[0](["old"]);
    await one;
    const result = resource.state;
    resource.destroy();
    return { status: result.status, data: result.data, states };
  });
  assert.deepEqual(resource.data, ["new"]);
  assert.equal(resource.status, "success");
  // Pausable and persistent notifications preserve interactive actions.
  await page.clock.install();
  await page.evaluate(() =>
    LumenUI.mount(document).toast("Pause this message", { duration: 2000 }),
  );
  const toast = page
    .getByRole("status")
    .filter({ hasText: "Pause this message" });
  await toast.hover();
  await page.clock.runFor(3000);
  assert(await toast.isVisible());
  await page.mouse.move(0, 0);
  await page.clock.runFor(2100);
  assert.equal(await toast.count(), 0);
  await page.evaluate(() =>
    LumenUI.mount(document).toast("Undo remains available", {
      duration: 0,
      action: {
        label: "Undo test",
        run: () => {
          window.undoActivated = true;
        },
      },
    }),
  );
  await page.clock.runFor(30000);
  await page.getByRole("button", { name: "Undo test" }).click();
  assert(await page.evaluate(() => undoActivated));
  await page.clock.resume();
  // A menu uses the top layer and type-ahead, skips disabled items, and restores focus.
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="lumen dropdown" id="menu-test"><button class="btn" data-lm-menu-toggle aria-expanded="false">Menu test</button><div class="menu" role="menu" hidden><button role="menuitem" aria-disabled="true">Unavailable</button><button role="menuitem">Alpha</button><button role="menuitem">Beta</button></div></div>',
    );
    LumenUI.refresh(document);
  });
  await page.getByRole("button", { name: "Menu test", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();
  assert(
    await page.getByRole("menu").evaluate((n) => n.matches(":popover-open")),
  );
  await page.keyboard.press("b");
  await expect(page.getByRole("menuitem", { name: "Beta" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Menu test", exact: true }),
  ).toBeFocused();
  // Customization retains the chosen example's controls and existing anatomy.
  await page.goto(server.base + "/studio-preview.html#buttons");
  await page.waitForFunction(() => window.LumenStudio);
  assert(
    await page.evaluate(() => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = "<h2>Project</h2>";
      const originalCard = LumenVariants.read(card, "card");
      LumenVariants.apply(card, originalCard);
      if (originalCard.color !== "" || /color-/.test(card.className))
        return false;
      const badge = document.createElement("span");
      badge.className = "badge";
      const button = document.createElement("button");
      button.className = "btn";
      button.innerHTML = '<svg><use href="#i-custom-artwork"></use></svg>Save';
      const config = LumenVariants.read(button, "btn");
      LumenVariants.apply(button, { ...config, size: "xl" });
      return (
        LumenVariants.read(badge, "badge").style === "tonal" &&
        config.iconName === "original" &&
        !!button.querySelector('use[href="#i-custom-artwork"]') &&
        LumenDesign.css({ radius: 0 }).includes("--lm-control-radius-md:0px")
      );
    }),
    "existing badge style, source icon and zero radius survive configuration",
  );

  await page.evaluate(() =>
    LumenStudio.openInspector(
      LumenStudio.catalog.items.find((i) => i.key === "buttons/solid"),
    ),
  );
  await page.locator("[data-inspect=configure]").click();
  await page.locator("#configure-text").waitFor();
  assert.equal(await page.locator("#configure-text").inputValue(), "Primary");
  const originalCount = await page.locator(".variant-preview .btn").count();
  assert(originalCount > 1);
  await page.locator("#configure-size").selectOption("xl");
  await page.locator("#configure-text").fill("Create project");
  await expect(
    page
      .locator(".variant-preview")
      .getByRole("button", { name: "Create project", exact: true }),
  ).toBeVisible();
  assert.equal(
    await page.locator(".variant-preview .btn").count(),
    originalCount,
  );
  assert.equal(
    await page.locator(".variant-preview .color-secondary").textContent(),
    "Secondary",
  );
  await page.locator("#configure-reset").click();
  assert.equal(await page.locator("#configure-text").inputValue(), "Primary");
  await page.locator("#inspector-close").click();
  await page.evaluate(() =>
    LumenStudio.openInspector(
      LumenStudio.catalog.items.find((i) => i.key === "forms/switches"),
    ),
  );
  assert(await page.locator("[data-inspect=configure]").isHidden());
  await page.locator("#inspector-close").click();
  await page.locator("#tokens-open").click();
  await page.locator("#tokens-form [name=primary]").fill("#b91c1c");
  await page.locator("#tokens-form [name=control]").fill("52");
  await page.locator("#tokens-form [name=radius]").fill("18");
  await page.locator("#tokens-close").click();
  await page.locator("#search").fill("outline");
  await page.locator("#layout-filter").selectOption("list");
  await page.locator("#direction").selectOption("rtl");
  const savedURL = page.url();
  await page.reload();
  await page.waitForFunction(() => window.LumenStudio);
  assert.equal(await page.locator("#search").inputValue(), "outline");
  assert.equal(await page.locator("#layout-filter").inputValue(), "list");
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
  assert(page.url().includes("workspace="));
  await page.evaluate(() =>
    LumenStudio.openInspector(
      LumenStudio.catalog.items.find((i) => i.key === "buttons/solid"),
    ),
  );
  await page.locator("[data-inspect=configure]").click();
  const portable = await page.evaluate(() =>
    LumenStudio.standalone(
      LumenStudio.catalog.items.find((i) => i.key === "buttons/solid"),
      "all",
      true,
    ),
  );
  const exported = await context.newPage();
  await exported.route("**/*", (route) => route.abort());
  await exported.setContent(portable);
  assert.equal(
    await exported
      .getByRole("button", { name: "Primary", exact: true })
      .evaluate((n) => n.getBoundingClientRect().height),
    52,
  );
  assert.equal(
    await exported
      .getByRole("button", { name: "Primary", exact: true })
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(185, 28, 28)",
  );
  await exported.close();
  await page.locator("[data-inspect=html]").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-inspect=preview]")).toBeFocused();
  assert.equal(
    await page.locator("#inspector-body").getAttribute("aria-labelledby"),
    "inspector-tab-preview",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS system: authoritative roles, scoped token changes, all medium-size contracts, nested themes, request races, notification timing, overlay keyboard behavior, anatomy-preserving customization, URL restoration and branded portable exports",
  );
} finally {
  await browser?.close();
  await server.close();
}
