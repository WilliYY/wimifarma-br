import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { formatCurrency } from "@/lib/utils";

export function PublicProductCard({ product }: { product: PublicProductSearchItem }) {
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(
    product.promotionalPrice && Number(product.promotionalPrice) < Number(product.price),
  );

  return (
    <Link
      className="group grid min-h-44 grid-cols-[7rem_minmax(0,1fr)] gap-4 rounded-lg border border-line bg-white p-4 shadow-[0_14px_45px_rgba(17,24,39,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_20px_55px_rgba(17,24,39,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      href={`/produto/${product.slug}`}
    >
      <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md bg-surface-subtle">
        {product.imageUrl ? (
          <Image
            alt={product.name}
            className="h-full w-full object-contain p-2"
            height={112}
            src={product.imageUrl}
            unoptimized
            width={112}
          />
        ) : (
          <ImageIcon className="h-7 w-7 text-muted" />
        )}
      </span>
      <span className="min-w-0">
        <span className="text-xs font-black uppercase text-brand">
          {product.category || product.brand || "Produto"}
        </span>
        <strong className="mt-1 block line-clamp-2 text-base text-ink">
          {product.name}
        </strong>
        <span className="mt-2 block line-clamp-1 text-xs font-semibold text-muted">
          {product.activeIngredients.join(" + ") || "Consulte os detalhes"}
        </span>
        <span className="mt-3 flex items-center gap-2">
          <strong className="text-lg text-brand">{formatCurrency(currentPrice)}</strong>
          {hasPromotion ? (
            <span className="text-xs font-semibold text-muted line-through">
              {formatCurrency(Number(product.price))}
            </span>
          ) : null}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-ink transition group-hover:text-brand">
          Ver produto <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </Link>
  );
}
