"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartProduct } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function ProductPurchasePanel({ product }: { product: CartProduct }) {
  const router = useRouter();
  const { addProduct } = useCart();
  const [quantity, setQuantity] = useState(1);
  const requiresAssistance = product.requiresPrescription || product.isPopularPharmacy;
  const maxQuantity = Math.min(product.stock, 20);

  if (requiresAssistance) {
    return (
      <div className="mt-6 border-t border-line pt-6">
        <p className="text-sm font-semibold leading-6 text-muted">
          Este item precisa de atendimento da equipe antes da compra.
        </p>
        <a
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-pharma-green px-5 text-sm font-black text-white transition hover:bg-[#07863f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pharma-green focus-visible:ring-offset-2"
          href={buildWhatsAppUrl(
            `Ola, gostaria de consultar ${product.name} e confirmar os documentos necessarios.`,
          )}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Consultar no WhatsApp
        </a>
      </div>
    );
  }

  if (product.stock < 1) {
    return (
      <div className="mt-6 border-t border-line pt-6">
        <button className="min-h-12 w-full cursor-not-allowed rounded-md bg-surface-subtle px-5 text-sm font-black text-muted" disabled type="button">
          Produto indisponivel
        </button>
      </div>
    );
  }

  function changeQuantity(nextQuantity: number) {
    setQuantity(Math.min(Math.max(nextQuantity, 1), maxQuantity));
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="grid h-12 shrink-0 grid-cols-[2.75rem_3rem_2.75rem] items-center overflow-hidden rounded-md border border-line bg-white">
          <button
            aria-label="Diminuir quantidade"
            className="flex h-full items-center justify-center text-muted transition hover:bg-surface-subtle hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
            disabled={quantity <= 1}
            onClick={() => changeQuantity(quantity - 1)}
            type="button"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span aria-live="polite" className="text-center text-sm font-black text-ink">{quantity}</span>
          <button
            aria-label="Aumentar quantidade"
            className="flex h-full items-center justify-center text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35"
            disabled={quantity >= maxQuantity}
            onClick={() => changeQuantity(quantity + 1)}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,16,46,0.2)] transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          onClick={() => {
            addProduct(product, quantity);
            router.push("/carrinho");
          }}
          type="button"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          Adicionar ao carrinho
        </button>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-pharma-green">
        <Check className="h-4 w-4" aria-hidden="true" />
        Em estoque, sujeito a confirmacao da farmacia
      </p>
    </div>
  );
}
