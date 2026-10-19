import assert from "node:assert/strict";
import test from "node:test";
import { restockContactLinks } from "./restock-contact";

test("aviso mantém assunto genérico, destinatários escolhidos e URL da própria loja", () => {
  const links = restockContactLinks({ phone: "5544999990000", email: "cliente@example.com", slug: "produto-sintetico-20-mg" });
  const whatsapp = new URL(links.whatsapp!);
  assert.equal(whatsapp.host, "wa.me");
  assert.equal(whatsapp.pathname, "/5544999990000");
  assert.match(whatsapp.searchParams.get("text")!, /https:\/\/wimifarma\.com\.br\/produto\/produto-sintetico-20-mg/);
  const email = new URL(links.email!);
  assert.equal(email.searchParams.get("subject"), "Seu aviso de disponibilidade — Wimifarma");
  assert.doesNotMatch(email.searchParams.get("subject")!, /20 mg|sintetico/);
  assert.equal(email.pathname, "cliente@example.com");
  assert.match(email.searchParams.get("body")!, /Confira o preço e o estoque atual/);
});

test("contato ausente não gera link e dados inseguros não viram destinatário ou cabeçalho", () => {
  assert.deepEqual(restockContactLinks({ phone: null, email: null, slug: "seguro" }), { whatsapp: null, email: null });
  const invalid = restockContactLinks({ phone: "55;alert(1)", email: "a@example.com\r\nBcc:outro@example.com", slug: "seguro" });
  assert.equal(invalid.email, null);
  assert.equal(invalid.whatsapp, null);
  assert.deepEqual(restockContactLinks({ phone: "5544999990000", email: "a@example.com", slug: "//outro.example/segredo" }), { whatsapp: null, email: null });
});

test("um canal não escolhido não é incluído no aviso", () => {
  const links = restockContactLinks({ phone: null, email: "cliente@example.com", slug: "produto" });
  assert.equal(links.whatsapp, null);
  assert.ok(links.email?.startsWith("mailto:"));
});
