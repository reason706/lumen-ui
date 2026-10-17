/* One catalog drives navigation, search, organization, previews and copying. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    templates = new Map(),
    cssCache = new Map(),
    sheetCache = new Map(),
    previews = new Set();
  const read = (name, fallback) => {
    try {
      return (
        JSON.parse(localStorage.getItem("lumen-studio-" + name)) ?? fallback
      );
    } catch {
      return fallback;
    }
  };
  const write = (name, value) => {
    try {
      localStorage.setItem("lumen-studio-" + name, JSON.stringify(value));
    } catch {}
  };
  let comparison = [],
    catalog,
    category = "home",
    width = "full",
    selected = null,
    inspectorPreview = null,
    observer,
    noticeTimer,
    renderSequence = 0,
    configuration = null;
  let favorites = read("favorites", []),
    recent = read("recent", []);
  let brandConfiguration = LumenDesign.normalize(read("brand", {})),
    activeTab = "preview",
    restoringWorkspace = false;
  const workspaceStates = new Map();
  function currentWorkspace() {
    return {
      view: category,
      q: $("search").value,
      family: $("family-filter").value,
      status: $("status-filter").value,
      layout: $("layout-filter").value,
      width,
      theme: $("theme").value,
      dir: document.documentElement.dir || "ltr",
      compare: comparison,
      brand: brandConfiguration,
      item: $("inspector").open ? selected?.key : null,
      tab: activeTab,
      config: configured(selected || {}) ? configuration : null,
    };
  }
  function saveWorkspace() {
    if (!catalog || restoringWorkspace) return;
    const state = currentWorkspace();
    workspaceStates.set(category, state);
    const url = new URL(location.href);
    url.searchParams.set("workspace", JSON.stringify(state));
    history.replaceState(null, "", url);
    write("workspace", state);
  }
  function urlWorkspace() {
    try {
      const value = JSON.parse(
        new URLSearchParams(location.search).get("workspace") || "null",
      );
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }
  function applyBrand() {
    LumenDesign.apply(document.documentElement, brandConfiguration);
    for (const preview of previews)
      LumenDesign.apply(preview.host, brandConfiguration);
    write("brand", brandConfiguration);
    saveWorkspace();
  }
  const icons = ["◈", "▦", "↗", "▤", "◉", "☷", "▣", "◇", "◌", "▥", "▷", "✦"];
  const typeLabels = {
    functional: "Interactive core",
    css: "CSS / native controls",
    reference: "Visual reference",
    composition: "Composition",
  };
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function notice(message) {
    $("notice").textContent = message;
    $("notice").hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => ($("notice").hidden = true), 2500);
  }
  async function loadTemplates(file) {
    if (!templates.has(file))
      templates.set(file, LumenAssets.templateDocument(file, catalog.items));
    return templates.get(file);
  }
  async function content(item) {
    const doc = await loadTemplates(item.template),
      t = doc.querySelector('template[id="' + CSS.escape(item.id) + '"]');
    if (!t) throw Error("Missing template: " + item.key);
    return t.content.cloneNode(true);
  }
  function legacySnippet(fragment) {
    const sec = fragment.querySelector("section.demo-section");
    if (sec) {
      sec.removeAttribute("id");
      sec.querySelector(".demo-heading")?.remove();
      sec.classList.remove("demo-section", "demo-span-2", "demo-span-full");
    }
    return fragment;
  }
  function configured(item) {
    return configuration?.key === item.key;
  }
  function copyCandidates(fragment) {
    return [
      ...fragment.querySelectorAll(
        "button,input,select,textarea,progress,meter",
      ),
    ].filter((node) => {
      // Stateful controls need their surrounding behavior and referenced targets.
      for (
        let owner = node;
        owner && owner !== fragment;
        owner = owner.parentElement
      ) {
        if (
          [...owner.attributes].some(
            (a) =>
              a.name.startsWith("data-lm-") ||
              [
                "aria-controls",
                "aria-describedby",
                "aria-labelledby",
                "role",
              ].includes(a.name),
          )
        )
          return false;
      }
      return true;
    });
  }
  async function configuredContent(item) {
    const fragment = legacySnippet(await content(item));
    if (configured(item)) {
      const node = fragment.querySelectorAll(item.customize.selector)[
        configuration.index || 0
      ];
      if (node) LumenVariants.apply(node, configuration.value);
    }
    return fragment;
  }
  async function markup(item, variant) {
    let fragment = await configuredContent(item);
    if (variant !== undefined && variant !== "all") {
      const candidates = copyCandidates(fragment);
      const node = candidates[Number(variant)];
      if (node) {
        const label = node.closest("label");
        fragment = (label || node).cloneNode(true);
      }
    }
    const holder = el("div");
    if (item.source !== "core") {
      const wrapper = el("div", "lumen " + item.wrapper);
      wrapper.append(fragment);
      holder.append(wrapper);
    } else holder.append(fragment);
    LumenUI.prepare(holder);
    if (holder.querySelector("use")) {
      holder.insertAdjacentHTML("afterbegin", await dependencies(item));
    }
    const output = el("div");
    output.append(LumenUI.fragment(holder.innerHTML));
    return output.innerHTML;
  }
  async function dependencies(item) {
    const doc = await loadTemplates(item.template);
    return doc.querySelector("template#icons")?.innerHTML || "";
  }
  async function standalone(item, variant = "all", portable = false) {
    const snippet = await markup(item, variant);
    const links = stylesheetFiles(item);
    const theme = $("theme").value;
    const scripts = [
      "js/tokens.js",
      "js/design.js",
      "js/widgets.js",
      "js/components.js",
      ...(item.scripts || []),
    ];
    const brandCSS = LumenDesign.css(brandConfiguration);
    const assets = portable
      ? "<style>" +
        (
          (
            await Promise.all(links.map((file) => previewSheet(file, true)))
          ).join("\n") +
          "\n" +
          brandCSS
        ).replace(/<\/style/gi, "<\\/style") +
        "</style>\n<script>" +
        (await Promise.all(scripts.map((file) => LumenAssets.text(file))))
          .join("\n")
          .replace(/<\/script/gi, "<\\/script") +
        "</script>"
      : links
          .map((file) => '<link rel="stylesheet" href="' + file + '">')
          .join("\n") +
        "<style>" +
        brandCSS +
        "</style>" +
        scripts
          .map((file) => '<script src="' + file + '" defer></script>')
          .join("\n");
    return (
      '<!doctype html>\n<html lang="en" dir="' +
      (document.documentElement.dir || "ltr") +
      '" data-theme="' +
      theme +
      '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' +
      item.title.replace(
        /[&<>]/g,
        (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[x],
      ) +
      "</title>\n" +
      assets +
      '\n</head>\n<body class="lumen">\n' +
      snippet +
      "\n</body>\n</html>"
    );
  }
  async function preview(item, container, useConfiguration = false) {
    const custom = useConfiguration && configured(item);
    const host = el("div", "preview-host");
    LumenDesign.apply(host, brandConfiguration);
    host.dataset.theme = $("theme").value;
    host.style.maxWidth = width === "full" ? "100%" : width + "px";
    host.style.containerType = "inline-size";
    host.style.containerName = "lm-preview";
    container.replaceChildren(host);
    const shadow = host.attachShadow({ mode: "open" });
    const root = el("div", "lumen " + (item.wrapper || ""));
    let destroyed = false,
      api,
      app;
    const handle = {
      host,
      item,
      shadow,
      destroy() {
        destroyed = true;
        app?.destroy();
        api?.destroy();
        previews.delete(handle);
        host.remove();
      },
    };
    previews.add(handle);
    try {
      const [fragment, doc] = await Promise.all([
        custom ? configuredContent(item) : content(item).then(legacySnippet),
        loadTemplates(item.template),
      ]);
      if (destroyed) return handle;
      for (const file of stylesheetFiles(item)) {
        const sheet = el("style");
        sheet.textContent = await previewSheet(file);
        if (destroyed) return handle;
        shadow.append(sheet);
      }
      const style = el("style");
      style.textContent =
        ":host{display:block;min-width:0}[hidden]{display:none!important}";
      shadow.append(style);
      const defs = doc.querySelector("template#icons");
      if (defs) root.append(defs.content.cloneNode(true));
      root.append(fragment);
      shadow.append(root);
      api = LumenUI.mount(shadow);
      const workspace = root.querySelector("[data-lumen-workspace]");
      if (workspace) app = LumenWorkspace.mount(workspace);
      host.dataset.ready = "true";
    } catch (error) {
      if (!destroyed) {
        container.textContent = error.message;
        host.dataset.ready = "error";
      }
      throw error;
    }
    return handle;
  }
  async function previewSheet(file, raw = false) {
    const key = file + (raw ? ":raw" : "");
    if (!sheetCache.has(key))
      sheetCache.set(
        key,
        (async () => {
          let text = await LumenAssets.text(file);
          const imports = [
            ...text.matchAll(/@import\s+url\(['"]([^'"]+)['"]\);/g),
          ];
          for (const match of imports) {
            const path = LumenAssets.path(
              new URL(match[1], new URL(file, document.baseURI)),
            );
            text = text.replace(match[0], await previewSheet(path, raw));
          }
          return raw
            ? text
            : text
                .replace(/:root\b/g, ":host")
                .replace(/(-?\d*\.?\d+)vw\b/g, "$1cqw")
                .replace(
                  /@media\s*\((min|max)-width\s*:\s*([^)]*)\)/g,
                  "@container lm-preview ($1-width: $2)",
                );
        })(),
      );
    return sheetCache.get(key);
  }
  function cleanup() {
    observer?.disconnect();
    for (const p of [...previews]) if (p !== inspectorPreview) p.destroy();
  }
  function resolve(hash) {
    const path = decodeURIComponent(hash.replace(/^#/, "")),
      parts = path.split("/");
    if (["home", "favorites", "recent", "compare"].includes(path))
      return { category: path };
    const item = catalog.items.find(
      (x) =>
        x.key === (catalog.aliases?.[path] || path) ||
        x.category + "/" + x.id === path,
    );
    if (item) return { category: item.category, key: item.key };
    return {
      category: catalog.categories.some((c) => c.id === path) ? path : "home",
    };
  }
  function updateFavorites() {
    write("favorites", favorites);
    $("favorite-count").textContent = favorites.length;
    document.querySelectorAll("[data-favorite]").forEach((b) => {
      const yes = favorites.includes(b.dataset.favorite);
      b.setAttribute("aria-pressed", String(yes));
      b.textContent = yes ? "★" : "☆";
    });
    if (selected)
      $("save-favorite").textContent = favorites.includes(selected.key)
        ? "★ Favorited"
        : "☆ Favorite";
  }
  function toggleFavorite(key) {
    favorites = favorites.includes(key)
      ? favorites.filter((k) => k !== key)
      : [...favorites, key];
    updateFavorites();
    if (category === "favorites") render();
  }
  function remember(item) {
    recent = [item.key, ...recent.filter((k) => k !== item.key)].slice(0, 30);
    write("recent", recent);
  }
  function baseItems() {
    if (category === "compare")
      return comparison
        .map((k) => catalog.items.find((x) => x.key === k))
        .filter(Boolean);
    if (category === "favorites")
      return catalog.items.filter((x) => favorites.includes(x.key));
    if (category === "recent")
      return recent
        .map((k) => catalog.items.find((x) => x.key === k))
        .filter(Boolean);
    return catalog.items.filter((x) => x.category === category);
  }
  function visibleItems() {
    const term = $("search").value.toLowerCase().trim(),
      family = $("family-filter").value,
      type = $("status-filter").value;
    let items = term ? catalog.items : baseItems();
    return items.filter(
      (x) =>
        (!family || x.family === family) &&
        (!type || x.status === type) &&
        (!term || LumenVariants.matches(x, term)),
    );
  }
  function sorted(items) {
    return items
      .map((item, i) => ({ item, i }))
      .sort(
        (a, b) =>
          a.item.family.localeCompare(b.item.family) ||
          (a.item.source === "core" ? 0 : 1) -
            (b.item.source === "core" ? 0 : 1) ||
          a.i - b.i,
      )
      .map((x) => x.item);
  }
  function card(item) {
    const article = el("article", "example-card");
    article.id = "item-" + item.key.replace("/", "--");
    article.dataset.key = item.key;
    const head = el("div", "example-head"),
      titles = el("div");
    titles.append(
      el("h3", "", item.title),
      el("p", "", catalog.categories.find((c) => c.id === item.category).label),
    );
    const actions = el("div", "card-actions");
    const compare = el("button", "", comparison.includes(item.key) ? "✓" : "⇄");
    compare.setAttribute("aria-label", "Compare " + item.title);
    compare.dataset.compare = item.key;
    compare.setAttribute("aria-pressed", String(comparison.includes(item.key)));
    compare.onclick = () => {
      if (comparison.includes(item.key))
        comparison = comparison.filter((k) => k !== item.key);
      else if (comparison.length < 4) comparison.push(item.key);
      else return notice("Compare up to four examples");
      document.querySelectorAll("[data-compare]").forEach((b) => {
        b.setAttribute(
          "aria-pressed",
          String(comparison.includes(b.dataset.compare)),
        );
        b.textContent = comparison.includes(b.dataset.compare) ? "✓" : "⇄";
      });
      $("compare-open").textContent = "Compare (" + comparison.length + ")";
      $("compare-open").disabled = !comparison.length;
    };
    const star = el("button", "", favorites.includes(item.key) ? "★" : "☆");
    star.dataset.favorite = item.key;
    star.setAttribute("aria-label", "Favorite " + item.title);
    star.setAttribute("aria-pressed", String(favorites.includes(item.key)));
    star.onclick = () => toggleFavorite(item.key);
    const inspect = el("button", "", "Inspect");
    inspect.setAttribute("aria-label", "Inspect " + item.title);
    inspect.onclick = () => openInspector(item);
    const copy = el("button", "", "Copy");
    copy.setAttribute("aria-label", "Copy " + item.title);
    copy.onclick = async () => {
      try {
        await LumenUI.copy(await markup(item));
        notice("HTML copied");
      } catch {
        notice("Clipboard unavailable");
      }
    };
    actions.append(compare, star, inspect, copy);
    head.append(titles, actions);
    const surface = el("div", "preview-surface");
    surface.setAttribute("aria-label", item.title + " preview");
    surface.append(el("span", "lm-help", "Loading preview…"));
    const foot = el("div", "example-foot");
    foot.append(
      el("span", "", typeLabels[item.status]),
      el(
        "span",
        "",
        item.source === "core"
          ? "Shared public components"
          : item.status === "reference"
            ? "Appearance reference · app behavior required"
            : "Native controls / CSS",
      ),
    );
    article.append(head, surface, foot);
    article._item = item;
    observer.observe(article);
    return article;
  }
  function render() {
    const sequence = ++renderSequence;
    cleanup();
    $("cards").replaceChildren();
    $("family-nav").replaceChildren();
    const items = sorted(visibleItems());
    $("result-count").textContent = items.length + " examples";
    $("cards").classList.toggle("list", $("layout-filter").value === "list");
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            observer.unobserve(e.target);
            preview(
              e.target._item,
              e.target.querySelector(".preview-surface"),
            ).catch((error) => notice(error.message));
          }
      },
      { rootMargin: "600px" },
    );
    let family = null;
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      if (item.family !== family) {
        family = item.family;
        const id =
          "family-" +
          [...family].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
        const heading = el(
          "h2",
          "family-heading",
          family.replace(/^\d+ · /, ""),
        );
        heading.id = id;
        fragment.append(heading);
        const link = el("a", "", heading.textContent);
        link.href = "#" + id;
        link.onclick = (e) => {
          e.preventDefault();
          heading.scrollIntoView({ block: "start", behavior: "smooth" });
        };
        $("family-nav").append(link);
      }
      fragment.append(card(item));
    }
    if (!items.length)
      fragment.append(
        el(
          "div",
          "empty-results",
          "No matching examples. Try another search or reset the filters.",
        ),
      );
    $("cards").append(fragment);
    $("overview").hidden = true;
    $("browser").hidden = false;
    if (sequence !== renderSequence) return;
    saveWorkspace();
  }
  function navigate() {
    if (!catalog) return;
    const route = resolve(location.hash);
    category = route.category;
    const queryState = urlWorkspace();
    const state =
      queryState?.view === category
        ? queryState
        : workspaceStates.get(category);
    restoringWorkspace = true;
    $("search").value = state?.q || "";
    $("status-filter").value = state?.status || "";
    $("layout-filter").value = ["grid", "list"].includes(state?.layout)
      ? state.layout
      : "grid";
    if (state) {
      width = ["full", "768", "375"].includes(state.width)
        ? state.width
        : "full";
      comparison = Array.isArray(state.compare)
        ? state.compare
            .filter((key) => catalog.items.some((i) => i.key === key))
            .slice(0, 4)
        : [];
      brandConfiguration = LumenDesign.normalize(
        state.brand || brandConfiguration,
      );
      $("theme").value = LumenTokens.themes.includes(state.theme)
        ? state.theme
        : "light";
      $("direction").value = state.dir === "rtl" ? "rtl" : "ltr";
      document.documentElement.dir = $("direction").value;
      setTheme($("theme").value);
    }
    $("compare-open").disabled = !comparison.length;
    $("compare-open").textContent = "Compare (" + comparison.length + ")";
    applyBrand();
    document.querySelectorAll("[data-category]").forEach((a) => {
      if (a.dataset.category === category)
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("sidebar").classList.remove("open");
    $("menu-toggle").setAttribute("aria-expanded", "false");
    syncSidebar();
    if (category === "home") {
      cleanup();
      $("overview").hidden = false;
      $("browser").hidden = true;
      restoringWorkspace = false;
      saveWorkspace();
      return;
    }
    const title =
      catalog.categories.find((c) => c.id === category)?.label ||
      {
        favorites: "Favorites",
        recent: "Recently viewed",
        compare: "Compare components",
      }[category];
    $("page-title").textContent = title;
    $("page-summary").textContent =
      "Compare related variants, inspect their markup, and copy an example.";
    $("breadcrumb").textContent = "COMPONENT LIBRARY / " + title;
    $("family-filter").replaceChildren(
      new Option("All families", ""),
      ...[...new Set(baseItems().map((x) => x.family))]
        .sort()
        .map((x) => new Option(x.replace(/^\d+ · /, ""), x)),
    );
    $("family-filter").value = state?.family || "";
    restoringWorkspace = false;
    document
      .querySelectorAll("[data-width]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.width === width)),
      );
    render();
    saveWorkspace();
    if (state?.item) {
      const item = catalog.items.find((i) => i.key === state.item);
      if (item) {
        const config =
          item.customize && state.config?.key === item.key
            ? {
                key: item.key,
                index: Math.max(0, Math.trunc(Number(state.config.index) || 0)),
                value: LumenVariants.normalize({
                  ...state.config.value,
                  type: item.customize.type,
                }),
              }
            : null;
        openInspector(item, config, state.tab);
      }
    } else if ($("inspector").open) $("inspector").close();
    if (route.key) {
      const item = catalog.items.find((x) => x.key === route.key);
      remember(item);
      const node = document.querySelector(
        '[data-key="' + CSS.escape(route.key) + '"]',
      );
      node?.classList.add("is-selected");
      node?.scrollIntoView({ block: "start" });
    }
  }
  async function openInspector(item, restored = null, restoredTab = null) {
    configuration = restored;
    selected = item;
    $("configure-tab").hidden = !LumenVariants.infer(item);
    remember(item);
    $("inspector-title").textContent = item.title;
    $("inspector-capabilities").textContent =
      typeLabels[item.status] +
      (item.customize
        ? " · Edit an existing " + item.customize.type + " instance"
        : "") +
      (item.capabilities?.applicationIntegration
        ? " · Application integration required"
        : "");
    $("standalone-link").href =
      "example.html?item=" +
      encodeURIComponent(item.key) +
      "&theme=" +
      $("theme").value +
      (LumenAssets.offline && location.protocol !== "file:"
        ? "&offline=1"
        : "");
    $("save-favorite").textContent = favorites.includes(item.key)
      ? "★ Favorited"
      : "☆ Favorite";
    if (!$("inspector").open) $("inspector").showModal();
    await inspectTab(
      [
        "preview",
        "html",
        "css",
        ...(item.customize ? ["configure"] : []),
      ].includes(restoredTab)
        ? restoredTab
        : restored
          ? "configure"
          : "preview",
    );
  }
  async function inspectTab(tab) {
    const item = selected;
    if (!item) return;
    activeTab = tab;
    $("inspector-body").setAttribute(
      "aria-labelledby",
      document.querySelector('[data-inspect="' + tab + '"]').id,
    );
    inspectorPreview?.destroy();
    inspectorPreview = null;
    $("inspector-body").replaceChildren();
    document.querySelectorAll("[data-inspect]").forEach((b) => {
      const on = b.dataset.inspect === tab;
      b.id ||= "inspector-tab-" + b.dataset.inspect;
      b.setAttribute("aria-controls", "inspector-body");
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    saveWorkspace();
    if (tab === "configure") {
      await configurePanel(item);
      return;
    }
    if (tab === "preview") {
      inspectorPreview = await preview(item, $("inspector-body"), true);
      if (selected !== item || !$("inspector").open) {
        inspectorPreview.destroy();
        inspectorPreview = null;
      }
      return;
    }
    const label = el("label", "variant-select", "Copy selection"),
      select = el("select");
    select.id = "variant-selection";
    select.setAttribute("aria-label", "Copy selection");
    select.append(new Option("Complete example", "all"));
    if (tab === "html") {
      const fragment = await configuredContent(item);
      copyCandidates(fragment).forEach((node, i) => {
        select.append(
          new Option(
            (node.textContent.trim() ||
              node.getAttribute("aria-label") ||
              node.getAttribute("placeholder") ||
              node.tagName) +
              " · " +
              (i + 1),
            String(i),
          ),
        );
      });
    }
    label.append(select);
    const source = el("pre");
    $("inspector-body").append(label, source);
    const refresh = async () => {
      source.textContent =
        tab === "html" ? await markup(item, select.value) : await styles(item);
    };
    select.onchange = refresh;
    await refresh();
  }
  function stylesheetFiles(item) {
    return [
      ...new Set([
        "lumen-core.css",
        ...(item.source === "core" ? [] : item.css),
      ]),
    ];
  }
  async function styles(item) {
    const files = stylesheetFiles(item);
    return (
      "/* Required stylesheet: " +
      files.join(", ") +
      " */\n\n" +
      (await Promise.all(files.map((file) => previewSheet(file, true)))).join(
        "\n",
      )
    );
  }
  function standaloneURL(item) {
    const params = new URLSearchParams({
      item: item.key,
      theme: $("theme").value,
    });
    if (configured(item)) {
      params.set("config", JSON.stringify(configuration.value));
      params.set("configTarget", String(configuration.index || 0));
    }
    if (Object.keys(brandConfiguration).length)
      params.set("brand", JSON.stringify(brandConfiguration));
    params.set("dir", document.documentElement.dir || "ltr");
    if (LumenAssets.offline && location.protocol !== "file:")
      params.set("offline", "1");
    return "example.html?" + params;
  }
  async function configurePanel(item) {
    const source = legacySnippet(await content(item)),
      targets = [...source.querySelectorAll(item.customize.selector)];
    if (!targets.length) {
      $("inspector-body").append(
        el("p", "", "This example has no supported editable primitive."),
      );
      return;
    }
    if (!configured(item))
      configuration = {
        key: item.key,
        index: 0,
        value: LumenVariants.read(targets[0], item.customize.type),
      };
    const panel = el("div", "variant-builder"),
      controls = el("div", "variant-controls"),
      surface = el("div", "variant-preview"),
      code = el("pre", "variant-code");
    code.setAttribute("aria-label", "Configured HTML");
    panel.append(controls, surface, code);
    $("inspector-body").append(panel);
    let sequence = 0;
    const refresh = async () => {
      const current = ++sequence;
      inspectorPreview?.destroy();
      const handle = await preview(item, surface, true);
      if (current !== sequence || !panel.isConnected || !$("inspector").open) {
        handle.destroy();
        return;
      }
      inspectorPreview = handle;
      code.textContent = await markup(item);
      $("standalone-link").href = standaloneURL(item);
      saveWorkspace();
    };
    function select(name, label, values) {
      const wrap = el("label", "", label),
        input = el("select");
      input.id = "configure-" + name;
      input.setAttribute("aria-label", label);
      for (const value of values)
        input.append(
          new Option(
            value === "original" ? "Original icon" : value || "Default",
            value,
          ),
        );
      input.value = configuration.value[name];
      input.onchange = async () => {
        configuration.value = LumenVariants.normalize({
          ...configuration.value,
          [name]: input.value,
        });
        if (name === "type") {
          const focus = input.id;
          await inspectTab("configure");
          document.getElementById(focus)?.focus();
        } else await refresh();
      };
      wrap.append(input);
      controls.append(wrap);
    }
    const targetLabel = el("label", "", "Edit instance"),
      targetSelect = el("select");
    targetSelect.id = "configure-target";
    targetSelect.setAttribute("aria-label", "Edit instance");
    targets.forEach((node, index) =>
      targetSelect.append(
        new Option(
          (
            node.getAttribute("aria-label") ||
            node.getAttribute("placeholder") ||
            node.textContent.trim() ||
            item.customize.type
          ).slice(0, 60),
          String(index),
        ),
      ),
    );
    targetSelect.value = String(configuration.index || 0);
    targetSelect.onchange = async () => {
      configuration.index = Number(targetSelect.value);
      configuration.value = LumenVariants.read(
        targets[configuration.index],
        item.customize.type,
      );
      saveWorkspace();
      await inspectTab("configure");
    };
    targetLabel.append(targetSelect);
    controls.prepend(targetLabel);
    const reset = el("button", "btn btn-style-ghost", "Reset customization");
    reset.type = "button";
    reset.id = "configure-reset";
    reset.onclick = async () => {
      configuration.value = LumenVariants.read(
        targets[configuration.index || 0],
        item.customize.type,
      );
      saveWorkspace();
      await inspectTab("configure");
    };
    controls.append(reset);
    configuration.index = Math.min(
      targets.length - 1,
      Math.max(0, configuration.index || 0),
    );
    const c = configuration.value;
    if (LumenVariants.types[c.type].length)
      select("style", "Style", LumenVariants.types[c.type]);
    select("color", "Color", [
      "",
      ...LumenVariants.colors,
      ...(!["input", "progress"].includes(c.type)
        ? LumenVariants.gradients
        : []),
    ]);
    select("size", "Size", LumenVariants.sizes);
    select("shape", "Shape", [
      "rounded",
      "pill",
      "square",
      ...(["btn", "avatar"].includes(c.type) ? ["circle"] : []),
    ]);
    if (["btn", "input"].includes(c.type))
      select(
        "state",
        "State",
        c.type === "btn"
          ? ["normal", "hover", "pressed", "focus", "disabled", "loading"]
          : ["normal", "hover", "focus", "disabled", "invalid"],
      );
    const label = el("label", "", "Label"),
      text = el("input");
    text.id = "configure-text";
    text.value = c.text;
    text.maxLength = 200;
    text.oninput = async () => {
      configuration.value.text = text.value;
      await refresh();
    };
    label.append(text);
    controls.append(label);
    if (c.type === "btn") {
      for (const [key, title] of [
        ["icon", "Include icon"],
        ["iconOnly", "Icon only"],
      ]) {
        const label = el("label", "variant-check"),
          box = el("input");
        box.type = "checkbox";
        box.id = "configure-" + key;
        box.checked = c[key];
        box.onchange = async () => {
          configuration.value[key] = box.checked;
          await refresh();
        };
        label.append(box, document.createTextNode(title));
        controls.append(label);
      }
      select("iconName", "Icon", [
        ...(c.iconName === "original" ? ["original"] : []),
        ...LumenIcons.names,
      ]);
    }
    await refresh();
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    write("theme", theme);
    for (const p of previews) p.host.dataset.theme = theme;
    if (selected) $("standalone-link").href = standaloneURL(selected);
    applyBrand();
    saveWorkspace();
  }
  $("compare-open").onclick = () => {
    if (!comparison.length) return;
    category = "compare";
    $("page-title").textContent = "Compare components";
    $("page-summary").textContent =
      "Selected examples side by side. Use the theme and width controls to compare.";
    $("search").value = "";
    $("family-filter").value = "";
    $("status-filter").value = "";
    $("layout-filter").value = "grid";
    render();
    location.hash = "compare";
  };
  $("direction").onchange = () => {
    document.documentElement.dir = $("direction").value;
    saveWorkspace();
  };
  $("theme").value = read("theme", "light");
  if (!$("theme").value) $("theme").value = "light";
  setTheme($("theme").value);
  $("theme").onchange = () => setTheme($("theme").value);
  function syncSidebar() {
    const closed =
      matchMedia("(max-width:800px)").matches &&
      !$("sidebar").classList.contains("open");
    $("sidebar").inert = closed;
    if (closed) $("sidebar").setAttribute("aria-hidden", "true");
    else $("sidebar").removeAttribute("aria-hidden");
  }
  matchMedia("(max-width:800px)").addEventListener("change", syncSidebar);
  syncSidebar();
  $("menu-toggle").onclick = () => {
    const open = $("sidebar").classList.toggle("open");
    $("menu-toggle").setAttribute("aria-expanded", String(open));
    syncSidebar();
  };
  $("search").addEventListener("input", () => {
    if (!catalog) return;
    if ($("search").value) {
      $("page-title").textContent = "Search results";
      $("page-summary").textContent = "Search across all component families.";
      $("family-filter").value = "";
      render();
    } else navigate();
  });
  ["family-filter", "status-filter", "layout-filter"].forEach(
    (id) => ($(id).onchange = render),
  );
  $("reset-filters").onclick = () => {
    $("search").value = "";
    $("family-filter").value = "";
    $("status-filter").value = "";
    $("layout-filter").value = "grid";
    navigate();
  };
  for (const b of document.querySelectorAll("[data-width]"))
    b.onclick = () => {
      width = b.dataset.width;
      document
        .querySelectorAll("[data-width]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      for (const p of previews)
        p.host.style.maxWidth = width === "full" ? "100%" : width + "px";
      saveWorkspace();
    };
  $("inspector-close").onclick = () => $("inspector").close();
  $("inspector").addEventListener("close", () => {
    configuration = null;
    inspectorPreview?.destroy();
    inspectorPreview = null;
    saveWorkspace();
  });
  document.querySelectorAll("[data-inspect]").forEach((b) => {
    b.onclick = () => inspectTab(b.dataset.inspect);
    b.onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const tabs = [
          ...document.querySelectorAll("[data-inspect]:not([hidden])"),
        ];
        let i = tabs.indexOf(b);
        i =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : (i +
                  (e.key === "ArrowRight" ? 1 : -1) *
                    (document.documentElement.dir === "rtl" ? -1 : 1) +
                  tabs.length) %
                tabs.length;
        tabs[i].focus();
        inspectTab(tabs[i].dataset.inspect);
      }
    };
  });
  $("copy-snippet").onclick = async () => {
    try {
      await LumenUI.copy(await markup(selected, $("variant-selection")?.value));
      notice("HTML copied");
    } catch {
      notice("Clipboard unavailable");
    }
  };
  $("download-example").onclick = async () => {
    if (!selected) return;
    try {
      const html = await standalone(
          selected,
          $("variant-selection")?.value || "all",
          true,
        ),
        url = URL.createObjectURL(new Blob([html], { type: "text/html" })),
        link = el("a");
      link.href = url;
      link.download = selected.id + ".html";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice("HTML downloaded with CSS and interactions included");
    } catch (error) {
      notice(error.message);
    }
  };
  $("copy-css").onclick = async () => {
    try {
      await LumenUI.copy(await styles(selected));
      notice("CSS copied");
    } catch {
      notice("Clipboard unavailable");
    }
  };
  $("copy-standalone").onclick = async () => {
    try {
      await LumenUI.copy(
        await standalone(selected, $("variant-selection")?.value),
      );
      notice("Complete example copied");
    } catch {
      notice("Clipboard unavailable");
    }
  };
  $("save-favorite").onclick = () => toggleFavorite(selected.key);
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $("search").focus();
      $("search").select();
    }
    if (e.key === "Escape") {
      $("sidebar").classList.remove("open");
      $("menu-toggle").setAttribute("aria-expanded", "false");
      syncSidebar();
    }
  });
  window.addEventListener("hashchange", navigate);
  window.addEventListener("popstate", () => {
    if (catalog) navigate();
  });
  $("tokens-open").onclick = () => {
    const form = $("tokens-form");
    form.replaceChildren();
    const labels = {
      primary: "Primary color",
      canvas: "Page background",
      surface: "Panel background",
      ink: "Main text",
      muted: "Secondary text",
      radius: "Corner radius (px)",
      space: "Panel spacing (px)",
      control: "Medium control height (px)",
      font: "Font family",
    };
    for (const [key, title] of Object.entries(labels)) {
      const label = el("label", "field", title),
        input = key === "font" ? el("select", "input") : el("input", "input");
      input.name = key;
      if (key === "font")
        for (const name of Object.keys(LumenDesign.fonts))
          input.append(new Option(name, name));
      else if (["radius", "space", "control"].includes(key)) {
        input.type = "number";
        input.min = key === "radius" ? "0" : key === "space" ? "8" : "32";
        input.max = key === "radius" ? "32" : key === "space" ? "40" : "64";
      } else input.type = "color";
      const value =
        brandConfiguration[key] ??
        LumenDesign.current(document.documentElement)[key];
      input.value = String(value);
      input.oninput = () => {
        brandConfiguration = LumenDesign.normalize({
          ...brandConfiguration,
          [key]: input.value,
        });
        applyBrand();
        $("token-feedback").textContent =
          LumenDesign.validate({
            ...LumenDesign.current(document.documentElement),
            ...brandConfiguration,
          }).join(". ") ||
          "Brand configuration applied to the workspace and exports.";
      };
      const caption = el("span", "input-label", title);
      caption.id = "token-label-" + key;
      label.replaceChildren(caption, input);
      input.setAttribute("aria-labelledby", caption.id);
      form.append(label);
    }
    $("tokens-dialog").showModal();
  };
  $("tokens-form").onsubmit = (event) => event.preventDefault();
  $("tokens-close").onclick = () => $("tokens-dialog").close();
  $("tokens-reset").onclick = () => {
    brandConfiguration = {};
    applyBrand();
    $("tokens-dialog").close();
  };
  $("tokens-copy").onclick = async () => {
    await LumenUI.copy(LumenDesign.css(brandConfiguration));
    notice("Brand CSS copied");
  };
  $("share-workspace").onclick = async () => {
    saveWorkspace();
    await LumenUI.copy(location.href);
    notice("Workspace link copied");
  };
  $("compare-clear").onclick = () => {
    comparison = [];
    $("compare-open").disabled = true;
    $("compare-open").textContent = "Compare (0)";
    saveWorkspace();
    if (category === "compare") navigate();
    else render();
  };
  LumenAssets.json("catalog/components.json")
    .then((data) => {
      catalog = data;
      // Migrate old favorites and recent records using stable original keys.
      favorites = [
        ...new Set(favorites.map((k) => catalog.aliases?.[k] || k)),
      ].filter((k) => catalog.items.some((x) => x.key === k));
      recent = [
        ...new Set(
          recent
            .map((x) => (typeof x === "string" ? x : x.p + "/" + x.id))
            .map((k) => catalog.aliases?.[k] || k),
        ),
      ].filter((k) => catalog.items.some((x) => x.key === k));
      const families = new Set(
          catalog.items.map((x) => x.category + "/" + x.family),
        ),
        core = catalog.items.filter((x) => x.source === "core");
      for (const [value, label] of [
        [catalog.items.length, "Curated examples"],
        [families.size, "Component families"],
        [catalog.categories.length, "Purposeful categories"],
        [core.length, "Public core examples"],
      ]) {
        const stat = el("div");
        stat.append(el("strong", "", String(value)), el("span", "", label));
        $("stats").append(stat);
      }
      catalog.categories.forEach((cat, i) => {
        const count = catalog.items.filter((x) => x.category === cat.id).length;
        const link = el("a");
        link.href = "#" + cat.id;
        link.dataset.category = cat.id;
        link.append(
          el("span", "", icons[i]),
          document.createTextNode(cat.label),
          el("span", "", String(count)),
        );
        $("category-nav").append(link);
        const card = el("a", "category-card");
        card.href = "#" + cat.id;
        card.append(
          el("div", "category-icon", icons[i]),
          el("h3", "", cat.label),
          el(
            "p",
            "",
            [
              ...new Set(
                catalog.items
                  .filter((x) => x.category === cat.id)
                  .map((x) => x.family.replace(/^\d+ · /, "")),
              ),
            ]
              .slice(0, 3)
              .join(" · "),
          ),
          el("small", "", count + " examples ↗"),
        );
        $("category-grid").append(card);
      });
      updateFavorites();
      navigate();
      window.LumenStudio = {
        catalog,
        content,
        markup,
        standalone,
        preview,
        openInspector,
        render,
        styles,
      };
    })
    .catch((error) => {
      $("load-error").textContent = error.message;
      $("load-error").hidden = false;
    });
})();
