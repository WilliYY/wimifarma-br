"use client";

import { OrderShortageActions } from "./order-shortage-actions";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleHelp, Clock3, CreditCard, MapPin, Package, RefreshCw, ShoppingBag, Store, Truck, XCircle } from "lucide-react";
import { useState } from "react";
import { getOrderTracking, orderPaymentLabels, type CustomerOrder, type CustomerOrderHistory, type OrderHistoryFilter } from "@/features/orders/customer-orders";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { orderPixDiscountCents } from "@/features/payments/pix-discount";

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

export function CustomerOrderCard({ order, featured = false, onShortageChanged }: { order: CustomerOrder; featured?: boolean; onShortageChanged?: () => void }) {
  const pixDiscount = orderPixDiscountCents(order);
  const tracking = getOrderTracking(order.status, order.fulfillmentMethod);
  const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
  const pickup = order.fulfillmentMethod === "PICKUP";
  const StatusIcon = tracking.canceled ? XCircle : order.status === "COMPLETED" ? CircleCheck : Clock3;
  const address = [order.street, order.addressNumber, order.complement, order.neighborhood, order.city, order.state].filter(Boolean).join(", ");
  const helpUrl = `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(`Olá! Gostaria de ajuda com meu pedido ${order.number}.`)}`;
  return <article aria-label={`Pedido ${order.number}`} className={cn("min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm", featured ? "border-brand/25" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-subtle px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", featured ? "bg-brand-soft text-brand" : "bg-slate-50 text-slate-600")}>
            {pickup ? <Store aria-hidden="true" className="h-5 w-5" /> : <Truck aria-hidden="true" className="h-5 w-5" />}
          </span>
          <div className="min-w-0"><p className="mb-1 text-xs font-medium text-muted">Pedido feito em {orderDate(order.createdAt)}</p><h3 className="break-all text-sm font-black text-ink">#{order.number}</h3></div>
        </div>
        <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold", tracking.canceled ? "border-slate-200 bg-slate-100 text-slate-700" : order.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900")}><StatusIcon aria-hidden="true" className="h-4 w-4 shrink-0" />{tracking.label}</span>
      </div>
    <div className="p-4 sm:p-5">
      {featured && <div className="mb-5 border-b border-line pb-4"><OrderTracking order={order} /></div>}
      <OrderShortageActions orderId={order.id} shortages={order.itemShortages ?? []} onChanged={onShortageChanged} />
      {order.preparationReadyAt && !tracking.canceled && order.status !== "COMPLETED" && <p className="mt-4 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-ink"><strong>Preparação prevista até {orderDate(order.preparationReadyAt, true)}.</strong> Avisaremos quando estiver pronto para retirada ou envio.</p>}
      {order.requiresPrescriptionReview && !tracking.canceled && order.status !== "COMPLETED" && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Apresente a receita à farmácia antes da entrega ou retirada. <a className="font-bold underline underline-offset-4" href={helpUrl} rel="noreferrer" target="_blank">Combine pelo WhatsApp com o número do pedido.</a></p>}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 gap-1.5">
            {order.items.slice(0, 2).map((item, index) => <span className={index ? "hidden sm:inline-flex" : "inline-flex"} key={item.id}><ProductThumbnail name={item.productName} src={item.productImageUrl} /></span>)}
          </div>
          <div className="min-w-0"><p className="line-clamp-2 break-words text-sm font-bold leading-5 text-ink">{order.items[0]?.productName ?? "Produtos da compra"}</p>{order.items.length > 1 && <p className="mt-1 text-xs text-muted">e mais {order.items.length - 1} {order.items.length === 2 ? "produto" : "produtos"}</p>}<p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">{pickup ? <Store aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <Truck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}{pickup ? "Retirada na loja" : "Entrega em casa"} · {quantity} {quantity === 1 ? "item" : "itens"}</p></div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:block sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right"><p className="text-xs font-medium text-muted">Total do pedido</p><p className="text-xl font-black tabular-nums text-ink sm:mt-1">{accountMoney(order.totalCents)}</p></div>
      </div>
    </div>
    <details className="group border-t border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-brand-soft/40 px-4 py-3 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand sm:px-5 [&::-webkit-details-marker]:hidden">
        Ver detalhes do pedido <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform motion-reduce:transition-none group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-line bg-surface-subtle/50 p-4 sm:p-5">
        {!featured && <section aria-label="Acompanhamento do pedido" className="rounded-xl border border-line bg-white p-4"><h4 className="text-sm font-black text-ink">Acompanhamento do pedido</h4><OrderTracking order={order} /></section>}
        <section aria-label="Itens do pedido" className="rounded-xl border border-line bg-white p-4"><h4 className="flex items-center gap-2 text-sm font-black text-ink"><ShoppingBag aria-hidden="true" className="h-4 w-4 text-brand" />Produtos da compra</h4>
        <ul aria-label="Produtos da compra" className="mt-2 divide-y divide-line">
          {order.items.map(item => <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 py-3 sm:flex sm:items-center" key={item.id}>
            <span className="row-span-2 self-start sm:self-center"><ProductThumbnail name={item.productName} src={item.productImageUrl} /></span>
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-ink">{item.productName}</p><p className="mt-1 text-xs text-muted">{item.quantity} × {accountMoney(item.unitPriceCents)}</p>{(item.shortageQuantity ?? 0) > 0 && <p className="mt-1 text-xs font-bold text-amber-900">Quantidade original: {item.quantity} · Para entrega: {Math.max(0, item.quantity - (item.shortageQuantity ?? 0))}</p>}</div>
            <span className="col-start-2 shrink-0 whitespace-nowrap text-sm font-bold tabular-nums">{accountMoney(item.totalCents)}</span>
          </li>)}
        </ul></section>
        <div className="grid gap-3 sm:grid-cols-2">
          <section aria-label={pickup ? "Retirada" : "Endereço da compra"} className="rounded-xl border border-line bg-white p-4"><h4 className="flex items-center gap-2 text-sm font-black"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />{pickup ? "Retirada" : "Endereço da compra"}</h4><p className="mt-3 break-words text-sm leading-6 text-muted">{pickup ? `Wimifarma · ${siteConfig.address}` : address || "Confirme o endereço com a equipe."}</p></section>
          <section aria-label="Pagamento" className="rounded-xl border border-line bg-white p-4"><h4 className="flex items-center gap-2 text-sm font-black"><CreditCard aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />Pagamento</h4><p className="mt-3 text-sm font-bold text-ink">{orderPaymentLabels[order.paymentStatus]}</p><p className="mt-1 text-sm text-muted">{order.paymentMethod === "ONLINE" ? "Mercado Pago" : order.paymentMethod === "PIX" ? "Pix" : order.paymentMethod === "CASH" ? "Dinheiro" : "Cartão na entrega / retirada"}</p></section>
        </div>
        <section aria-label="Resumo de valores" className="rounded-xl border border-line bg-white p-4"><h4 className="mb-4 text-sm font-black text-ink">Resumo de valores</h4><dl className="grid gap-3 text-sm tabular-nums [&_dd]:shrink-0 [&_dd]:whitespace-nowrap">
          <div className="flex justify-between gap-3"><dt className="text-muted">Produtos</dt><dd>{accountMoney(order.subtotalCents)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Entrega</dt><dd>{pickup ? "Retirada na loja" : order.deliveryFeeCents ? accountMoney(order.deliveryFeeCents) : "Sem taxa"}</dd></div>
          {(order.wimicoinsRedeemedPoints ?? 0) > 0 && <div className="flex justify-between gap-3 text-amber-800"><dt>WimiCoins utilizados</dt><dd>− {accountMoney(order.wimicoinsRedeemedPoints!)}</dd></div>}
          {order.cashbackRedeemedCents > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Desconto de cashback</dt><dd>− {accountMoney(order.cashbackRedeemedCents)}</dd></div>}
          {(order.storeCreditRedeemedCents ?? 0) > 0 && <div className="flex justify-between gap-3 text-brand"><dt>Crédito de compra utilizado</dt><dd>− {accountMoney(order.storeCreditRedeemedCents!)}</dd></div>}
          {pixDiscount > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Desconto no Pix</dt><dd>− {accountMoney(pixDiscount)}</dd></div>}
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-black"><dt>Total do pedido</dt><dd>{accountMoney(order.totalCents)}</dd></div>
        </dl></section>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a className={cn(actionClass, "border border-line bg-white text-ink hover:bg-slate-50")} href={helpUrl} target="_blank" rel="noopener noreferrer"><CircleHelp className="h-4 w-4" />Ajuda com este pedido</a>
          {order.paymentMethod === "ONLINE" && order.paymentStatus === "PENDING" && order.status === "PENDING" && <a className={cn(actionClass, "bg-brand text-white")} href={`/checkout/pagamento/${order.id}`}>Retomar pagamento <ArrowRight className="h-4 w-4" /></a>}
          {order.status === "COMPLETED" && order.paymentStatus === "PAID" && <Link className={cn(actionClass, "bg-brand-soft text-brand hover:bg-brand/10")} href="/minha-conta/avaliacoes">Avaliar produtos <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </div>
    </details>
  </article>;
}

export function CustomerOrderHistoryPanel({ history, loading, error, onLoad, onShortageChanged }: { history: CustomerOrderHistory; loading: boolean; error: string | null; onLoad: (filter: OrderHistoryFilter, page: number) => void; onShortageChanged?: () => void }) {
  const filters = [{ id: "all", label: "Todos", icon: ShoppingBag }, { id: "active", label: "Em andamento", icon: Clock3 }, { id: "completed", label: "Concluídos", icon: CircleCheck }, { id: "canceled", label: "Cancelados", icon: XCircle }] as const;
  const pageCount = Math.max(1, Math.ceil(history.total / history.pageSize));
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ShoppingBag className="h-5 w-5" /></span><div><h2 className="text-2xl font-black tracking-tight">Meus pedidos</h2><p className="mt-1 text-sm leading-6 text-muted">Acompanhe suas compras e encontre cada detalhe.</p></div></div>
      <button className={cn(actionClass, "border border-line disabled:opacity-50")} disabled={loading} onClick={() => onLoad(history.filter, history.page)} type="button"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin motion-reduce:animate-none")} />Atualizar pedidos</button>
    </div>
    <div aria-label="Filtrar pedidos" className="my-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {filters.map(filter => <button aria-label={`${filter.label} ${history.counts[filter.id]}`} aria-pressed={history.filter === filter.id} className={cn(actionClass, "min-w-0 flex-col items-start gap-3 border px-3 py-3 text-left disabled:opacity-50 sm:px-4", history.filter === filter.id ? "border-brand/40 bg-brand-soft text-brand shadow-sm" : "border-line bg-white text-slate-700 hover:border-brand/30 hover:bg-surface-subtle")} disabled={loading} key={filter.id} onClick={() => onLoad(filter.id, 1)} type="button"><span className="flex w-full items-center justify-between gap-2"><filter.icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="text-xl font-black tabular-nums">{history.counts[filter.id]}</span></span><span className="text-xs font-bold sm:text-sm">{filter.label}</span></button>)}
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <p aria-live="polite" className="sr-only">{loading ? "Consultando pedidos…" : `${history.total} pedidos encontrados. Página ${history.page}.`}</p>
    <div aria-busy={loading} className={cn("grid gap-4", loading && "opacity-60")}>
      {history.orders.length ? history.orders.map(order => <CustomerOrderCard key={order.id} order={order} onShortageChanged={onShortageChanged} />) : <div className="rounded-2xl border border-dashed border-line bg-slate-50/60 px-5 py-12 text-center">
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
