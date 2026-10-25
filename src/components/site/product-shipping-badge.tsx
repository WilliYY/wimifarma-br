import { Truck } from "lucide-react";

export function ProductShippingBadge() {
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2 py-1 text-xs font-black text-white">
        <Truck aria-hidden="true" className="h-3.5 w-3.5" />Frete grátis
      </span>
      <p className="mt-1 text-xs leading-5 text-muted">
        Consulte seu CEP para frete grátis
      </p>
    </div>
  );
}
