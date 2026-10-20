"use client";

import { useState } from "react";
import type { ShippingOption, ShippingSettings } from "@/features/shipping/schema";
import { postingLocationSchema } from "@/features/shipping/schema";
import type { ShippingCargo } from "@/features/shipping/cargo-policy";
import { shippingOperationalCostSchema, type ShippingOperationalCost } from "@/features/shipping/operational-cost-schema";
import { shippingOperationalRouteKey } from "@/features/shipping/operational-cost";
import { buildShippingComparisons } from "@/features/shipping/carrier-comparison";

const field = "min-h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const amount = (cents: number | null) => cents === null ? "Pendente" : money.format(cents / 100);
const costFields = [
  ["tripCostCents", "Deslocamento por viagem de ida e volta (R$)"],
  ["collectionFeeCents", "Coleta adicional por encomenda (R$)"],
  ["extraInsuranceCents", "Seguro externo adicional por encomenda (R$)"],
  ["returnReserveCents", "Provisão interna de retorno por encomenda (R$)"],
  ["otherFeesCents", "Outros adicionais por encomenda (R$)"],
] as const;

function emptyCost(serviceId: number, routeKey: string): ShippingOperationalCost {
  return { serviceId, routeKey, tripCostCents: null, parcelsPerTrip: 1, collectionFeeCents: null, extraInsuranceCents: null, returnReserveCents: null, otherFeesCents: null };
}

export function ShippingOperationalCostFields({ settings, services, disabled, onChange }: {
  settings: ShippingSettings;
  services: Array<Pick<ShippingOption, "serviceId" | "carrier" | "service">>;
  disabled: boolean;
  onChange: (next: ShippingSettings) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const choices = new Map(services.map(service => [service.serviceId, `${service.carrier} · ${service.service}`]));
  for (const id of [...settings.serviceIds, ...(settings.operationalCosts ?? []).map(entry => entry.serviceId), ...settings.postingLocations.map(entry => entry.serviceId)]) {
    if (!choices.has(id)) choices.set(id, `Serviço ${id}`);
  }
  const serviceId = selected !== null && choices.has(selected) ? selected : choices.keys().next().value as number | undefined;
  const location = settings.postingLocations.find(entry => entry.serviceId === serviceId);
  const raw = settings.operationalCosts?.find(entry => entry.serviceId === serviceId);
  // Keep other draft values visible while the operator clears/retypes the trip count.
  // The estimator still validates the original record and leaves its total pending.
  const parsed = shippingOperationalCostSchema.safeParse(raw && { ...raw, parcelsPerTrip: raw.parcelsPerTrip ?? 1 });
  const routeKey = serviceId === undefined ? "" : shippingOperationalRouteKey(settings, serviceId);
  const current = parsed.success && routeKey && parsed.data.routeKey === routeKey ? { ...parsed.data, parcelsPerTrip: raw?.parcelsPerTrip ?? null } : null;
  function changeCost(key: typeof costFields[number][0] | "parcelsPerTrip", value: string) {
    if (serviceId === undefined) return;
    const numeric = value.trim() === "" ? null : Number(value);
    const valid = numeric !== null && Number.isFinite(numeric) && numeric >= 0 && (key === "parcelsPerTrip" ? Number.isInteger(numeric) && numeric >= 1 && numeric <= 1000 : numeric <= 100000);
    const nextValue = valid ? key === "parcelsPerTrip" ? numeric : Math.round(numeric * 100) : null;
    const next = { ...(current ?? emptyCost(serviceId, routeKey)), [key]: nextValue, routeKey };
    onChange({ ...settings, operationalCosts: [...(settings.operationalCosts ?? []).filter(entry => entry.serviceId !== serviceId), next as ShippingOperationalCost] });
  }
  function changeLocation(key: "city" | "state" | "pointName", value: string) {
    if (serviceId === undefined) return;
    const next = { serviceId, city: location?.city ?? "", state: location?.state ?? settings.originState, pointName: location?.pointName ?? "", [key]: value };
    onChange({ ...settings, postingLocations: [...settings.postingLocations.filter(entry => entry.serviceId !== serviceId), next] });
  }
  return <section aria-label="Planejamento de custos operacionais" className="min-w-0 rounded-xl border border-line p-4">
    <h3 className="text-base font-black text-ink">Custos operacionais por rota</h3>
    <p className="mt-2 text-sm leading-6 text-muted">Valores reais em reais (R$). Deixe em branco quando desconhecido; informe 0 quando não houver custo. Planejar uma rota não seleciona nem ativa o serviço.</p>
    <label className="mt-4 grid min-w-0 gap-2 text-xs font-bold text-muted">Serviço para planejar custos<select className={field} disabled={disabled || !choices.size} onChange={event => setSelected(Number(event.target.value))} value={serviceId ?? ""}>{!choices.size && <option value="">Consulte os serviços primeiro</option>}{[...choices].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {serviceId !== undefined && <>
      <p className="mt-3 text-xs leading-5 text-muted">{settings.serviceIds.includes(serviceId) ? "Serviço selecionado no painel. Confira a rota atual antes de salvar." : "Serviço ainda não selecionado. Esta rota serve somente para planejamento."}</p>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 gap-2 text-xs font-bold text-muted">Cidade planejada de postagem/coleta<input className={field} disabled={disabled} maxLength={100} onChange={event => changeLocation("city", event.target.value)} value={location?.city ?? ""} /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-muted">UF planejada de postagem/coleta<select className={field} disabled={disabled} onChange={event => changeLocation("state", event.target.value)} value={location?.state ?? settings.originState}>{postingLocationSchema.shape.state.options.map(state => <option key={state}>{state}</option>)}</select></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-muted">Ponto planejado de postagem/coleta<input className={field} disabled={disabled} maxLength={160} onChange={event => changeLocation("pointName", event.target.value)} value={location?.pointName ?? ""} /></label>
        {costFields.map(([key, label]) => <label className="grid min-w-0 gap-2 text-xs font-bold text-muted" key={key}>{label}<input className={field} disabled={disabled} inputMode="decimal" type="number" min="0" max="100000" step="0.01" placeholder="Desconhecido" onChange={event => changeCost(key, event.target.value)} value={current?.[key] == null ? "" : current[key] / 100} /></label>)}
        <label className="grid min-w-0 gap-2 text-xs font-bold text-muted">Encomendas por viagem<input className={field} disabled={disabled} type="number" min="1" max="1000" step="1" onChange={event => changeCost("parcelsPerTrip", event.target.value)} value={current?.parcelsPerTrip ?? ""} placeholder="Informe o rateio" /></label>
      </div>
      {raw && !current && <p className="mt-3 text-xs text-amber-900">Custos pendentes de revisão para esta rota. A primeira edição inicia os valores da nova rota em branco.</p>}
    </>}
    <p className="mt-3 text-xs leading-5 text-muted">O deslocamento considera ida e volta e é dividido pelas encomendas da viagem. O valor segurado da mercadoria não é prêmio: informe apenas seguro externo adicional, sem repetir seguro incluído na etiqueta. A provisão de retorno é uma estimativa interna, não uma tarifa obrigatória do Melhor Envio. A isenção de tarifa de devolução informada pelo Melhor Envio não representa reembolso do frete de ida nem logística reversa gratuita. Podem existir ajustes após a postagem.</p>
    <p className="mt-3 text-xs font-bold text-muted">Use “Salvar configuração” para persistir. A prévia usa os valores da tela; não compra etiquetas nem altera a cobrança ao cliente.</p>
  </section>;
}

export function ShippingCostComparisons({ quotes, settings, cargoKinds, acceptanceConfirmed, disabled, onToggleService }: {
  quotes: ShippingOption[]; settings: ShippingSettings; cargoKinds: ShippingCargo[];
  acceptanceConfirmed: boolean; disabled: boolean; onToggleService: (id: number, selected: boolean) => void;
}) {
  const comparisons = buildShippingComparisons(quotes, settings, cargoKinds, acceptanceConfirmed);
  const statuses = { allowed: "Categoria aceita", conditional: "Aceitação condicionada", blocked: "Transporte bloqueado", unknown: "Aceitação não comprovada" };
  return <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">{comparisons.map(({ quote, cargo, cost, bestKnownCost }) => {
    const selected = settings.serviceIds.includes(quote.serviceId);
    const blocked = cargo.status === "blocked" || cargo.status === "unknown";
    const selectionPending = blocked || (cargo.status === "conditional" && !acceptanceConfirmed);
    return <article className="min-w-0 rounded-xl border border-line p-4 text-sm" key={quote.serviceId}>
      <label className="flex min-w-0 items-start gap-3"><input aria-label={`Selecionar ${quote.carrier} · ${quote.service}`} checked={selected} className="mt-1 h-4 w-4 shrink-0 accent-brand" disabled={disabled || (!selected && selectionPending)} onChange={event => onToggleService(quote.serviceId, event.target.checked)} type="checkbox" /><span className="min-w-0 break-words"><strong>{quote.carrier} · {quote.service}</strong><span className="mt-1 block text-muted">Até {quote.deliveryDays} dias úteis estimados, com preparação</span></span></label>
      <p className="mt-3 font-bold text-brand">Etiqueta: {amount(quote.priceCents)}</p>
      <p className="mt-2 font-black text-ink">{cost.complete ? `Custo total estimado: ${amount(cost.totalCostCents)}` : `Subtotal conhecido: ${amount(cost.knownSubtotalCents)}`}</p>
      {bestKnownCost && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Menor custo entre rotas completas</p>}
      <p className="mt-3 break-words text-xs text-muted">{cost.route ? `Postagem/coleta em ${cost.route.city}/${cost.route.state}${cost.route.pointName ? ` · ${cost.route.pointName}` : ""}${cost.route.requiresTravel ? " · exige deslocamento" : ""}` : "Local de postagem: confirmação pendente"}</p>
      <dl className="mt-3 space-y-1 text-xs text-muted">{([
        ["Deslocamento rateado", cost.travelAllocatedCents], ["Coleta adicional", cost.collectionFeeCents],
        ["Seguro externo adicional", cost.extraInsuranceCents], ["Provisão interna de retorno", cost.returnReserveCents], ["Outros adicionais", cost.otherFeesCents],
      ] as const).map(([label, value]) => <div className="flex flex-wrap justify-between gap-x-2" key={label}><dt>{label}</dt><dd>{amount(value)}</dd></div>)}</dl>
      {!cost.complete && <p className="mt-3 text-xs leading-5 text-amber-900">Pendências: {cost.missing.join("; ")}.</p>}
      <p className={`mt-3 text-xs font-bold ${blocked ? "text-amber-900" : "text-muted"}`}>{statuses[cargo.status]}</p>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-muted">{cargo.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      {cargo.status === "conditional" && !acceptanceConfirmed && <p className="mt-2 text-xs text-amber-900">Confirme a revisão da aceitação para considerar esta rota na recomendação.</p>}
    </article>;
  })}</div>;
}
