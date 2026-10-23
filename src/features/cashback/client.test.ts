import assert from "node:assert/strict";
import test from "node:test";
import { CashbackSessionError, cashbackSavedSchema, readCashbackResponse, selectCashbackProducts, createCashbackBulkUpdate, confirmCashbackBulkResponse, type CashbackListProduct } from "./client";

const saved = { id: "product-1", cashbackEnabled: true, cashbackRateBps: 200, updatedAt: "2026-09-11T12:00:00.000Z" };
const product = (id: string, extra = {}): CashbackListProduct => ({ ...saved, id, name: id, brand: null, imageUrl: null, status: "ACTIVE", price: "10", promotionalPrice: null, requiresPrescription: false, isPopularPharmacy: false, ...extra });

test("cashback lote seleciona somente visíveis elegíveis, sem duplicar e até 50", () => {
  const products = Array.from({ length: 100 }, (_, i) => product(String(i)));
  products[0].requiresPrescription = true;
  products[1].isPopularPharmacy = true;
  const selected = selectCashbackProducts(products.map(p => p.id).concat("hidden", "2"), products);
  assert.equal(selected.length, 50);
  assert.deepEqual(selected.slice(0, 2), ["2", "3"]);
  assert.deepEqual(selectCashbackProducts(selected, [products[90]]), []);
});

test("cashback lote usa revisões atuais e somente mudanças financeiras explícitas", () => {
  const products = [product("a"), product("b")];
  assert.deepEqual(createCashbackBulkUpdate(products, true, 235), { items: products.map(p => ({ id: p.id, expectedUpdatedAt: p.updatedAt })), changes: { cashbackEnabled: true, cashbackRateBps: 235 } });
  assert.deepEqual(createCashbackBulkUpdate(products, false).changes, { cashbackEnabled: false });
  for (const items of [[], [product("a"), product("a")], [product("rx", { requiresPrescription: true })], [product("fp", { isPopularPharmacy: true })], Array.from({ length: 51 }, (_, i) => product(String(i)))]) assert.throws(() => createCashbackBulkUpdate(items, true, 200));
  for (const rate of [0, 10001, NaN]) assert.throws(() => createCashbackBulkUpdate(products, true, rate));
});

test("cashback lote exige resposta completa e os mesmos ids antes de confirmar", async () => {
  const body = createCashbackBulkUpdate([product("a"), product("b")], false);
  const data = body.items.map(p => ({ id: p.id, updatedAt: saved.updatedAt }));
  await confirmCashbackBulkResponse(Response.json({ data: [...data].reverse(), count: 2 }), body);
  for (const payload of [{ data, count: 1 }, { data: [data[0], data[0]], count: 2 }, { data: [{ ...data[0], id: "other" }, data[1]], count: 2 }, { data: data.slice(0, 1), count: 2 }, {}]) await assert.rejects(confirmCashbackBulkResponse(Response.json(payload), body), /confirmar/);
  await assert.rejects(confirmCashbackBulkResponse(new Response("", { status: 503 }), body), /indisponivel/);
});

test("cashback identifica sessao revogada para oferecer novo login", async () => {
  await assert.rejects(readCashbackResponse(new Response("", { status: 401 }), cashbackSavedSchema), CashbackSessionError);
});

test("cashback exige confirmacao valida antes de mostrar sucesso", async () => {
  assert.deepEqual(await readCashbackResponse(Response.json({ data: saved }), cashbackSavedSchema), { data: saved });
  for (const body of ["", "<html>Bad gateway</html>", "{", "null", "{}", '{"data":{}}']) {
    await assert.rejects(readCashbackResponse(new Response(body), cashbackSavedSchema), /confirmar.*Atualize/);
  }
});

test("cashback traduz resposta vazia, sessao expirada e conflito sem vazar JSON tecnico", async () => {
  for (const status of [500, 502, 503]) {
    await assert.rejects(readCashbackResponse(new Response("", { status }), cashbackSavedSchema), /indisponivel/);
  }
  await assert.rejects(readCashbackResponse(new Response("", { status: 401 }), cashbackSavedSchema), /sessao.*Entre/);
  await assert.rejects(readCashbackResponse(Response.json({ error: "Produto alterado. Atualize a lista." }, { status: 409 }), cashbackSavedSchema), /Produto alterado/);
  await assert.rejects(readCashbackResponse(new Response("", { status: 429 }), cashbackSavedSchema), /Aguarde/);
});
