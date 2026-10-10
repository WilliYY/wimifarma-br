"use client";

import { useMemo, useState } from "react";
import { getAdminOrderGroup, matchesAdminOrderSearch, type AdminOrderGroup } from "@/features/orders/admin-presentation";
import { OrderShippingSummary } from "./order-shipping-summary";
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
  Store,
  XCircle,
} from "lucide-react";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
type FulfillmentMethod = "DELIVERY" | "PICKUP";
type PaymentMethod = "PIX" | "CARD_ON_DELIVERY" | "CASH" | "ONLINE";

export type AdminOrderRecord = {
  onlinePayment?: { environment: string; status: string; statusDetail: string | null; providerOrderId: string | null } | null;
  shippingQuote?: unknown;
  cashbackRedeemedCents?: number;
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
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const groupLabels: Record<AdminOrderGroup, string> = { NEW: "Pedidos feitos", ACTIVE: "Em andamento", COMPLETED: "Concluídos", CANCELED: "Cancelados / estornados" };
const onlineStatusLabels: Record<string, string> = {
  REVIEW: "Conferência financeira necessária",
  NEW: "Aguardando pagamento", SUBMITTING: "Enviando pagamento", UNKNOWN: "Confirmação pendente",
  PENDING: "Aguardando pagamento", PAID: "Pagamento aprovado", FAILED: "Pagamento recusado",
  CANCELED: "Pagamento cancelado", REFUNDED: "Pagamento estornado", PARTIALLY_REFUNDED: "Reembolso parcial", DISPUTED: "Pagamento contestado",
};

export function OrdersPanel({ initialOrders }: { initialOrders: AdminOrderRecord[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [group, setGroup] = useState<"ALL" | AdminOrderGroup>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = filter === "ALL" || order.status === filter;
      return matchesStatus && (group === "ALL" || getAdminOrderGroup(order) === group) && matchesAdminOrderSearch(order, search);
    });
  }, [filter, group, orders, search]);

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
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Clock3} label="Pedidos feitos" tone="brand" value={counts.NEW} />
        <Metric icon={ShoppingBag} label="Em andamento" tone="green" value={counts.ACTIVE} />
        <Metric icon={PackageCheck} label="Concluídos" tone="green" value={counts.COMPLETED} />
        <Metric icon={XCircle} label="Cancelados / estornados" tone="neutral" value={counts.CANCELED} />
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
        <div aria-label="Situação dos pedidos" className="mb-5 flex flex-wrap gap-2">
          {(["ALL", "NEW", "ACTIVE", "COMPLETED", "CANCELED"] as const).map(value => <button aria-pressed={group === value} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${group === value ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:bg-surface-subtle"}`} key={value} onClick={() => { setGroup(value); setFilter("ALL"); }} type="button">{value === "ALL" ? "Todos" : groupLabels[value]} <span className="ml-2 tabular-nums">{value === "ALL" ? orders.length : counts[value]}</span></button>)}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
          <label className="relative block"><span className="sr-only">Buscar pedido</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="h-11 w-full rounded-md border border-line pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" onChange={(event) => setSearch(event.target.value)} placeholder="Número, cliente, telefone ou produto" value={search} /></label>
          <label><span className="sr-only">Filtrar por status</span><select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-brand" onChange={(event) => setFilter(event.target.value as "ALL" | OrderStatus)} value={filter}><option value="ALL">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <p aria-live="polite" className="mt-3 text-xs font-semibold text-muted">{visibleOrders.length} de {orders.length} pedidos carregados · {group === "ALL" ? "Todas as situações" : groupLabels[group]}</p>
        {error ? <p className="mt-3 rounded-md bg-brand-soft px-4 py-3 text-sm font-bold text-brand" role="alert">{error}</p> : null}
      </section>

      {visibleOrders.length === 0 ? <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white px-5 text-center text-sm font-semibold text-muted">Nenhum pedido encontrado.</div> : <section className="grid gap-4">{visibleOrders.map((order) => <OrderCard key={order.id} onUpdate={updateOrder} order={order} updating={updatingId === order.id} />)}</section>}
    </div>
  );
}

function Metric({ icon: Icon, label, tone, value }: { icon: typeof ShoppingBag; label: string; tone: "brand" | "green" | "neutral"; value: number }) { const colors = tone === "brand" ? "bg-brand-soft text-brand" : tone === "green" ? "bg-[#e9f9ef] text-pharma-green" : "bg-surface-subtle text-muted"; return <div className="flex items-center gap-4 rounded-lg border border-line bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-md ${colors}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl font-black text-ink">{value}</strong><span className="text-xs font-bold text-muted">{label}</span></span></div>; }

function OrderCard({ order, onUpdate, updating }: { order: AdminOrderRecord; onUpdate: (id: string, field: "status" | "paymentStatus" | "prescriptionReviewed", value: string | true) => void; updating: boolean }) {
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const payment = order.paymentMethod === "ONLINE" ? { icon: CreditCard, label: "Mercado Pago" } : order.paymentMethod === "PIX" ? { icon: QrCode, label: "Pix" } : order.paymentMethod === "CARD_ON_DELIVERY" ? { icon: CreditCard, label: "Cartao" } : { icon: Banknote, label: "Dinheiro" };
  const MethodIcon = order.fulfillmentMethod === "DELIVERY" ? Bike : Store;
  const PaymentIcon = payment.icon;
  const online = order.onlinePayment;
  const paymentAllowedTransitions = order.paymentMethod !== "ONLINE" ? transitions[order.status] :
    online?.environment === "production" && online.status === "PAID" ? transitions[order.status].filter(status => status !== "CANCELED") : [];
  const allowedTransitions = paymentAllowedTransitions.filter(status => !order.requiresPrescriptionReview || order.prescriptionReviewedAt || !["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(status));
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
    <header className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="break-all text-lg font-black text-ink sm:text-xl">{order.number}</h2><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.status === "PENDING" ? "bg-brand-soft text-brand" : order.status === "COMPLETED" ? "bg-[#e9f9ef] text-pharma-green" : order.status === "CANCELED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{statusLabels[order.status]}</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.paymentStatus === "PAID" && (!online || online.status === "PAID") ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{online ? onlineStatusLabels[online.status] ?? online.status : `Pagamento ${paymentStatusLabels[order.paymentStatus].toLowerCase()}`}</span></div><p className="mt-2 text-sm font-medium text-muted">{dateTime.format(new Date(order.createdAt))}</p></div><div className="shrink-0"><p className="text-xs font-semibold text-muted sm:text-right">Total do pedido</p><strong className="text-2xl font-black text-ink">{currency.format(order.totalCents / 100)}</strong></div></header>
    {online?.environment === "test" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 sm:mx-7">HOMOLOGAÇÃO — não separar nem entregar</p>}
    {online && ["UNKNOWN", "SUBMITTING"].includes(online.status) && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Confirmação pendente. Não cobre novamente nem libere o estoque sem conferir a tentativa no Mercado Pago.</p>}
    {online?.status === "PARTIALLY_REFUNDED" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Reembolso parcial: conferir valores e benefícios antes de continuar o atendimento.</p>}
    {online?.status === "REVIEW" && <p className="mx-5 mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:mx-7">Conferência financeira necessária. Consulte a tentativa no gateway antes de continuar. Não cobre novamente nem libere o estoque enquanto a situação estiver incerta.</p>}
    {(order.cashbackRedeemedCents ?? 0) > 0 ? <p className="border-b border-line bg-emerald-50 px-5 py-3 text-sm text-emerald-900">Desconto de cashback: <strong>{currency.format((order.cashbackRedeemedCents ?? 0) / 100)}</strong> · {order.cashbackRedemptionState === "RETURNED" ? "Devolvido ao cliente" : order.cashbackRedemptionState === "REDEEMED" ? "Utilizado" : "Reservado"}. O total ja considera o desconto.</p> : null}
    <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
      <div><p className="text-xs font-black uppercase text-muted">Cliente</p><p className="mt-2 font-black text-ink">{order.customerName}</p><a className="mt-1 block text-sm font-semibold text-brand" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>{order.customerEmail ? <p className="mt-1 break-all text-xs font-semibold text-muted">{order.customerEmail}</p> : null}</div>
      <div><p className="text-xs font-black uppercase text-muted">Atendimento</p><p className="mt-2 flex items-center gap-2 text-sm font-bold text-ink"><MethodIcon className="h-4 w-4 text-pharma-green" />{order.fulfillmentMethod === "DELIVERY" ? "Entrega" : "Retirada"}</p>{order.fulfillmentMethod === "DELIVERY" ? <p className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.street}, {order.addressNumber}{order.complement ? ` - ${order.complement}` : ""}<br />{order.neighborhood}, {order.city}-{order.state}<br />CEP {order.postalCode}</p> : null}<p className="mt-3 flex items-center gap-2 text-sm font-bold text-ink"><PaymentIcon className="h-4 w-4 text-brand" />{payment.label} · {paymentStatusLabels[order.paymentStatus]}</p></div>
      <div><p className="text-xs font-black uppercase text-muted">Itens</p><div className="mt-2 grid gap-2">{order.items.map((item) => <div className="flex justify-between gap-4 text-sm" key={item.id}><span className="font-semibold text-ink">{item.quantity}x {item.productName}</span><strong className="shrink-0 text-ink">{currency.format(item.totalCents / 100)}</strong></div>)}</div>{order.notes ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900"><strong>Observacao:</strong> {order.notes}</p> : null}</div>
    </div>
    <OrderShippingSummary quote={order.shippingQuote} />
    {order.requiresPrescriptionReview && <section aria-label="Conferência de receita" className="border-t border-line bg-amber-50 px-5 py-4 text-sm sm:px-7">
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
  </article>;
}
