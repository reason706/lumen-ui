import { readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import { sharedSource } from "./shared.mjs";
import { compile } from "./naming.mjs";
export async function flatten(
  file,
  registry,
  compatibility = true,
  stack = [],
) {
  if (stack.includes(file)) throw Error("CSS import cycle: " + file);
  const sourceFile = file.replace(/(^|\/)public-/, "$1");
  const source =
    !compatibility && registry.files[sourceFile]
      ? compile(await sharedSource(sourceFile), sourceFile, registry, false)
      : await readFile(file, "utf8");
  const css = postcss.parse(source);
  for (const rule of [...css.nodes].filter(
    (n) => n.type === "atrule" && n.name === "import",
  )) {
    const match = /^url\(['"]([^'"]+)['"]\)$/.exec(rule.params);
    if (!match) throw Error("Unsupported CSS import: " + rule.toString());
    const dependency = path.normalize(path.join(path.dirname(file), match[1]));
    rule.replaceWith(
      postcss.parse(
        await flatten(dependency, registry, compatibility, [...stack, file]),
      ).nodes,
    );
  }
  return css.toString();
}
