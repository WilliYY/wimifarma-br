"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, MapPin, Package, RefreshCw, ShoppingBag, Store, Truck } from "lucide-react";
import { useState } from "react";
import { getOrderTracking, orderPaymentLabels, type CustomerOrder, type CustomerOrderHistory, type OrderHistoryFilter } from "@/features/orders/customer-orders";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const accountMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const orderDate = (value: string, time = false) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "America/Sao_Paulo" }).format(new Date(value));
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

function ProductThumbnail({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-1.5">
    {src && !failed ? /* eslint-disable-next-line @next/next/no-img-element */
      <img alt={name} className="h-full w-full object-contain" loading="lazy" onError={() => setFailed(true)} src={src} /> : <ShoppingBag aria-hidden="true" className="h-5 w-5 text-muted" />}
  </span>;
}

export function OrderTracking({ order }: { order: CustomerOrder }) {
  const tracking = getOrderTracking(order.status, order.fulfillmentMethod);
  return <div>
    {!tracking.canceled && <ol aria-label="Etapas do pedido" className="my-5 grid grid-cols-5">
      {tracking.steps.map((step, index) => <li aria-label={step} aria-current={index === tracking.currentStep ? "step" : undefined} className="relative min-w-0 text-center" key={step}>
        {index < tracking.steps.length - 1 && <span aria-hidden="true" className={cn("absolute left-1/2 right-[-50%] top-3.5 h-0.5", index < tracking.currentStep ? "bg-emerald-500" : "bg-slate-200")} />}
        <span aria-hidden="true" className={cn("relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ring-4 ring-white", index < tracking.currentStep ? "bg-emerald-600 text-white" : index === tracking.currentStep ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}>
          {index < tracking.currentStep ? <Check className="h-4 w-4" /> : index + 1}
        </span>
        <span className={cn("relative mt-2 hidden px-0.5 text-xs font-bold leading-4 sm:block", index === tracking.currentStep ? "text-brand" : "text-muted")}>{step}</span>
      </li>)}
    </ol>}
    {!tracking.canceled && <p className="mb-2 text-xs font-bold text-brand sm:hidden">Etapa {tracking.currentStep + 1} de {tracking.steps.length} · {tracking.steps[tracking.currentStep]}</p>}
    <p className="text-sm leading-6 text-muted">{tracking.description}</p>
    <p className="mt-2 text-xs leading-5 text-muted">Atualização do pedido: {orderDate(order.updatedAt, true)}. Andamento informado pela farmácia.</p>
  </div>;
}

export function CustomerOrderCard({ order, featured = false }: { order: CustomerOrder; featured?: boolean }) {
  const tracking = getOrderTracking(order.status, order.fulfillmentMethod);
  const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
  const pickup = order.fulfillmentMethod === "PICKUP";
  const address = [order.street, order.addressNumber, order.complement, order.neighborhood, order.city, order.state].filter(Boolean).join(", ");
  const helpUrl = `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(`Olá! Gostaria de ajuda com meu pedido ${order.number}.`)}`;
  return <article aria-label={`Pedido ${order.number}`} className={cn("min-w-0 overflow-hidden rounded-2xl border bg-white", featured ? "border-brand/20 shadow-[0_10px_35px_rgba(17,24,39,0.04)]" : "border-line")}>
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", featured ? "bg-brand-soft text-brand" : "bg-slate-50 text-slate-600")}>
            {pickup ? <Store aria-hidden="true" className="h-5 w-5" /> : <Truck aria-hidden="true" className="h-5 w-5" />}
          </span>
          <div className="min-w-0"><h3 className="break-all text-sm font-black text-ink">#{order.number}</h3><p className="mt-1 text-xs text-muted">{orderDate(order.createdAt)} · {pickup ? "Retirada na loja" : "Entrega em casa"}</p></div>
        </div>
        <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", tracking.canceled ? "bg-slate-100 text-slate-600" : order.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>{tracking.label}</span>
      </div>
      {featured && <OrderTracking order={order} />}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {order.items.slice(0, 3).map(item => <ProductThumbnail key={item.id} name={item.productName} src={item.productImageUrl} />)}
          {order.items.length > 3 && <span className="text-xs font-bold text-muted">+{order.items.length - 3}</span>}
        </div>
        <div><p className="text-xs text-muted">{quantity} {quantity === 1 ? "item" : "itens"}</p><p className="text-xl font-black text-ink">{accountMoney(order.totalCents)}</p></div>
      </div>
    </div>
    <details className="group border-t border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand sm:px-6 [&::-webkit-details-marker]:hidden">
        Ver detalhes do pedido <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform motion-reduce:transition-none group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-line px-4 pb-5 pt-3 sm:px-6">
        {!featured && <OrderTracking order={order} />}
        <ul aria-label="Produtos da compra" className="divide-y divide-line">
          {order.items.map(item => <li className="flex items-center gap-3 py-3" key={item.id}>
            <ProductThumbnail name={item.productName} src={item.productImageUrl} />
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-ink">{item.productName}</p><p className="mt-1 text-xs text-muted">{item.quantity} × {accountMoney(item.unitPriceCents)}</p></div>
            <span className="shrink-0 text-sm font-bold">{accountMoney(item.totalCents)}</span>
          </li>)}
        </ul>
        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div><p className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-brand" />{pickup ? "Retirada" : "Endereço da compra"}</p><p className="mt-2 break-words text-sm leading-6 text-muted">{pickup ? `Wimifarma · ${siteConfig.address}` : address || "Confirme o endereço com a equipe."}</p></div>
          <div><p className="text-sm font-bold">{orderPaymentLabels[order.paymentStatus]}</p><p className="mt-2 text-sm text-muted">{order.paymentMethod === "PIX" ? "Pix" : order.paymentMethod === "CASH" ? "Dinheiro" : "Cartão na entrega / retirada"}</p></div>
        </div>
        <dl className="ml-auto grid max-w-sm gap-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">Produtos</dt><dd>{accountMoney(order.subtotalCents)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Entrega</dt><dd>{pickup ? "Retirada na loja" : order.deliveryFeeCents ? accountMoney(order.deliveryFeeCents) : "Sem taxa"}</dd></div>
          {order.cashbackRedeemedCents > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Desconto de cashback</dt><dd>− {accountMoney(order.cashbackRedeemedCents)}</dd></div>}
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-black"><dt>Total do pedido</dt><dd>{accountMoney(order.totalCents)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <a className={cn(actionClass, "border border-line bg-white text-ink hover:bg-slate-50")} href={helpUrl} target="_blank" rel="noopener noreferrer"><CircleHelp className="h-4 w-4" />Ajuda com este pedido</a>
          {order.status === "COMPLETED" && order.paymentStatus === "PAID" && <Link className={cn(actionClass, "bg-brand-soft text-brand hover:bg-brand/10")} href="/minha-conta/avaliacoes">Avaliar produtos <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </div>
    </details>
  </article>;
}

export function CustomerOrderHistoryPanel({ history, loading, error, onLoad }: { history: CustomerOrderHistory; loading: boolean; error: string | null; onLoad: (filter: OrderHistoryFilter, page: number) => void }) {
  const filters = [{ id: "all", label: "Todos" }, { id: "active", label: "Em andamento" }, { id: "completed", label: "Concluídos" }, { id: "canceled", label: "Cancelados" }] as const;
  const pageCount = Math.max(1, Math.ceil(history.total / history.pageSize));
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-black tracking-tight">Meus pedidos</h2><p className="mt-2 text-sm leading-6 text-muted">Suas compras e cada próximo passo, em um só lugar.</p></div>
      <button className={cn(actionClass, "border border-line disabled:opacity-50")} disabled={loading} onClick={() => onLoad(history.filter, history.page)} type="button"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin motion-reduce:animate-none")} />Atualizar pedidos</button>
    </div>
    <div aria-label="Filtrar pedidos" className="my-5 flex flex-wrap gap-2">
      {filters.map(filter => <button aria-pressed={history.filter === filter.id} className={cn(actionClass, "px-3 text-xs disabled:opacity-50", history.filter === filter.id ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")} disabled={loading} key={filter.id} onClick={() => onLoad(filter.id, 1)} type="button">{filter.label}<span className="opacity-70">{history.counts[filter.id]}</span></button>)}
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <p aria-live="polite" className="sr-only">{loading ? "Consultando pedidos…" : `${history.total} pedidos encontrados. Página ${history.page}.`}</p>
    <div aria-busy={loading} className={cn("grid gap-4", loading && "opacity-60")}>
      {history.orders.length ? history.orders.map(order => <CustomerOrderCard key={order.id} order={order} />) : <div className="rounded-2xl border border-dashed border-line bg-slate-50/60 px-5 py-12 text-center">
        <Package aria-hidden="true" className="mx-auto h-10 w-10 text-brand/60" /><h3 className="mt-4 text-lg font-black">{history.filter === "all" ? "Sua próxima compra começa aqui" : "Nenhum pedido neste filtro"}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{history.filter === "all" ? "As compras feitas com esta conta aparecerão aqui para você acompanhar." : "Veja os outros filtros para consultar seu histórico."}</p>
        <Link className={cn(actionClass, "mt-5 bg-brand text-white hover:bg-brand-dark")} href="/catalogo">Explorar produtos <ArrowRight className="h-4 w-4" /></Link>
      </div>}
    </div>
    {pageCount > 1 && <nav aria-label="Páginas de pedidos" className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <button aria-label="Página anterior de pedidos" className={cn(actionClass, "border border-line disabled:opacity-40")} disabled={loading || history.page <= 1} onClick={() => onLoad(history.filter, history.page - 1)} type="button"><ChevronLeft className="h-4 w-4" />Anterior</button>
      <span className="text-xs text-muted">{history.page} de {pageCount}</span>
      <button aria-label="Próxima página de pedidos" className={cn(actionClass, "border border-line disabled:opacity-40")} disabled={loading || history.page >= pageCount || history.page >= 1000} onClick={() => onLoad(history.filter, history.page + 1)} type="button">Próxima<ChevronRight className="h-4 w-4" /></button>
    </nav>}
    <p className="mt-5 text-xs leading-5 text-muted">Aqui aparecem pedidos feitos com login nesta conta. Para compras feitas sem login ou na loja física, fale com a equipe.</p>
  </div>;
}
