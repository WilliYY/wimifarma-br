import assert from "node:assert/strict";
import test from "node:test";
import { extractProductImageUrls, isPublicIpv4, validateRemoteUrl } from "./remote-images";

test("downloads recusam destinos internos, credenciais, portas e enderecos literais", () => {
  for (const value of ["http://example.com/a", "https://localhost/a", "https://127.0.0.1/a", "https://[::1]/a", "https://user:pass@example.com/a", "https://example.com:8443/a", "https://metadata.google.internal/a"]) {
    assert.throws(() => validateRemoteUrl(value));
  }
  assert.equal(validateRemoteUrl("https://www.nestle.com.br/produto").hostname, "www.nestle.com.br");
  for (const address of ["127.0.0.1", "10.0.0.2", "169.254.169.254", "172.16.1.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1", "192.0.2.1"]) assert.equal(isPublicIpv4(address), false, address);
  assert.equal(isPublicIpv4("8.8.8.8"), true);
});

test("extrai fotos do produto sem executar HTML, scripts ou instrucoes", () => {
  const html = `<script type="application/ld+json">{"@type":"Product","image":["/frente.jpg",{"url":"https://cdn.example.com/verso.png"}]}</script><meta property="og:image" content="/frente.jpg"><img src="/logo.png" alt="Logo"><img src="/lateral.webp" alt="KitKat lateral"><img src="http://127.0.0.1/a" alt="Produto">`;
  assert.deepEqual(extractProductImageUrls(html, "https://example.com/produto"), ["https://example.com/frente.jpg", "https://cdn.example.com/verso.png", "https://example.com/lateral.webp"]);
});
test("le galerias JSON, zoom e maior srcset sem limitar a primeira foto", () => {
  const html = '<script type="application/json">{"product":{"images":[{"url":"https://example.com/back.webp"},{"imageUrl":"https://example.com/side.webp"}]}}</script><img alt="produto" data-zoom-image="https://example.com/zoom.webp" srcset="https://example.com/small.webp 120w, https://example.com/large.webp 1200w">';
  const urls = extractProductImageUrls(html, "https://example.com/product");
  assert.ok(urls.includes("https://example.com/back.webp"));
  assert.ok(urls.includes("https://example.com/side.webp"));
  assert.ok(urls.includes("https://example.com/zoom.webp"));
  assert.ok(urls.includes("https://example.com/large.webp"));
  assert.ok(!urls.includes("https://example.com/small.webp"));
});
