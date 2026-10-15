import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
export function compile(source, file, registry, compatibility = true) {
  const { classes } = registry.files[file];
  const css = postcss.parse(source, { from: file });
  const reference =
    /^components\/(foundations|buttons|forms|navigation|surfaces|feedback|sliders-values|data-media)\.css$/.test(
      file,
    );
  const wrappers = [
    ...new Set(
      Object.values(registry.templates)
        .filter((t) => t.css === file)
        .map((t) => t.wrapper),
    ),
  ];
  css.walkRules((rule) => {
    // Reference selectors belong to their exported category scope. This prevents
    // full-bundle reference styles from changing unrelated core components.
    let keyframe = false;
    for (let parent = rule.parent; parent; parent = parent.parent)
      if (parent.type === "atrule" && /keyframes$/.test(parent.name))
        keyframe = true;
    rule.selector = selectorParser((selectors) => {
      const nodes = [];
      selectors.walkClasses((node) => nodes.push(node));
      for (const node of nodes) {
        const name = classes[node.value];
        if (!name || name === node.value) continue;
        const names = [
          ...new Set([
            name,
            ...Object.values(registry.templates)
              .filter((t) => t.css === file)
              .map((t) => t.classes[node.value])
              .filter(Boolean),
          ]),
        ];
        if (
          /^btn-style-(solid|tonal|outline|ghost|link)$/.test(name) &&
          [
            "solid",
            "soft",
            "outline",
            "ghost",
            "link",
            "gtonal",
            "gout",
            "gghost",
          ].includes(node.value)
        )
          names.push(
            name.replace("btn-", "badge-"),
            name.replace("btn-", "chip-"),
          );
        const replacement = selectorParser().astSync(
          ":is(" +
            (compatibility ? "." + node.value + "," : "") +
            names
              .map(
                (x) =>
                  "." +
                  x +
                  (["gtonal", "gout", "gghost"].includes(node.value)
                    ? '[class*="color-gradient-"]'
                    : ""),
              )
              .join(",") +
            ")",
        ).first.first;
        node.replaceWith(replacement);
      }
      selectors.walkAttributes((node) => {
        if (
          node.attribute === "class" &&
          node.operator === "*=" &&
          node.value === "k-"
        )
          node.replaceWith(
            selectorParser().astSync(
              compatibility
                ? ':is([class*="k-"],[class*="color-"])'
                : '[class*="color-"]',
            ).first.first,
          );
      });
    }).processSync(rule.selector);
    if (reference && !keyframe) {
      rule.selector = selectorParser((selectors) =>
        selectors.each((selector) => {
          let scoped = false;
          selector.walkClasses((node) => {
            if (node.value === "p" || wrappers.includes(node.value))
              scoped = true;
          });
          const globalReset = selector.nodes.every(
            (node) =>
              (node.type === "tag" && ["html", "body"].includes(node.value)) ||
              node.type === "universal",
          );
          if (!scoped && !globalReset) {
            const prefix = selectorParser().astSync(
              ":where(" +
                wrappers
                  .map((w) => "." + w)
                  .concat(".p")
                  .join(",") +
                ") ",
            ).first.nodes;
            selector.prepend(selectorParser.combinator({ value: " " }));
            selector.prepend(prefix[0].clone());
          }
        }),
      ).processSync(rule.selector);
    }
  });
  if (file === "components/core.css")
    css.walkDecls((decl) => {
      decl.value = decl.value.replaceAll(
        "var(--lm-primary)",
        "var(--lm-accent,var(--lm-primary))",
      );
    });
  css.walkAtRules("import", (rule) => {
    rule.params = rule.params.replace(
      /([^/]+)\.css/,
      (_, name) => "public-" + name + ".css",
    );
  });
  return css.toString().replace(/[ \t]+$/gm, "");
}
