import assert from "node:assert/strict";
import test from "node:test";
import { getSafeCustomerCallbackUrl } from "./customer-redirect";

test("keeps a local product destination with its review anchor", () => {
  assert.equal(
    getSafeCustomerCallbackUrl("/produto/cimegrip-20cp#avaliacoes"),
    "/produto/cimegrip-20cp#avaliacoes",
  );
});

test("keeps local query parameters", () => {
  assert.equal(
    getSafeCustomerCallbackUrl("/checkout?etapa=entrega"),
    "/checkout?etapa=entrega",
  );
});

test("rejects external, protocol-relative and restricted destinations", () => {
  const unsafeDestinations = [
    undefined,
    "https://example.com",
    "//example.com/produto",
    "/admin/dashboard",
    "/api/pedidos",
    "/login",
    "/produto/../admin/dashboard",
  ];

  for (const destination of unsafeDestinations) {
    assert.equal(getSafeCustomerCallbackUrl(destination), "/minha-conta");
  }
});
