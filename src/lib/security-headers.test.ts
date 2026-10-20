import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("public pages allow official payment images while provider scripts and connections stay restricted to checkout", async () => {
  const rules = await nextConfig.headers!();
  const policy = rules.find(rule => rule.source === "/:path*")!.headers.find(header => header.key === "Content-Security-Policy")!.value;
  const directives = new Map(policy.split(";").map(part => { const [name, ...sources] = part.trim().split(/\s+/); return [name, sources]; }));
  assert.deepEqual(directives.get("img-src"), ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com", "https://http2.mlstatic.com", "https://www.mercadopago.com"]);
  assert.deepEqual(directives.get("connect-src"), ["'self'"]);
  assert.equal(directives.get("script-src")?.some(source => source.includes("mercadopago") || source.includes("mlstatic")), false);
  assert.equal(directives.has("frame-src"), false);
});

test("prescription downloads override the general CSP with a sandbox policy", async () => {
  const rules = await nextConfig.headers!();
  const index = rules.findIndex(rule => rule.source === "/api/admin/receitas/:path*");
  assert.ok(index > rules.findIndex(rule => rule.source === "/:path*"));
  const policy = rules[index].headers.find(header => header.key.toLowerCase() === "content-security-policy")?.value;
  assert.match(policy || "", /(?:^|;\s*)sandbox(?:;|$)/);
  assert.match(policy || "", /default-src 'none'/);
  assert.equal(policy?.includes("unsafe-inline"), false);
});

test("private APIs including the credential vault prohibit browser and intermediary storage", async () => {
  const rules = await nextConfig.headers!();
  for (const source of ["/api/admin/:path*", "/api/minha-conta/:path*"]) {
    const headers = rules.find(rule => rule.source === source)?.headers;
    assert.ok(headers);
    const cache = headers.find(header => header.key.toLowerCase() === "cache-control")?.value;
    assert.ok(cache?.includes("no-store"));
    assert.ok(cache?.includes("private"));
  }
  const ordinary = rules.find(rule => rule.source === "/:path*")!.headers;
  assert.ok(ordinary.some(header => header.key === "X-Content-Type-Options" && header.value === "nosniff"));
  assert.ok(ordinary.some(header => header.key === "X-Frame-Options" && header.value === "DENY"));
  assert.ok(!rules.some(rule => rule.source.startsWith("/api/admin") && rule.headers.some(header => header.value.includes("public"))));
});
