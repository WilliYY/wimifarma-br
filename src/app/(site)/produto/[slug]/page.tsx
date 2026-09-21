import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbData, categoryPath } from "@/lib/seo";
import {
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Headphones,
  MapPin,
  PackageCheck,
  Pill,
  ShieldCheck,
  Truck,
  Star,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { DeliveryEstimator } from "@/components/site/delivery-estimator";
import { ProductImageViewer } from "@/components/site/product-image-viewer";
import { ProductShareButton } from "@/components/site/product-share-button";
import { ProductPurchasePanel } from "@/components/site/product-purchase-panel";
import { ProductCashback } from "@/components/site/product-cashback";
import { ProductReviewForm } from "@/components/site/product-review-form";
import { RelatedProductsCarousel } from "@/components/site/related-products-carousel";
import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import {
  buildProductMetaDescription,
  buildProductStructuredData,
  publicReviewerName,
  serializeProductStructuredData,
  summarizeProductReviews,
} from "@/features/products/product-detail";
import {
  normalizeProductSearch,
  rankRelatedProducts,
} from "@/features/products/public-search";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const productSelect = {
  cashbackEnabled: true,
  cashbackRateBps: true,
  activeIngredients: true,
  brand: true,
  category: true,
  description: true,
  ean: true,
  id: true,
  imageUrl: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  searchTerms: true,
  sku: true,
  slug: true,
  stock: true,
} as const;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function serializeProduct(product: ProductRecord): RelatedProductCardItem {
  return {
    cashbackEnabled: product.cashbackEnabled,
    cashbackRateBps: product.cashbackRateBps,
    activeIngredients: product.activeIngredients,
    brand: product.brand,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    isPopularPharmacy: product.isPopularPharmacy,
    name: product.name,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    requiresPrescription: product.requiresPrescription,
    searchTerms: product.searchTerms,
    slug: product.slug,
    stock: product.stock,
  };
}

function RatingStars({ rating, size = "h-4 w-4" }: { rating: number | null; size?: string }) {
  const roundedRating = rating === null ? 0 : Math.round(rating);
  return (
    <span aria-label={rating === null ? "Produto sem avaliacoes" : `${rating} de 5 estrelas`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          aria-hidden="true"
          className={`${size} ${value <= roundedRating ? "fill-amber-400 text-amber-400" : "fill-white text-slate-300"}`}
          key={value}
        />
      ))}
    </span>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPrisma().product.findFirst({
    select: { brand: true, description: true, imageUrl: true, name: true },
    where: { slug, status: "ACTIVE" },
  });
  if (!product) return {};
  const description = buildProductMetaDescription(product);
  const productUrl = `/produto/${encodeURIComponent(slug)}`;
  return {
    alternates: { canonical: productUrl },
    description,
    openGraph: {
      description,
      images: product.imageUrl ? [{ alt: product.name, url: product.imageUrl }] : undefined,
      title: product.name,
      type: "website",
      url: productUrl,
    },
    title: product.name,
    twitter: {
      card: "summary_large_image",
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
      title: product.name,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prisma = getPrisma();
  const product = await prisma.product.findFirst({
    select: productSelect,
    where: { slug, status: "ACTIVE" },
  });
  if (!product) notFound();

  const relationFilters: Prisma.ProductWhereInput[] = [
    ...product.activeIngredients.map((ingredient) => ({ searchText: { contains: normalizeProductSearch(ingredient) } })),
    ...product.searchTerms.map((term) => ({ searchText: { contains: normalizeProductSearch(term) } })),
  ];
  if (product.category) relationFilters.push({ category: { equals: product.category, mode: "insensitive" } });

  const session = await auth();
  const customerId = sessionCustomerId(session) ?? null;
  const [relatedCandidates, reviews, reviewRatings, existingReview, completedOrder] = await Promise.all([
    relationFilters.length
      ? prisma.product.findMany({
          orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          select: productSelect,
          take: 30,
          where: { id: { not: product.id }, OR: relationFilters, status: "ACTIVE" },
        })
      : Promise.resolve([]),
    prisma.productReview.findMany({
      orderBy: { createdAt: "desc" },
      select: { comment: true, createdAt: true, customer: { select: { name: true } }, id: true, rating: true, cashbackRewardCents: true },
      take: 8,
      where: { isPublished: true, order: { status: "COMPLETED" }, productId: product.id },
    }),
    prisma.productReview.findMany({
      select: { rating: true },
      where: { isPublished: true, order: { status: "COMPLETED" }, productId: product.id },
    }),
    customerId
      ? prisma.productReview.findUnique({
          select: { comment: true, rating: true },
          where: { productId_customerId: { customerId, productId: product.id } },
        })
      : Promise.resolve(null),
    customerId
      ? prisma.order.findFirst({
          select: { id: true },
          where: { customerId, items: { some: { productId: product.id } }, status: "COMPLETED", paymentStatus: "PAID" },
        })
      : Promise.resolve(null),
  ]);

  const relatedProducts = rankRelatedProducts(product, relatedCandidates).slice(0, 10).map(serializeProduct);
  const ratingSummary = summarizeProductReviews(reviewRatings.map((review) => review.rating));
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(product.promotionalPrice && currentPrice < normalPrice);
  const saving = hasPromotion ? normalPrice - currentPrice : 0;
  const discountPercentage = hasPromotion ? Math.round((saving / normalPrice) * 100) : 0;
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
  const productStructuredData = buildProductStructuredData({
    category: product.category,
    brand: product.brand,
    description: product.description,
    ean: product.ean,
    imageUrl: product.imageUrl,
    name: product.name,
    price: currentPrice,
    rating: ratingSummary,
    sku: product.sku,
    slug: product.slug,
    stock: product.stock,
  });
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
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: serializeProductStructuredData([productStructuredData, breadcrumbData([{ name: "Início", path: "/" }, { name: "Catálogo", path: "/catalogo" }, ...(product.category ? [{ name: product.category, path: categoryPath(product.category) }] : []), { name: product.name, path: `/produto/${encodeURIComponent(product.slug)}` }])]) }}
        type="application/ld+json"
      />
      <section className="border-b border-line bg-[#f7f8fa]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-12 lg:pt-56">
          <nav aria-label="Navegacao estrutural" className="flex items-center gap-1 overflow-hidden text-xs font-bold text-muted sm:text-sm">
            <Link className="shrink-0 transition hover:text-brand" href="/">Home</Link>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            {product.category ? (
              <>
                <Link className="shrink-0 hover:text-brand" href={categoryPath(product.category)}>{product.category}</Link>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </>
            ) : null}
            <span aria-current="page" className="truncate text-ink">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="grid min-w-0 gap-4 lg:sticky lg:top-52">
              <ProductImageViewer imageUrl={product.imageUrl} key={product.id} name={product.name} />
              <div className="flex items-center gap-3 px-2 text-sm text-muted">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand"><Headphones className="h-5 w-5" aria-hidden="true" /></span>
                <p><strong className="block font-bold text-ink">Cuidado de perto, também online.</strong><span className="text-xs">Atendimento pela equipe da Wimifarma em Ivaté.</span></p>
              </div>
            </div>

            <div className="grid gap-4">
              <article className="min-w-0 rounded-3xl border border-line bg-white p-5 shadow-[0_12px_40px_rgba(17,24,39,0.04)] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand">{product.brand ?? "Wimifarma"}</span>
                  <ProductShareButton key={product.id} name={product.name} />
                </div>

                <h1 className="mt-4 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-3xl lg:text-[2.15rem]">{product.name}</h1>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" />Vendido e atendido por <strong className="font-bold text-ink">Wimifarma</strong></p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {ratingSummary.count > 0 ? (
                    <a className="inline-flex min-h-8 items-center gap-2 text-xs font-bold text-muted transition hover:text-brand focus-visible:outline-brand" href="#avaliacoes">
                      <RatingStars rating={ratingSummary.average} />
                      {`${ratingSummary.average} (${ratingSummary.count} ${ratingSummary.count === 1 ? "avaliacao" : "avaliacoes"})`}
                    </a>
                  ) : (
                    <a className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-muted underline-offset-4 transition hover:text-brand hover:underline focus-visible:outline-brand" href="#avaliacoes">
                      <Star className="h-4 w-4" aria-hidden="true" />
                      Sem avaliações · Seja o primeiro a avaliar
                    </a>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {product.category ? <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-muted">{product.category}</span> : null}
                  {product.isPopularPharmacy ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Farmácia Popular</span> : null}
                  {product.requiresPrescription ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Exige receita</span> : null}
                  {product.sku ? <span className="self-center text-xs text-muted">Cód. {product.sku}</span> : null}
                </div>

                <div className="mt-5 rounded-2xl bg-brand-soft/70 p-5">
                  {hasPromotion ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">De <del>{formatCurrency(normalPrice)}</del></span>
                      <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">−{discountPercentage}%</span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <strong className="text-5xl font-bold tracking-tight text-brand tabular-nums">{formatCurrency(currentPrice)}</strong>
                    <span className="text-xs text-muted">por unidade</span>
                  </div>
                  {hasPromotion ? <p className="mt-2 text-xs font-semibold text-emerald-800">Você economiza {formatCurrency(saving)} por unidade</p> : null}
                </div>

                <ProductCashback product={product} unitPriceCents={Math.round(currentPrice * 100)} details />
                <ProductPurchasePanel key={product.id} product={cartProduct} />

                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <p>Pedido confirmado pela equipe. O pagamento é combinado no atendimento, sem informar dados de cartão no site.</p>
                </div>
              </article>

              <div className="scroll-mt-56" id="entrega"><DeliveryEstimator /></div>
            </div>
          </div>

          <div className="mt-8 grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-3">
            <div className="flex items-center gap-3 border-b border-line p-4 sm:border-b-0 sm:border-r">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-pharma-green"><MapPin className="h-5 w-5" aria-hidden="true" /></span>
              <span><strong className="block text-sm text-ink">Retirada gratuita</strong><span className="mt-0.5 block text-xs font-semibold text-muted">Na loja em Ivate</span></span>
            </div>
            <div className="flex items-center gap-3 border-b border-line p-4 sm:border-b-0 sm:border-r">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
              <span><strong className="block text-sm text-ink">Pedido acompanhado</strong><span className="mt-0.5 block text-xs font-semibold text-muted">Confirmacao pela equipe</span></span>
            </div>
            <div className="flex items-center gap-3 p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><Headphones className="h-5 w-5" aria-hidden="true" /></span>
              <span><strong className="block text-sm text-ink">Duvidas pelo WhatsApp</strong><span className="mt-0.5 block text-xs font-semibold text-muted">Atendimento da farmacia</span></span>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Explore este produto" className="border-b border-line bg-white px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1 py-2 text-sm font-semibold text-muted sm:gap-x-10">
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#informacoes"><PackageCheck className="h-4 w-4" aria-hidden="true" />Detalhes do produto</a>
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#entrega"><Truck className="h-4 w-4" aria-hidden="true" />Entrega e retirada</a>
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#avaliacoes"><Star className="h-4 w-4" aria-hidden="true" />Avaliações <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs">{ratingSummary.count}</span></a>
          <a className="inline-flex min-h-12 items-center gap-2 transition-colors hover:text-brand focus-visible:outline-brand" href="#relacionados">Produtos relacionados<ChevronRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </nav>

      <section className="scroll-mt-52 bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-16" id="informacoes">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="text-xs font-black uppercase text-brand">Informacoes do produto</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Conheça antes de comprar</h2>
              <div className="mt-7 divide-y divide-line border-y border-line">
                <details className="group py-5" open>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-ink focus-visible:outline-brand">Descrição<ChevronRight className="h-5 w-5 text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" /></summary>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted">{product.description ?? "A descricao detalhada ainda nao foi cadastrada. Consulte a embalagem e confirme as informacoes com a equipe da farmacia."}</p>
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
                  <p className="mt-4 text-sm leading-7 text-muted">Pix apos confirmacao da equipe, dinheiro ou cartao no atendimento. O site nao solicita numero do cartao ou CVV.</p>
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

      <section className="scroll-mt-52 border-y border-line bg-[#f7f8fa] px-4 py-14 sm:px-6 lg:px-8" id="avaliacoes">
        <div className="mx-auto max-w-7xl">
          {reviews.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)_22rem] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-brand">Avaliacoes</p>
              <h2 className="mt-2 text-3xl font-black text-ink">Opinioes de clientes</h2>
              {ratingSummary.average !== null ? (
                <>
                  <strong className="mt-6 block text-5xl font-black text-ink">{ratingSummary.average}</strong>
                  <RatingStars rating={ratingSummary.average} size="h-5 w-5" />
                  <p className="mt-2 text-sm font-semibold text-muted">{ratingSummary.count} {ratingSummary.count === 1 ? "avaliacao verificada" : "avaliacoes verificadas"}</p>
                  <div className="mt-5 grid gap-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div className="grid grid-cols-[1rem_1fr_1.5rem] items-center gap-2 text-xs font-bold text-muted" key={rating}>
                        <span>{rating}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-amber-400" style={{ width: `${(ratingSummary.distribution[rating - 1] / ratingSummary.count) * 100}%` }} /></span>
                        <span>{ratingSummary.distribution[rating - 1]}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-6"><RatingStars rating={null} size="h-5 w-5" /><p className="mt-3 text-sm font-semibold leading-6 text-muted">Este produto ainda nao recebeu avaliacoes.</p></div>
              )}
            </div>

            <div className="grid gap-3">
              {reviews.map((review) => (
                <article className="rounded-lg border border-line bg-white p-5 shadow-[0_10px_28px_rgba(17,24,39,0.05)]" key={review.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><strong className="text-sm font-black text-ink">{publicReviewerName(review.customer.name)}</strong><span className="ml-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[0.68rem] font-black uppercase text-emerald-700">Compra verificada</span></div>
                    <time className="text-xs font-semibold text-muted" dateTime={review.createdAt.toISOString()}>{dateFormatter.format(review.createdAt)}</time>
                  </div>
                  <div className="mt-3"><RatingStars rating={review.rating} /></div>
                  <p className="mt-3 text-sm leading-7 text-muted">{review.comment}</p>
                  {review.cashbackRewardCents > 0 ? <p className="mt-3 text-xs text-muted">Avaliacao com incentivo de cashback, independente da nota.</p> : null}
                </article>
              ))}
            </div>

            <ProductReviewForm
              canReview={Boolean(completedOrder)}
              existingReview={existingReview}
              isCustomer={Boolean(customerId)}
              loginHref={`/login?callbackUrl=${encodeURIComponent(`/produto/${product.slug}#avaliacoes`)}`}
              productId={product.id}
              rewardAvailable={!existingReview && !product.requiresPrescription && !product.isPopularPharmacy}
            />
          </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
              <div className="relative overflow-hidden rounded-lg border border-line bg-white p-6 shadow-[0_14px_38px_rgba(17,24,39,0.06)] sm:p-8">
                <div className="absolute inset-y-0 left-0 w-1 bg-brand" />
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <Star className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Avaliacoes verificadas</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl">Sua experiencia pode ser a primeira</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Depois de uma compra concluida, conte como foi o produto e o atendimento. Sua opiniao ajuda outros clientes a decidir com mais seguranca.</p>
                  </div>
                </div>
                <div className="mt-7 grid gap-3 border-t border-line pt-5 text-sm font-semibold text-muted sm:grid-cols-3">
                  <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-pharma-green" aria-hidden="true" />Pedido concluido</span>
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-pharma-green" aria-hidden="true" />Cliente identificado</span>
                  <span className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />Nota de 1 a 5</span>
                </div>
              </div>

              <ProductReviewForm
                canReview={Boolean(completedOrder)}
                existingReview={existingReview}
                isCustomer={Boolean(customerId)}
                loginHref={`/login?callbackUrl=${encodeURIComponent(`/produto/${product.slug}#avaliacoes`)}`}
                productId={product.id}
                rewardAvailable={!existingReview && !product.requiresPrescription && !product.isPopularPharmacy}
              />
            </div>
          )}
        </div>
      </section>

      <section className="scroll-mt-52 bg-white px-4 pb-28 pt-14 sm:px-6 lg:px-8" id="relacionados">
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
    </>
  );
}
