import assert from "node:assert/strict";
import test from "node:test";
import { readShoppingContext, shoppingListHref, SHOPPING_CONTEXT_MAX_AGE } from "./shopping-context";

test("retorno permite listas públicas e preserva busca, filtros e página", () => {
  for (const href of ["/busca?q=sabonete+Rexona&marca=Rexona&ordem=preco-asc&pagina=3", "/catalogo?grupo=beauty&assunto=bath&ofertas=1", "/ofertas?marca=Rexona", "/categorias/higiene-e-beleza?pagina=2"]) {
    assert.equal(shoppingListHref(href), href);
    assert.deepEqual(readShoppingContext(JSON.stringify({ href, scrollY: 730, savedAt: 100 }), 200), { href, scrollY: 730, savedAt: 100 });
  }
});

test("retorno rejeita destinos privados/externos, parâmetros não públicos e estado inválido ou vencido", () => {
  for (const href of ["https://evil.test", "//evil.test", "/\\evil.test", "/admin", "/api/products", "/login", "/produto/item", "/catalogo?token=secret", "/busca?q=a&q=b", "/catalogo#item", "/categorias/%2e%2e/admin", "/catalogo?q=%00"]) assert.equal(shoppingListHref(href), null, href);
  for (const value of [null, "bad json", "{}", JSON.stringify({ href: "/catalogo", scrollY: -1, savedAt: 100 }), JSON.stringify({ href: "/catalogo", scrollY: 1, savedAt: 100 })]) assert.equal(readShoppingContext(value, SHOPPING_CONTEXT_MAX_AGE + 200), null);
  assert.equal(readShoppingContext(JSON.stringify({ href: "/catalogo", scrollY: 1, savedAt: 300 }), 200), null);
});
