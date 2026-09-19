"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
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
    <div role="group" aria-label="Quantidade do produto" className="grid h-12 shrink-0 grid-cols-[2.75rem_3rem_2.75rem] items-center overflow-hidden rounded-xl border border-line bg-surface-subtle transition-colors hover:border-brand/35">
      <button
        aria-label="Diminuir quantidade"
        className="group flex h-full cursor-pointer items-center justify-center text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-35"
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        type="button"
      >
        <Minus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="text-center text-sm font-black text-ink">
        {quantity}
      </span>
      <button
        aria-label="Aumentar quantidade"
        className="group flex h-full cursor-pointer items-center justify-center text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-35"
        disabled={quantity >= maxQuantity}
        onClick={() => onChange(quantity + 1)}
        type="button"
      >
        <Plus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-active:rotate-90" aria-hidden="true" />
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
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
        <p className="text-sm font-semibold leading-6 text-amber-900">
          Este item precisa de atendimento da equipe antes da compra.
        </p>
        <a
          className="group mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pharma-green focus-visible:ring-offset-2"
          href={buildWhatsAppUrl(
            `Ola, gostaria de consultar ${product.name} e confirmar os documentos necessarios.`,
          )}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
          Consultar no WhatsApp
        </a>
      </div>
    );
  }

  if (product.stock < 1) {
    return (
      <div className="mt-5 border-t border-line pt-5">
        <button className="min-h-12 w-full cursor-not-allowed rounded-xl bg-surface-subtle px-5 text-sm font-bold text-muted" disabled type="button">
          Produto indisponível
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-muted">Consulte a equipe sobre a disponibilidade deste produto.</p>
        <a className="mt-2 flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-brand underline-offset-4 hover:underline focus-visible:outline-brand" href={buildWhatsAppUrl(`Ola, gostaria de consultar a disponibilidade de ${product.name}.`)} rel="noreferrer" target="_blank"><MessageCircle className="h-4 w-4" aria-hidden="true" />Consultar disponibilidade</a>
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
        className="mt-5 border-t border-line pt-5"
        ref={purchasePanelRef}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Quantidade</p>
          <QuantitySelector
            maxQuantity={maxQuantity}
            onChange={changeQuantity}
            quantity={quantity}
          />
          </div>
          <div className="text-right" aria-live="polite" aria-atomic="true">
            <p className="text-xs text-muted">Total de {quantity} {quantity === 1 ? "unidade" : "unidades"}</p>
            <strong className="mt-1 block text-xl font-bold text-ink tabular-nums">{formatCurrency(product.unitPriceCents * quantity / 100)}</strong>
          </div>
        </div>
        <div className="grid gap-2.5">
          <button
            className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand/30 bg-white px-5 text-sm font-bold text-brand transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={() => continuePurchase("/carrinho")}
            type="button"
          >
            <ShoppingCart className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105" aria-hidden="true" />
            Adicionar ao carrinho
          </button>
          <button
            className="group inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white shadow-[0_8px_20px_rgba(200,16,46,0.16)] transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={() => continuePurchase("/checkout")}
            type="button"
          >
            <ShoppingBag className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105" aria-hidden="true" />
            Comprar agora
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 flex min-h-10 items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
          Em estoque, sujeito à confirmação da farmácia
        </p>
      </div>

      {showPurchaseDock ? (
        <aside
          aria-label="Compra rapida do produto"
          className="fixed inset-x-0 bottom-0 z-40 animate-in border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(17,24,39,0.08)] backdrop-blur duration-300 slide-in-from-bottom-4 motion-reduce:animate-none"
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

            <div className="shrink-0"><span className="block text-xs text-muted">{quantity} {quantity === 1 ? "unidade" : "unidades"}</span><strong className="text-xl font-bold text-brand tabular-nums sm:text-2xl">{formatCurrency(product.unitPriceCents * quantity / 100)}</strong></div>
            <div className="hidden sm:block">
              <QuantitySelector
                maxQuantity={maxQuantity}
                onChange={changeQuantity}
                quantity={quantity}
              />
            </div>
            <button
              className="group inline-flex min-h-12 min-w-36 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:flex-none"
              onClick={() => continuePurchase("/checkout")}
              type="button"
            >
              <ShoppingBag className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
              Comprar agora
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
