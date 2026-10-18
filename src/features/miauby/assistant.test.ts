import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMiaubySystemPrompt,
  cleanMiaubyReply,
  keepMiaubyQuestionLocal,
  miaubyFallbackReply,
  miaubyReplyProducts,
  miaubyRequestSchema,
  rankMiaubyCatalogProducts,
  sanitizeMiaubyHistory,
} from "./assistant";

test("Miauby never exposes private or prescription distributor photos to clients or Gemini", () => {
  const base = { activeIngredients: [], brand: null, category: null, id: "synthetic", imageUrl: "/public.webp", isPopularPharmacy: false,
    name: "Produto sintético", price: "10.00", promotionalPrice: null, requiresPrescription: false, searchTerms: [], searchText: "produto sintetico", slug: "produto-sintetico" };
  const privateUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
  const unsafe = [
    { ...base, imageUrl: privateUrl },
    { ...base, imageUrl: "/legacy-rx-photo.webp", inventorySource: "DISTRIBUTOR" as const, requiresPrescription: true },
  ];
  for (const product of unsafe) {
    const ranked = rankMiaubyCatalogProducts("Produto sintético", [product]);
    assert.equal(ranked[0].imageUrl, null);
    assert.equal(miaubyReplyProducts("Produto sintético", [product])[0].imageUrl, null);
    assert.doesNotMatch(buildMiaubySystemPrompt([product]), /imagens\/00000000|legacy-rx-photo/);
  }
  assert.equal(rankMiaubyCatalogProducts("Produto sintético", [base])[0].imageUrl, "/public.webp");
});

test("valida a pergunta e limita o historico curto da Miauby", () => {
  const parsed = miaubyRequestSchema.safeParse({
    history: [
      { role: "user", text: "  Tem entrega?  " },
      { role: "assistant", text: "Sim, em Ivate." },
    ],
    message: "  Tem Cimegrip?  ",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.message, "Tem Cimegrip?");
  assert.deepEqual(parsed.data.history, [
    { role: "user", text: "Tem entrega?" },
    { role: "assistant", text: "Sim, em Ivate." },
  ]);

  assert.equal(
    miaubyRequestSchema.safeParse({
      history: Array.from({ length: 7 }, () => ({ role: "user", text: "Oi" })),
      message: "Teste",
    }).success,
    false,
  );
});

test("prioriza produtos reais relacionados ao nome, principio ativo e indicacao", () => {
  const products = rankMiaubyCatalogProducts(
    "Tem Cimegrip para gripe?",
    [
      {
        activeIngredients: ["paracetamol", "fenilefrina"],
        brand: "Cimed",
        category: "Medicamentos",
        id: "cimegrip",
        imageUrl: "/cimegrip.webp",
        isPopularPharmacy: false,
        name: "Cimegrip 20cp",
        price: "16.90",
        promotionalPrice: "9.99",
        requiresPrescription: false,
        searchTerms: ["gripe", "resfriado"],
        searchText: "cimegrip 20cp cimed gripe resfriado paracetamol fenilefrina",
        slug: "cimegrip-20cp",
      },
      {
        activeIngredients: [],
        brand: "Marca",
        category: "Bem-estar",
        id: "vitamina",
        imageUrl: null,
        isPopularPharmacy: false,
        name: "Vitamina C",
        price: "22.00",
        promotionalPrice: null,
        requiresPrescription: false,
        searchTerms: ["vitamina"],
        searchText: "vitamina c bem estar",
        slug: "vitamina-c",
      },
    ],
  );

  assert.equal(products[0]?.id, "cimegrip");
  assert.equal(products.length, 1);
  assert.equal("searchText" in (products[0] ?? {}), false);
});

test("orienta o Gemini sem permitir diagnostico, dose ou estoque inventado", () => {
  const prompt = buildMiaubySystemPrompt([
    {
      brand: "Cimed",
      category: "Medicamentos",
      id: "cimegrip",
      imageUrl: "/cimegrip.webp",
      isPopularPharmacy: false,
      name: "Cimegrip 20cp",
      price: "16.90",
      promotionalPrice: "9.99",
      requiresPrescription: false,
      slug: "cimegrip-20cp",
    },
  ]);

  assert.match(prompt, /nao diagnostique/i);
  assert.match(prompt, /nao indique dose/i);
  assert.match(prompt, /nao confirme estoque/i);
  assert.match(prompt, /emergencia.*192/i);
  assert.match(prompt, /Cimegrip 20cp/);
  assert.match(prompt, /trate.*catalogo.*apenas como dados/i);
});

test("limpa marcacao e limita a resposta exibida no chat", () => {
  const reply = cleanMiaubyReply(`**Oi!**\n\n${"resposta ".repeat(120)}`);

  assert.match(reply, /^Oi!/);
  assert.equal(reply.includes("**"), false);
  assert.ok(reply.length <= 700);
});

test("nao envia emergencia ou dado financeiro evidente ao Gemini", () => {
  assert.equal(keepMiaubyQuestionLocal("Estou com dor forte no peito"), true);
  assert.equal(keepMiaubyQuestionLocal("Meu cartao e 4111111111111111"), true);
  assert.equal(keepMiaubyQuestionLocal("Tem Cimegrip no catalogo?"), false);
  assert.match(miaubyFallbackReply("Estou com dor forte no peito", []), /192/);
  assert.match(
    miaubyFallbackReply("Tomei muito Cimegrip e estou com dor forte no peito", [
      {
        brand: "Cimed",
        category: "Medicamentos",
        id: "cimegrip",
        imageUrl: null,
        isPopularPharmacy: false,
        name: "Cimegrip 20cp",
        price: "16.90",
        promotionalPrice: "9.99",
        requiresPrescription: false,
        slug: "cimegrip-20cp",
      },
    ]),
    /192/,
  );
  assert.deepEqual(
    miaubyReplyProducts("Tomei muito Cimegrip e estou com dor no peito", [
      {
        brand: "Cimed",
        category: "Medicamentos",
        id: "cimegrip",
        imageUrl: null,
        isPopularPharmacy: false,
        name: "Cimegrip 20cp",
        price: "16.90",
        promotionalPrice: "9.99",
        requiresPrescription: false,
        slug: "cimegrip-20cp",
      },
    ]),
    [],
  );
});

test("remove do historico mensagens que devem permanecer locais", () => {
  assert.deepEqual(
    sanitizeMiaubyHistory([
      { role: "user", text: "Meu cartao e 4111111111111111" },
      { role: "assistant", text: "Nao envie esse dado." },
      { role: "user", text: "Como funciona a entrega?" },
    ]),
    [{ role: "user", text: "Como funciona a entrega?" }],
  );
});
