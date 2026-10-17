import { readFile, writeFile } from "node:fs/promises";
const check = process.argv.includes("--check"),
  schema = JSON.parse(await readFile("tokens/design-tokens.json", "utf8"));
const header =
  "/* Generated from tokens/design-tokens.json. Edit that source or tokens/source utilities. */\n";
const scope = ":where(:root,:host,.lumen,.lm-scope,[data-theme])";
const declarations = (values) =>
  Object.entries(values)
    .map(([key, value]) => `  ${key}:${value};`)
    .join("\n");
const bind = {
  ...Object.fromEntries(
    Object.entries(schema.semantic).filter(
      ([key, value]) =>
        !Object.hasOwn(schema.themes.light, key) && value.includes("var("),
    ),
  ),
  ...Object.fromEntries(
    Object.entries(schema.components).filter(([, value]) =>
      value.includes("var("),
    ),
  ),
  ...schema.aliases,
};
let css =
  header +
  `:where(:root,:host){\n${declarations({ ...schema.primitives, ...schema.components, ...schema.semantic, ...schema.themes.light })}\n}\n`;
for (const [theme, values] of Object.entries(schema.themes))
  css += `:where([data-theme="${theme}"],:host([data-theme="${theme}"])){\n${declarations(values)}\n}\n`;
css += `${scope}{\n${declarations(bind)}\n}\n`;
css +=
  ':where([data-density="compact"]){--lumen-table-pad:var(--space-2);--lumen-section-gap:var(--space-4);--lumen-panel-pad:var(--space-4)}\n';
const outputs = { "tokens/system.css": css };
for (const name of [
  "colors",
  "typography",
  "spacing-sizing",
  "effects",
  "media-queries",
  "brand",
  "controls",
]) {
  let utilities = ["brand", "controls"].includes(name)
    ? ""
    : await readFile("tokens/source/" + name + ".css", "utf8");
  // Breakpoints are build-time constants shared by generated CSS and JavaScript.
  if (name === "media-queries")
    for (const [key, value] of Object.entries(schema.breakpoints)) {
      const original = {
        sm: "40rem",
        md: "48rem",
        lg: "64rem",
        xl: "80rem",
        "2xl": "96rem",
        p2p: "120rem",
      }[key];
      utilities = utilities.replaceAll(original, value);
    }
  outputs["tokens/" + name + ".css"] =
    header +
    '@import url("./system.css");\n' +
    (utilities.trim() ? utilities.trim() + "\n" : "");
}
const utilityBase = (
  await readFile("tokens/source/utilities.css", "utf8")
).trimEnd();
let responsiveUtilities = utilityBase + "\n";
const utilityRules = utilityBase.slice(utilityBase.indexOf(".lm-"));
for (const key of ["sm", "md", "lg", "xl", "2xl"]) {
  const prefix = key === "2xl" ? "xxl" : key;
  const rules = utilityRules.replace(/\.lm-([\w-]+)/g, ".lm-" + prefix + "-$1");
  responsiveUtilities +=
    "@media (min-width: " +
    schema.breakpoints[key] +
    ") {\n" +
    rules
      .split("\n")
      .map((line) => "  " + line)
      .join("\n") +
    "\n}\n";
}
outputs["components/utilities.css"] = header + responsiveUtilities;
let sizing =
  "/* Generated component size contracts from tokens/design-tokens.json. */\n";
for (const [component, sizes] of Object.entries(schema.componentSizes))
  for (const [size, values] of Object.entries(sizes)) {
    const owner = ":where(.lumen,.lm-scope) ";
    const selectors = [owner + "." + component + ".size-" + size];
    if (size === "md")
      selectors.push(owner + "." + component + ':not([class*="size-"])');
    sizing +=
      selectors.join(",") +
      "{" +
      Object.entries(values)
        .map(([property, value]) => property + ":" + value + ";")
        .join("") +
      "}\n";
  }
outputs["components/sizes.css"] = sizing;
// Fail on broken references and dependency cycles before emitting usable-looking CSS.
const known = {
  ...schema.primitives,
  ...schema.semantic,
  ...schema.components,
  ...schema.aliases,
  ...schema.themes.light,
};
const refs = (value) =>
  [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
for (const [key, value] of Object.entries(known))
  for (const ref of refs(value))
    if (!(ref in known)) throw Error("Undefined token " + ref + " in " + key);
function visit(key, stack = []) {
  if (stack.includes(key))
    throw Error("Token cycle: " + [...stack, key].join(" → "));
  for (const ref of refs(known[key] || "")) visit(ref, [...stack, key]);
}
for (const key of Object.keys(known)) visit(key);
const sourceFiles = [
  "components/core.css",
  "components/appearance.css",
  "components/patterns.css",
  "components/button-treatments.css",
  "components/widgets.css",
];
const sources = await Promise.all(
  sourceFiles.map((file) => readFile(file, "utf8")),
);
const local = new Set(Object.keys(known));
for (const css of sources)
  for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) local.add(match[1]);
for (let i = 0; i < sources.length; i++)
  for (const match of sources[i].matchAll(/var\((--[\w-]+)\s*([,)])/g))
    if (match[2] === ")" && !local.has(match[1]))
      throw Error(
        "Undefined source token " + match[1] + " in " + sourceFiles[i],
      );
for (const [theme, values] of Object.entries(schema.themes))
  for (const key of Object.keys(schema.themes.light))
    if (!(key in values))
      throw Error("Missing theme role " + theme + ": " + key);
const contracts = JSON.parse(
    await readFile("components/contracts.json", "utf8"),
  ),
  catalog = JSON.parse(await readFile("catalog/components.json", "utf8"));
for (const item of catalog.items) {
  if (!item.capabilities)
    throw Error("Missing capability contract: " + item.key);
  if (item.customize && !contracts.components[item.customize.type])
    throw Error("Unknown customization contract: " + item.key);
}

outputs["js/tokens.js"] =
  "/* Generated design metadata; no DOM or network dependency. */\nwindow.LumenTokens=Object.freeze(" +
  JSON.stringify({
    version: schema.version,
    themes: Object.keys(schema.themes),
    breakpoints: schema.breakpoints,
    contracts: schema.contracts,
    semantic: Object.keys(schema.semantic),
    roles: Object.keys(schema.components).filter((k) =>
      k.startsWith("--lumen-"),
    ),
  }) +
  ");\n";
for (const [file, value] of Object.entries(outputs))
  if (check) {
    if ((await readFile(file, "utf8")) !== value)
      throw Error("Stale token output: " + file);
  } else await writeFile(file, value);
console.log(
  "PASS token system: " +
    Object.keys(known).length +
    " values/roles; " +
    Object.keys(schema.themes).length +
    " scoped themes; aliases and dependencies valid",
);
