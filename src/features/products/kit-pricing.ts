import { isMedicineProduct } from "./product-description";

type KitPricingProduct = Parameters<typeof isMedicineProduct>[0] & {
  name: string;
  brand: string | null;
  price: string;
  promotionalPrice: string | null;
  stock: number;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function priceCents(product: KitPricingProduct) {
  const value = product.promotionalPrice ?? product.price;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

/** Only homogeneous bar-soap packs with an explicit count and mass are comparable. */
function barPresentation(product: KitPricingProduct) {
  if (isMedicineProduct(product)) return null;
  let name = normalize(product.name);
  if (!/\bsabonetes?\b/.test(name) || /\bliquido\b|[+&/]|\be\b/.test(name)) return null;
  const kit = /\bkit\b/.test(name);
  const counts = [...name.matchAll(/\b(\d{1,3})\s*(?:x(?=\s*\d+(?:[.,]\d+)?\s*(?:kg|g)\b)|un(?:id(?:ades?)?)?\b|sabonetes?\b)/g)];
  if ((kit && counts.length !== 1) || (!kit && counts.length)) return null;
  const quantity = kit ? Number(counts[0][1]) : 1;
  if (quantity < 1 || quantity > 100 || (kit && quantity < 2)) return null;
  if (kit) {
    const count = counts[0];
    // Keep the product noun when the count is written as “6 sabonetes”.
    name = name.replace(count[0], /sabonetes?/.test(count[0]) ? "sabonete" : " ").replace(/\bkit\b/, " ").replace(/^\s*com\s+/, "");
  }
  const masses = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|g)\b/g)];
  if (masses.length !== 1) return null;
  const mass = masses[0];
  const grams = Number(mass[1].replace(",", ".")) * (mass[2] === "kg" ? 1000 : 1);
  if (!Number.isFinite(grams) || grams <= 0) return null;
  const signature = normalize(name.replace(mass[0], `${grams}g`).replace(/\bsabonetes\b/g, "sabonete"));
  return { quantity, signature, brand: normalize(product.brand ?? "") };
}

export function productKitPricing(product: KitPricingProduct, candidates: KitPricingProduct[]) {
  const pack = barPresentation(product);
  const totalCents = priceCents(product);
  if (!pack || pack.quantity < 2 || totalCents === null || totalCents < pack.quantity || product.stock < 1) return null;
  const prices = candidates.flatMap(candidate => {
    const unit = barPresentation(candidate);
    const cents = priceCents(candidate);
    return unit?.quantity === 1 && unit.signature === pack.signature && pack.brand && unit.brand === pack.brand &&
      candidate.stock >= pack.quantity && cents !== null ? [cents] : [];
  });
  const individualTotal = prices.length ? Math.min(...prices) * pack.quantity : null;
  const saves = individualTotal !== null && individualTotal > totalCents;
  return {
    quantity: pack.quantity, totalCents, perItemCents: Math.round(totalCents / pack.quantity),
    savingCents: saves ? individualTotal - totalCents : null,
    individualTotalCents: saves ? individualTotal : null,
  };
}
