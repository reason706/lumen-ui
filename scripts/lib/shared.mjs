import { readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
// Compile extracted source fragments in the importing category's naming context.
// This retains contextual aliases without duplicating authored declarations.
export async function sharedSource(file, stack = []) {
  if (stack.includes(file)) throw Error("Shared CSS import cycle: " + file);
  const css = postcss.parse(await readFile(file, "utf8"));
  for (const rule of [...css.nodes].filter(
    (n) => n.type === "atrule" && n.name === "import",
  )) {
    const match = /^url\(['"](\.\/reference-[^'"]+\.css)['"]\)$/.exec(
      rule.params,
    );
    if (match)
      rule.replaceWith(
        postcss.parse(
          await sharedSource(path.join(path.dirname(file), match[1]), [
            ...stack,
            file,
          ]),
        ).nodes,
      );
  }
  if (file === "components/patterns.css") {
    const { breakpoints } = JSON.parse(
      await readFile("tokens/design-tokens.json", "utf8"),
    );
    css.walkAtRules("media", (rule) => {
      rule.params = rule.params.replaceAll(
        "(--lumen-md-down)",
        "(max-width: " + breakpoints.md + ")",
      );
    });
  }
  return css.toString();
}
