"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, PackageOpen, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "@/components/site/cart-provider";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CartPage() {
  const { hydrated, items, removeProduct, subtotalCents, updateQuantity } = useCart();

  return (
    <section className="min-h-[70vh] bg-surface-subtle px-4 pb-20 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pt-56">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase text-brand">Sua compra</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Carrinho</h1>

        {!hydrated ? (
          <div className="mt-8 h-52 animate-pulse rounded-lg border border-line bg-white" />
        ) : items.length === 0 ? (
          <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-lg border border-line bg-white px-5 text-center shadow-sm">
            <PackageOpen className="h-12 w-12 text-brand" />
            <h2 className="mt-4 text-xl font-black text-ink">Seu carrinho esta vazio</h2>
            <p className="mt-2 max-w-md text-sm text-muted">Escolha um produto na vitrine para iniciar o pedido.</p>
            <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-black text-white" href="/">
              Ver melhores ofertas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="grid gap-3">
              {items.map((item) => (
                <article className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-sm sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center" key={item.id}>
                  <Link className="relative mx-auto aspect-square w-28 overflow-hidden rounded-md border border-line bg-white" href={`/produto/${item.slug}`}>
                    {item.imageUrl ? <Image alt={item.name} className="object-contain p-2" fill sizes="112px" src={item.imageUrl} /> : <PackageOpen className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted" />}
                  </Link>
                  <div className="min-w-0">
                    {item.category ? <p className="text-xs font-bold uppercase text-muted">{item.category}</p> : null}
                    <Link className="mt-1 block text-base font-black text-ink transition hover:text-brand" href={`/produto/${item.slug}`}>{item.name}</Link>
                    <strong className="mt-3 block text-xl font-black text-brand">{currency.format(item.unitPriceCents / 100)}</strong>
                    {item.originalPriceCents && item.originalPriceCents > item.unitPriceCents ? <span className="text-xs font-semibold text-muted line-through">{currency.format(item.originalPriceCents / 100)}</span> : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="grid h-11 grid-cols-[2.5rem_2.75rem_2.5rem] overflow-hidden rounded-md border border-line bg-white">
                      <button aria-label={`Diminuir quantidade de ${item.name}`} className="grid place-items-center text-muted transition hover:bg-surface-subtle hover:text-brand" onClick={() => updateQuantity(item.id, item.quantity - 1)} type="button"><Minus className="h-4 w-4" /></button>
                      <span aria-live="polite" className="grid place-items-center border-x border-line text-sm font-black text-ink">{item.quantity}</span>
                      <button aria-label={`Aumentar quantidade de ${item.name}`} className="grid place-items-center text-muted transition hover:bg-surface-subtle hover:text-brand disabled:opacity-35" disabled={item.quantity >= Math.min(item.stock, 20)} onClick={() => updateQuantity(item.id, item.quantity + 1)} type="button"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button aria-label={`Remover ${item.name}`} className="inline-flex h-10 items-center gap-2 px-2 text-xs font-bold text-muted transition hover:text-brand" onClick={() => removeProduct(item.id)} type="button"><Trash2 className="h-4 w-4" /> Remover</button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rounded-lg border border-line bg-white p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)] lg:sticky lg:top-56">
              <h2 className="text-lg font-black text-ink">Resumo</h2>
              <div className="mt-5 flex justify-between text-sm text-muted"><span>Produtos</span><span>{currency.format(subtotalCents / 100)}</span></div>
              <div className="mt-3 flex justify-between text-sm text-muted"><span>Entrega em Ivate ou retirada</span><span className="font-bold text-pharma-green">Gratis</span></div>
              <div className="mt-5 flex items-end justify-between border-t border-line pt-5"><span className="font-black text-ink">Total</span><strong className="text-2xl font-black text-brand">{currency.format(subtotalCents / 100)}</strong></div>
              <Link className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(208,14,49,0.2)] transition hover:bg-brand-dark" href="/checkout">Ir para o checkout <ArrowRight className="h-4 w-4" /></Link>
              <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" />O pedido e conferido pela farmacia antes da confirmacao.</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
