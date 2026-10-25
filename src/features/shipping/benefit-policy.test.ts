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
