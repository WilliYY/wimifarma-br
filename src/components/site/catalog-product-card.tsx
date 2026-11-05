import Link from "next/link";
import { isPrescriptionSearchProduct } from "@/features/products/public-search";
import { PrescriptionSearchDetails } from "./prescription-search-details";
import { PublicProductCard, type RelatedProductCardItem } from "./public-product-card";
import type { PublicCatalogIdentity } from "@/features/catalog-identities/types";
import { isConsultationIdentity } from "@/features/products/consultation-catalog";
import { ConsultationProductCard } from "./consultation-product-card";

export function CatalogProductCard({ product, topicSearch = false }: { product: RelatedProductCardItem | PublicCatalogIdentity; topicSearch?: boolean }) {
  if (isConsultationIdentity(product)) return <ConsultationProductCard product={product} />;
  if (!topicSearch || !isPrescriptionSearchProduct(product)) return <PublicProductCard product={product} showShippingEstimate />;

  return (
    <article className="flex h-full min-h-64 min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
      <Link className="flex min-w-0 flex-1 flex-col justify-center p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" href={`/produto/${encodeURIComponent(product.slug)}`}>
        <PrescriptionSearchDetails item={product} />
      </Link>
    </article>
  );
}
