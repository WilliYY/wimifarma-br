import type { CartItem, CartProduct } from "@/components/site/cart-provider";
import { requiresPurchaseAssistance } from "@/features/products/purchase-policy";
import { orderQuantityLimit } from "@/features/products/quantity";

export type RepurchaseItem = { productId: string | null; productName: string; quantity: number };
export type RepurchasePlan = {
  additions: Array<{ product: CartProduct; quantity: number }>;
  notices: Array<{ productName: string; message: string }>;
};

export function createRepurchasePlan(source: RepurchaseItem[], products: CartProduct[], cart: CartItem[]): RepurchasePlan {
  const plan: RepurchasePlan = { additions: [], notices: [] };
  const grouped = new Map<string, RepurchaseItem>();
  for (const item of source) {
    if (!item.productId) {
      plan.notices.push({ productName: item.productName, message: "Produto sem vínculo com o catálogo atual. Não foi adicionado." });
      continue;
    }
    const previous = grouped.get(item.productId);
    grouped.set(item.productId, { ...item, quantity: (previous?.quantity ?? 0) + item.quantity });
  }

  const cartIds = new Set(cart.map(item => item.id));
  for (const item of grouped.values()) {
    const product = products.find(current => current.id === item.productId);
    const notice = (message: string) => plan.notices.push({ productName: item.productName, message });
    if (!product) { notice("Produto indisponível no catálogo atual. Não foi adicionado."); continue; }
    if (requiresPurchaseAssistance(product)) { notice("Produto exige atendimento assistido. Não foi adicionado."); continue; }
    const limit = orderQuantityLimit(product);
    if (limit < 1) { notice("Produto sem estoque disponível. Não foi adicionado."); continue; }
    if (!cartIds.has(product.id) && cartIds.size >= 30) { notice("Carrinho cheio: limite de 30 produtos diferentes. Não foi adicionado."); continue; }

    const existingQuantity = cart.find(current => current.id === product.id)?.quantity ?? 0;
    const quantity = Math.min(item.quantity, Math.max(0, limit - existingQuantity));
    if (quantity < item.quantity) notice(`Quantidade reduzida de ${item.quantity} para ${quantity}, considerando o estoque e o limite atual, incluindo o que já está no carrinho.`);
    if (quantity > 0) {
      plan.additions.push({ product, quantity });
      cartIds.add(product.id);
    }
  }
  return plan;
}
