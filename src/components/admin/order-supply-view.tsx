import type { OrderSupplyGroup } from "@/features/orders/admin-supply";

export function OrderSupplyView({ groups }: { groups: OrderSupplyGroup[] }) {
  return <section aria-label="Conferência por distribuidora" className="space-y-3">
    <div className="rounded-xl border border-line bg-white px-4 py-3 text-xs leading-5 text-muted"><p className="font-bold text-ink">Itens dos pedidos em aberto, reunidos por origem e apresentação.</p><p>Pedidos pendentes de pagamento continuam identificados para conferência.</p><p>Confira pagamento, EAN e disponibilidade antes da aquisição. Esta lista não envia pedidos às distribuidoras.</p></div>
    {!groups.length && <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">Nenhum item em aberto para conferir nos filtros selecionados.</p>}
    {groups.map(group => <section className="overflow-hidden rounded-xl border border-line bg-white" key={group.key}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-subtle px-4 py-3"><h2 className="text-sm font-black text-ink">{group.label}</h2><span className="text-xs font-semibold text-muted">{group.items.length} apresentações · {group.items.reduce((total, item) => total + item.quantity, 0)} un. a conferir</span></header>
      <div className="divide-y divide-line">{group.items.map(item => <div className="grid min-w-0 gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_5rem] sm:gap-x-5" key={item.key}>
        <div className="min-w-0"><h3 className="text-sm font-bold text-ink">{item.name}</h3><p className="mt-1 text-[11px] text-muted">{item.orders.length} pedido(s) · {item.paidQuantity} un. com pagamento confirmado{item.quantity > item.paidQuantity ? ` · ${item.quantity - item.paidQuantity} un. aguardando conferência` : ""}</p></div>
        <div className="text-xs"><span className="block text-[10px] font-bold text-muted">{item.eanSource === "offer" ? "EAN da oferta vinculada" : "EAN cadastrado"}</span><span className="mt-1 block select-all break-all font-mono font-semibold text-ink">{item.ean ?? "Não registrado"}</span></div>
        <div className="flex items-baseline gap-2 sm:block sm:text-right"><span className="text-[10px] font-bold text-muted">Quantidade</span><strong className="text-xl font-black tabular-nums text-brand sm:block">{item.quantity}</strong></div>
        <div className="flex flex-wrap gap-1.5 sm:col-span-3">{item.orders.map((order, index) => <span className={`break-all rounded-md px-2 py-1 text-[10px] font-semibold ${order.needsReview ? "bg-amber-50 text-amber-900" : order.paid ? "bg-emerald-50 text-pharma-green" : "bg-surface-subtle text-muted"}`} key={`${order.number}:${index}`}>{order.number} · {order.quantity} un. · {order.needsReview ? "Conferir pagamento" : order.paid ? "Pago" : "Pagamento pendente"}</span>)}</div>
      </div>)}</div>
    </section>)}
  </section>;
}
