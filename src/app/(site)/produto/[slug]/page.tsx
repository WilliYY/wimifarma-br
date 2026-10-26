import Link from "next/link";
import { productImageAlt } from "@/features/products/image-placeholder";
import { publicProductImageUrl, publicProductImageUrls } from "@/features/product-images/private-supplier-policy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbData, categoryPath } from "@/lib/seo";
import {
  BadgeCheck,
  ChevronRight,
  CreditCard,
  PackageCheck,
  Pill,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { DeliveryEstimator } from "@/components/site/delivery-estimator";
import { ProductImageViewer } from "@/components/site/product-image-viewer";
import { ProductShareButton } from "@/components/site/product-share-button";
import { ProductPurchasePanel } from "@/components/site/product-purchase-panel";
import { ProductPaymentMethods } from "@/components/site/product-payment-methods";
import { ProductQuantityProvider } from "@/components/site/product-quantity";
import { ProductCashback } from "@/components/site/product-cashback";
import { RelatedProductsCarousel } from "@/components/site/related-products-carousel";
import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import {
  buildProductMetaDescription,
  buildProductStructuredData,
  serializeProductStructuredData,
  summarizeProductReviews,
} from "@/features/products/product-detail";
import {
  normalizeProductSearch,
  rankRelatedProducts,
} from "@/features/products/public-search";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { productDisplayName } from "@/features/products/display-name";
import { buildPublicProductDescription } from "@/features/products/product-description";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { canDisplayPmcSavings, pmcSavingsPercent } from "@/features/products/cmed-reference";
import { ProductPmcBadge, ProductPmcDetails, ProductPmcPrice } from "@/components/site/product-pmc";

export const dynamic = "force-dynamic";

const productSelect = {
  ...supplierOfferInclude, cmedReference: true, inventorySource: true,
  cashbackEnabled: true,
  cashbackRateBps: true,
  activeIngredients: true,
  brand: true,
  category: true,
  description: true,
  ean: true,
  id: true,
  imageUrl: true,
  imageUrls: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  prescriptionType: true,
  searchTerms: true,
  sku: true,
  slug: true,
  stock: true,
} as const;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function serializeProduct(raw: ProductRecord): RelatedProductCardItem {
  const product = toSaleProduct(raw);
  return {
    pmcReference: product.pmcReference,
    cashbackEnabled: product.cashbackEnabled,
    inventorySource: product.inventorySource,
    cashbackRateBps: product.cashbackRateBps,
    activeIngredients: product.activeIngredients,
    brand: product.brand,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    catalogClassification: product.catalogClassification,
    isPopularPharmacy: product.isPopularPharmacy,
    name: product.name,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    requiresPrescription: product.requiresPrescription,
    prescriptionType: product.prescriptionType,
    searchTerms: product.searchTerms,
    slug: product.slug,
    stock: product.stock,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPrisma().product.findFirst({
    select: { catalogClassification: true, brand: true, category: true, description: true, ean: true, imageUrl: true, imageUrls: true, isPopularPharmacy: true, name: true, prescriptionType: true, inventorySource: true, requiresPrescription: true },
    where: { slug, status: "ACTIVE" },
  });
  if (!product) return {};
  product.imageUrl = publicProductImageUrl(product);
  product.imageUrls = publicProductImageUrls(product);
  const description = buildProductMetaDescription({ ...product, description: buildPublicProductDescription(product) });
  const productUrl = `/produto/${encodeURIComponent(slug)}`;
  return {
    alternates: { canonical: productUrl },
    description,
    openGraph: {
      description,
      images: product.imageUrl ? [product.imageUrl, ...product.imageUrls].map(url => ({ alt: productImageAlt(product.name, url), url })) : undefined,
      title: product.name,
      type: "website",
      url: productUrl,
    },
    title: product.name,
    twitter: {
      card: "summary_large_image",
      description,
      images: product.imageUrl ? [product.imageUrl, ...product.imageUrls] : undefined,
      title: product.name,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prisma = getPrisma();
  const record = await prisma.product.findFirst({
    select: productSelect,
    where: { slug, status: "ACTIVE" },
  });
  if (!record) notFound();
  const product = toSaleProduct(record);
  const description = buildPublicProductDescription(product);

  const relationFilters: Prisma.ProductWhereInput[] = [
    ...product.activeIngredients.map((ingredient) => ({ searchText: { contains: normalizeProductSearch(ingredient) } })),
    ...product.searchTerms.map((term) => ({ searchText: { contains: normalizeProductSearch(term) } })),
  ];
  if (product.category) relationFilters.push({ category: { equals: product.category, mode: "insensitive" } });

  const relatedCandidates = relationFilters.length
    ? await prisma.product.findMany({
        orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: productSelect,
        take: 30,
        where: { id: { not: product.id }, OR: relationFilters, status: "ACTIVE" },
      })
    : [];

  const relatedProducts = rankRelatedProducts(product, relatedCandidates).slice(0, 10).map(serializeProduct);
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(product.promotionalPrice && currentPrice < normalPrice);
  const saving = hasPromotion ? normalPrice - currentPrice : 0;
  const discountPercentage = hasPromotion ? Math.round((saving / normalPrice) * 100) : 0;
  const pmc = product.pmcReference;
  const pmcSavings = pmc && canDisplayPmcSavings(product) ? pmcSavingsPercent(pmc.amountCents, Math.round(currentPrice * 100)) : null;
  const productStructuredData = buildProductStructuredData({
    category: product.category,
    brand: product.brand,
    description,
    ean: product.ean,
    imageUrl: product.imageUrl,
    name: product.name,
    price: currentPrice,
    rating: summarizeProductReviews([]),
    sku: product.sku,
    slug: product.slug,
    stock: product.stock,
  });
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
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: serializeProductStructuredData([productStructuredData, breadcrumbData([{ name: "Início", path: "/" }, { name: "Catálogo", path: "/catalogo" }, ...(product.category ? [{ name: product.category, path: categoryPath(product.category) }] : []), { name: product.name, path: `/produto/${encodeURIComponent(product.slug)}` }])]) }}
        type="application/ld+json"
      />
      <section className="border-b border-line bg-[#f7f8fa]">
        <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-40 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12 lg:pt-56">
          <nav aria-label="Navegacao estrutural" className="flex items-center gap-1 overflow-hidden text-xs font-bold text-muted sm:text-sm">
            <Link className="shrink-0 transition hover:text-brand" href="/">Home</Link>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            {product.category ? (
              <>
                <Link className="shrink-0 hover:text-brand" href={categoryPath(product.category)}>{product.category}</Link>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </>
            ) : null}
            <span aria-current="page" className="truncate text-ink">{productDisplayName(product.name)}</span>
          </nav>

          <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="grid min-w-0 gap-4 lg:sticky lg:top-[var(--site-header-offset,13rem)]">
              <ProductImageViewer catalogClassification={product.catalogClassification} category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} imageUrls={product.imageUrls} imageUrl={product.imageUrl} key={product.id} name={product.name} />
            </div>

            <div className="grid gap-4">
              <ProductQuantityProvider key={product.id}>
              <article className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_rgba(17,24,39,0.04)] sm:rounded-3xl sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand">{product.brand ?? "Wimifarma"}</span>
                  <ProductShareButton key={product.id} name={product.name} />
                </div>

                <h1 className="mt-3 break-words text-2xl font-bold leading-[1.15] tracking-tight text-ink sm:mt-4 sm:text-3xl lg:text-[2.15rem]">{productDisplayName(product.name)}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted"><BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />Vendido e atendido por <strong className="font-bold text-ink">Wimifarma</strong></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.category ? <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-muted">{product.category}</span> : null}
                  {product.isPopularPharmacy ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Farmácia Popular</span> : null}
                  {product.sku ? <span className="self-center text-xs text-muted">Cód. {product.sku}</span> : null}
                </div>

                <div className="mt-4 rounded-xl bg-brand-soft/70 p-4 sm:mt-5 sm:rounded-2xl sm:p-5">
                  {pmc ? <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><ProductPmcPrice reference={pmc} strike={pmcSavings !== null} />{pmcSavings !== null ? <ProductPmcBadge percent={pmcSavings} /> : null}</div> : null}
                  {hasPromotion ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">De <del>{formatCurrency(normalPrice)}</del></span>
                      <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">−{discountPercentage}%</span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <strong className="text-4xl font-bold tracking-tight text-brand tabular-nums sm:text-5xl">{formatCurrency(currentPrice)}</strong>
                    <span className="text-xs text-muted">por unidade</span>
                  </div>
                  {hasPromotion ? <p className="mt-2 text-xs font-semibold text-emerald-800">Você economiza {formatCurrency(saving)} por unidade</p> : null}
                </div>

                {pmc ? <ProductPmcDetails reference={pmc} /> : null}

                <ProductCashback product={product} unitPriceCents={Math.round(currentPrice * 100)} details />
                <ProductPurchasePanel key={product.id} product={cartProduct} />

                <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-muted sm:mt-4 sm:bg-transparent sm:p-0">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <p>Pedido confirmado pela equipe. O pagamento é combinado no atendimento, sem informar dados de cartão no site.</p>
                </div>
              </article>

              <div className="scroll-mt-56" id="entrega"><DeliveryEstimator product={cartProduct} /></div>
              </ProductQuantityProvider>
            </div>
          </div>

        </div>
      </section>

      <section className="scroll-mt-52 bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8" id="relacionados">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 border-b border-line pb-7 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase text-brand"><BadgeCheck className="h-5 w-5" aria-hidden="true" />Voce pode gostar</p>
              <h2 className="mt-2 text-3xl font-black text-ink">Produtos correlatos</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Relacionados por principio ativo, termo de busca ou categoria cadastrada.</p>
            </div>
            <p className="flex max-w-md items-start gap-2 text-xs font-semibold leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" aria-hidden="true" />Correlato nao significa substituto. Confirme a opcao adequada com a equipe.</p>
          </div>
          {relatedProducts.length > 0 ? (
            <RelatedProductsCarousel products={relatedProducts} />
          ) : <div className="mt-7 flex min-h-36 items-center justify-center border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Ainda nao ha correlatos publicados para este produto.</div>}
        </div>
      </section>

      <nav aria-label="Explore este produto" className="border-b border-line bg-white px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1 py-2 text-sm font-semibold text-muted sm:gap-x-10">
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#informacoes"><PackageCheck className="h-4 w-4" aria-hidden="true" />Detalhes do produto</a>
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#entrega"><Truck className="h-4 w-4" aria-hidden="true" />Entrega e retirada</a>
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#relacionados">Produtos relacionados<ChevronRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </nav>

      <section className="scroll-mt-52 bg-white px-4 pb-28 pt-12 sm:px-6 lg:px-8 lg:pt-16" id="informacoes">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="text-xs font-black uppercase text-brand">Informacoes do produto</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Conheça antes de comprar</h2>
              <div className="mt-7 divide-y divide-line border-y border-line">
                <details className="group py-5" open>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-ink focus-visible:outline-brand">Descrição<ChevronRight className="h-5 w-5 text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" /></summary>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted">{description}</p>
                </details>
                <details className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-ink focus-visible:outline-brand">Princípios ativos e identificação<ChevronRight className="h-5 w-5 text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" /></summary>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="font-bold text-muted">Principios ativos</dt><dd className="mt-1 font-black text-ink">{product.activeIngredients.join(", ") || "Nao informado"}</dd></div>
                    <div><dt className="font-bold text-muted">Marca</dt><dd className="mt-1 font-black text-ink">{product.brand ?? "Nao informada"}</dd></div>
                    <div><dt className="font-bold text-muted">Categoria</dt><dd className="mt-1 font-black text-ink">{product.category ?? "Nao informada"}</dd></div>
                    <div><dt className="font-bold text-muted">SKU</dt><dd className="mt-1 font-black text-ink">{product.sku ?? "Nao informado"}</dd></div>
                    <div><dt className="font-bold text-muted">EAN</dt><dd className="mt-1 font-black text-ink">{product.ean ?? "Nao informado"}</dd></div>
                  </dl>
                </details>
                <details className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-ink focus-visible:outline-brand"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted" aria-hidden="true" />Formas de pagamento</span><ChevronRight className="h-5 w-5 text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" /></summary>
                  <ProductPaymentMethods />
                </details>
              </div>
            </div>

            <aside className="h-fit rounded-2xl border border-emerald-100 bg-[#f2f8f5] p-5 sm:p-6">
              <Pill className="h-6 w-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-ink">Cuidado em cada escolha</h3>
              <p className="mt-3 text-sm leading-7 text-muted">Leia a embalagem e a bula. Em caso de duvida, fale com o farmaceutico. Nao use medicamentos sem orientacao adequada.</p>
              <p className="mt-3 text-xs font-semibold leading-5 text-muted">A imagem pode ter pequena variacao de embalagem conforme o lote do fabricante.</p>
            </aside>
          </div>
        </div>
      </section>


    </>
  );
}
