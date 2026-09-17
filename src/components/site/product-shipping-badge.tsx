import { Truck } from "lucide-react";

export function ProductShippingBadge() {
  return <div className="px-3 pt-3"><span className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-2 py-1 text-[0.68rem] font-black text-white" title="Em compras a partir de R$ 99,90. Consulte a cobertura pelo CEP."><Truck aria-hidden="true" className="h-3.5 w-3.5" />Frete gratis</span><span className="sr-only">Em compras a partir de R$ 99,90, sujeito ao CEP atendido.</span></div>;
}
