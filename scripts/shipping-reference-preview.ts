import { createServer } from "node:http";
import fs from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

async function main() {
  const bundle = await build({ entryPoints: ["scripts/fixtures/qa-shipping-reference.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const server = createServer((req, res) => {
    if (req.method !== "GET") { res.writeHead(405).end(); return; }
    if (req.url === "/qa.js") { res.writeHead(200, { "Content-Type": "text/javascript" }).end(bundle.outputFiles[0].contents); return; }
    if (req.url === "/qa.css") { res.writeHead(200, { "Content-Type": "text/css" }).end(css); return; }
    if (req.url !== "/") { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>');
  });
  server.listen(3016, "127.0.0.1", () => console.log("Prévia isolada: http://127.0.0.1:3016 — encerrar com Ctrl+C"));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
