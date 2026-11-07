import { productCardAlternateImage } from "@/features/products/card-alternate-image";
import { ProductCardImage, ProductCardSurface } from "./product-card-image";
import Link from "next/link";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import { ProductCardActions } from "@/components/site/product-card-actions";
import { ProductCashback } from "@/components/site/product-cashback";
import type { CartProduct } from "@/components/site/cart-provider";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { formatCurrency } from "@/lib/utils";
import { productDisplayName, productTitleBrand } from "@/features/products/display-name";
import { productIngredientLabel } from "@/features/products/medicine-presentation";
import { productOfferDiscount } from "@/features/offers/daily-rotation";
import { ProductPmcBadge, ProductPmcPrice } from "./product-pmc";
import { CatalogShippingBenefitBadge, CatalogShippingButton } from "./catalog-shipping-preview";
import { diaperPackageUnitPrice } from "@/features/products/diaper-unit-price";
import { productSaleUnitLabel } from "@/features/products/product-presentation";
import { requiresPurchaseAssistance } from "@/features/products/purchase-policy";

export type RelatedProductCardItem = PublicProductSearchItem & {
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  isPopularPharmacy: boolean;
  stock: number;
};

export function PublicProductCard({ product, showShippingEstimate = false, variant = "default" }: { product: RelatedProductCardItem; showShippingEstimate?: boolean; variant?: "default" | "medicine-rail" }) {
  const compact = variant === "medicine-rail";
  const alternateImageUrl = productCardAlternateImage(product);
  const imageKey = `${product.imageUrl}:${alternateImageUrl ?? ""}`;
  const publicName = productDisplayName(product.name, product.activeIngredients);
  const ingredientLabel = productIngredientLabel(product);
  const displayName = publicName
    .replace(/\bcomprimidos?\b/giu, "comp.")
    .replace(/\brevestidos?\b/giu, "rev.");
  const titleBrand = productTitleBrand(product.name, product.brand);
  const fullTitle = `${publicName}${titleBrand ? ` · ${product.brand?.trim()}` : ""}`;
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(
    product.promotionalPrice && currentPrice < normalPrice,
  );
  const discount = productOfferDiscount(product);
  const pmc = product.pmcReference;
  const pmcSavings = pmc ? discount : null;
  const cartProduct = {
    supplierDemandAllowed: product.supplierDemandAllowed,
    inventorySource: product.inventorySource,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    catalogClassification: product.catalogClassification,
    isPopularPharmacy: product.isPopularPharmacy,
    name: publicName,
    originalPriceCents: hasPromotion ? Math.round(normalPrice * 100) : null,
    requiresPrescription: product.requiresPrescription,
    prescriptionType: product.prescriptionType,
    slug: product.slug,
    stock: product.stock,
    unitPriceCents: Math.round(currentPrice * 100),
  } satisfies CartProduct;
  const diaperPrice = diaperPackageUnitPrice(product, cartProduct.unitPriceCents);
  const saleUnit = productSaleUnitLabel(product);
  const showShippingBenefit = showShippingEstimate && product.stock > 0 && !product.requiresPrescription && !product.isPopularPharmacy && !requiresPurchaseAssistance(cartProduct);

  if (compact) return (
    <ProductCardSurface key={imageKey} alternateImageUrl={alternateImageUrl} variant="medicine-rail" className="group relative flex h-full min-w-0 flex-col rounded-xl border border-line bg-white p-3 shadow-sm">
      <div data-product-badges className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {pmcSavings !== null ? <ProductPmcBadge percent={pmcSavings} /> : discount !== null && !pmc ? <span className="rounded-md bg-brand px-2 py-1 text-xs font-black text-white">{discount}% OFF</span> : null}
          <ProductCashback compact product={product} unitPriceCents={cartProduct.unitPriceCents} />
        </div>
        {showShippingEstimate ? <CatalogShippingButton product={cartProduct} variant={showShippingBenefit ? "benefit-badge" : "default"} /> : null}
      </div>
      <div className="flex min-w-0 items-center gap-3 py-1">
        <div data-product-photo className="flex h-20 w-20 shrink-0 items-center justify-center bg-white">
          {product.imageUrl ? <ProductCardImage imageUrl={product.imageUrl} alternateImageUrl={alternateImageUrl} name={product.name} size={160} /> : <ProductImagePlaceholder catalogClassification={product.catalogClassification} category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} className="h-full w-full" />}
        </div>
        <div className="min-w-0 flex-1">
          <Link aria-label={`Ver ${fullTitle}`} className="block min-w-0 break-words text-sm font-bold leading-5 text-ink after:absolute after:inset-0 after:z-10 after:cursor-pointer hover:text-brand focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand" href={`/produto/${product.slug}`} title={fullTitle}>
            <span>{publicName}{titleBrand ? <> <span className="font-black">{titleBrand}</span></> : null}</span>
          </Link>
          {ingredientLabel ? <p className="mt-1 break-words text-xs font-semibold leading-4 text-muted">{ingredientLabel}</p> : null}
        </div>
      </div>
      <div className="mt-auto border-t border-line pt-2">
        <div role="group" aria-label="Preço do produto" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {pmc ? <span className="text-xs text-muted"><ProductPmcPrice reference={pmc} strike={pmcSavings !== null} /></span> : hasPromotion ? <span className="text-xs text-muted">De <s>{formatCurrency(normalPrice)}</s></span> : null}
          <strong className="text-xl font-black leading-6 text-brand">{formatCurrency(cartProduct.unitPriceCents / 100)}</strong>
          <span className="text-xs leading-4 text-muted">{saleUnit ? `Para ${saleUnit.toLowerCase()}.` : "Para 1 unidade."}</span>
        </div>
        <ProductCardActions compact product={cartProduct} />
      </div>
    </ProductCardSurface>
  );

  return (
    <ProductCardSurface key={imageKey} alternateImageUrl={alternateImageUrl}
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_18px_40px_rgba(17,24,39,0.11)] motion-reduce:transform-none"
    >
      <div data-product-badges className={`flex shrink-0 flex-wrap content-start items-start gap-1 px-2 pb-0.5 pt-1.5 ${showShippingEstimate ? "min-h-16 sm:min-h-10" : "min-h-9"}`}>
        {pmcSavings !== null ? <ProductPmcBadge percent={pmcSavings} /> : discount !== null && !pmc ? (
          <span className="rounded-lg bg-brand px-2 py-1.5 text-[0.65rem] font-black leading-tight text-white shadow-sm">
            {discount}% OFF
          </span>
        ) : null}
        {showShippingBenefit ? <CatalogShippingBenefitBadge /> : null}
      </div>
      <div
        data-product-photo
        className="relative flex h-32 shrink-0 items-center justify-center overflow-hidden bg-white p-2 sm:h-36 sm:p-3"
      >
        {product.imageUrl ? (
          <ProductCardImage imageUrl={product.imageUrl} alternateImageUrl={alternateImageUrl} name={product.name} size={240} />
        ) : (
          <ProductImagePlaceholder catalogClassification={product.catalogClassification} category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} className="h-full w-full" showLabel />
        )}
      </div>
      <div className="flex h-6 shrink-0 items-start justify-end px-2">
        <ProductCashback compact product={product} unitPriceCents={cartProduct.unitPriceCents} />
      </div>

      <div className="flex flex-1 flex-col border-t border-line px-3 pb-3 pt-2">
        <span className="h-4 shrink-0 truncate text-[0.68rem] font-black uppercase text-brand">
          {product.category || product.brand || "Produto"}
        </span>
        <Link
          aria-label={`Ver ${fullTitle}`}
          className="mt-1 h-14 min-w-0 shrink-0 text-[0.8125rem] font-bold leading-[1.125rem] text-ink after:absolute after:inset-0 after:z-10 after:cursor-pointer hover:text-brand focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand sm:h-[3.75rem] sm:text-sm sm:leading-5"
          href={`/produto/${product.slug}`}
          title={fullTitle}
        >
          <span className="line-clamp-3">{displayName}{titleBrand ? <> <span className="font-black">{titleBrand}</span></> : null}</span>
        </Link>
        <span className="mt-1 min-h-4 shrink-0 text-[0.68rem] font-semibold leading-4 text-muted" title={ingredientLabel || undefined}>
          {ingredientLabel}
        </span>

        <div className="mt-auto pt-2">
          <div role="group" aria-label={diaperPrice ? `Preço do pacote com ${diaperPrice.quantity} fraldas` : "Preço do produto"} className="grid grid-rows-[0.75rem_1.5rem_1rem] gap-y-0.5 border-t border-line pt-2">
            <span className="block min-w-0 text-[0.68rem] font-semibold leading-3 text-muted">
              {pmc ? <ProductPmcPrice reference={pmc} strike={pmcSavings !== null} /> : hasPromotion ? <>De <s>{formatCurrency(normalPrice)}</s></> : null}
            </span>
            <div className="flex min-w-0 flex-wrap content-start items-baseline gap-x-1 gap-y-1">
              {hasPromotion && <span className="sr-only">Por</span>}
              <strong className="text-lg font-black leading-none text-brand sm:text-xl">{formatCurrency(cartProduct.unitPriceCents / 100)}</strong>
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] leading-4 text-muted">{diaperPrice ? `${formatCurrency(diaperPrice.perDiaperCents / 100)} por fralda` : saleUnit ? `Para ${saleUnit.toLowerCase()}.` : "Para 1 unidade."}</p>
            </div>
          </div>
          <ProductCardActions product={cartProduct} />
          {showShippingEstimate ? <CatalogShippingButton product={cartProduct} /> : null}
        </div>
      </div>
    </ProductCardSurface>
  );
}
