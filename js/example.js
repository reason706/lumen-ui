(async () => {
  "use strict";
  const params = new URLSearchParams(location.search),
    key = params.get("item") || "core/buttons-solid",
    theme = params.get("theme") || "light";
  document.documentElement.dataset.theme = [
    "light",
    "dark",
    "oled",
    "cyberpunk",
    "obsidian",
    "arctic",
    "sport",
    "luxury",
  ].includes(theme)
    ? theme
    : "light";
  try {
    const catalog = await LumenAssets.json("catalog/components.json"),
      item = catalog.items.find(
        (x) => x.key === (catalog.aliases?.[key] || key),
      );
    if (!item) throw Error("Unknown component");
    const doc = await LumenAssets.templateDocument(
      item.template,
      catalog.items,
    );
    const template = doc.querySelector(
      'template[id="' + CSS.escape(item.id) + '"]',
    );
    if (!template) throw Error("Missing component template");
    document.title = item.title + " — Lumen";
    await Promise.all(
      (item.source === "core" ? [] : item.css).map(
        (file) =>
          new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = file;
            link.onload = resolve;
            link.onerror = () =>
              reject(Error("Could not load stylesheet: " + file));
            document.head.append(link);
          }),
      ),
    );
    const config = params.has("config")
      ? LumenVariants.normalize(JSON.parse(params.get("config")))
      : null;
    const fragment = config
        ? LumenVariants.create(config)
        : template.content.cloneNode(true),
      section = fragment.querySelector(".demo-section");
    if (section) {
      section.querySelector(".demo-heading")?.remove();
      section.removeAttribute("id");
      section.classList.remove("demo-section", "demo-span-2", "demo-span-full");
    }
    const main = document.getElementById("example");
    main.replaceChildren();
    const icons = doc.querySelector("template#icons");
    if (icons) main.append(icons.content.cloneNode(true));
    const wrap = document.createElement("div");
    wrap.className = config ? "lumen" : item.wrapper || "lumen";
    wrap.append(fragment);
    main.append(wrap);
    main.dataset.ready = "true";
    LumenUI.mount(document);
  } catch (error) {
    document.getElementById("example").textContent = error.message;
    document.getElementById("example").dataset.ready = "error";
  }
})();
