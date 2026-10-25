"use client";

import { defaultShippingBenefitPolicy, type ShippingBenefitPolicy } from "@/features/shipping/benefit-policy";

const fields = [
  ["maximumSubsidyCents", "Limite de subsídio por pedido (R$)", 100, 100000],
  ["minimumContributionBps", "Contribuição mínima projetada (%)", 100, 90],
  ["variableCostReserveBps", "Reserva de custos variáveis (%)", 100, 90],
  ["packagingCostCents", "Embalagem e proteção por volume (R$)", 100, 100000],
] as const;

export function ShippingBenefitFields({ value = defaultShippingBenefitPolicy, onChange }: { value?: ShippingBenefitPolicy; onChange: (policy: ShippingBenefitPolicy) => void }) {
  return <fieldset className="grid min-w-0 gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
    <legend className="px-1 text-sm font-black">Benefício de frete conforme a margem</legend>
    <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 accent-brand focus-visible:ring-2 focus-visible:ring-brand" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} type="checkbox" /><span><strong>Aplicar benefício nas cotações elegíveis</strong><span className="mt-1 block text-xs leading-5 text-muted">O servidor preserva a contribuição projetada e limita o subsídio. A margem projetada não é lucro garantido.</span></span></label>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">{fields.map(([key, label, scale, max]) => <label className="grid min-w-0 gap-2 text-sm font-semibold" key={key}><span>{label}</span><input className="min-h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" type="number" inputMode="decimal" min={0} max={max} step="0.01" required={value.enabled} placeholder="Não confirmado" value={value[key] === null ? "" : value[key] / scale} onChange={event => onChange({ ...value, [key]: event.target.value === "" ? null : Math.round(Number(event.target.value) * scale) })} /></label>)}
      <label className="grid min-w-0 gap-2 text-sm font-semibold"><span>Validade do custo de aquisição (horas)</span><input className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/20" min={1} max={168} step={1} required type="number" value={value.costMaxAgeHours} onChange={event => onChange({ ...value, costMaxAgeHours: Number(event.target.value) })} /></label>
    </div>
    <p className="text-xs leading-5 text-muted">Vazio significa desconhecido. Informe zero somente quando confirmado. Contribuição e reserva somadas devem ficar abaixo de 100%.</p>
    <p className="text-xs leading-5 text-muted">O custo de embalagem é multiplicado pelos volumes cotados. Confirme proteção e custo dos formatos utilizados antes de informar um valor geral; o custo de uma caixa não comprova o dos demais pacotes.</p>
    <p className="text-xs leading-5 text-muted">A reserva ADMIN deve abranger taxas fixas, taxas de pagamento e parcelamento, tributos e revisão de retornos, sem duplicar custos da rota. Revise esses valores com os responsáveis financeiros.</p>
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Subsídio exige custo de aquisição atual, embalagem e custos operacionais completos na rota vigente. Valores desconhecidos ou pendentes bloqueiam o benefício; não significam custo zero.</p>
  </fieldset>;
}
