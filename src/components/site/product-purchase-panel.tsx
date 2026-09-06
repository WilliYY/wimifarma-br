"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useCart, type CartProduct } from "@/components/site/cart-provider";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

function QuantitySelector({
  maxQuantity,
  onChange,
  quantity,
}: {
  maxQuantity: number;
  onChange: (quantity: number) => void;
  quantity: number;
}) {
  return (
    <div className="grid h-12 shrink-0 grid-cols-[2.75rem_3rem_2.75rem] items-center overflow-hidden rounded-md border border-line bg-white">
      <button
        aria-label="Diminuir quantidade"
        className="flex h-full items-center justify-center text-muted transition hover:bg-surface-subtle hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        type="button"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="text-center text-sm font-black text-ink">
        {quantity}
      </span>
      <button
        aria-label="Aumentar quantidade"
        className="flex h-full items-center justify-center text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35"
        disabled={quantity >= maxQuantity}
        onClick={() => onChange(quantity + 1)}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ProductPurchasePanel({ product }: { product: CartProduct }) {
  const router = useRouter();
  const { addProduct } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [showPurchaseDock, setShowPurchaseDock] = useState(false);
  const purchasePanelRef = useRef<HTMLDivElement>(null);
  const requiresAssistance = product.requiresPrescription || product.isPopularPharmacy;
  const maxQuantity = Math.min(product.stock, 20);

  useEffect(() => {
    let animationFrame: number | null = null;

    const updatePurchaseDock = () => {
      animationFrame = null;
      const purchasePanel = purchasePanelRef.current;
      setShowPurchaseDock(
        Boolean(purchasePanel && purchasePanel.getBoundingClientRect().bottom < 0),
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updatePurchaseDock);
    };

    updatePurchaseDock();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

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

  function continuePurchase(destination: "/carrinho" | "/checkout") {
    addProduct(product, quantity);
    router.push(destination);
  }

  return (
    <>
      <div
        className="mt-6 border-t border-line pt-6"
        ref={purchasePanelRef}
      >
        <div className="grid gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <QuantitySelector
            maxQuantity={maxQuantity}
            onChange={changeQuantity}
            quantity={quantity}
          />
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-brand bg-white px-5 text-sm font-black text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={() => continuePurchase("/carrinho")}
            type="button"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            Adicionar ao carrinho
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,16,46,0.2)] transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:col-span-2"
            onClick={() => continuePurchase("/checkout")}
            type="button"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            Comprar agora
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-pharma-green">
          <Check className="h-4 w-4" aria-hidden="true" />
          Em estoque, sujeito a confirmacao da farmacia
        </p>
      </div>

      {showPurchaseDock ? (
        <aside
          aria-label="Compra rapida do produto"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-16px_44px_rgba(17,24,39,0.14)] backdrop-blur"
        >
          <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
              {product.imageUrl ? (
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-line bg-white">
                  <Image
                    alt=""
                    className="object-contain p-1"
                    fill
                    sizes="56px"
                    src={product.imageUrl}
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <span className="block text-xs font-bold uppercase text-muted">
                  {product.category ?? "Produto"}
                </span>
                <strong className="block truncate text-sm text-ink">
                  {product.name}
                </strong>
              </div>
            </div>

            <strong className="shrink-0 text-xl font-black text-brand sm:text-2xl">
              {formatCurrency(product.unitPriceCents / 100)}
            </strong>
            <div className="hidden sm:block">
              <QuantitySelector
                maxQuantity={maxQuantity}
                onChange={changeQuantity}
                quantity={quantity}
              />
            </div>
            <button
              className="inline-flex min-h-12 min-w-36 flex-1 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(200,16,46,0.22)] transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:flex-none"
              onClick={() => continuePurchase("/checkout")}
              type="button"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              Comprar agora
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
