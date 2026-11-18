import { Check, Truck } from "lucide-react";
import type { CSSProperties } from "react";
import type { ShippingBenefit } from "@/features/shipping/benefit-policy";
import type { ShippingOption } from "@/features/shipping/schema";
import { formatPostalCode } from "@/features/products/product-detail";
import { formatCurrency } from "@/lib/utils";

function benefitProgress(benefit: ShippingBenefit) {
  const { minimumOrderCents: minimum, remainingCents: remaining } = benefit;
  const hasGoal = minimum !== null && remaining !== null
    && Number.isSafeInteger(minimum) && Number.isSafeInteger(remaining)
    && minimum > 0 && remaining > 0 && remaining <= minimum;
  return benefit.status === "free" ? 100 : hasGoal ? Math.floor(((minimum - remaining) * 100) / minimum) : null;
}

export function ShippingFreeProgress({ options, postalCode, localCity }: {
  options: readonly ShippingOption[];
  postalCode: string;
  localCity?: string | null;
}) {
  const goals = options.filter(option => option.benefit && benefitProgress(option.benefit) !== null);
  const selected = goals.reduce<ShippingOption | undefined>((best, option) => {
    const remaining = option.benefit?.status === "free" ? 0 : option.benefit!.remainingCents!;
    const bestRemaining = best?.benefit?.status === "free" ? 0 : best?.benefit?.remainingCents ?? Infinity;
    return remaining < bestRemaining ? option : best;
  }, undefined);
  const benefit = selected?.benefit;
  const free = Boolean(localCity) || benefit?.status === "free";
  const progress = localCity ? 100 : benefit ? benefitProgress(benefit) : null;
  const remaining = benefit?.remainingCents;
  const minimum = benefit?.minimumOrderCents;
  const message = localCity ? `Entrega grátis em ${localCity}` : free ? "Seu frete é grátis!" : progress !== null ? `Faltam ${formatCurrency(remaining! / 100)}` : "Vamos buscar seu frete grátis";
  const service = localCity || (selected ? `${selected.carrier} · ${selected.service}` : undefined);

  return <section aria-label="Frete grátis para o seu CEP" className="shipping-goal-highlight relative mb-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
    <div className="relative flex items-start gap-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        {free ? <Check className="size-5" /> : <Truck className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black tracking-[0.12em] text-emerald-700">FRETE GRÁTIS</p>
        <h3 className="mt-1 text-lg font-black leading-tight tracking-tight text-emerald-950">{message}</h3>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          {progress !== null ? `${free ? "Disponível" : "Para chegar lá"} no CEP ${formatPostalCode(postalCode)}` : "A meta depende dos produtos do pedido."}
        </p>
        {progress === null && <p className="text-xs leading-5 text-emerald-800">CEP {formatPostalCode(postalCode)}</p>}
      </div>
    </div>
    {progress !== null ? <>
      <ShippingProgress progress={progress} message={message} service={localCity || formatPostalCode(postalCode)} prominent />
      {!free && minimum !== null && minimum !== undefined && remaining !== null && remaining !== undefined && <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs tabular-nums text-emerald-800">
        <span>{formatCurrency((minimum - remaining) / 100)} em produtos</span>
        <strong>Meta {formatCurrency(minimum / 100)}</strong>
      </div>}
      <p className="mt-2 text-xs leading-5 text-emerald-800">
        {free ? `${service}.` : `Meta estimada com ${service}. O valor é recalculado ao mudar os itens.`}
      </p>
    </> : <p className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-5 text-emerald-800">Confira a meta no carrinho após escolher os produtos e as quantidades.</p>}
  </section>;
}

export function ShippingBenefitNote({ benefit, service, showProgress = true }: { benefit?: ShippingBenefit; service?: string; showProgress?: boolean }) {
  if (!benefit) return null;

  const { minimumOrderCents: minimum, remainingCents: remaining, status, subsidyCents } = benefit;
  const free = status === "free";
  const progress = benefitProgress(benefit);
  if (progress === null) {
    return subsidyCents > 0 ? (
      <p className="mt-1 text-xs leading-4 text-emerald-800">
        <strong>{formatCurrency(subsidyCents / 100)} de desconto no frete</strong>
        {service ? ` · ${service}` : null}
      </p>
    ) : null;
  }

  const message = free
    ? "Frete grátis nesta cotação"
    : `Para frete grátis, faltam ${formatCurrency((remaining ?? 0) / 100)}`;
  return <div className="mt-1.5 min-w-0 text-xs leading-4 text-emerald-950">
    <p className="font-bold">{message}</p>
    {(!free || service) && (
      <p className="mt-0.5 text-emerald-800">
        {!free ? `Meta estimada de ${formatCurrency((minimum ?? 0) / 100)}` : null}
        {service ? `${free ? "" : " · "}${service}` : null}
        {!free && subsidyCents > 0 ? ` · ${formatCurrency(subsidyCents / 100)} de desconto` : null}
      </p>
    )}
    {showProgress && <ShippingProgress progress={progress} message={message} service={service} />}
  </div>;
}

export function LocalShippingBenefitNote({ city }: { city: string }) {
  const message = `Entrega grátis em ${city}`;
  return <div className="mt-1.5 min-w-0 text-xs leading-4 text-emerald-950">
    <p className="font-bold">{message}</p>
    <ShippingProgress progress={100} message={message} service={city} />
  </div>;
}

function ShippingProgress({ progress, message, service, prominent = false }: { progress: number; message: string; service?: string; prominent?: boolean }) {
  const trackStyle = { "--shipping-progress": `${progress}%` } as CSSProperties;
  return (
    <div className={prominent ? "mt-3 flex h-8 items-center px-4" : "mt-1 flex h-6 items-center px-3"} role="progressbar"
      aria-label={service ? `Progresso para frete grátis em ${service}` : "Progresso para frete grátis"}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={message}>
      <div className={`${prominent ? "h-2.5" : "h-1.5"} w-full rounded-full bg-emerald-100`} aria-hidden="true">
        <div className={`${prominent ? "shipping-goal-fill " : ""}relative h-full w-[var(--shipping-progress)] rounded-full bg-linear-to-r from-amber-400 via-emerald-400 to-teal-600 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:starting:w-0`}
          style={trackStyle}>
          <span className={`absolute top-1/2 right-0 flex ${prominent ? "size-8" : "size-6"} translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm ring-2 ring-white`}>
            <Truck className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
