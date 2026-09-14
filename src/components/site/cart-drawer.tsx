"use client";

import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowRight, ImageIcon, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/site/cart-provider";
import { formatCurrency } from "@/lib/utils";

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { clearCart, hydrated, itemCount, items, removeProduct, subtotalCents, updateQuantity } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const iconButton = "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-35";
  return <Dialog.Portal>
    <Dialog.Content
      className="fixed bottom-0 right-0 z-[151] flex h-[70dvh] w-full max-w-[28rem] flex-col rounded-t-lg border border-line bg-white shadow-2xl outline-none sm:inset-y-0 sm:h-dvh sm:rounded-none sm:border-y-0 sm:border-r-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:animate-none"
      data-lenis-prevent
      onInteractOutside={(event) => event.preventDefault()}
      onKeyDownCapture={(event) => {
        // Radix loops Tab even without a modal; preserve the browser's page-wide tab order.
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      <header className="shrink-0 border-b border-line px-5 pb-2 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-brand-soft text-brand"><ShoppingBag className="h-5 w-5" aria-hidden="true" /></span><Dialog.Title className="text-xl font-black text-ink">Minha cesta</Dialog.Title><Dialog.Close aria-label="Fechar cesta" className={`${iconButton} ml-auto`} title="Fechar cesta"><X className="h-5 w-5" /></Dialog.Close></div>
        <div className="mt-3 flex items-center justify-between gap-3"><Dialog.Description className="text-sm text-muted">{itemCount} {itemCount === 1 ? "item selecionado" : "itens selecionados"}</Dialog.Description>{items.length > 0 && <button className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-semibold text-muted hover:bg-brand-soft hover:text-brand focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setConfirmClear(true)} type="button"><Trash2 className="h-3.5 w-3.5" />Limpar cesta</button>}</div>
        {confirmClear && items.length > 0 && <div className="mt-2 border-l-2 border-brand bg-brand-soft p-3 text-sm" role="alert"><p className="font-bold text-ink">Remover todos os itens?</p><div className="mt-2 flex gap-3"><button className="min-h-9 cursor-pointer rounded bg-brand px-3 text-xs font-bold text-white" onClick={() => { clearCart(); setConfirmClear(false); }} type="button">Sim, limpar</button><button className="min-h-9 cursor-pointer rounded px-3 text-xs font-bold text-ink" onClick={() => setConfirmClear(false)} type="button">Cancelar</button></div></div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6" data-lenis-prevent>
        {!hydrated ? <div className="my-5 h-48 animate-pulse bg-surface-subtle" /> : items.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center py-8 text-center"><ShoppingBag className="h-12 w-12 text-brand/40" aria-hidden="true" /><h2 className="mt-5 text-lg font-bold text-ink">Sua cesta esta vazia</h2><p className="mt-2 text-sm text-muted">Seus produtos escolhidos aparecem aqui.</p><Dialog.Close className="mt-5 min-h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-bold text-white">Continuar comprando</Dialog.Close></div> : <ul className="divide-y divide-line">{items.map((item) => <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-5" key={item.id}>
          <Link aria-label={`Ver ${item.name}`} className="relative flex h-24 items-center justify-center rounded border border-line bg-white p-1 focus-visible:ring-2 focus-visible:ring-brand" href={`/produto/${item.slug}`} onClick={onClose}>{item.imageUrl ? <Image alt={item.name} className="h-full w-full object-contain" height={100} src={item.imageUrl} width={80} /> : <ImageIcon className="h-6 w-6 text-muted" />}</Link>
          <div className="min-w-0"><div className="flex items-start gap-2"><Link className="min-w-0 flex-1 text-sm font-bold leading-5 text-ink hover:text-brand focus-visible:ring-2 focus-visible:ring-brand" href={`/produto/${item.slug}`} onClick={onClose}>{item.name}</Link><button aria-label={`Remover ${item.name}`} className={`${iconButton} -mr-2 -mt-2`} onClick={() => removeProduct(item.id)} title="Remover produto" type="button"><Trash2 className="h-4 w-4" /></button></div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div>{item.originalPriceCents && item.originalPriceCents > item.unitPriceCents ? <span className="block text-xs text-muted line-through">{formatCurrency(item.originalPriceCents / 100)}</span> : null}<strong className="block text-lg font-black text-brand">{formatCurrency(item.unitPriceCents / 100)}</strong></div><div aria-label={`Quantidade de ${item.name}`} className="grid h-10 grid-cols-[2.25rem_1.75rem_2.25rem] items-center rounded-md border border-line" role="group"><button aria-label={`Diminuir ${item.name}`} className={`${iconButton} w-9`} onClick={() => updateQuantity(item.id, item.quantity - 1)} type="button"><Minus className="h-3.5 w-3.5" /></button><output aria-live="polite" className="text-center text-sm font-bold text-ink">{item.quantity}</output><button aria-label={`Aumentar ${item.name}`} className={`${iconButton} w-9`} disabled={item.quantity >= Math.min(item.stock, 20)} onClick={() => updateQuantity(item.id, item.quantity + 1)} title="Adicionar uma unidade" type="button"><Plus className="h-3.5 w-3.5" /></button></div></div>
          </div>
        </li>)}</ul>}
      </div>
      {items.length > 0 && <footer className="shrink-0 border-t border-line bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-4"><div aria-live="polite" className="mb-2 flex items-center justify-between gap-3 sm:mb-4"><span className="font-bold text-ink">Subtotal</span><strong className="text-2xl font-black text-brand">{formatCurrency(subtotalCents / 100)}</strong></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-1"><Link className="col-span-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:col-span-1" href="/checkout" onClick={onClose}>Finalizar pedido<ArrowRight className="h-4 w-4" /></Link><Link className="flex min-h-11 items-center justify-center rounded-md border border-line px-2 text-center text-sm font-bold text-ink hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand" href="/carrinho" onClick={onClose}>Ver cesta completa</Link><Dialog.Close className="min-h-11 cursor-pointer rounded-md px-2 text-sm font-semibold text-muted hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-brand">Continuar comprando</Dialog.Close></div></footer>}
    </Dialog.Content>
  </Dialog.Portal>;
}
