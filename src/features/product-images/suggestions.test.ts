import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { analyzeProductPhoto, buildArtworkPrompt, generateProductArtwork } from "./suggestions";

const photo = () => sharp({ create: { width: 120, height: 120, channels: 3, background: "white" } }).png().toBuffer();
const input = { name: "KitKat ao leite 41,5g", brand: "KitKat", ean: "7891000248768" };
const analysis = { name: input.name, brand: "KitKat", ean: null, productType: "food", visibleView: "front", summary: "Frente da embalagem de chocolate.", warnings: [] };
const response = (data: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }));

test("busca indisponivel preserva leitura da foto e nunca aprova fotos sem comparacao", async () => {
  let calls = 0;
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", fetchImplementation: async () => ++calls === 1 ? response(analysis) : new Response("", { status: 503 }),
  });
  assert.equal(result.analysis.productType, "food");
  assert.deepEqual(result.candidates, []);
  assert.match(result.warnings.join(" "), /indisponivel/);
});

test("EAN divergente interrompe busca mesmo com foto identificada", async () => {
  let calls = 0;
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", fetchImplementation: async () => { calls++; return response({ ...analysis, ean: "7891000100103" }); },
  });
  assert.equal(calls, 1);
  assert.equal(result.candidates.length, 0);
  assert.match(result.warnings.join(" "), /diverge/);
});

test("produto divergente na foto interrompe busca sem depender de EAN visivel", async () => {
  let calls = 0;
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", fetchImplementation: async () => { calls++; return response({ ...analysis, name: "Outro produto", identityMatch: "conflict" }); },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.candidates, []);
  assert.match(result.warnings.join(" "), /diverge/);
});

test("somente foto real confirmada entra nas opcoes, com fonte e preview limitado", async () => {
  let calls = 0;
  const asset = await sharp({ create: { width: 800, height: 800, channels: 3, background: "red" } }).png().toBuffer();
  const side = await sharp({ create: { width: 800, height: 800, channels: 3, background: "blue" } }).png().toBuffer();
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", fetchImplementation: async () => {
      calls++;
      if (calls === 1) return response(analysis);
      if (calls === 2) return new Response(JSON.stringify({ candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: "https://www.nestle.com.br/kitkat" } }] } }] }));
      return response({ matches: [{ index: 0, sameProduct: false, view: "front" }, { index: 1, sameProduct: true, view: "back" }, { index: 1, sameProduct: true, view: "back" }] });
    },
    download: async url => ({ url, contentType: url.endsWith(".png") ? "image/png" : "text/html", bytes: url.endsWith("b.png") ? side : url.endsWith(".png") ? asset : Buffer.from('<script type="application/ld+json">{"@type":"Product","image":["https://www.nestle.com.br/a.png","https://www.nestle.com.br/b.png"]}</script>') }),
  });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].view, "back");
  assert.equal(result.candidates[0].kind, "real");
  assert.equal(result.candidates[0].sourceUrl, "https://www.nestle.com.br/kitkat");
  assert.ok(Buffer.from(result.candidates[0].previewDataUrl.split(",")[1], "base64").length <= 350_000);
});

test("arquivo invalido e rejeitado antes de enviar para a IA", async () => {
  await assert.rejects(analyzeProductPhoto(Buffer.from("not an image"), input, {
    apiKey: "test", model: "test", fetchImplementation: async () => { throw new Error("Nao deve chamar IA"); },
  }), /ler esta foto/);
});

test("referencia manual funciona sem busca e prioriza verso e lateral sem duplicatas", async () => {
  const assets = await Promise.all(["red", "blue", "green"].map(background => sharp({ create: { width: 800, height: 800, channels: 3, background } }).png().toBuffer()));
  let calls = 0;
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", referenceUrls: ["https://www.nestle.com.br/kitkat"],
    fetchImplementation: async () => {
      if (++calls === 1) return response(analysis);
      if (calls === 2) return new Response("", { status: 503 });
      return response({ matches: [{ index: 0, sameProduct: true, view: "front" }, { index: 1, sameProduct: true, view: "back" }, { index: 2, sameProduct: true, view: "side" }] });
    },
    download: async url => ({ url, contentType: url.endsWith(".png") ? "image/png" : "text/html", bytes: url.endsWith(".png") ? assets[Number(url.match(/(\d)\.png$/)?.[1]) % 3] : Buffer.from('<script type="application/ld+json">{"@type":"Product","image":["https://www.nestle.com.br/0.png","https://www.nestle.com.br/1.png","https://www.nestle.com.br/2.png","https://www.nestle.com.br/3.png"]}</script>') }),
  });
  assert.equal(calls, 3);
  assert.deepEqual(result.candidates.map(candidate => candidate.view), ["back", "side", "front"]);
});

test("arte gerada e normalizada para WebP e marcada como gerada", async () => {
  const bytes = await photo();
  const result = await generateProductArtwork(bytes, input, "editorial", {
    apiKey: "test", model: "test", fetchImplementation: async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: bytes.toString("base64") } }] } }] })),
  });
  assert.equal(result.kind, "generated");
  assert.match(result.previewDataUrl, /^data:image\/webp;base64,/);
  assert.equal(result.sourceUrl, undefined);
  const meta = await sharp(Buffer.from(result.previewDataUrl.split(",")[1], "base64")).metadata();
  assert.match(meta.xmp?.toString() ?? "", /trainedAlgorithmicMedia/);
});

test("analise nao cria um verso nem persiste arquivo quando nao ha fotos reais", async () => {
  let calls = 0;
  const result = await analyzeProductPhoto(await photo(), input, {
    apiKey: "test", model: "test", fetchImplementation: (async () => {
      calls++;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: calls === 1 ? JSON.stringify({ name: input.name, brand: "KitKat", ean: null, productType: "food", visibleView: "front", summary: "Frente da embalagem de chocolate.", warnings: [] }) : "Nenhuma fonte para fotos adicionais." }] } }] }));
    }),
    download: async () => { throw new Error("Nao deve baixar sem fontes"); },
  });
  assert.equal(result.analysis.productType, "food");
  assert.deepEqual(result.candidates, []);
  assert.ok(result.warnings.some(warning => /foto real/i.test(warning)));
});

test("arte solicita preservar embalagem e nao inventar angulos, preco ou alegacoes", () => {
  const prompt = buildArtworkPrompt(input, "editorial");
  assert.match(prompt, /nao.*verso.*lateral/i);
  assert.match(prompt, /nao.*preco/i);
  assert.match(prompt, /rotulos/i);
});

test("geracao sem imagem falha explicitamente e nao retorna sucesso vazio", async () => {
  await assert.rejects(generateProductArtwork(await photo(), input, "studio", {
    apiKey: "test", model: "test", fetchImplementation: (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Nao foi possivel gerar." }] } }] }))),
  }), /imagem/i);
});
