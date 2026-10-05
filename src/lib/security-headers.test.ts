import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

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
