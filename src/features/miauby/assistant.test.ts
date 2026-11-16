import assert from "node:assert/strict";
import test from "node:test";
import { rankExactProductsForQuery } from "@/features/products/public-search";
import { pharmacyLegalDetails } from "@/lib/site";
import {
  buildMiaubySystemPrompt,
  cleanMiaubyReply,
  keepMiaubyQuestionLocal,
  miaubyCatalogQuery,
  miaubyFallbackReply,
  miaubyLocalAnswer,
  miaubyReplyProducts,
  miaubyRequestSchema,
  rankMiaubyCatalogProducts,
  sanitizeMiaubyHistory,
} from "./assistant";

test("Miauby consulta a mesma apresentação Dove com linguagem comercial ou EAN", () => {
  const products = [
    { id: "90g", name: "Sabonete Dove Original 90g", brand: "Dove", ean: "7891150023710", searchText: "sabonete dove original 90g" },
    { id: "135g", name: "Sabonete Dove Original 135g", brand: "Dove", searchText: "sabonete dove original 135g" },
  ];
  const doveResults = rankExactProductsForQuery(products, "sabonete Dove");
  assert.equal(doveResults.length, 2);
  for (const message of ["Qual o preço do sabonete Dove?", "Você tem sabonete Dove?"]) {
    const query = miaubyCatalogQuery(message);
    assert.ok(query, message);
    assert.deepEqual(rankExactProductsForQuery(products, query), doveResults, message);
  }
  for (const message of [
    "Sabonete Dove Original 90g",
    "Os sabonetes Dove Original 90g, por favor?",
    "O preço do sabonete Dove 90g?",
    "Tem sabonete Dove 90g disponível?",
    "Tem o sabonete Dove Original 90g disponível?",
    "7891150023710",
    "EAN: 7891150023710",
    "EAN: 7891150023710.",
    "Código de barras 7891150023710, por favor",
  ]) {
    const query = miaubyCatalogQuery(message);
    assert.ok(query, message);
    assert.deepEqual(rankExactProductsForQuery(products, query), [products[0]], message);
  }
  assert.match(miaubyLocalAnswer("EAN: 7891150023711") ?? "", /EAN.*válido/u);
  assert.match(miaubyLocalAnswer("7891150023711") ?? "", /EAN.*válido/u);
  assert.equal(miaubyCatalogQuery("Quanto custa o produto Exemplo 2,5 mg/mL 100 mL?"), "produto Exemplo 2,5 mg/mL 100 mL");
});

test("Miauby remove o verbo Tem sem cortar nomes de medicamentos", () => {
  for (const product of ["Tempra", "Temodal", "Temozolomida"]) {
    assert.equal(miaubyCatalogQuery(product), product);
    assert.equal(miaubyCatalogQuery(`Tem ${product}?`), product);
  }
});

test("Miauby consulta preços de itens não medicamentosos e mantém triagem sensível", () => {
  for (const [message, query] of [
    ["Qual o preço da fralda para bebê Huggies M?", "fralda para bebê Huggies M"],
    ["O preço da fralda para bebê Huggies M?", "fralda para bebê Huggies M"],
    ["Tem fralda para bebê Huggies M?", "fralda para bebê Huggies M"],
    ["Sabonete para bebê", "Sabonete para bebê"],
    ["Quanto custa o termômetro digital para bebê?", "termômetro digital para bebê"],
    ["Qual o preço do medidor de pressão Omron?", "medidor de pressão Omron"],
  ]) {
    assert.equal(miaubyLocalAnswer(message), null, message);
    assert.equal(miaubyCatalogQuery(message), query);
  }
  for (const [message, reply] of [
    ["Qual o preço da fralda para bebê? Meu bebê está com falta de ar", /192/],
    ["Qual o preço da fralda para bebê? Meu CPF é 00000000000", /Por segurança/],
    ["Qual o preço da fralda para bebê e como usar?", /farmacêutico/],
    ["Preço de fralda e dipirona para bebê", /farmacêutico/],
    ["Preço de fralda para bebê com dipirona", /farmacêutico/],
    ["Preço de fralda para bebê dipirona", /farmacêutico/],
    ["Preço de fralda para bebê posso dar dipirona", /farmacêutico/],
    ["Quanto custa dipirona para bebê?", /farmacêutico/],
    ["Tem dipirona para bebê?", /farmacêutico/],
    ["Posso dar um medicamento ao bebê?", /farmacêutico/],
    ["Sabonete para bebê com alergia", /farmacêutico/],
    ["Estou com febre e quero o preço do sabonete para bebê", /farmacêutico/],
    ["Preço do medidor de pressão alta", /farmacêutico/],
    ["Preço do medidor de pressão arterial alta", /farmacêutico/],
    ["Preço do medidor de pressão arterial baixa", /farmacêutico/],
    ["Quanto custa o medidor de pressão Omron para hipertensão?", /farmacêutico/],
    ["Quanto custa o medidor de pressão Omron e a losartana?", /farmacêutico/],
    ["Quanto custa o medidor de pressão Omron? Estou com dor no peito", /192/],
    ["Quanto custa o medidor de pressão Omron? Meu CPF é 00000000000", /Por segurança/],
  ] as const) {
    assert.match(miaubyLocalAnswer(message) ?? "", reply, message);
    assert.equal(miaubyCatalogQuery(message), null);
  }
});

test("Miauby responde a saudações e horário sem buscar ou afirmar abertura atual", () => {
  for (const message of ["Oi, tudo bem?", "Bom dia, Miauby!"]) {
    assert.match(miaubyLocalAnswer(message) ?? "", /Olá!/u);
    assert.equal(miaubyCatalogQuery(message), null);
  }
  for (const message of ["Qual é o horário de funcionamento?", "Qual horário vocês abrem?", "Qual o horário aos domingos?", "Vocês estão abertos?", "Está aberta agora?", "Que horas fecha hoje?", "Abre no domingo?", "Funciona no feriado?", "Qual é o plantão?"]) {
    const reply = miaubyLocalAnswer(message) ?? "";
    assert.ok(pharmacyLegalDetails.openingHours && reply.includes(pharmacyLegalDetails.openingHours), message);
    assert.match(reply, /equipe/u);
    assert.equal(miaubyCatalogQuery(message), null);
  }
  assert.ok(miaubyLocalAnswer("Qual o horário?")?.includes(pharmacyLegalDetails.openingHours ?? ""));
  assert.match(miaubyLocalAnswer("Qual o horário de entrega?") ?? "", /CEP/u);
  for (const message of ["Qual o melhor horário da dipirona?", "Qual o horário que devo tomar dipirona?", "Qual o horário do antibiótico?", "Que horas devo tomar dipirona?"]) {
    assert.match(miaubyLocalAnswer(message) ?? "", /farmacêutico/u, message);
    assert.equal(miaubyCatalogQuery(message), null);
  }
  assert.equal(miaubyCatalogQuery("Bom dia, qual o preço do sabonete Dove?"), "sabonete Dove");
});

test("Miauby never exposes private image URLs and preserves approved public photos", () => {
  const base = { activeIngredients: [], brand: null, category: null, id: "synthetic", imageUrl: "/public.webp", isPopularPharmacy: false,
    name: "Produto sintético", price: "10.00", promotionalPrice: null, requiresPrescription: false, searchTerms: [], searchText: "produto sintetico", slug: "produto-sintetico" };
  const privateUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
  const unsafe = [
    { ...base, imageUrl: privateUrl },
  ];
  for (const product of unsafe) {
    const ranked = rankMiaubyCatalogProducts("Produto sintético", [product]);
    assert.equal(ranked[0].imageUrl, null);
    assert.equal(miaubyReplyProducts("Produto sintético", [product])[0].imageUrl, null);
    assert.doesNotMatch(buildMiaubySystemPrompt([product]), /imagens\/00000000|legacy-rx-photo/);
  }
  assert.equal(rankMiaubyCatalogProducts("Produto sintético", [base])[0].imageUrl, "/public.webp");
  const approved = { ...base, imageUrl: "/uploads/products/approved.webp", inventorySource: "DISTRIBUTOR" as const, requiresPrescription: true };
  assert.equal(rankMiaubyCatalogProducts("Produto sintético", [approved])[0].imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.equal(miaubyReplyProducts("Produto sintético", [approved])[0].imageUrl, "/brand/medicamento-ilustrativo.webp");
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
