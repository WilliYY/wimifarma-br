import { productImageAlt } from "@/features/products/image-placeholder";
import Image from "next/image";
import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import { ProductCardActions } from "@/components/site/product-card-actions";
import { ProductShippingBadge } from "@/components/site/product-shipping-badge";
import { ProductCashback } from "@/components/site/product-cashback";
import type { CartProduct } from "@/components/site/cart-provider";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { formatCurrency } from "@/lib/utils";
import { productDisplayName, productTitleBrand } from "@/features/products/display-name";
import { requiresPurchaseAssistance } from "@/features/products/purchase-policy";

export type RelatedProductCardItem = PublicProductSearchItem & {
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  isPopularPharmacy: boolean;
  stock: number;
};

export function PublicProductCard({ product }: { product: RelatedProductCardItem }) {
  const displayName = productDisplayName(product.name)
    .replace(/\bcomprimidos?\b/giu, "comp.")
    .replace(/\brevestidos?\b/giu, "rev.");
  const titleBrand = productTitleBrand(product.name, product.brand);
  const fullTitle = `${product.name}${titleBrand ? ` · ${product.brand?.trim()}` : ""}`;
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(
    product.promotionalPrice && currentPrice < normalPrice,
  );
  const discount = hasPromotion
    ? Math.round(((normalPrice - currentPrice) / normalPrice) * 100)
    : 0;
  const cartProduct = {
    supplierDemandAllowed: product.supplierDemandAllowed,
    inventorySource: product.inventorySource,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    catalogClassification: product.catalogClassification,
    isPopularPharmacy: product.isPopularPharmacy,
    name: product.name,
    originalPriceCents: hasPromotion ? Math.round(normalPrice * 100) : null,
    requiresPrescription: product.requiresPrescription,
    prescriptionType: product.prescriptionType,
    slug: product.slug,
    stock: product.stock,
    unitPriceCents: Math.round(currentPrice * 100),
  } satisfies CartProduct;
  const canOrder = product.stock > 0 && !requiresPurchaseAssistance(cartProduct);

  return (
    <article
      className="group relative flex h-full min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_18px_40px_rgba(17,24,39,0.11)] motion-reduce:transform-none"
    >
      <div className="h-[4.25rem] shrink-0 px-3 pb-1 pt-3 sm:h-14">
        {canOrder && <ProductShippingBadge />}
      </div>
      <div
        className="relative flex h-40 shrink-0 items-center justify-center overflow-hidden bg-white px-3 pb-7 pt-8"
      >
        {product.imageUrl ? (
          <Image
            alt={productImageAlt(product.name, product.imageUrl)}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
            height={240}
            src={product.imageUrl}
            width={240}
          />
        ) : (
          <ProductImagePlaceholder catalogClassification={product.catalogClassification} category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} className="h-full w-full" showLabel />
        )}
        {hasPromotion ? (
          <span className="absolute left-2 top-2 rounded-sm bg-brand-soft px-1.5 py-1 text-[0.625rem] font-black text-brand">
            {discount}% OFF
          </span>
        ) : null}
        <div className="absolute inset-x-2 bottom-1 flex justify-end">
          <ProductCashback compact product={product} unitPriceCents={cartProduct.unitPriceCents} />
        </div>
      </div>

      <div className="flex flex-1 flex-col border-t border-line px-4 pb-4 pt-3">
        <span className="h-4 shrink-0 truncate text-[0.68rem] font-black uppercase text-brand">
          {product.category || product.brand || "Produto"}
        </span>
        <Link
          aria-label={`Ver ${fullTitle}`}
          className="mt-1 h-16 min-w-0 shrink-0 text-sm font-bold leading-5 text-ink after:absolute after:inset-0 after:z-10 after:cursor-pointer hover:text-brand focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
          href={`/produto/${product.slug}`}
          title={fullTitle}
        >
          <span className="line-clamp-3">{displayName}{titleBrand ? <> <span className="font-black">{titleBrand}</span></> : null}</span>
        </Link>
        <span className="mt-2 h-4 shrink-0 truncate text-xs font-semibold leading-4 text-muted" title={product.activeIngredients.join(" + ") || undefined}>
          {product.activeIngredients.join(" + ") || "Consulte os detalhes"}
        </span>

        <div className="mt-auto pt-3">
          <div role="group" aria-label="Preço do produto" className="grid grid-rows-[1rem_1.75rem_1rem] gap-y-1 border-t border-line pt-3">
            <span className="block min-w-0 text-[0.68rem] font-semibold text-muted">
              {hasPromotion ? <>De <s>{formatCurrency(normalPrice)}</s></> : null}
            </span>
            <div className="flex min-w-0 flex-wrap content-start items-baseline gap-x-1 gap-y-1">
              {hasPromotion && <span className="sr-only">Por</span>}
              <strong className="text-lg font-black leading-none text-brand sm:text-xl">{formatCurrency(cartProduct.unitPriceCents / 100)}</strong>
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] leading-4 text-muted">Para 1 unidade.</p>
            </div>
          </div>
          <ProductCardActions product={cartProduct} />
        </div>
      </div>
    </article>
  );
}
