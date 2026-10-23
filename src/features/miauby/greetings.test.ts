import assert from "node:assert/strict";
import test from "node:test";
import { claimMiaubyNotice, miaubyRouteTip, safeMiaubyFirstName } from "./greetings";

test("saudação aceita apenas primeiro nome curto, nunca e-mail ou marcação", () => {
  assert.equal(safeMiaubyFirstName("  Ana Maria  "), "Ana");
  assert.equal(safeMiaubyFirstName("João da Silva"), "João");
  for (const name of [null, "", "ana@example.test", "Ana <script>", "A".repeat(25), "123456789", "Ana\nMaria"]) {
    assert.equal(safeMiaubyFirstName(name), null);
  }
});

test("dicas usam somente a categoria pública da rota", () => {
  assert.match(miaubyRouteTip("/catalogo")?.text ?? "", /catálogo/);
  assert.match(miaubyRouteTip("/produto/exemplo")?.text ?? "", /produto/);
  assert.match(miaubyRouteTip("/carrinho")?.text ?? "", /carrinho/);
  assert.equal(miaubyRouteTip("/minha-conta"), null);
  assert.deepEqual(miaubyRouteTip("/produto/a"), miaubyRouteTip("/produto/b"));
});

test("avisos limitados por aba e identidade guardam somente marcadores", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(claimMiaubyNotice(storage, "opaque-a", "welcome"), true);
  assert.equal(claimMiaubyNotice(storage, "opaque-a", "welcome"), false);
  assert.equal(claimMiaubyNotice(storage, "opaque-b", "welcome"), true);
  assert.equal(claimMiaubyNotice(storage, "opaque-b", "catalog"), true);
  assert.equal(claimMiaubyNotice(storage, "opaque-b", "product"), true);
  assert.equal(claimMiaubyNotice(storage, "opaque-b", "cart"), true);
  assert.equal(claimMiaubyNotice(storage, "opaque-c", "catalog"), false);
  assert.equal(claimMiaubyNotice(storage, "opaque-c", "welcome"), true, "Login recebe boas-vindas mesmo após três dicas");
  for (let index = 0; index < 5; index++) assert.equal(claimMiaubyNotice(storage, `opaque-${index}`, "welcome"), true);
  assert.equal(claimMiaubyNotice(storage, "overflow", "welcome"), false, "Armazenamento de identidades é limitado");
  assert.equal([...values.values()].some(value => /Ana|mensagem|produto/.test(value)), false);
});

test("storage bloqueado ou corrompido não impede atendimento", () => {
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(claimMiaubyNotice(blocked, "opaque", "welcome"), false);
  assert.equal(claimMiaubyNotice({ getItem: () => "{", setItem: () => {} }, "opaque", "welcome"), false);
});
