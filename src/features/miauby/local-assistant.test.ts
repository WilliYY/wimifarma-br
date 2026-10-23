import assert from "node:assert/strict";
import test from "node:test";
import { miaubyCatalogQuery, miaubyLocalAnswer } from "./assistant";

test("extrai consulta comercial sem alterar números, apresentação ou identificadores", () => {
  for (const [message, expected] of [
    ["Qual é o preço da losartana 50mg?", "losartana 50mg"],
    ["Quero saber o valor da Tadalaflia 20 mg 4 comp., por favor", "Tadalaflia 20 mg 4 comp."],
    ["Oi, quanto custa o bisoprolol 2,5mg?", "bisoprolol 2,5mg"],
    ["Vocês têm Dove?", "Dove"],
    ["7891234567890", "7891234567890"],
    ["SKU-10/20", "SKU-10/20"],
  ]) assert.equal(miaubyCatalogQuery(message), expected);
});

test("preço sem produto retoma somente consulta pública explícita do usuário", () => {
  assert.equal(miaubyCatalogQuery("Quanto custa?"), null);
  assert.equal(miaubyCatalogQuery("E o preço?", [{ role: "user", text: "Tem losartana 50mg?" }, { role: "assistant", text: "Confira o produto." }]), "losartana 50mg");
  assert.equal(miaubyCatalogQuery("E o preço?", [{ role: "assistant", text: "losartana 100mg" }]), null);
  assert.equal(miaubyCatalogQuery("E o preço?", [{ role: "user", text: "Tenho dor no peito e queria losartana" }]), null);
  assert.equal(miaubyCatalogQuery("e a de 25mg?", [{ role: "user", text: "losartana 50mg" }]), null);
});

test("saudações e orientações do site ficam locais, sem busca ou promessas falsas", () => {
  for (const message of ["Olá!", "obrigado", "Consultar preço de um produto", "Quero encontrar um produto", "Como funciona a entrega?", "Tem desconto no Pix?", "Como acompanho meu pedido?", "Farmácia Popular"]) {
    assert.ok(miaubyLocalAnswer(message), message);
    assert.equal(miaubyCatalogQuery(message), null, message);
  }
  assert.match(miaubyLocalAnswer("Tem desconto no Pix?")!, /3%.*checkout/i);
  assert.match(miaubyLocalAnswer("Como acompanho meu pedido?")!, /minha conta/i);
  assert.equal(miaubyLocalAnswer("preço do sabonete Dove"), null);
});

test("contexto clínico e dados privados nunca geram consulta nem oferta", () => {
  for (const message of ["Estou com febre, tem dipirona?", "Posso tomar losartana?", "Qual remédio para tosse?", "Como usar o creme?", "Loratadina para meu filho", "Substituir losartana por outro mais barato", "Meu CPF é 12345678901", "Qual o pedido do cliente 123?", "dor de cabeça", "pressão alta"]) {
    assert.ok(miaubyLocalAnswer(message), message);
    assert.equal(miaubyCatalogQuery(message), null, message);
  }
  assert.match(miaubyLocalAnswer("Falta de ar e dor no peito")!, /192/);
  assert.equal(miaubyCatalogQuery("x".repeat(81)), null);
});
