import assert from "node:assert/strict";
import test from "node:test";
import { createPublicPageMetadata } from "./metadata";

test("cria titulo e canonical proprios para uma pagina publica", () => {
  const metadata = createPublicPageMetadata({
    description: "Entrega local da farmacia em Ivate-PR.",
    path: "/delivery",
    title: "Delivery de farmacia em Ivate-PR",
  });

  assert.equal(metadata.title, "Delivery de farmacia em Ivate-PR");
  assert.deepEqual(metadata.alternates, { canonical: "/delivery" });
  assert.equal(metadata.openGraph?.title, "Delivery de farmacia em Ivate-PR | Wimifarma");
  assert.equal(metadata.openGraph?.url, "/delivery");
  assert.equal(metadata.twitter?.title, "Delivery de farmacia em Ivate-PR | Wimifarma");
});
