import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { ProductCashback } from "@/components/site/product-cashback";
import type { CartProduct } from "@/components/site/cart-provider";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { formatCurrency } from "@/lib/utils";

export type RelatedProductCardItem = PublicProductSearchItem & {
  isPopularPharmacy: boolean;
  stock: number;
};

export function PublicProductCard({ product }: { product: RelatedProductCardItem }) {
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(
    product.promotionalPrice && currentPrice < normalPrice,
  );
  const discount = hasPromotion
    ? Math.round(((normalPrice - currentPrice) / normalPrice) * 100)
    : 0;
  const cartProduct = {
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    isPopularPharmacy: product.isPopularPharmacy,
    name: product.name,
    originalPriceCents: hasPromotion ? Math.round(normalPrice * 100) : null,
    requiresPrescription: product.requiresPrescription,
    slug: product.slug,
    stock: product.stock,
    unitPriceCents: Math.round(currentPrice * 100),
  } satisfies CartProduct;

  return (
    <article
      className="group flex h-full min-h-[22rem] flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_18px_40px_rgba(17,24,39,0.11)]"
    >
      <Link
        aria-label={`Ver ${product.name}`}
        className="relative flex h-40 items-center justify-center overflow-hidden bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        href={`/produto/${product.slug}`}
      >
        {product.imageUrl ? (
          <Image
            alt={product.name}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
            height={240}
            src={product.imageUrl}
            width={240}
          />
        ) : (
          <ImageIcon className="h-7 w-7 text-muted" />
        )}
        {hasPromotion ? (
          <span className="absolute left-3 top-3 rounded-sm bg-brand-soft px-2 py-1 text-[0.68rem] font-black text-brand">
            {discount}% OFF
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col border-t border-line px-4 pb-4 pt-3">
        <span className="text-[0.68rem] font-black uppercase text-brand">
          {product.category || product.brand || "Produto"}
        </span>
        <Link
          className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={`/produto/${product.slug}`}
        >
          {product.name}
        </Link>
        <span className="mt-2 block line-clamp-1 min-h-4 text-xs font-semibold text-muted">
          {product.activeIngredients.join(" + ") || "Consulte os detalhes"}
        </span>
        <strong className="mt-3 block truncate text-xs uppercase text-ink">
          {product.brand ?? "Wimifarma"}
        </strong>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            {hasPromotion ? (
              <span className="block text-[0.68rem] font-semibold text-muted line-through">
                {formatCurrency(normalPrice)}
              </span>
            ) : null}
            <strong className="mt-1 block text-xl font-black leading-none text-brand">
              {formatCurrency(currentPrice)}
            </strong>
          </div>
          <AddToCartButton
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_22px_rgba(200,16,46,0.2)] transition hover:-translate-y-0.5 hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            iconOnly
            product={cartProduct}
          />
        </div>
        <ProductCashback product={product} unitPriceCents={cartProduct.unitPriceCents} />
      </div>
    </article>
  );
}
