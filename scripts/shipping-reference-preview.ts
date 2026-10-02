import { createServer } from "node:http";
import fs from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

async function main() {
  const catalog = process.argv.includes("--catalog");
  const bundle = await build({ entryPoints: [catalog ? "scripts/fixtures/qa-catalog-page.tsx" : "scripts/fixtures/qa-shipping-reference.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const server = createServer(async (req, res) => {
    if (catalog && req.method === "POST" && req.url === "/api/produtos/sugestoes") {
      // Synthetic responses only. Every catalog write is refused below; no DB/provider exists here.
      let body = "";
      for await (const chunk of req) { body += chunk; if (body.length > 4096) { res.writeHead(413).end(); return; } }
      let input: { name?: string; brand?: string; ean?: string };
      try { input = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
      const name = input.name || "Produto sintético";
      const source = { title: "Referência sintética de QA", url: "https://example.com/ficha", evidence: "Peso bruto: 800 g. Comprimento 15 cm, largura 20 cm, altura 30 cm." };
      const shipping = /sem medidas/i.test(name) ? null : { productName: name, packageLevel: "retail_unit", weightGrams: 800, widthCm: 20, heightCm: 30, lengthCm: 15, weightSource: source, dimensionsSource: source, warnings: ["Dados sintéticos de QA; confira embalagem real."], researchedAt: new Date().toISOString() };
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: { name, brand: input.brand || "Marca sintética", ean: input.ean || null, productType: /medicamento/i.test(name) ? "medicine" : "other", identityMatch: "exact", confidence: /revisar/i.test(name) ? "medium" : "high", category: "Categoria sintética", activeIngredients: [], searchTerms: [name, "Marca sintética"], description: "Descrição sintética de teste do cadastro; nenhum produto ou medida desta página corresponde a uma ficha real.", warnings: [], sources: [source], shipping } }));
      return;
    }
    if (req.method !== "GET") { res.writeHead(405).end(); return; }
    if (catalog && ["/api/produtos", "/api/admin/imagens-produtos"].includes(req.url || "")) { res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: [] })); return; }
    if (req.url === "/qa.js") { res.writeHead(200, { "Content-Type": "text/javascript" }).end(bundle.outputFiles[0].contents); return; }
    if (req.url === "/qa.css") { res.writeHead(200, { "Content-Type": "text/css" }).end(css); return; }
    if (req.url !== "/") { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>');
  });
  server.listen(3016, "127.0.0.1", () => console.log("Prévia isolada: http://127.0.0.1:3016 — encerrar com Ctrl+C"));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
