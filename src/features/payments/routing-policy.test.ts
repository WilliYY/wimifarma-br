import assert from "node:assert/strict";
import test from "node:test";
import { choosePaymentRoute } from "./routing-policy";
const now = Date.parse("2026-10-08T12:00:00Z");
const connections = [
  { id: "mercado-pago", accountId: "mp-account", enabled: true, environment: "production", methods: ["pix", "card"] },
  { id: "asaas", accountId: "asaas-account", enabled: true, environment: "production", methods: ["pix", "card"] },
];
const rule = (provider: "asaas" | "mercado-pago", percentageBps: number) => ({ id: provider, provider,
  accountId: `${provider === "asaas" ? "asaas" : "mp"}-account`, processingMode: provider === "asaas" ? "hosted-card" : "orders",
  method: "card", currency: "BRL", fixedCents: 0, percentageBps, minInstallments: 1, maxInstallments: 1,
  zeroInterestInstallments: 1, settlementDays: 30, checkedAt: new Date(now - 1000).toISOString(),
  validUntil: new Date(now + 60_000).toISOString(), source: "https://example.com/contract" });
test("seleciona menor custo apenas com taxas atuais de ambas as contas e modalidades", () => {
  assert.deepEqual(choosePaymentRoute({ amountCents: 10000, method: "card", installments: 1 }, connections, [rule("mercado-pago", 499), rule("asaas", 299)], now),
    { provider: "asaas", reason: "confirmed-fees", ruleId: "asaas", feeCents: 299 });
});
test("taxa ausente, vencida ou de outra conta não afirma menor custo e conserva Mercado Pago", () => {
  for (const rules of [[rule("asaas", 1)], [rule("asaas", 1), { ...rule("mercado-pago", 500), accountId: "other" }],
    [rule("mercado-pago", 500), { ...rule("asaas", 1), validUntil: new Date(now - 1).toISOString() }]]) {
    assert.equal(choosePaymentRoute({ amountCents: 10000, method: "card", installments: 1 }, connections, rules, now).provider, "mercado-pago");
  }
});
test("Asaas hospedado não captura parcelamento nem valor abaixo do mínimo", () => {
  for (const input of [{ amountCents: 499, method: "card" as const, installments: 1 }, { amountCents: 10000, method: "card" as const, installments: 3 }]) {
    assert.equal(choosePaymentRoute(input, connections, [rule("mercado-pago", 499), rule("asaas", 1)], now).provider, "mercado-pago");
  }
});
test("Sandbox, integração desativada e instrumento não homologado ficam fora do público", () => {
  const route = choosePaymentRoute({ amountCents: 10000, method: "pix", installments: 1 },
    [connections[0], { ...connections[1], methods: ["card"] }], [], now);
  assert.equal(route.provider, "mercado-pago");
  assert.throws(() => choosePaymentRoute({ amountCents: 10000, method: "pix", installments: 1 },
    [{ ...connections[0], enabled: false }, { ...connections[1], environment: "test" }], [], now), /indisponível/);
});
