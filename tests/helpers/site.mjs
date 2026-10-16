import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
export async function site() {
  const root = resolve("."),
    server = createServer(async (req, res) => {
      try {
        const file = resolve(
          root,
          "." +
            decodeURIComponent(new URL(req.url, "http://localhost").pathname),
        );
        if (!file.startsWith(root + "/")) throw Error("Outside root");
        res.setHeader(
          "Content-Type",
          {
            ".css": "text/css",
            ".js": "text/javascript",
            ".html": "text/html",
            ".json": "application/json",
            ".svg": "image/svg+xml",
          }[extname(file)] || "text/plain",
        );
        res.end(await readFile(file));
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    base: "http://127.0.0.1:" + server.address().port,
    close: () => new Promise((r) => server.close(r)),
  };
}
