import type { PublicProductSearchItem } from "@/features/products/public-search";
import { formatCurrency } from "@/lib/utils";

// Neutral price-list content for prescription products in topic searches.
export function PrescriptionSearchDetails({ item }: { item: Pick<PublicProductSearchItem, "name" | "activeIngredients" | "brand" | "price" | "promotionalPrice"> }) {
  return (
    <span className="block min-w-0" data-prescription-search="true">
      <span className="block break-words text-sm font-semibold leading-6 text-ink">{item.name}</span>
      {item.activeIngredients.length ? <span className="mt-1 block break-words text-xs leading-5 text-muted">{item.activeIngredients.join(" + ")}</span> : null}
      {item.brand ? <span className="mt-1 block text-xs text-muted">{item.brand}</span> : null}
      <span className="mt-2 block text-sm font-semibold text-ink">{formatCurrency(Number(item.promotionalPrice ?? item.price))}</span>
    </span>
  );
}
