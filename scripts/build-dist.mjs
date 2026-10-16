/* Ready-to-use bundles: flatten imports, retain cascade order, remove duplicate rules. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { flatten } from "./lib/styles.mjs";
const registry = JSON.parse(await readFile("naming/classes.json", "utf8"));
const budgets = JSON.parse(await readFile("bundle-budgets.json", "utf8"));
import postcss from "postcss";
import { minify } from "terser";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const check = process.argv.includes("--check"),
  root = process.cwd(),
  outputs = {};
const metrics = {};
for (const entry of [
  "lumen.css",
  "lumen-core.css",
  "lumen-modern.css",
  "lumen-core-modern.css",
]) {
  const modern = entry.includes("-modern");
  const source = await flatten(entry.replace("-modern", ""), registry, !modern),
    css = postcss.parse(source),
    seen = new Set();
  let removed = 0;
  const rules = [];
  css.walkRules((r) => rules.push(r));
  for (const rule of rules.reverse()) {
    const parents = [];
    for (let p = rule.parent; p?.type === "atrule"; p = p.parent)
      parents.push(p.name + " " + p.params);
    const key =
      parents.join("|") +
      "|" +
      rule.selector +
      "|" +
      rule.nodes.map((n) => n.toString()).join(";");
    if (seen.has(key)) {
      rule.remove();
      removed++;
    } else seen.add(key);
  }
  css.walkDecls((decl) => {
    let depth = 0,
      quote = "",
      escaped = false;
    for (const char of decl.value) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (quote) {
        if (char === quote) quote = "";
        continue;
      }
      if (char === '\"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth < 0) throw Error("Invalid CSS value: " + decl.toString());
    }
    if (depth !== 0 || quote)
      throw Error("Unbalanced CSS value: " + decl.toString());
  });
  css.walkComments((c) => c.remove());
  // Compact serialization leaves selector and declaration values intact.
  css.walk((node) => {
    node.raws.before = "";
    if (node.nodes) {
      node.raws.after = "";
      node.raws.semicolon = false;
    }
    if (node.type === "decl") node.raws.between = ":";
    if (node.type === "rule") node.raws.between = "";
  });
  css.raws.after = "";
  outputs["dist/" + entry] =
    `/* Lumen UI ${version} — built from shared sources. */\n` + css.toString();
  metrics[entry] = {
    sourceBytes: Buffer.byteLength(source),
    bytes: Buffer.byteLength(outputs["dist/" + entry]),
    gzipBytes: gzipSync(outputs["dist/" + entry]).length,
    duplicateRulesRemoved: removed,
  };
  if (metrics[entry].gzipBytes > budgets[entry].gzipBytes)
    throw Error(
      "Bundle exceeds gzip budget: " +
        entry +
        " (" +
        metrics[entry].gzipBytes +
        " > " +
        budgets[entry].gzipBytes +
        ")",
    );
}
const runtime =
  (await readFile("js/tokens.js", "utf8")) +
  "\n" +
  (await readFile("js/design.js", "utf8")) +
  "\n" +
  (await readFile("js/icons.js", "utf8")) +
  "\n" +
  (await readFile("js/components.js", "utf8"));
outputs["dist/lumen.js"] =
  "/* Lumen UI " +
  version +
  " */\n" +
  (await minify(runtime, { ecma: 2020, compress: true, mangle: true })).code +
  "\n";
if (gzipSync(outputs["dist/lumen.js"]).length > budgets["lumen.js"].gzipBytes)
  throw Error("Runtime exceeds gzip budget");
outputs["dist/icons.svg"] = await readFile("icons/lumen.svg", "utf8");
outputs["dist/index.html"] =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumen quick start</title><link rel="stylesheet" href="lumen-core.css"><script src="lumen.js" defer></script></head><body class="lumen"><main class="container p-6"><article class="card"><header class="card-header"><h1 class="heading-lg">Start with Lumen</h1></header><div class="card-body"><p class="body-md">Shared foundations. Independent components.</p><button type="button" class="btn btn-style-tonal color-blue size-lg" data-lm-toast="Your components are ready">Try an action</button></div></article></main></body></html>\n';
outputs["dist/manifest.json"] =
  JSON.stringify(
    {
      version,
      styles: metrics,
      files: Object.fromEntries(
        Object.entries(outputs).map(([file, value]) => [
          file.slice(5),
          {
            bytes: Buffer.byteLength(value),
            gzipBytes: gzipSync(value).length,
            sha256: createHash("sha256").update(value).digest("hex"),
          },
        ]),
      ),
    },
    null,
    2,
  ) + "\n";
await mkdir("dist", { recursive: true });
for (const [file, value] of Object.entries(outputs))
  if (check) {
    if ((await readFile(file, "utf8")) !== value)
      throw Error("Stale distribution: " + file);
  } else await writeFile(file, value);
console.log(
  "PASS distribution: " +
    Object.keys(outputs).length +
    " ready-built files; " +
    Object.entries(metrics)
      .map(
        ([f, m]) =>
          f +
          " " +
          m.bytes +
          " bytes (" +
          m.duplicateRulesRemoved +
          " duplicate rules removed)",
      )
      .join("; "),
);
