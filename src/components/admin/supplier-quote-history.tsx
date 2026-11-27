"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type QuoteObservation = {
  id: string; supplier: string; observedAt: string; unitCostCents: number | null; stockQuantity: number | null;
  status: string; promotion: boolean; basisAfterCents: number | null; displayPriceCents?: number | null;
};

const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const money = (cents: number) => formatCurrency(cents / 100);

export const observationLabels: Record<string, string> = {
  APPLIED: "Conferência aplicada",
  DROP_WITHIN_TOLERANCE: "Queda de até 15% · base mantida",
  DROP_BASE_KEPT: "Queda acima de 15% · base mantida",
  SPIKE_REVIEW: "Aumento fora do padrão · revise o custo antes de confirmar",
  PROMOTION_RECORDED: "Promoção registrada no histórico",
  INELIGIBLE: "Condição comercial pendente de validação",
  ACTIVE_RESERVATION: "Oferta preservada por pagamento em andamento",
  OPEN_ORDER: "Código preservado por pedido em aberto",
  OLDER_OBSERVATION: "Já existe uma conferência mais recente",
  UNAVAILABLE: "Falta informada pelo fornecedor · oferta anterior preservada",
  WITHDRAWN: "Oferta retirada na conferência manual",
  DISPLAY_PRICE_ONLY: "Preço exibido pela ANB · unidade e condição a conferir",
};

export function SupplierQuoteHistory({ history, ean, basis }: { history: QuoteObservation[]; ean: string; basis: number | null }) {
  const daily = new Map<string, { day: string; cost: number | null; basis: number | null; displayed: number | null }>();
  for (const row of history) {
    const day = dayFormat.format(new Date(row.observedAt));
    if (!daily.has(day)) daily.set(day, { day, cost: null, basis: null, displayed: null });
    const point = daily.get(day)!;
    point.basis ??= row.basisAfterCents;
    if (row.status === "DISPLAY_PRICE_ONLY") point.displayed ??= row.displayPriceCents ?? null;
    if (row.unitCostCents !== null && ["APPLIED", "DROP_WITHIN_TOLERANCE", "DROP_BASE_KEPT", "ACTIVE_RESERVATION"].includes(row.status)) {
      point.cost = Math.min(point.cost ?? row.unitCostCents, row.unitCostCents);
    }
  }
  const chart = [...daily.values()].reverse();
  const regularCosts = chart.flatMap(point => point.cost === null ? [] : [point.cost]).sort((a, b) => a - b);
  const midpoint = Math.floor(regularCosts.length / 2);
  const median = regularCosts.length >= 5 ? Math.round((regularCosts[midpoint] + regularCosts[Math.floor((regularCosts.length - 1) / 2)]) / 2) : null;

  return <details className="rounded-lg border border-line bg-white p-3">
    <summary className="cursor-pointer font-bold text-ink">Histórico de custo e disponibilidade</summary>
    <div className="mt-3 space-y-3 text-xs font-normal text-muted">
      <p>EAN {ean} · Últimos 30 dias · Custo-base atual {basis === null ? "a definir" : money(basis)}</p>
      {history.length === 0 ? <p>As novas conferências deste EAN aparecerão aqui.</p> : <>
        {chart.some(point => point.cost !== null || point.displayed !== null) && <div className="h-40 min-w-0" aria-label="Gráfico de custo regular, custo-base e preço exibido pela ANB">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ top: 8, left: 5, right: 10, bottom: 5 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={money} width={72} tick={{ fontSize: 10 }} />
            <Tooltip formatter={value => money(Number(value))} />
            <Line type="linear" dataKey="cost" name="Menor custo regular" stroke="#0f766e" dot={{ r: 3 }} isAnimationActive={false} />
            <Line type="linear" dataKey="basis" name="Custo-base" stroke="#c8102e" dot={{ r: 3 }} isAnimationActive={false} />
            <Line type="linear" dataKey="displayed" name="Preço exibido pela ANB" stroke="#92400e" strokeDasharray="4 3" dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart></ResponsiveContainer>
        </div>}
        <p><span className="font-semibold text-teal-700">Menor custo regular por dia</span> · <span className="font-semibold text-brand">Custo-base</span>{chart.some(point => point.displayed !== null) && <span className="font-semibold text-amber-800"> · Preço exibido pela ANB</span>}{median !== null ? ` · Mediana dos dias com custo regular: ${money(median)}` : " · Mediana disponível após 5 dias com cotação regular"}</p>
        <div className="max-h-48 overflow-auto rounded-md border border-line">
          <table className="w-full min-w-80 text-left">
            <thead className="sticky top-0 bg-white text-ink"><tr><th className="p-2">Conferência</th><th className="p-2">Valor</th><th className="p-2">Situação</th></tr></thead>
            <tbody>{history.map(row => {
              const amount = row.unitCostCents ?? row.displayPriceCents;
              return <tr key={row.id} className="border-t border-line"><td className="p-2">{dateTimeFormat.format(new Date(row.observedAt))} · {row.supplier}</td><td className="whitespace-nowrap p-2 tabular-nums">{amount == null ? "—" : money(amount)}</td><td className="p-2">{observationLabels[row.status] ?? row.status}{row.stockQuantity === null ? "" : ` · saldo ${row.stockQuantity}`}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </>}
    </div>
  </details>;
}
