import assert from "node:assert/strict";
import test from "node:test";
import { cashbackSavedSchema, readCashbackResponse } from "./client";

const saved = { id: "product-1", cashbackEnabled: true, cashbackRateBps: 200, updatedAt: "2026-09-11T12:00:00.000Z" };

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
