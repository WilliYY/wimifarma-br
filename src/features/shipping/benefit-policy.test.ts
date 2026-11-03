import assert from "node:assert/strict";
import test from "node:test";
import { calculateShippingBenefit, shippingBenefitPolicySchema } from "./benefit-policy";

const policy = { enabled: true, maximumSubsidyCents: 2500, minimumContributionBps: 1000, variableCostReserveBps: 700, packagingCostCents: 300, costMaxAgeHours: 24 };
const base = { policy, carrierPriceCents: 2000, economicPriceCents: 2000, netProductsCents: 20000, acquisitionCostCents: 11000, rewardsReserveCents: 200, operationalExtraCents: 0 };

test("gratuidade depende do custo e margem, não de atingir R$99,90", () => {
  assert.equal(calculateShippingBenefit(base).customerPriceCents, 0);
  const tight = calculateShippingBenefit({ ...base, netProductsCents: 10000, acquisitionCostCents: 9100 });
  assert.equal(tight.customerPriceCents, 2000);
});

test("desconhecido não vira custo zero e modalidade rápida paga a diferença", () => {
  assert.equal(calculateShippingBenefit({ ...base, acquisitionCostCents: null }).subsidyCents, 0);
  assert.equal(calculateShippingBenefit({ ...base, operationalExtraCents: null }).subsidyCents, 0);
  assert.equal(calculateShippingBenefit({ ...base, carrierPriceCents: 4500 }).customerPriceCents, 2500);
});

test("limites da política precisam de confirmação e combinação percentual válida", () => {
  assert.equal(shippingBenefitPolicySchema.safeParse({ enabled: true }).success, false);
  assert.equal(shippingBenefitPolicySchema.safeParse({ ...policy, minimumContributionBps: 9500 }).success, false);
  assert.equal(calculateShippingBenefit({ ...base, policy: undefined }).customerPriceCents, 2000);
});

test("subsídio preserva contribuição inteira e reserva inclusive sobre o frete cobrado", () => {
  for (let i = 1; i <= 600; i++) {
    const p = 1000 + i * 37, n = p - Math.round(p * .03), c = Math.round(p * ((i % 7 + 3) / 10));
    const reserve = i % 4 * 200, minimum = i % 3 * 300, q = 300 + i % 37 * 101;
    const input = { ...base, policy: { ...policy, maximumSubsidyCents: 1700, minimumContributionBps: minimum, variableCostReserveBps: reserve, packagingCostCents: 100 }, carrierPriceCents: q, economicPriceCents: 1500, percentageBaseCents: p, netProductsCents: n, acquisitionCostCents: c, rewardsReserveCents: 20, operationalExtraCents: 50 };
    const b = calculateShippingBenefit(input);
    assert.ok(b.subsidyCents <= Math.min(q, 1500, 1700));
    assert.equal(b.customerPriceCents + b.subsidyCents, q);
    if (b.subsidyCents > 0) {
      const contribution = n - c - 20 - 150 - b.subsidyCents - Math.ceil((p + b.customerPriceCents) * reserve / 10000);
      assert.ok(contribution >= Math.ceil(p * minimum / 10000), `case ${i}`);
    }
  }
});

test("mínimo é estimativa apenas quando modalidade e teto permitem gratuidade integral", () => {
  const partial = { ...base, netProductsCents: 10000, acquisitionCostCents: 7000 };
  assert.ok(calculateShippingBenefit(partial).remainingCents! > 0);
  assert.equal(calculateShippingBenefit({ ...partial, carrierPriceCents: 4000 }).remainingCents, null);
  assert.equal(calculateShippingBenefit({ ...partial, policy: { ...policy, maximumSubsidyCents: 1000 } }).remainingCents, null);
});

const historicalPolicy = { enabled: true, fundingMode: "HISTORICAL_MARGIN_SHARE", marginShareBps: 5000, historicalCostMaxAgeHours: 720,
  maximumSubsidyCents: null, minimumContributionBps: null, variableCostReserveBps: null, packagingCostCents: null, costMaxAgeHours: 24 };

test("modo histórico é explícito; custos desconhecidos permanecem null e objetos antigos permanecem iguais", () => {
  assert.deepEqual(shippingBenefitPolicySchema.parse(policy), policy);
  const result = shippingBenefitPolicySchema.parse(historicalPolicy);
  assert.deepEqual(result, historicalPolicy);
  for (const patch of [{ marginShareBps: undefined }, { marginShareBps: 4999 }, { historicalCostMaxAgeHours: undefined }, { historicalCostMaxAgeHours: 721 }, { historicalCostMaxAgeHours: 0 }]) {
    assert.equal(shippingBenefitPolicySchema.safeParse({ ...historicalPolicy, ...patch }).success, false);
  }
  assert.equal(shippingBenefitPolicySchema.safeParse({ enabled: false, fundingMode: "HISTORICAL_MARGIN_SHARE" }).success, true);
  assert.equal(shippingBenefitPolicySchema.safeParse({ ...historicalPolicy, minimumContributionBps: 9000, variableCostReserveBps: 9000 }).success, true);
  assert.equal(shippingBenefitPolicySchema.safeParse({ ...policy, fundingMode: "CONFIRMED_COSTS" }).success, true);
});

test("histórico reserva metade da margem após recompensas, deduz extras conhecidos e arredonda subsídio para baixo", () => {
  const input = { ...base, policy: historicalPolicy, carrierPriceCents: 10000, economicPriceCents: 10000,
    netProductsCents: 10001, acquisitionCostCents: 4000, rewardsReserveCents: 2, operationalExtraCents: null };
  const before = structuredClone(input), result = calculateShippingBenefit(input);
  assert.equal(result.subsidyCents, 2999); assert.equal(result.customerPriceCents, 7001);
  assert.deepEqual(input, before);
  assert.equal(calculateShippingBenefit({ ...input, operationalExtraCents: 1000 }).subsidyCents, 2499);
  assert.equal(calculateShippingBenefit({ ...input, operationalExtraCents: 1000, policy: { ...historicalPolicy, packagingCostCents: 500 } }).subsidyCents, 2249);
  assert.equal(calculateShippingBenefit({ ...input, acquisitionCostCents: null }).subsidyCents, 0);
  assert.equal(calculateShippingBenefit({ ...input, acquisitionCostCents: 20000 }).subsidyCents, 0);
});

test("histórico limita etiqueta econômica e teto informado; teto null nunca cria orçamento infinito", () => {
  const input = { ...base, policy: historicalPolicy, carrierPriceCents: 10000, economicPriceCents: 3000, netProductsCents: 10000, acquisitionCostCents: 4000, rewardsReserveCents: 0, operationalExtraCents: null };
  const result = calculateShippingBenefit(input);
  assert.equal(result.subsidyCents, 3000); assert.equal(result.customerPriceCents, 7000); assert.equal(result.minimumOrderCents, null);
  assert.equal(calculateShippingBenefit({ ...input, policy: { ...historicalPolicy, maximumSubsidyCents: 1000 } }).subsidyCents, 1000);
  assert.equal(calculateShippingBenefit({ ...input, policy: { ...historicalPolicy, maximumSubsidyCents: 0 } }).subsidyCents, 0);
});

test("mínimo histórico usa a composição atual e extras fixos; arredonda para cima em R$10", () => {
  const input = { ...base, policy: { ...historicalPolicy, packagingCostCents: 50 }, percentageBaseCents: 10000,
    netProductsCents: 9700, acquisitionCostCents: 7000, rewardsReserveCents: 100, operationalExtraCents: 150 };
  const result = calculateShippingBenefit(input);
  assert.equal(result.subsidyCents, 1200); assert.equal(result.minimumOrderCents, 17000); assert.equal(result.remainingCents, 7000);
  assert.equal(calculateShippingBenefit({ ...input, policy: { ...input.policy, maximumSubsidyCents: 1999 } }).minimumOrderCents, null);
  assert.equal(calculateShippingBenefit({ ...input, economicPriceCents: 1999 }).minimumOrderCents, null);
  assert.equal(calculateShippingBenefit({ ...input, acquisitionCostCents: 9700 }).minimumOrderCents, null);
});

test("histórico conserva pelo menos metade da margem disponível em centavos inteiros", () => {
  for (let i = 1; i <= 150; i++) {
    const net = 10000 + i * 31, cost = 4000 + i * 13, rewards = i * 3, extras = i % 19;
    const result = calculateShippingBenefit({ ...base, policy: historicalPolicy, carrierPriceCents: 30000, economicPriceCents: 30000,
      netProductsCents: net, acquisitionCostCents: cost, rewardsReserveCents: rewards, operationalExtraCents: extras });
    const margin = net - cost - rewards - extras;
    assert.equal(result.subsidyCents, Math.floor(Math.max(0, margin) / 2));
    assert.ok(margin - result.subsidyCents >= Math.ceil(margin / 2));
  }
});
