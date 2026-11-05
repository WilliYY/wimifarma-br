import Link from "next/link";
import type { PublicCatalogIdentity } from "@/features/catalog-identities/types";
import { ProductImagePlaceholder } from "./product-image-placeholder";

export function ConsultationProductCard({ product }: { product: PublicCatalogIdentity }) {
  return (
    <article className="flex h-full min-h-64 min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
      <Link className="flex min-w-0 flex-1 flex-col p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" href={product.href}>
        <span className="flex h-36 items-center justify-center rounded-lg bg-surface-subtle">
          <ProductImagePlaceholder className="h-full w-full p-4" />
        </span>
        <span className="mt-4 text-xs font-semibold text-muted">{product.categoryName ?? "Catálogo"}</span>
        <h2 className="mt-2 break-words text-sm font-bold leading-5 text-ink">{product.name}</h2>
        <p className="mt-2 break-all text-xs text-muted">EAN: {product.ean}</p>
        <p className="mt-4 text-sm font-bold leading-5 text-brand">Preço e disponibilidade sob consulta</p>
        <span className="mt-auto pt-4 text-sm font-bold text-brand">Consultar detalhes</span>
      </Link>
    </article>
  );
}
