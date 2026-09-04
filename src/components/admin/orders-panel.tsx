"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Bike,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  QrCode,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
type FulfillmentMethod = "DELIVERY" | "PICKUP";
type PaymentMethod = "PIX" | "CARD_ON_DELIVERY" | "CASH";

export type AdminOrderRecord = {
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
  PREPARING: "Em separacao",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluido",
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

export function OrdersPanel({ initialOrders }: { initialOrders: AdminOrderRecord[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = filter === "ALL" || order.status === filter;
      const matchesSearch = !term || [order.number, order.customerName, order.customerPhone, ...order.items.map((item) => item.productName)].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filter, orders, search]);

  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const activeCount = orders.filter((order) => !["COMPLETED", "CANCELED"].includes(order.status)).length;

  async function updateOrder(orderId: string, field: "status" | "paymentStatus", value: string) {
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
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, [field]: payload.data[field], updatedAt: payload.data.updatedAt } : order));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel atualizar o pedido.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <Metric icon={Clock3} label="Aguardando confirmacao" tone="brand" value={pendingCount} />
        <Metric icon={PackageCheck} label="Em andamento" tone="green" value={activeCount} />
        <Metric icon={ShoppingBag} label="Pedidos carregados" tone="neutral" value={orders.length} />
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
          <label className="relative block"><span className="sr-only">Buscar pedido</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="h-11 w-full rounded-md border border-line pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" onChange={(event) => setSearch(event.target.value)} placeholder="Numero, cliente, telefone ou produto" value={search} /></label>
          <label><span className="sr-only">Filtrar por status</span><select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-brand" onChange={(event) => setFilter(event.target.value as "ALL" | OrderStatus)} value={filter}><option value="ALL">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {error ? <p className="mt-3 rounded-md bg-brand-soft px-4 py-3 text-sm font-bold text-brand" role="alert">{error}</p> : null}
      </section>

      {visibleOrders.length === 0 ? <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white px-5 text-center text-sm font-semibold text-muted">Nenhum pedido encontrado.</div> : <section className="grid gap-4">{visibleOrders.map((order) => <OrderCard key={order.id} onUpdate={updateOrder} order={order} updating={updatingId === order.id} />)}</section>}
    </div>
  );
}

function Metric({ icon: Icon, label, tone, value }: { icon: typeof ShoppingBag; label: string; tone: "brand" | "green" | "neutral"; value: number }) { const colors = tone === "brand" ? "bg-brand-soft text-brand" : tone === "green" ? "bg-[#e9f9ef] text-pharma-green" : "bg-surface-subtle text-muted"; return <div className="flex items-center gap-4 rounded-lg border border-line bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-md ${colors}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl font-black text-ink">{value}</strong><span className="text-xs font-bold text-muted">{label}</span></span></div>; }

function OrderCard({ order, onUpdate, updating }: { order: AdminOrderRecord; onUpdate: (id: string, field: "status" | "paymentStatus", value: string) => void; updating: boolean }) {
  const payment = order.paymentMethod === "PIX" ? { icon: QrCode, label: "Pix" } : order.paymentMethod === "CARD_ON_DELIVERY" ? { icon: CreditCard, label: "Cartao" } : { icon: Banknote, label: "Dinheiro" };
  const MethodIcon = order.fulfillmentMethod === "DELIVERY" ? Bike : Store;
  const PaymentIcon = payment.icon;
  return <article className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
    <header className="flex flex-col gap-4 border-b border-line bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black text-ink">{order.number}</h2><span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase ${order.status === "PENDING" ? "bg-brand-soft text-brand" : order.status === "COMPLETED" ? "bg-[#e9f9ef] text-pharma-green" : order.status === "CANCELED" ? "bg-slate-200 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{statusLabels[order.status]}</span></div><p className="mt-1 text-xs font-semibold text-muted">{dateTime.format(new Date(order.createdAt))}</p></div><strong className="text-xl font-black text-brand">{currency.format(order.totalCents / 100)}</strong></header>
    <div className="grid gap-6 p-4 sm:p-5 xl:grid-cols-[1fr_1fr_1.3fr]">
      <div><p className="text-xs font-black uppercase text-muted">Cliente</p><p className="mt-2 font-black text-ink">{order.customerName}</p><a className="mt-1 block text-sm font-semibold text-brand" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>{order.customerEmail ? <p className="mt-1 break-all text-xs font-semibold text-muted">{order.customerEmail}</p> : null}</div>
      <div><p className="text-xs font-black uppercase text-muted">Atendimento</p><p className="mt-2 flex items-center gap-2 text-sm font-bold text-ink"><MethodIcon className="h-4 w-4 text-pharma-green" />{order.fulfillmentMethod === "DELIVERY" ? "Entrega" : "Retirada"}</p>{order.fulfillmentMethod === "DELIVERY" ? <p className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.street}, {order.addressNumber}{order.complement ? ` - ${order.complement}` : ""}<br />{order.neighborhood}, {order.city}-{order.state}<br />CEP {order.postalCode}</p> : null}<p className="mt-3 flex items-center gap-2 text-sm font-bold text-ink"><PaymentIcon className="h-4 w-4 text-brand" />{payment.label} · {paymentStatusLabels[order.paymentStatus]}</p></div>
      <div><p className="text-xs font-black uppercase text-muted">Itens</p><div className="mt-2 grid gap-2">{order.items.map((item) => <div className="flex justify-between gap-4 text-sm" key={item.id}><span className="font-semibold text-ink">{item.quantity}x {item.productName}</span><strong className="shrink-0 text-ink">{currency.format(item.totalCents / 100)}</strong></div>)}</div>{order.notes ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900"><strong>Observacao:</strong> {order.notes}</p> : null}</div>
    </div>
    <footer className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 sm:p-5"><label className="grid gap-1.5 text-xs font-black text-muted">Andamento<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink disabled:opacity-60" disabled={updating || transitions[order.status].length === 0} onChange={(event) => onUpdate(order.id, "status", event.target.value)} value={order.status}><option value={order.status}>{statusLabels[order.status]}</option>{transitions[order.status].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><label className="grid gap-1.5 text-xs font-black text-muted">Pagamento<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold text-ink disabled:opacity-60" disabled={updating || paymentTransitions[order.paymentStatus].length === 0} onChange={(event) => onUpdate(order.id, "paymentStatus", event.target.value)} value={order.paymentStatus}><option value={order.paymentStatus}>{paymentStatusLabels[order.paymentStatus]}</option>{paymentTransitions[order.paymentStatus].map((status) => <option key={status} value={status}>{paymentStatusLabels[status]}</option>)}</select></label>{updating ? <p className="text-xs font-bold text-muted">Salvando...</p> : null}</footer>
  </article>;
}
