import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../next.config";

test("only payment pages allow both official Secure Fields preflight and iframe hosts", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const routes = await nextConfig.headers!();
  const policy = (source: string) => {
    const rule = routes.find(route => route.source === source);
    assert.ok(rule);
    const header = rule.headers.find(entry => entry.key === "Content-Security-Policy");
    assert.ok(header);
    return new Map(header.value.split(";").map(part => {
      const [directive, ...values] = part.trim().split(/\s+/);
      return [directive, values];
    }));
  };
  const payment = policy("/checkout/pagamento/:path*");
  assert.deepEqual(policy("/checkout"), payment);
  const ordinary = policy("/:path*");
  for (const host of ["https://secure-fields.mercadopago.com", "https://api-static.mercadopago.com"]) {
    assert.ok(payment.get("connect-src")?.includes(host), `Missing preflight permission for ${host}`);
    assert.ok(payment.get("frame-src")?.includes(host), `Missing iframe permission for ${host}`);
    assert.ok(!ordinary.get("connect-src")?.includes(host));
  }
  assert.deepEqual(ordinary.get("connect-src"), ["'self'"]);
  assert.deepEqual(payment.get("object-src"), ["'none'"]);
  assert.deepEqual(payment.get("frame-ancestors"), ["'none'"]);
  assert.ok(![...payment.values()].flat().includes("*"));
});
