import { Clock3, CreditCard } from "lucide-react";
import { PIX_DISCOUNT_PERCENT } from "@/features/payments/pix-discount";
import { productPickupInformation } from "@/features/products/product-presentation";

export function ProductPurchaseConditions({ inventorySource, now }: { inventorySource: "PHARMACY" | "DISTRIBUTOR" | undefined; now: Date }) {
  const pickup = productPickupInformation(inventorySource, now);
  return <div className="mt-4 grid gap-3 border-t border-line pt-4 text-xs leading-5" data-product-purchase-conditions>
    <div className="flex gap-2.5"><Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" /><div><strong className="block text-ink">{pickup.title}</strong><p className="text-muted">{pickup.description}</p></div></div>
    <div className="flex gap-2.5"><CreditCard aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><p className="text-muted"><strong className="font-semibold text-ink">Pix com {PIX_DISCOUNT_PERCENT}% de desconto ao selecionar no checkout.</strong> Cartão ou dinheiro também na retirada. Confira as opções na finalização.</p></div>
  </div>;
}
