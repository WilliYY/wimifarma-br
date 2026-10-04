"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DirectoryPerson } from "@/features/admin-users/directory";
import { formatCurrency } from "@/lib/utils";

type Purchase = { id: string; number: string; createdAt: string; status: string; paymentStatus: string;
  subtotalCents: number; deliveryFeeCents: number; totalCents: number; fulfillmentMethod: string;
  items: { productName: string; quantity: number; totalCents: number }[] };
const statuses: Record<string, string> = { PENDING: "Recebido", CONFIRMED: "Confirmado", PREPARING: "Preparando", READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega", COMPLETED: "Concluído", CANCELED: "Cancelado" };
const payments: Record<string, string> = { PENDING: "Pagamento pendente", PAID: "Pago", CANCELED: "Pagamento cancelado", REFUNDED: "Reembolsado" };
type History = { orders: Purchase[]; total: number; pageSize: number };

export function CustomerPurchaseHistory({ person, month, onClose }: { person: DirectoryPerson | null; month: string; onClose: () => void }) {
  const [data, setData] = useState<History | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { setPage(1); }, [person?.id, month]);
  useEffect(() => {
    if (!person) return;
    const controller = new AbortController();
    setLoading(true); setData(null); setError("");
    void fetch(`/api/admin/pessoas/${encodeURIComponent(person.id)}/compras?${new URLSearchParams({ month, page: String(page) })}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); if (!controller.signal.aborted) setData(body); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Histórico indisponível."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [person, month, page]);
  return <Dialog open={Boolean(person)} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="min-w-0 rounded-2xl">
    <DialogHeader><DialogTitle>Histórico de compras</DialogTitle><DialogDescription className="break-words">{person?.name} · {month ? month.split("-").reverse().join("/") : "Todos os meses"}. Pedidos recebidos e cancelados também aparecem aqui; só concluídos e pagos entram no ranking.</DialogDescription></DialogHeader>
    {loading && <p role="status" className="py-6 text-sm text-muted">Carregando compras…</p>}
    {error && <p role="alert" className="text-sm text-brand">{error}</p>}
    {data && !data.orders.length && <p className="py-6 text-sm text-muted">Nenhuma compra neste período.</p>}
    <div className="grid min-w-0 gap-4">{data?.orders.map(order => <article key={order.id} className="min-w-0 rounded-xl border border-line p-4">
      <header className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="break-all font-bold">{order.number}</p><p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p></div><strong className="text-lg text-brand">{formatCurrency(order.totalCents / 100)}</strong></header>
      <div className="my-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-surface-subtle px-3 py-1.5">{statuses[order.status] ?? order.status}</span><span className={`rounded-full px-3 py-1.5 ${order.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-800" : "bg-brand-soft text-brand"}`}>{payments[order.paymentStatus] ?? order.paymentStatus}</span></div>
      <details><summary className="cursor-pointer text-sm font-semibold">{order.items.reduce((sum, item) => sum + item.quantity, 0)} itens · {order.fulfillmentMethod === "PICKUP" ? "Retirada" : "Entrega"}</summary><ul className="mt-3 grid gap-2 text-sm">{order.items.map((item, index) => <li key={index} className="flex min-w-0 justify-between gap-3"><span className="min-w-0 break-words">{item.quantity}x {item.productName}</span><span className="shrink-0">{formatCurrency(item.totalCents / 100)}</span></li>)}</ul><p className="mt-3 text-xs text-muted">Produtos {formatCurrency(order.subtotalCents / 100)} · Frete {formatCurrency(order.deliveryFeeCents / 100)}</p></details>
    </article>)}</div>
    {data && data.total > data.pageSize && <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</Button><span className="text-sm">{page} de {Math.ceil(data.total / data.pageSize)}</span><Button variant="secondary" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage(value => value + 1)}>Próxima</Button></div>}
  </DialogContent></Dialog>;
}
