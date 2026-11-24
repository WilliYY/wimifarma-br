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

test("Correios requires authenticated automatic insurance covering the full value below declared-value minimum", async () => {
  const config = getCorreiosConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" })!;
  for (const coverage of ["25,63", "12,99", "12,98", "0,00", "25.63", undefined, null, 2563, "invalid"]) {
    const request: typeof fetch = async target => {
      const url = new URL(String(target));
      const code = url.pathname.split("/").at(-1);
      if (url.pathname.includes("servicos-adicionais")) return json([{ codigo: code === "03298" ? "064" : "019", vlMinDeclarado: 25.63, vlMaxDeclarado: 4668.29 }]);
      if (url.pathname.startsWith("/prazo/")) return json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: "S" });
      assert.equal(url.searchParams.has("servicosAdicionais"), false);
      assert.equal(url.searchParams.has("vlDeclarado"), false);
      return json({ coProduto: code, pcFinal: "10,50", vlSeguroAutomatico: coverage });
    };
    const result = await quoteCorreios(config, { ...input, insuranceValueCents: 1299 }, request);
    const covered = coverage === "25,63" || coverage === "12,99";
    assert.equal(result.quotes.length, covered ? 2 : 0, String(coverage));
    if (covered) assert.deepEqual(result.quotes.map(quote => quote.insuranceMode), ["automatic", "automatic"]);
  }
});

test("Correios keeps the declared-value boundary and never falls back above the maximum", async () => {
  const config = getCorreiosConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" })!;
  let priceCalls = 0;
  const request: typeof fetch = async target => {
    const url = new URL(String(target));
    const code = url.pathname.split("/").at(-1);
    const addition = code === "03298" ? "064" : "019";
    if (url.pathname.includes("servicos-adicionais")) return json([{ codigo: addition, vlMinDeclarado: 25.63, vlMaxDeclarado: 100 }]);
    if (url.pathname.startsWith("/prazo/")) return json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: "S" });
    priceCalls++;
    assert.equal(url.searchParams.get("servicosAdicionais"), addition);
    assert.equal(url.searchParams.get("vlDeclarado"), "25.63");
    return json({ coProduto: code, pcFinal: "10,50", servicoAdicional: [{ coServAdicional: addition }] });
  };
  const atMinimum = await quoteCorreios(config, { ...input, insuranceValueCents: 2563 }, request);
  assert.equal(atMinimum.quotes.length, 2);
  assert.ok(atMinimum.quotes.every(quote => !("insuranceMode" in quote)));
  assert.equal(priceCalls, 2);
  assert.equal((await quoteCorreios(config, { ...input, insuranceValueCents: 10001 }, request)).quotes.length, 0);
  assert.equal(priceCalls, 2);
});

test("automatic insurance preserves service isolation and all normal quote validations", async () => {
  const config = getCorreiosConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" })!;
  for (const failure of ["coverage", "price", "identity", "delivery", "deadline", "http"]) {
    const request: typeof fetch = async target => {
      const url = new URL(String(target));
      const code = url.pathname.split("/").at(-1);
      if (url.pathname.includes("servicos-adicionais")) return json([{ codigo: code === "03298" ? "064" : "019", vlMinDeclarado: 25.63, vlMaxDeclarado: 100 }]);
      const failing = code === "03298";
      if (url.pathname.startsWith("/prazo/")) return json({ coProduto: code, prazoEntrega: failing && failure === "deadline" ? -1 : 3, entregaDomiciliar: failing && failure === "delivery" ? "N" : "S" });
      if (failing && failure === "http") return json({}, 503);
      return json({ coProduto: failing && failure === "identity" ? "03220" : code,
        pcFinal: failing && failure === "price" ? "invalid" : "10,50", vlSeguroAutomatico: failing && failure === "coverage" ? "12,98" : "25,63" });
    };
    const result = await quoteCorreios(config, { ...input, insuranceValueCents: 1299 }, request);
    assert.deepEqual(result.quotes, [{ code: "03220", name: "SEDEX", priceCents: 1050, deliveryDays: 3, insuranceMode: "automatic" }], failure);
    assert.deepEqual(result.unavailableServices, ["03298"], failure);
  }
});

test("Correios credentials require the card and accept the optional contract and DR as a pair", () => {
  assert.equal(getCorreiosConfig({}), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_POSTING_CARD: "abc" }), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_CONTRACT_NUMBER: "0000234567" }), null);
  assert.equal(getCorreiosConfig({ ...env, CORREIOS_REGIONAL_DIRECTORATE: "08" }), null);
  assert.ok(getCorreiosConfig(env));
  assert.ok(getCorreiosConfig({ ...env, CORREIOS_CONTRACT_NUMBER: "0000234567", CORREIOS_REGIONAL_DIRECTORATE: "08" }));
});

test("Correios rejects malformed delegated keys and mixed authentication modes", () => {
  const delegated = { CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-delegated.key" };
  assert.ok(getCorreiosConfig(delegated));
  assert.equal(getCorreiosConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "Bearer synthetic-delegated.key" }), null);
  assert.equal(getCorreiosConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "synthetic\r\nkey" }), null);
  assert.equal(getCorreiosConfig({ ...delegated, CORREIOS_API_USER: env.CORREIOS_API_USER }), null);
  assert.equal(getCorreiosConfig({ ...delegated, CORREIOS_API_CODE: env.CORREIOS_API_CODE }), null);
  assert.equal(getCorreiosConfig({ ...delegated, CORREIOS_POSTING_CARD: env.CORREIOS_POSTING_CARD }), null);
  assert.equal(getCorreiosConfig({ ...delegated, CORREIOS_CONTRACT_NUMBER: "0000234567" }), null);
  assert.ok(getCorreiosConfig({ ...env, CORREIOS_DELEGATED_ACCESS_KEY: "" }));
});

test("Correios sends a delegated key directly to the price and deadline APIs", async () => {
  const config = getCorreiosConfig({
    CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-delegated.key",
    CORREIOS_CONTRACT_NUMBER: "0000234567",
    CORREIOS_REGIONAL_DIRECTORATE: "08",
  });
  assert.ok(config);
  const paths: string[] = [];
  const request: typeof fetch = async (target, init) => {
    const url = new URL(String(target));
    paths.push(url.pathname);
    assert.equal(url.origin, "https://api.correios.com.br");
    assert.equal(init?.method, "GET");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer synthetic-delegated.key");
    const code = url.pathname.split("/").at(-1);
    if (url.pathname.startsWith("/preco/")) {
      assert.equal(url.searchParams.get("nuContrato"), "0000234567");
      assert.equal(url.searchParams.get("nuDR"), "08");
      return json({ coProduto: code, pcFinal: "10,50" });
    }
    assert.equal(url.searchParams.has("nuContrato"), false);
    return json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: "S" });
  };
  assert.deepEqual(await quoteCorreios(config, input, request), {
    quotes: [
      { code: "03220", name: "SEDEX", priceCents: 1050, deliveryDays: 3 },
      { code: "03298", name: "PAC", priceCents: 1050, deliveryDays: 3 },
    ],
    unavailableServices: [],
  });
  assert.deepEqual(paths.sort(), ["/prazo/v1/nacional/03220", "/prazo/v1/nacional/03298", "/preco/v1/nacional/03220", "/preco/v1/nacional/03298"]);
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
