import assert from "node:assert/strict";
import test from "node:test";
import { shippingOptionsForDisplay } from "@/components/site/shipping-option-display";
import { shippingProviderDisplay } from "./provider-display";
import type { ShippingOption } from "./schema";

test("direct Correios is identified even alone, preserving distinct provider keys and customer price order", () => {
  const base = { carrier: "Correios", service: "PAC", priceCents: 2000, deliveryDays: 5 };
  const direct: ShippingOption = { ...base, provider: "correios", serviceId: 3298, serviceCode: "03298" };
  assert.equal(shippingOptionsForDisplay([direct])[0].integrator, "Correios — contrato Wimifarma");
  const displayed = shippingOptionsForDisplay([direct,
    { ...base, provider: "melhor-envio", serviceId: 1, priceCents: 2200 },
    { ...base, provider: "superfrete", serviceId: 1, priceCents: 1800 },
  ]);
  assert.deepEqual(displayed.map(row => row.key), ["superfrete:1", "correios:3298", "melhor-envio:1"]);
  assert.deepEqual(displayed.map(row => row.integrator), ["SuperFrete", "Correios — contrato Wimifarma", "Melhor Envio"]);
});

test("posting destinations remain specific to each provider", () => {
  assert.equal(shippingProviderDisplay.correios.url, "https://prepostagem.correios.com.br/");
  assert.equal(shippingProviderDisplay["melhor-envio"].url, "https://melhorenvio.com.br/painel");
  assert.equal(shippingProviderDisplay.superfrete.url, "https://web.superfrete.com/");
});
