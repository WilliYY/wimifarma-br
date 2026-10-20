import { Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/features/shipping/delivery-policy";
import { formatCurrency } from "@/lib/utils";

export function ProductShippingBadge() {
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2 py-1 text-[0.68rem] font-black text-white">
        <Truck aria-hidden="true" className="h-3.5 w-3.5" />Frete grátis
      </span>
      <p className="mt-1 text-[0.6rem] leading-3 text-muted">
        A partir de {formatCurrency(FREE_SHIPPING_THRESHOLD_CENTS / 100)} · Consulte o CEP
      </p>
    </div>
  );
}
