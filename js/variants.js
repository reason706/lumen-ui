/* Shared component factory: the configurator, preview and export use the same markup. */
(function (global) {
  "use strict";
  const types = {
    btn: ["solid", "tonal", "outline", "ghost", "link"],
    card: ["", "solid", "tonal", "outline", "raised", "glass", "gradient"],
    badge: ["solid", "tonal", "outline"],
    input: [],
    alert: ["tonal", "solid", "outline"],
    chip: ["solid", "tonal", "outline"],
    avatar: [],
    progress: [],
  };
  const colors = [
    "primary",
    "secondary",
    "success",
    "info",
    "warning",
    "danger",
    "red",
    "blue",
    "green",
    "teal",
    "orange",
    "yellow",
    "purple",
    "pink",
    "violet",
    "slate",
    "dark",
    "light",
  ];
  const gradients = [
    "violet",
    "ocean",
    "sunset",
    "candy",
    "forest",
    "midnight",
    "rose",
    "aurora",
  ].map((x) => "gradient-" + x);
  const sizes = ["xs", "sm", "md", "lg", "xl"];
  function normalize(value = {}) {
    const type = Object.hasOwn(types, value.type) ? value.type : "btn";
    return {
      type,
      style: types[type].includes(value.style)
        ? value.style
        : types[type][0] || "",
      color: [
        "",
        ...colors,
        ...(!["input", "progress"].includes(type) ? gradients : []),
      ].includes(value.color)
        ? value.color
        : "primary",
      size: sizes.includes(value.size) ? value.size : "md",
      shape: [
        "rounded",
        "pill",
        "square",
        ...(["btn", "avatar"].includes(type) ? ["circle"] : []),
      ].includes(value.shape)
        ? value.shape
        : "rounded",
      state: (type === "btn"
        ? ["normal", "hover", "pressed", "focus", "disabled", "loading"]
        : type === "input"
          ? ["normal", "hover", "focus", "disabled", "invalid"]
          : ["normal"]
      ).includes(value.state)
        ? value.state
        : "normal",
      icon: type === "btn" && !!value.icon,
      iconOnly: type === "btn" && !!value.iconOnly,
      iconName:
        value.iconName === "original" ||
        global.LumenIcons?.names.includes(value.iconName)
          ? value.iconName
          : "plus",
      text: String(
        value.text ||
          {
            btn: "Continue",
            card: "Your next project",
            badge: "New",
            input: "Your name",
            alert: "Changes saved successfully.",
            chip: "Design",
            avatar: "AB",
            progress: "Upload progress",
          }[type],
      ).slice(0, 200),
    };
  }
  function create(value) {
    const c = normalize(value),
      tag = {
        btn: "button",
        card: "article",
        badge: "span",
        input: "input",
        alert: "div",
        chip: "span",
        avatar: "span",
        progress: "progress",
      }[c.type],
      node = document.createElement(tag);
    node.className =
      c.type +
      (c.color ? " color-" + c.color : "") +
      " size-" +
      c.size +
      (c.style ? " " + c.type + "-style-" + c.style : "") +
      (c.shape !== "rounded" ? " shape-" + c.shape : "");
    if (c.type === "btn") {
      node.type = "button";
      if (c.icon || c.iconOnly)
        node.append(
          LumenIcons.create(c.iconName === "original" ? "plus" : c.iconName),
        );
      if (c.iconOnly) {
        node.classList.add("btn-icon");
        node.setAttribute("aria-label", c.text);
      } else node.append(document.createTextNode(c.text));
    } else if (c.type === "input") {
      node.type = "text";
      node.setAttribute("aria-label", c.text);
      node.setAttribute("placeholder", c.text);
    } else if (c.type === "card") {
      const head = document.createElement("header");
      head.className = "card-header";
      const title = document.createElement("h3");
      title.textContent = c.text;
      head.append(title);
      const body = document.createElement("div");
      body.className = "card-body";
      body.textContent = "Shared foundations. Ready for your next interface.";
      node.append(head, body);
    } else if (c.type === "progress") {
      node.max = 100;
      node.value = 65;
      node.setAttribute("aria-label", c.text);
    } else {
      node.textContent = c.text;
      if (c.type === "alert") node.setAttribute("role", "status");
    }
    if (c.state === "disabled") {
      node.disabled = true;
      node.setAttribute("disabled", "");
    }
    if (c.state === "loading" && c.type === "btn") {
      node.disabled = true;
      node.setAttribute("disabled", "");
      node.setAttribute("aria-busy", "true");
    }
    if (c.state === "hover") node.classList.add("demo-hover");
    if (c.state === "pressed") node.classList.add("demo-pressed");
    if (c.state === "invalid") node.setAttribute("aria-invalid", "true");
    if (c.state === "focus") node.classList.add("demo-focus");
    return node;
  }
  function infer(item) {
    return item.customize?.type || null;
  }
  function read(node, type) {
    const classes = [...node.classList],
      style =
        classes
          .find((c) => c.startsWith(type + "-style-"))
          ?.slice(type.length + 7) ||
        ({
          btn: "solid",
          card: "",
          badge: "tonal",
          alert: "tonal",
          chip: "tonal",
        }[type] ??
          types[type]?.[0]) ||
        "";
    const label =
      type === "card" ? node.querySelector("h1,h2,h3,h4,h5,h6") : null;
    const svg = node.querySelector("svg"),
      use = svg?.querySelector("use"),
      iconName =
        svg?.dataset.icon ||
        use?.getAttribute("href")?.replace(/^#i-/, "") ||
        "plus";
    const text =
      type === "input"
        ? node.getAttribute("placeholder") ||
          node.value ||
          node.getAttribute("aria-label") ||
          "Your name"
        : type === "progress"
          ? node.getAttribute("aria-label") || "Progress"
          : label?.textContent ||
            node.getAttribute("aria-label") ||
            node.textContent.trim();
    return normalize({
      type,
      style,
      color: classes.find((c) => c.startsWith("color-"))?.slice(6) || "",
      size: classes.find((c) => c.startsWith("size-"))?.slice(5) || "md",
      shape: classes.find((c) => c.startsWith("shape-"))?.slice(6) || "rounded",
      state:
        node.getAttribute("aria-busy") === "true"
          ? "loading"
          : node.disabled
            ? "disabled"
            : node.getAttribute("aria-invalid") === "true"
              ? "invalid"
              : classes.includes("demo-hover")
                ? "hover"
                : classes.includes("demo-pressed")
                  ? "pressed"
                  : classes.includes("demo-focus")
                    ? "focus"
                    : "normal",
      text,
      icon: !!svg,
      iconOnly: classes.includes("btn-icon"),
      iconName: global.LumenIcons?.names.includes(iconName)
        ? iconName
        : "original",
    });
  }
  function apply(node, value) {
    const previous = read(node, value.type),
      c = normalize(value);
    for (const name of [...node.classList])
      if (
        name.startsWith(c.type + "-style-") ||
        /^(color-|size-|shape-|demo-(hover|pressed|focus))/.test(name)
      )
        node.classList.remove(name);
    node.classList.add("size-" + c.size);
    if (c.color) node.classList.add("color-" + c.color);
    if (c.style) node.classList.add(c.type + "-style-" + c.style);
    if (c.shape !== "rounded") node.classList.add("shape-" + c.shape);
    if (c.type === "btn") {
      node.classList.toggle("btn-icon", c.iconOnly);
      const oldIcon = node.querySelector("svg");
      if (!c.icon && !c.iconOnly) oldIcon?.remove();
      else if (!oldIcon || c.iconName !== previous.iconName) {
        oldIcon?.remove();
        node.prepend(
          global.LumenIcons.create(
            c.iconName === "original" ? "plus" : c.iconName,
          ),
        );
      }
      if (c.iconOnly) {
        node.setAttribute("aria-label", c.text);
        for (const child of [...node.childNodes])
          if (
            child.nodeType === 3 ||
            (child.nodeType === 1 && child.tagName.toLowerCase() !== "svg")
          )
            child.remove();
      } else {
        if (previous.iconOnly) node.removeAttribute("aria-label");
        const label = [...node.querySelectorAll("span")].find(
          (n) => !n.closest("svg"),
        );
        if (label) label.textContent = c.text;
        else {
          for (const child of [...node.childNodes])
            if (child.nodeType === 3) child.remove();
          node.append(document.createTextNode(c.text));
        }
      }
    } else if (c.text !== previous.text) {
      if (c.type === "input") node.placeholder = c.text;
      else if (c.type === "progress") node.setAttribute("aria-label", c.text);
      else {
        const target =
          c.type === "card"
            ? node.querySelector("h1,h2,h3,h4,h5,h6")
            : c.type === "alert"
              ? node.querySelector("p")
              : null;
        if (target) target.textContent = c.text;
        else {
          const text = [...node.childNodes].find(
            (n) => n.nodeType === 3 && n.textContent.trim(),
          );
          if (text) text.textContent = c.text;
          else if (!node.children.length) node.textContent = c.text;
        }
      }
    }
    if (["btn", "input"].includes(c.type)) {
      node.disabled = ["disabled", "loading"].includes(c.state);
      if (c.state === "loading") node.setAttribute("aria-busy", "true");
      else node.removeAttribute("aria-busy");
      if (c.state === "invalid") node.setAttribute("aria-invalid", "true");
      else node.removeAttribute("aria-invalid");
    }
    if (c.state === "hover") node.classList.add("demo-hover");
    if (c.state === "focus") node.classList.add("demo-focus");
    if (c.state === "pressed") node.classList.add("demo-pressed");
    return node;
  }
  const synonyms = {
    ib: "icon",
    icons: "icon",
    btn: "button",
    buttons: "button",
    soft: "tonal",
    tinted: "tonal",
    dropdowns: "dropdown",
    inputs: "input",
    dialogs: "dialog",
    modal: "dialog",
    modals: "dialog",
    toggles: "toggle",
    colour: "color",
    colours: "color",
    gradiant: "gradient",
    gradiants: "gradient",
  };
  function terms(text) {
    return String(text)
      .toLowerCase()
      .replace(/(?:btn-style-|card-style-|color-|size-)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => synonyms[word] || word);
  }
  function matches(item, text) {
    const hay = terms(
      item.title +
        " " +
        item.family +
        " " +
        item.key +
        " " +
        item.tags.join(" "),
    ).join(" ");
    return terms(text).every((t) => hay.includes(t));
  }
  global.LumenVariants = {
    types,
    colors,
    gradients,
    sizes,
    normalize,
    create,
    infer,
    read,
    apply,
    matches,
  };
})(window);
