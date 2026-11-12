import { Truck } from "lucide-react";
import type { CSSProperties } from "react";
import type { ShippingBenefit } from "@/features/shipping/benefit-policy";
import { formatCurrency } from "@/lib/utils";

export function ShippingBenefitNote({ benefit, service }: { benefit?: ShippingBenefit; service?: string }) {
  if (!benefit) return null;

  const { minimumOrderCents: minimum, remainingCents: remaining, status, subsidyCents } = benefit;
  const free = status === "free";
  const hasGoal = minimum !== null && remaining !== null
    && Number.isSafeInteger(minimum) && Number.isSafeInteger(remaining)
    && minimum > 0 && remaining > 0 && remaining <= minimum;
  const progress = free ? 100 : hasGoal ? Math.floor(((minimum - remaining) * 100) / minimum) : null;
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
  const trackStyle = { "--shipping-progress": `${progress}%` } as CSSProperties;

  return <div className="mt-1.5 min-w-0 text-xs leading-4 text-emerald-950">
    <p className="font-bold">{message}</p>
    {(!free || service) && (
      <p className="mt-0.5 text-emerald-800">
        {!free ? `Meta estimada de ${formatCurrency((minimum ?? 0) / 100)}` : null}
        {service ? `${free ? "" : " · "}${service}` : null}
        {!free && subsidyCents > 0 ? ` · ${formatCurrency(subsidyCents / 100)} de desconto` : null}
      </p>
    )}
    <div className="mt-1 flex h-6 items-center px-3" role="progressbar"
      aria-label={service ? `Progresso para frete grátis em ${service}` : "Progresso para frete grátis"}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={message}>
      <div className="h-1.5 w-full rounded-full bg-emerald-100" aria-hidden="true">
        <div className="relative h-full w-[var(--shipping-progress)] rounded-full bg-linear-to-r from-amber-400 via-emerald-400 to-teal-600 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:starting:w-0"
          style={trackStyle}>
          <span className="absolute top-1/2 right-0 flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm ring-2 ring-white">
            <Truck className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  </div>;
}
