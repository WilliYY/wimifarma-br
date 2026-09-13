"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartProduct } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function ProductCardActions({ product }: { product: CartProduct }) {
  const { addProduct, hydrated, items, updateQuantity } = useCart();
  const router = useRouter();
  const quantity = items.find((item) => item.id === product.id)?.quantity ?? 0;
  const limit = Math.min(product.stock, 20);
  const restricted = product.requiresPrescription || product.isPopularPharmacy;
  const button = "inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  function add(buy = false) {
    if (!hydrated || restricted || limit < 1) return;
    if (!quantity && items.length >= 30) { toast.error("Seu carrinho ja tem 30 produtos diferentes."); return; }
    if (!buy || !quantity) addProduct(product);
    if (buy) router.push("/checkout");
  }

  return <div className="relative z-20 mt-3 grid min-h-[5.5rem] gap-2" data-product-controls>
    {restricted ? <a className={`${button} h-auto min-h-[5.5rem] border border-pharma-green/30 text-pharma-green hover:bg-emerald-50`} href={buildWhatsAppUrl(`Ola, gostaria de consultar ${product.name}.`)} rel="noreferrer" target="_blank"><MessageCircle className="h-4 w-4 shrink-0" />Consultar no WhatsApp</a> : product.stock < 1 ? <button className={`${button} h-auto min-h-[5.5rem] bg-surface-subtle text-muted`} disabled>Indisponivel</button> : <>
      {quantity > 0 ? <div aria-label={`Quantidade de ${product.name}`} className="grid h-10 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center rounded-md border border-line bg-white" role="group">
        <button aria-label={`Diminuir ${product.name}`} className={`${button} px-0 text-brand hover:bg-brand-soft`} onClick={() => updateQuantity(product.id, quantity - 1)} type="button"><Minus className="h-4 w-4" /></button>
        <output aria-live="polite" className="text-center text-sm font-black text-ink">{quantity}</output>
        <button aria-label={`Aumentar ${product.name}`} className={`${button} px-0 text-brand hover:bg-brand-soft`} disabled={quantity >= limit} onClick={() => addProduct(product)} title={quantity >= limit ? "Limite de estoque ou 20 unidades" : "Adicionar mais uma unidade"} type="button"><Plus className="h-4 w-4" /></button>
      </div> : <button className={`${button} border border-brand text-brand hover:bg-brand-soft`} disabled={!hydrated} onClick={() => add()} type="button"><ShoppingCart className="h-4 w-4" />Adicionar</button>}
      <button className={`${button} bg-brand text-white hover:bg-brand-dark active:scale-[0.98] motion-reduce:transform-none`} disabled={!hydrated} onClick={() => add(true)} type="button"><ShoppingBag className="h-4 w-4" />Comprar</button>
    </>}
  </div>;
}
