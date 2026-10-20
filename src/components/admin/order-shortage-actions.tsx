"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOrderRecord } from "./orders-panel";
import { OrderShortageActions } from "@/components/site/order-shortage-actions";

export function AdminOrderShortageActions({ order, canManageCredits }: { order: AdminOrderRecord; canManageCredits: boolean }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const sending = useRef(false);
  useEffect(() => { setSubmitted(false); setQuantity({}); }, [order.updatedAt]);
  const canPropose = canManageCredits && order.customerId && order.paymentStatus === "PAID" && ["PENDING", "CONFIRMED", "PREPARING"].includes(order.status);
  async function propose(orderItemId: string) {
    if (sending.current || submitted) return;
    sending.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/pedidos/${order.id}/faltas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderItemId, quantity: quantity[orderItemId] ?? 1, expectedUpdatedAt: order.updatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Não foi possível registrar a falta. Atualize o pedido.");
      setSubmitted(true); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível registrar a falta. Atualize o pedido."); }
    finally { sending.current = false; setPending(false); }
  }
  return <div className="px-5 pb-5 sm:px-7">
    <OrderShortageActions orderId={order.id} shortages={order.itemShortages ?? []} readOnly />
    {canPropose && <details className="mt-4 rounded-xl border border-line p-4"><summary className="min-h-11 cursor-pointer text-sm font-bold">Registrar falta da distribuidora</summary>
      <p className="mb-3 text-xs leading-5 text-muted">O cliente decide entre crédito e solicitação de reembolso. Valor calculado ao enviar.</p>
      {order.items.filter(item => item.inventorySource === "DISTRIBUTOR").map(item => {
        const proposed = (order.itemShortages ?? []).filter(shortage => shortage.orderItemId === item.id && ["PROPOSED", "REFUND_REQUESTED"].includes(shortage.status)).reduce((sum, shortage) => sum + shortage.quantity, 0);
        const maximum = item.quantity - (item.shortageQuantity ?? 0) - proposed;
        if (maximum <= 0) return null;
        return <div className="mb-3 flex flex-wrap items-end gap-3" key={item.id}><label className="min-w-0 flex-1 text-sm font-bold"><span className="block break-words">{item.productName}</span><span className="my-1 block text-xs text-muted">Quantidade faltante (máximo {maximum})</span><input aria-label={`Quantidade faltante de ${item.productName}`} className="min-h-11 w-full rounded-xl border border-line px-3" type="number" min={1} max={maximum} step={1} value={quantity[item.id] ?? 1} disabled={pending || submitted} onChange={event => setQuantity(current => ({ ...current, [item.id]: Number(event.target.value) }))} /></label><button type="button" className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={pending || submitted || !Number.isInteger(quantity[item.id] ?? 1) || (quantity[item.id] ?? 1) < 1 || (quantity[item.id] ?? 1) > maximum} onClick={() => void propose(item.id)}>Propor escolha ao cliente</button></div>;
      })}
      {submitted && <p role="status" className="text-sm font-bold text-emerald-800">Proposta registrada. O pedido está sendo atualizado.</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </details>}
  </div>;
}
