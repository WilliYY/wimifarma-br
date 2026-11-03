import type { ShippingBenefit } from "@/features/shipping/benefit-policy";
import { formatCurrency } from "@/lib/utils";

export function ShippingBenefitNote({ benefit, service }: { benefit?: ShippingBenefit; service?: string }) {
  if (!benefit) return <p className="mt-3 text-xs leading-5 text-muted">Consulte seu CEP para frete grátis. Os benefícios são conferidos na cotação.</p>;
  const hasGoal = benefit.status !== "free" && Number.isSafeInteger(benefit.minimumOrderCents) && (benefit.minimumOrderCents ?? 0) > 0 && Number.isSafeInteger(benefit.remainingCents) && (benefit.remainingCents ?? 0) > 0;
  return <div className="mt-3 min-w-0 break-words rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-900" role="status">
    <p className="font-bold">{benefit.status === "free" ? "Frete grátis nesta cotação" : benefit.status === "discounted" ? "Desconto no frete nesta cotação" : "Frete consultado para este pedido"}</p>
    {service && <p>Modalidade: {service}. Confira o preço de cada opção abaixo.</p>}
    {benefit.subsidyCents > 0 && <p>A Wimifarma oferece {formatCurrency(benefit.subsidyCents / 100)} de benefício no frete.</p>}
    {hasGoal && <p className="mt-1">Estimativa para frete grátis: pedido de {formatCurrency(benefit.minimumOrderCents! / 100)}; faltam {formatCurrency(benefit.remainingCents! / 100)} na composição atual.</p>}
    <p className="mt-1 text-muted">Estimativa da cotação atual. Alterar produtos, quantidades, créditos ou CEP exige nova consulta e pode mudar o benefício e a embalagem.</p>
  </div>;
}
