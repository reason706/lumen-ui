/* Validated brand configuration shared by the workspace, exports and reference app. */
(function (global) {
  "use strict";
  const fields = {
    primary: "--lumen-color-primary",
    canvas: "--lumen-canvas",
    surface: "--lumen-surface",
    ink: "--lumen-ink",
    muted: "--lumen-muted",
    radius: "--lumen-radius-md",
    space: "--space-5",
    control: "--lm-control-md",
    font: "--font-sans",
  };
  const fonts = {
    sans: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    serif: 'Georgia,"Times New Roman",serif',
    mono: "ui-monospace,Consolas,monospace",
  };
  const numeric = { radius: [0, 32], space: [8, 40], control: [32, 64] };
  function normalize(input = {}) {
    const result = {};
    for (const key of Object.keys(fields))
      if (Object.hasOwn(input, key)) {
        if (numeric[key]) {
          const value = Number(input[key]);
          if (Number.isFinite(value))
            result[key] = Math.min(
              numeric[key][1],
              Math.max(numeric[key][0], value),
            );
        } else if (key === "font") {
          if (fonts[input[key]]) result[key] = input[key];
        } else if (/^#[0-9a-f]{6}$/i.test(input[key]))
          result[key] = input[key].toLowerCase();
      }
    return result;
  }
  function luminance(hex) {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function declarations(input) {
    const config = normalize(input),
      result = {};
    for (const [key, value] of Object.entries(config))
      result[fields[key]] = numeric[key]
        ? value + "px"
        : key === "font"
          ? fonts[value]
          : value;
    if (config.primary) {
      result["--lumen-brand-primary"] = config.primary;
      result["--lumen-theme-primary"] = config.primary;
      result["--lumen-on-primary"] =
        contrast(config.primary, "#ffffff") >=
        contrast(config.primary, "#000000")
          ? "#ffffff"
          : "#000000";
      result["--lumen-brand-on-primary"] = result["--lumen-on-primary"];
      result["--lumen-on-theme-primary"] = result["--lumen-on-primary"];
    }
    if (Object.hasOwn(config, "radius")) {
      result["--radius-xl"] = config.radius + "px";
      result["--lm-control-radius-md"] = config.radius + "px";
      result["--lm-control-radius-sm"] = config.radius + "px";
    }
    return result;
  }
  const active = new WeakMap();
  function apply(element, input) {
    for (const name of active.get(element) || [])
      element.style.removeProperty(name);
    const values = declarations(input);
    for (const [key, value] of Object.entries(values))
      element.style.setProperty(key, value);
    active.set(element, Object.keys(values));
    return normalize(input);
  }
  function css(input, selector = ":root") {
    return (
      selector +
      "{" +
      Object.entries(declarations(input))
        .map(([key, value]) => key + ":" + value + ";")
        .join("") +
      "}"
    );
  }
  function current(element = document.documentElement) {
    const style = getComputedStyle(element),
      result = {};
    const canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    for (const [key, token] of Object.entries(fields)) {
      const value = style.getPropertyValue(token).trim();
      if (numeric[key])
        result[key] =
          parseFloat(value) ||
          (key === "radius" ? 0 : key === "space" ? 20 : 44);
      else if (key === "font")
        result[key] = /mono/i.test(value)
          ? "mono"
          : /Georgia|Times/i.test(value)
            ? "serif"
            : "sans";
      else {
        // Resolve modern CSS colors through the browser before reading an opaque pixel.
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value || "#000000";
        context.fillRect(0, 0, 1, 1);
        result[key] =
          "#" +
          [...context.getImageData(0, 0, 1, 1).data]
            .slice(0, 3)
            .map((n) => n.toString(16).padStart(2, "0"))
            .join("");
      }
    }
    return result;
  }
  function validate(input) {
    const c = normalize(input),
      issues = [];
    for (const [foreground, background] of [
      ["ink", "surface"],
      ["muted", "surface"],
      ["ink", "canvas"],
    ])
      if (
        c[foreground] &&
        c[background] &&
        contrast(c[foreground], c[background]) < 4.5
      )
        issues.push(foreground + " on " + background + " needs more contrast");
    return issues;
  }
  global.LumenDesign = Object.freeze({
    fields,
    fonts,
    current,
    normalize,
    apply,
    css,
    contrast,
    validate,
  });
})(window);
