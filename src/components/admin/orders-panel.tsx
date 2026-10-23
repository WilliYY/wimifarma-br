"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminOrderShortageActions } from "./order-shortage-actions";
import type { ItemShortageSummary } from "@/features/store-credit/contracts";
import { getAdminOrderGroup, matchesAdminOrderSearch, type AdminOrderGroup } from "@/features/orders/admin-presentation";
import { getOrderSupplyGroups, supplierSourceLabel } from "@/features/orders/admin-supply";
import { OrderSupplyView } from "./order-supply-view";
import { OrderShippingSummary } from "./order-shipping-summary";
import { orderPostingLocation } from "@/features/shipping/posting";
import { shippingQuotePayloadSchema } from "@/features/shipping/schema";
import { orderPixDiscountCents } from "@/features/payments/pix-discount";
import {
  Banknote,
  ChevronDown,
  Bike,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  QrCode,
  Search,
  ShoppingBag,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
type FulfillmentMethod = "DELIVERY" | "PICKUP";
type PaymentMethod = "PIX" | "CARD_ON_DELIVERY" | "CASH" | "ONLINE";

export type AdminOrderRecord = {
  prescriptionUpload?: { id: string } | null;
  preparationReadyAt?: string | null;
  preparationDays?: number;
  onlinePayment?: { environment: string; status: string; statusDetail: string | null; providerOrderId: string | null } | null;
  shippingQuote?: unknown;
  cashbackRedeemedCents?: number;
  storeCreditRedeemedCents?: number;
  itemShortages?: ItemShortageSummary[];
  wimicoinsRedeemedPoints?: number;
  wimicoinsRedemptionState?: string;
  cashbackRedemptionState?: string;
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfillmentMethod: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  requiresPrescriptionReview: boolean;
  prescriptionReviewedAt: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  postalCode: string | null;
  street: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  privacyConsentAt: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    shortageQuantity?: number;
    inventorySource?: "PHARMACY" | "DISTRIBUTOR";
    supplierCode?: string | null;
    ean?: string | null;
    eanSource?: "offer" | "product" | null;
    id: string;
    orderId: string;
    productId: string | null;
    productName: string;
    productSlug: string;
    productImageUrl: string | null;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
    createdAt: string;
  }>;
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em separação",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};
const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelado",
  REFUNDED: "Estornado",
};
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "OUT_FOR_DELIVERY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};
const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "CANCELED"],
  PAID: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};
const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const groupLabels: Record<AdminOrderGroup, string> = { NEW: "Pedidos feitos", ACTIVE: "Em andamento", COMPLETED: "Concluídos", CANCELED: "Cancelados / estornados" };
const onlineStatusLabels: Record<string, string> = {
  REVIEW: "Conferência financeira necessária",
  NEW: "Aguardando pagamento", SUBMITTING: "Enviando pagamento", UNKNOWN: "Confirmação pendente",
  PENDING: "Aguardando pagamento", PAID: "Pagamento aprovado", FAILED: "Pagamento recusado",
  CANCELED: "Pagamento cancelado", REFUNDED: "Pagamento estornado", PARTIALLY_REFUNDED: "Reembolso parcial", DISPUTED: "Pagamento contestado",
};

export function OrdersPanel({ initialOrders, canManageCredits = false, miaubyOrderAlertsEnabled }: { initialOrders: AdminOrderRecord[]; canManageCredits?: boolean; miaubyOrderAlertsEnabled?: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  useEffect(() => setOrders(initialOrders), [initialOrders]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [group, setGroup] = useState<"ALL" | AdminOrderGroup>("ALL");
  const [postingCity, setPostingCity] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [view, setView] = useState<"orders" | "suppliers">("orders");
  const [page, setPage] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = filter === "ALL" || order.status === filter;
      return matchesStatus && (source === "ALL" || order.items.some(item => orderSourceKey(item) === source)) && (postingCity === "ALL" || postingCityKey(order.shippingQuote) === postingCity) && (group === "ALL" || getAdminOrderGroup(order) === group) && matchesAdminOrderSearch(order, search);
    }).sort((a, b) => {
      const priority: Record<AdminOrderGroup, number> = { NEW: 0, ACTIVE: 1, COMPLETED: 2, CANCELED: 3 };
      return priority[getAdminOrderGroup(a)] - priority[getAdminOrderGroup(b)] || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [filter, group, orders, search, postingCity, source]);
  const postingCities = [...new Set(orders.map(order => postingCityKey(order.shippingQuote)).filter((city): city is string => city !== null))].sort();
  const sources = [...new Map(orders.flatMap(order => order.items.map(item => [orderSourceKey(item), supplierSourceLabel(item)] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / 30));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = visibleOrders.slice((currentPage - 1) * 30, currentPage * 30);
  const supplyGroups = getOrderSupplyGroups(visibleOrders).filter(item => source === "ALL" || (item.key === "pharmacy" ? "PHARMACY" : item.supplierCode ?? "UNKNOWN") === source);

  const counts = orders.reduce((summary, order) => { summary[getAdminOrderGroup(order)] += 1; return summary; }, { NEW: 0, ACTIVE: 0, COMPLETED: 0, CANCELED: 0 });

  async function updateOrder(orderId: string, field: "status" | "paymentStatus" | "prescriptionReviewed", value: string | true) {
    setUpdatingId(orderId);
    setError("");
    try {
      const response = await fetch(`/api/pedidos/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar o pedido.");
      setOrders((current) => current.map((order) => order.id === orderId ? {
        ...order,
        status: payload.data.status,
        paymentStatus: payload.data.paymentStatus,
        prescriptionReviewedAt: payload.data.prescriptionReviewedAt,
        cashbackRedeemedCents: payload.data.cashbackRedeemedCents,
        wimicoinsRedeemedPoints: payload.data.wimicoinsRedeemedPoints,
        wimicoinsRedemptionState: payload.data.wimicoinsRedemptionState,
        cashbackRedemptionState: payload.data.cashbackRedemptionState,
        updatedAt: payload.data.updatedAt,
      } : order));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel atualizar o pedido.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section aria-label="Resumo dos pedidos carregados" className="grid grid-cols-2 divide-x divide-line overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-4">
        <Metric icon={Clock3} label="Pedidos feitos" tone="brand" value={counts.NEW} />
        <Metric icon={ShoppingBag} label="Em andamento" tone="green" value={counts.ACTIVE} />
        <Metric icon={PackageCheck} label="Concluídos" tone="green" value={counts.COMPLETED} />
        <Metric icon={XCircle} label="Cancelados / estornados" tone="neutral" value={counts.CANCELED} />
      </section>

      <section className="rounded-xl border border-line bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div aria-label="Forma de visualização" className="inline-flex rounded-lg bg-surface-subtle p-1">
            <button aria-pressed={view === "orders"} className={`min-h-10 rounded-md px-3 text-sm font-bold ${view === "orders" ? "bg-white text-brand shadow-sm" : "text-muted"}`} onClick={() => setView("orders")} type="button">Por pedido</button>
            <button aria-pressed={view === "suppliers"} className={`min-h-10 rounded-md px-3 text-sm font-bold ${view === "suppliers" ? "bg-white text-brand shadow-sm" : "text-muted"}`} onClick={() => setView("suppliers")} type="button">Por distribuidora</button>
          </div>
          <div className="flex items-center gap-3">
            {typeof miaubyOrderAlertsEnabled === "boolean" && <a className={`text-xs font-bold ${miaubyOrderAlertsEnabled ? "text-pharma-green" : "text-brand"}`} href="/admin/miauby">{miaubyOrderAlertsEnabled ? "Miauby · avisos habilitados" : "Miauby · avisos desativados"}</a>}
            <button aria-label="Atualizar pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-3 text-xs font-bold text-muted hover:bg-surface-subtle" onClick={() => router.refresh()} type="button"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>
          </div>
        </div>
        <div aria-label="Situação dos pedidos" className="mb-3 flex gap-1.5 overflow-x-auto sm:flex-wrap">
          {(["ALL", "NEW", "ACTIVE", "COMPLETED", "CANCELED"] as const).map(value => <button aria-pressed={group === value} className={`min-h-10 shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${group === value ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:bg-surface-subtle"}`} key={value} onClick={() => { setGroup(value); setFilter("ALL"); setPage(1); }} type="button">{value === "ALL" ? "Todos" : groupLabels[value]} <span className="ml-2 tabular-nums">{value === "ALL" ? orders.length : counts[value]}</span></button>)}
        </div>
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 gap-2"><label className="relative block min-w-0 flex-1"><span className="sr-only">Buscar pedido</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="h-11 w-full rounded-md border border-line pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pedido, cliente, produto ou EAN" value={search} /></label><button aria-controls="order-extra-filters" aria-expanded={advancedFilters} className="min-h-11 rounded-md border border-line px-3 text-xs font-bold text-muted sm:hidden" onClick={() => setAdvancedFilters(value => !value)} type="button">Filtros{filter !== "ALL" || source !== "ALL" || postingCity !== "ALL" ? " · ativos" : ""}</button></div>
          <div id="order-extra-filters" className={`${advancedFilters ? "grid" : "hidden"} gap-2 sm:grid sm:grid-cols-3`}>
          <label><span className="sr-only">Filtrar por status</span><select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-brand" onChange={(event) => { setFilter(event.target.value as "ALL" | OrderStatus); setPage(1); }} value={filter}><option value="ALL">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="sr-only">Filtrar por distribuidora</span><select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-brand" onChange={event => { setSource(event.target.value); setPage(1); }} value={source}><option value="ALL">Todas as origens</option>{sources.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span className="sr-only">Filtrar por cidade de postagem</span><select aria-label="Filtrar por cidade de postagem" className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-brand" onChange={event => { setPostingCity(event.target.value); setPage(1); }} value={postingCity}><option value="ALL">Todas as postagens</option>{postingCities.map(city => <option key={city} value={city}>{city === "PENDING" ? "Confirmação pendente" : city}</option>)}</select></label>
          </div>
        </div>
        <p aria-live="polite" className="mt-3 text-xs font-semibold text-muted">{visibleOrders.length} de {orders.length} pedidos carregados · {group === "ALL" ? "Todas as situações" : groupLabels[group]}</p>
        {error ? <p className="mt-3 rounded-md bg-brand-soft px-4 py-3 text-sm font-bold text-brand" role="alert">{error}</p> : null}
      </section>

      {view === "suppliers" ? <OrderSupplyView groups={supplyGroups} /> : visibleOrders.length === 0 ? <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white px-5 text-center text-sm font-semibold text-muted">Nenhum pedido encontrado.</div> : <section aria-label="Lista de pedidos" className="overflow-hidden rounded-xl border border-line bg-white">
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_7rem_1.25rem] gap-4 border-b border-line bg-surface-subtle px-4 py-2 text-[10px] font-black uppercase tracking-wide text-muted sm:grid"><span>Pedido e horário</span><span>Cliente e origem</span><span>Situação</span><span className="text-right">Total</span><span /></div>
        {pageOrders.map((order) => <OrderRow canManageCredits={canManageCredits} key={order.id} onUpdate={updateOrder} order={order} updating={updatingId === order.id} />)}
        <footer className="flex flex-wrap items-center justify-between gap-3 bg-surface-subtle px-4 py-3 text-xs font-semibold text-muted"><p>Página {currentPage} de {pageCount} · até 30 pedidos por página</p><nav aria-label="Páginas de pedidos" className="flex gap-2"><button aria-label="Página anterior" className="min-h-10 rounded-md border border-line bg-white px-3 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">Anterior</button><button aria-label="Próxima página" className="min-h-10 rounded-md border border-line bg-white px-3 disabled:opacity-40" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} type="button">Próxima</button></nav></footer>
      </section>}
    </div>
  );
}

function Metric({ icon: Icon, label, tone, value }: { icon: typeof ShoppingBag; label: string; tone: "brand" | "green" | "neutral"; value: number }) { const colors = tone === "brand" ? "bg-brand-soft text-brand" : tone === "green" ? "bg-emerald-50 text-pharma-green" : "bg-surface-subtle text-muted"; return <div className="flex items-center gap-3 px-3 py-3 sm:px-4"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colors}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><strong className="block text-xl font-black tabular-nums text-ink">{value}</strong><span className="block text-[11px] font-bold leading-4 text-muted">{label}</span></span></div>; }

function orderSourceKey(item: AdminOrderRecord["items"][number]) { return item.inventorySource === "DISTRIBUTOR" ? item.supplierCode ?? "UNKNOWN" : "PHARMACY"; }

function OrderRow(props: Parameters<typeof OrderCard>[0]) {
  const { order } = props;
  const [expanded, setExpanded] = useState(false);
  const online = order.onlinePayment;
  const sources = [...new Set(order.items.map(supplierSourceLabel))];
  const units = order.items.reduce((total, item) => total + Math.max(0, item.quantity - (item.shortageQuantity ?? 0)), 0);
  const attention = online?.environment === "test" ? "Homologação · não separar" : ["UNKNOWN", "SUBMITTING"].includes(online?.status ?? "") ? "Pagamento incerto · não separar" : online?.status === "REVIEW" ? "Conferir pagamento · não separar" : online?.status === "PARTIALLY_REFUNDED" ? "Reembolso parcial · conferir" : null;
  return <article data-order-id={order.id} className="border-b border-line last:border-b-0">
    <button aria-controls={`order-details-${order.id}`} aria-expanded={expanded} aria-label={`Ver detalhes do pedido ${order.number}`} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-3 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_7rem_1.25rem] sm:px-4 ${expanded ? "bg-brand-soft/50" : "bg-white"}`} onClick={() => setExpanded(value => !value)} type="button">
      <span className="min-w-0"><span role="heading" aria-level={2} className="block break-all text-[13px] font-black text-ink">{order.number}</span><span className="mt-1 block text-[11px] font-medium text-muted">{dateTime.format(new Date(order.createdAt))}</span></span>
      <span className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-auto"><span className="block truncate text-sm font-bold text-ink">{order.customerName}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{units} un. · {sources.slice(0, 2).join(" / ")}{sources.length > 2 ? ` +${sources.length - 2}` : ""}</span></span>
      <span className="col-span-2 flex min-w-0 flex-wrap gap-1 sm:col-span-1 sm:flex-col sm:items-start"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${getAdminOrderGroup(order) === "NEW" ? "bg-brand-soft text-brand" : getAdminOrderGroup(order) === "ACTIVE" ? "bg-emerald-50 text-pharma-green" : "bg-surface-subtle text-muted"}`}>{statusLabels[order.status]}</span><span className={`text-[10px] font-semibold ${order.paymentStatus === "PAID" && (!online || online.status === "PAID") ? "text-pharma-green" : "text-muted"}`}>{online ? onlineStatusLabels[online.status] ?? online.status : `Pagamento ${paymentStatusLabels[order.paymentStatus].toLowerCase()}`}</span>{attention && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">{attention}</span>}</span>
      <span className="col-start-2 row-start-1 text-right sm:col-start-auto sm:row-auto"><strong className="block whitespace-nowrap text-sm font-black tabular-nums text-ink">{currency.format(order.totalCents / 100)}</strong><span className="mt-1 block text-[10px] font-semibold text-muted">{order.fulfillmentMethod === "PICKUP" ? "Retirada" : "Entrega"}</span></span>
      <ChevronDown aria-hidden="true" className={`hidden h-4 w-4 text-muted transition-transform sm:block ${expanded ? "rotate-180" : ""}`} />
      <span className="col-span-2 text-[10px] font-bold text-brand sm:hidden">{expanded ? "Recolher detalhes" : "Ver itens e detalhes"}</span>
    </button>
    <div id={`order-details-${order.id}`}>{expanded && <OrderCard {...props} />}</div>
  </article>;
}

function postingCityKey(quote: unknown) {
  if (!shippingQuotePayloadSchema.safeParse(quote).success) return null;
  const location = orderPostingLocation(quote);
  return location ? `${location.city}/${location.state}` : "PENDING";
}

function OrderCard({ order, onUpdate, updating, canManageCredits }: { order: AdminOrderRecord; canManageCredits: boolean; onUpdate: (id: string, field: "status" | "paymentStatus" | "prescriptionReviewed", value: string | true) => void; updating: boolean }) {
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const payment = order.paymentMethod === "ONLINE" ? { icon: CreditCard, label: "Mercado Pago" } : order.paymentMethod === "PIX" ? { icon: QrCode, label: "Pix" } : order.paymentMethod === "CARD_ON_DELIVERY" ? { icon: CreditCard, label: "Cartao" } : { icon: Banknote, label: "Dinheiro" };
  const MethodIcon = order.fulfillmentMethod === "DELIVERY" ? Bike : Store;
  const PaymentIcon = payment.icon;
  const online = order.onlinePayment;
  const pixDiscount = orderPixDiscountCents(order);
  const paymentAllowedTransitions = order.paymentMethod !== "ONLINE" ? transitions[order.status] :
    online?.environment === "production" && online.status === "PAID" ? transitions[order.status].filter(status => status !== "CANCELED") : [];
  const allowedTransitions = paymentAllowedTransitions.filter(status => !order.requiresPrescriptionReview || order.prescriptionReviewedAt || !["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(status));
  return <div aria-label={`Detalhes do pedido ${order.number}`} className="min-w-0 overflow-hidden border-t border-line bg-white">
    <OrderShippingSummary quote={order.shippingQuote} />
    {order.preparationReadyAt && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Pedido com itens de distribuidor.</strong> Previsão de preparo: {new Date(order.preparationReadyAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}. Providencie a compra e conferência antes de liberar a retirada ou o envio.</p>}
    {online?.environment === "test" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 sm:mx-7">HOMOLOGAÇÃO — não separar nem entregar</p>}
    {online && ["UNKNOWN", "SUBMITTING"].includes(online.status) && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Confirmação pendente. Não cobre novamente nem libere o estoque sem conferir a tentativa no Mercado Pago.</p>}
    {online?.status === "PARTIALLY_REFUNDED" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Reembolso parcial: conferir valores e benefícios antes de continuar o atendimento.</p>}
    {online?.status === "REVIEW" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Conferência financeira necessária. Consulte a tentativa no gateway antes de continuar. Não cobre novamente nem libere o estoque enquanto a situação estiver incerta.</p>}
    {(order.wimicoinsRedeemedPoints ?? 0) > 0 ? <p className="border-b border-line bg-amber-50 px-5 py-3 text-sm text-amber-900">WimiCoins: <strong>{order.wimicoinsRedeemedPoints} pontos · {currency.format((order.wimicoinsRedeemedPoints ?? 0) / 100)}</strong> · {order.wimicoinsRedemptionState === "RETURNED" ? "Devolvidos ao cliente" : order.wimicoinsRedemptionState === "REDEEMED" ? "Utilizados" : "Reservados"}. O total já considera o desconto.</p> : null}
    {(order.storeCreditRedeemedCents ?? 0) > 0 && <p className="border-b border-line px-5 py-3 text-sm text-brand">Crédito de compra utilizado: <strong>{currency.format((order.storeCreditRedeemedCents ?? 0) / 100)}</strong>. O total já considera o desconto.</p>}
    <AdminOrderShortageActions order={order} canManageCredits={canManageCredits} />
    {(order.cashbackRedeemedCents ?? 0) > 0 ? <p className="border-b border-line bg-emerald-50 px-5 py-3 text-sm text-emerald-900">Desconto de cashback: <strong>{currency.format((order.cashbackRedeemedCents ?? 0) / 100)}</strong> · {order.cashbackRedemptionState === "RETURNED" ? "Devolvido ao cliente" : order.cashbackRedemptionState === "REDEEMED" ? "Utilizado" : "Reservado"}. O total ja considera o desconto.</p> : null}
    {pixDiscount > 0 && <p className="border-b border-line bg-emerald-50 px-5 py-3 text-sm text-emerald-900">Desconto no Pix: <strong>{currency.format(pixDiscount / 100)}</strong>. O total já considera este desconto.</p>}
    <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
      <div><p className="text-xs font-black uppercase text-muted">Cliente</p><p className="mt-2 font-black text-ink">{order.customerName}</p><a className="mt-1 block text-sm font-semibold text-brand" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>{order.customerEmail ? <p className="mt-1 break-all text-xs font-semibold text-muted">{order.customerEmail}</p> : null}</div>
      <div><p className="text-xs font-black uppercase text-muted">Atendimento</p><p className="mt-2 flex items-center gap-2 text-sm font-bold text-ink"><MethodIcon className="h-4 w-4 text-pharma-green" />{order.fulfillmentMethod === "DELIVERY" ? "Destinatário · entrega" : "Retirada"}</p>{order.fulfillmentMethod === "DELIVERY" ? <p className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.street}, {order.addressNumber}{order.complement ? ` - ${order.complement}` : ""}<br />{order.neighborhood}, {order.city}-{order.state}<br />CEP {order.postalCode}</p> : null}<p className="mt-3 flex items-center gap-2 text-sm font-bold text-ink"><PaymentIcon className="h-4 w-4 text-brand" />{payment.label} · {paymentStatusLabels[order.paymentStatus]}</p></div>
      <div><p className="text-xs font-black uppercase text-muted">Itens e fornecimento</p><div className="mt-2 grid gap-2">{order.items.map((item) => <div className="rounded-lg border border-line p-3 text-sm" key={item.id}><div className="flex justify-between gap-3"><span className="font-bold text-ink">{item.quantity} × {item.productName}</span><strong className="shrink-0 text-ink">{currency.format(item.totalCents / 100)}</strong></div><p className="mt-2 text-xs font-bold text-brand">{supplierSourceLabel(item)}</p><p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted"><span>{item.eanSource === "offer" ? "EAN da oferta vinculada" : "EAN cadastrado"}</span><span className="select-all font-mono font-semibold text-ink">{item.ean ?? "Não registrado"}</span></p>{(item.shortageQuantity ?? 0) > 0 && <p className="mt-1 text-xs text-amber-800">Original: {item.quantity} · Para entrega: {Math.max(0, item.quantity - (item.shortageQuantity ?? 0))}</p>}</div>)}</div>{order.notes ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900"><strong>Observacao:</strong> {order.notes}</p> : null}</div>
    </div>
    {order.requiresPrescriptionReview && <section aria-label="Conferência de receita" className="border-t border-line bg-amber-50 px-5 py-4 text-sm sm:px-7">
      {order.prescriptionUpload && <div className="mb-3"><a href={`/api/admin/receitas/${order.prescriptionUpload.id}`} className="font-bold underline">Baixar receita para pré-análise</a><p className="mt-2 text-sm">Foto não substitui o original. Valide a receita física ou o PDF original, retenção e escrituração antes de registrar a conferência. Pagamento não autoriza dispensação.</p></div>}
      <p className="font-bold text-amber-900">{order.prescriptionReviewedAt ? `Receita conferida pelo farmacêutico · registro em ${dateTime.format(new Date(order.prescriptionReviewedAt))}` : "Receita pendente de conferência farmacêutica"}</p>
      {!order.prescriptionReviewedAt && !["CANCELED", "COMPLETED"].includes(order.status) && <div className="mt-3 grid gap-3">
        <p className="text-sm text-amber-900">Registre somente após o farmacêutico responsável conferir a receita. O pagamento não libera a dispensação.</p>
        <label className="flex items-start gap-2 font-semibold text-amber-900"><input checked={reviewConfirmed} className="mt-1 h-4 w-4" disabled={updating} onChange={event => setReviewConfirmed(event.target.checked)} type="checkbox" />Farmacêutico conferiu a receita</label>
        <button className="min-h-11 w-fit rounded-xl bg-brand px-4 py-2 font-bold text-white disabled:opacity-60" disabled={updating || !reviewConfirmed || online?.environment === "test" || online?.statusDetail === "partially_refunded"} onClick={() => onUpdate(order.id, "prescriptionReviewed", true)} type="button">Registrar conferência farmacêutica</button>
      </div>}
    </section>}
    {online && <details className="group border-t border-line px-5 py-4 text-sm sm:px-7">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">Detalhes do pagamento · Mercado Pago<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
      <div className="mt-4 space-y-2 rounded-xl bg-surface-subtle p-4 text-sm text-ink">
        <p><strong>Situação:</strong> {onlineStatusLabels[online.status] ?? online.status}</p>
        <p className="break-all text-xs text-muted">Estado do provedor: {online.status}{online.statusDetail ? ` · ${online.statusDetail}` : ""} · {online.environment === "test" ? "Homologação" : "Produção"}</p>
        {online.providerOrderId && <p className="break-all text-xs text-muted">Referência no provedor: {online.providerOrderId}</p>}
        <p className="text-xs leading-5 text-muted">Pagamento atualizado pelo provedor. Cancelamentos e reembolsos são feitos no Mercado Pago; depois, aguarde a sincronização e atualize esta página.</p>
        <a className="inline-block font-bold text-brand underline underline-offset-4" href="https://www.mercadopago.com.br/activities" rel="noreferrer" target="_blank">Consultar no Mercado Pago</a>
      </div>
    </details>}
    <footer className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 sm:p-5"><label className="grid gap-1.5 text-xs font-black text-muted">Andamento<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink disabled:opacity-60" disabled={updating || allowedTransitions.length === 0} onChange={(event) => onUpdate(order.id, "status", event.target.value)} value={order.status}><option value={order.status}>{statusLabels[order.status]}</option>{allowedTransitions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><label className="grid gap-1.5 text-xs font-black text-muted">Pagamento<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink disabled:opacity-60" disabled={order.paymentMethod === "ONLINE" || updating || paymentTransitions[order.paymentStatus].length === 0} onChange={(event) => onUpdate(order.id, "paymentStatus", event.target.value)} value={order.paymentStatus}><option value={order.paymentStatus}>{paymentStatusLabels[order.paymentStatus]}</option>{paymentTransitions[order.paymentStatus].map((status) => <option key={status} value={status}>{paymentStatusLabels[status]}</option>)}</select></label>{updating ? <p className="text-xs font-bold text-muted">Salvando...</p> : null}</footer>
  </div>;
}
