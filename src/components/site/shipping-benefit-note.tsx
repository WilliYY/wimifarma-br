import type { ShippingBenefit } from "@/features/shipping/benefit-policy";
import { formatCurrency } from "@/lib/utils";

export function ShippingBenefitNote({ benefit }: { benefit?: ShippingBenefit }) {
  if (!benefit) return <p className="mt-3 text-xs leading-5 text-muted">Consulte seu CEP para frete grátis. Os benefícios são conferidos na cotação.</p>;
  return <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-900">
    <p className="font-bold">{benefit.status === "free" ? "Frete grátis nesta cotação" : benefit.status === "discounted" ? "Desconto no frete nesta cotação" : "Frete consultado para este pedido"}</p>
    {benefit.subsidyCents > 0 && <p>A Wimifarma oferece {formatCurrency(benefit.subsidyCents / 100)} de benefício no frete.</p>}
    {benefit.minimumOrderCents !== null && benefit.remainingCents !== null && <p className="mt-1">Estimativa para frete grátis: pedido de {formatCurrency(benefit.minimumOrderCents / 100)}; faltam {formatCurrency(benefit.remainingCents / 100)} na composição atual.</p>}
    <p className="mt-1 text-muted">Estimativa da cotação atual. Alterar produtos, quantidades, créditos ou CEP exige nova consulta e pode mudar o benefício e a embalagem.</p>
  </div>;
}
