import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import { cartIdentity } from "@/features/orders/cart-identity";

const item = { id: "synthetic", quantity: 2, unitPriceCents: 1000, requiresPrescription: false, isPopularPharmacy: false };
const savedIdentity = JSON.stringify([[item.id, item.quantity, item.unitPriceCents, item.requiresPrescription, item.isPopularPharmacy]]);

test("identidade compartilhada mantém o formato persistido e ignora dados de apresentação", () => {
  assert.equal(cartIdentity([item]), savedIdentity);
  const renamed = { ...item, name: "Outro nome", imageUrl: "/synthetic.png" };
  assert.equal(cartIdentity([renamed]), savedIdentity);
});
const bundle = build({ entryPoints: ["src/components/site/online-payment.tsx"], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", packages: "external", plugins: [{ name: "isolated-payment-cart", setup(builder) {
  builder.onResolve({ filter: /cart-provider$|payment-card-form$|client-recovery$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("cart-provider") ? "export const useCart=()=>globalThis.cart;" :
    args.path.endsWith("client-recovery") ? "export const readPaymentView=async()=>globalThis.payment;" : "export const PaymentCardForm=()=>null;",
  }));
} }] });

async function confirmPayment(items: typeof item[], status = "PAID", hydrated = true, stored: string | null = savedIdentity) {
  const effects: (() => unknown)[] = [];
  let cleared = 0;
  const storage = new Map(stored === null ? [] : [["wimifarma-payment-cart:order-test", stored]]);
  const payment = { orderId: "order-test", status, method: "pix", environment: "production", amountCents: 2000 };
  const nativeRequire = createRequire(import.meta.url);
  const loaded = { exports: {} as { OnlinePayment: (props: unknown) => unknown } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: (id: string) => id === "react" ? { useState: (value: unknown) => [value, () => {}], useRef: (current: unknown) => ({ current }), useEffect: (effect: () => unknown) => effects.push(effect), useCallback: (callback: unknown) => callback } : nativeRequire(id),
    cart: { items, hydrated, clearCart: () => cleared++ }, payment,
    sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => storage.delete(key) },
    window: { dispatchEvent: () => {} }, Event, console, setInterval: () => 0, clearInterval: () => {},
  });
  loaded.exports.OnlinePayment({ orderId: "order-test", initialData: payment });
  for (const effect of effects) effect();
  return { cleared, retained: storage.has("wimifarma-payment-cart:order-test") };
}

test("pagamento PAID limpa carrinho inalterado com a identidade persistida pelo checkout", async () => {
  const result = await confirmPayment([{ ...item }]);
  assert.equal(result.cleared, 1);
  assert.equal(result.retained, false);
});

test("pagamento PAID preserva carrinho alterado em qualquer campo da identidade", async () => {
  for (const changed of [{ id: "other" }, { quantity: 3 }, { unitPriceCents: 1001 }, { requiresPrescription: true }, { isPopularPharmacy: true }]) {
    assert.equal((await confirmPayment([{ ...item, ...changed }])).cleared, 0);
  }
  assert.equal((await confirmPayment([])).cleared, 0);
  assert.equal((await confirmPayment([item, { ...item, id: "added" }])).cleared, 0);
});

test("pagamento pendente, carrinho não hidratado ou identidade ausente não apaga carrinho", async () => {
  assert.equal((await confirmPayment([item], "PENDING")).cleared, 0);
  const notReady = await confirmPayment([item], "PAID", false);
  assert.equal(notReady.cleared, 0);
  assert.equal(notReady.retained, true);
  assert.equal((await confirmPayment([item], "PAID", true, null)).cleared, 0);
});
