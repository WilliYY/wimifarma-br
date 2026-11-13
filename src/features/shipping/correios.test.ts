import assert from "node:assert/strict";
import test from "node:test";
import { CorreiosError, getCorreiosConfig, quoteCorreios } from "./correios";

const env = {
  CORREIOS_API_USER: "synthetic-id",
  CORREIOS_API_CODE: "synthetic-code",
  CORREIOS_POSTING_CARD: "0000123456",
};
const input = {
  originPostalCode: "87525000",
  destinationPostalCode: "01001-001",
  weightGrams: 500.1,
  lengthCm: 20.1,
  widthCm: 15,
  heightCm: 10,
};
const tokenPath = "/token/v1/autentica/cartaopostagem";
const json = (value: unknown, status = 200) => Response.json(value, { status });

test("Correios credentials require the card and accept the optional contract and DR as a pair", () => {
  assert.equal(getCorreiosConfig({}), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_POSTING_CARD: "abc" }), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_CONTRACT_NUMBER: "0000234567" }), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_REGIONAL_DIRECTORATE: "08" }), null);
  assert.ok(getCorreiosConfig(env));
  assert.ok(getCorreiosConfig({ ...env, CORREIOS_CONTRACT_NUMBER: "0000234567", CORREIOS_REGIONAL_DIRECTORATE: "08" }));
});

test("Correios quotes PAC and SEDEX with the card token, postal codes and parcel measurements", async () => {
  const config = getCorreiosConfig({ ...env, CORREIOS_CONTRACT_NUMBER: "0000234567", CORREIOS_REGIONAL_DIRECTORATE: "08" });
  assert.ok(config);
  const paths: string[] = [];
  const request: typeof fetch = async (target, init) => {
    const url = new URL(String(target));
    const headers = new Headers(init?.headers);
    paths.push(url.pathname);
    assert.equal(url.origin, "https://api.correios.com.br");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(headers.get("accept"), "application/json");
    if (url.pathname === tokenPath) {
      assert.equal(init?.method, "POST");
      assert.equal(headers.get("authorization"), `Basic ${Buffer.from("synthetic-id:synthetic-code").toString("base64")}`);
      assert.deepEqual(JSON.parse(String(init?.body)), { numero: "0000123456", contrato: "0000234567", dr: 8 });
      return json({ token: "synthetic.token" }, 201);
    }

    assert.equal(init?.method, "GET");
    assert.equal(headers.get("authorization"), "Bearer synthetic.token");
    const code = url.pathname.split("/").at(-1);
    const postalCodes = { cepOrigem: "87525000", cepDestino: "01001001" };
    if (url.pathname.startsWith("/preco/")) {
      assert.deepEqual(Object.fromEntries(url.searchParams), {
        ...postalCodes, psObjeto: "501", tpObjeto: "2", comprimento: "21", largura: "15", altura: "10", nuContrato: "0000234567", nuDR: "08",
      });
      return json({ coProduto: code, pcFinal: code === "03220" ? "1.234,56" : "10,50" });
    }

    assert.deepEqual(Object.fromEntries(url.searchParams), postalCodes);
    return json({ coProduto: code, prazoEntrega: code === "03220" ? 2 : 5, entregaDomiciliar: "S" });
  };

  assert.deepEqual(await quoteCorreios(config, input, request), {
    quotes: [
      { code: "03220", name: "SEDEX", priceCents: 123456, deliveryDays: 2 },
      { code: "03298", name: "PAC", priceCents: 1050, deliveryDays: 5 },
    ],
    unavailableServices: [],
  });
  assert.equal(paths[0], tokenPath);
  assert.deepEqual(new Set(paths.slice(1)), new Set(["/preco/v1/nacional/03220", "/prazo/v1/nacional/03220", "/preco/v1/nacional/03298", "/prazo/v1/nacional/03298"]));
});

test("Correios preserves a valid service when the other service fails or cannot deliver to the address", async () => {
  const config = getCorreiosConfig(env);
  assert.ok(config);
  for (const rejected of [
    () => json({ detail: "private response" }, 403),
    () => json({ coProduto: "03298", pcFinal: "1,00bad" }),
    () => json({ coProduto: "03298", pcFinal: "10.50" }),
    () => json({ coProduto: "03220", pcFinal: "10,50" }),
  ]) {
    const request: typeof fetch = async (target, init) => {
      const url = new URL(String(target));
      if (url.pathname === tokenPath) {
        assert.deepEqual(JSON.parse(String(init?.body)), { numero: "0000123456" });
        return json({ token: "synthetic.token" }, 201);
      }
      const code = url.pathname.split("/").at(-1);
      if (url.pathname.startsWith("/prazo/")) return json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: "S" });
      assert.equal(url.searchParams.has("nuContrato"), false);
      assert.equal(url.searchParams.has("nuDR"), false);
      return code === "03220" ? json({ coProduto: code, pcFinal: "12,34" }) : rejected();
    };
    assert.deepEqual(await quoteCorreios(config, input, request), {
      quotes: [{ code: "03220", name: "SEDEX", priceCents: 1234, deliveryDays: 3 }],
      unavailableServices: ["03298"],
    });
  }

  const noHomeDelivery: typeof fetch = async (target) => {
    const { pathname } = new URL(String(target));
    const code = pathname.split("/").at(-1);
    if (pathname === tokenPath) return json({ token: "synthetic.token" }, 201);
    if (pathname.startsWith("/preco/")) return json({ coProduto: code, pcFinal: "12,34" });
    return json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: code === "03298" ? "N" : "S" });
  };
  assert.deepEqual((await quoteCorreios(config, input, noHomeDelivery)).unavailableServices, ["03298"]);

  const pickupOnly: typeof fetch = async (target, init) => {
    const { pathname } = new URL(String(target));
    if (pathname.startsWith("/prazo/")) {
      return json({ coProduto: pathname.split("/").at(-1), prazoEntrega: 3, entregaDomiciliar: "N" });
    }
    return noHomeDelivery(target, init);
  };
  assert.deepEqual(await quoteCorreios(config, input, pickupOnly), {
    quotes: [],
    unavailableServices: ["03220", "03298"],
  });
});

test("Correios exposes safe errors for refused credentials, malformed quotes and outages", async () => {
  const config = getCorreiosConfig(env);
  assert.ok(config);
  const check = (status: number) => (error: unknown) => {
    assert.ok(error instanceof CorreiosError);
    assert.equal(error.status, status);
    assert.doesNotMatch(String(error), /private|synthetic|Bearer/);
    assert.equal(error.cause, undefined);
    return true;
  };

  await assert.rejects(quoteCorreios(config, input, async () => json({ msg: "private error" }, 401)), check(503));
  await assert.rejects(quoteCorreios(config, input, async (target) => {
    if (new URL(String(target)).pathname === tokenPath) return json({ token: "synthetic.token" }, 201);
    return new Response("private invalid data", { status: 200 });
  }), check(502));
  await assert.rejects(quoteCorreios(config, input, async () => { throw new Error("private outage"); }), check(503));
});
