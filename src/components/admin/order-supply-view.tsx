import { groupOrderItemsBySource } from "@/features/orders/admin-presentation";
import type { AdminOrderRecord } from "./orders-panel";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function OrderSupplyView({ items }: { items: AdminOrderRecord["items"] }) {
  return <section aria-label="Itens por origem" className="space-y-3">
    {groupOrderItemsBySource(items).map(group => <section aria-label={group.label} className="overflow-hidden rounded-lg border border-line" key={group.key}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-subtle px-3 py-2">
        <h3 className="text-xs font-black text-ink">{group.label}</h3>
        <span className="text-xs font-semibold text-muted">{group.items.reduce((total, item) => total + Math.max(0, item.quantity - (item.shortageQuantity ?? 0)), 0)} un. para atendimento</span>
      </header>
      <div className="divide-y divide-line">{group.items.map(item => <div className="min-w-0 px-3 py-2.5" key={item.id}>
        <div className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 font-bold leading-5 text-ink">{item.productName}</span><strong className="shrink-0 tabular-nums text-ink">{currency.format(item.totalCents / 100)}</strong></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-xs"><span className="block text-[10px] font-semibold text-muted">{item.eanSource === "offer" ? "EAN da oferta vinculada" : "EAN cadastrado"}</span><span className="select-all break-all font-mono font-semibold text-ink">{item.ean ?? "Não registrado"}</span></div>
          <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-semibold text-ink">Qtd. <strong className="tabular-nums">{Math.max(0, item.quantity - (item.shortageQuantity ?? 0))}</strong></span>
        </div>
        {(item.shortageQuantity ?? 0) > 0 && <p className="mt-1 text-xs text-amber-800">Original: {item.quantity} · Faltas registradas: {item.shortageQuantity}</p>}
      </div>)}</div>
    </section>)}
    <p className="text-[11px] leading-5 text-muted">Confira pagamento, EAN e disponibilidade antes da aquisição. Esta lista não envia compras às distribuidoras.</p>
  </section>;
}
