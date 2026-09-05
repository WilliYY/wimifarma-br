import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ChevronRight,
  CreditCard,
  PackageCheck,
  Pill,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { DeliveryEstimator } from "@/components/site/delivery-estimator";
import { ProductImageViewer } from "@/components/site/product-image-viewer";
import { ProductPurchasePanel } from "@/components/site/product-purchase-panel";
import { ProductReviewForm } from "@/components/site/product-review-form";
import { PublicProductCard } from "@/components/site/public-product-card";
import { auth } from "@/features/auth/auth";
import {
  publicReviewerName,
  summarizeProductReviews,
} from "@/features/products/product-detail";
import {
  normalizeProductSearch,
  rankRelatedProducts,
  type PublicProductSearchItem,
} from "@/features/products/public-search";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const productSelect = {
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

function serializeProduct(product: ProductRecord): PublicProductSearchItem {
  return {
    activeIngredients: product.activeIngredients,
    brand: product.brand,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    name: product.name,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    requiresPrescription: product.requiresPrescription,
    searchTerms: product.searchTerms,
    slug: product.slug,
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
    select: { description: true, imageUrl: true, name: true },
    where: { slug, status: "ACTIVE" },
  });
  if (!product) return {};
  const description = product.description?.slice(0, 155) ?? `Consulte preco e disponibilidade de ${product.name} na Wimifarma.`;
  return {
    description,
    openGraph: {
      description,
      images: product.imageUrl ? [{ alt: product.name, url: product.imageUrl }] : undefined,
      title: product.name,
      type: "website",
    },
    title: product.name,
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
  const customerId = session?.user?.role === "CUSTOMER" ? session.user.id : null;
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
      select: { comment: true, createdAt: true, customer: { select: { name: true } }, id: true, rating: true },
      take: 8,
      where: { isPublished: true, productId: product.id },
    }),
    prisma.productReview.findMany({
      select: { rating: true },
      where: { isPublished: true, productId: product.id },
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
          where: { customerId, items: { some: { productId: product.id } }, status: "COMPLETED" },
        })
      : Promise.resolve(null),
  ]);

  const relatedProducts = rankRelatedProducts(product, relatedCandidates).slice(0, 6).map(serializeProduct);
  const ratingSummary = summarizeProductReviews(reviewRatings.map((review) => review.rating));
  const normalPrice = Number(product.price);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(product.promotionalPrice && currentPrice < normalPrice);
  const saving = hasPromotion ? normalPrice - currentPrice : 0;
  const discountPercentage = hasPromotion ? Math.round((saving / normalPrice) * 100) : 0;
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
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
      <section className="border-b border-line bg-[#f5f6f8]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-16 lg:pt-56">
          <nav aria-label="Navegacao estrutural" className="flex items-center gap-1 overflow-hidden text-xs font-bold text-muted sm:text-sm">
            <Link className="shrink-0 transition hover:text-brand" href="/">Home</Link>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            {product.category ? (
              <>
                <span className="shrink-0">{product.category}</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </>
            ) : null}
            <span aria-current="page" className="truncate text-ink">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-start">
            <ProductImageViewer imageUrl={product.imageUrl} name={product.name} />

            <div className="grid gap-4">
              <article className="border border-line bg-white p-5 shadow-[0_18px_50px_rgba(17,24,39,0.07)] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-black text-brand">{product.brand ?? "Wimifarma"}</span>
                  <a className="inline-flex items-center gap-2 text-xs font-bold text-muted transition hover:text-brand" href="#avaliacoes">
                    <RatingStars rating={ratingSummary.average} />
                    {ratingSummary.count > 0
                      ? `${ratingSummary.average} (${ratingSummary.count} ${ratingSummary.count === 1 ? "avaliacao" : "avaliacoes"})`
                      : "Sem avaliacoes"}
                  </a>
                </div>

                <h1 className="mt-4 text-2xl font-black leading-tight text-ink sm:text-3xl lg:text-4xl">{product.name}</h1>
                <p className="mt-2 text-xs font-semibold text-muted">
                  Vendido e atendido por <strong className="text-ink">Wimifarma</strong>{product.sku ? ` · cod. ${product.sku}` : ""}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {product.category ? <span className="rounded-md bg-brand-soft px-3 py-1.5 text-xs font-black uppercase text-brand">{product.category}</span> : null}
                  {product.isPopularPharmacy ? <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">Farmacia Popular</span> : null}
                  {product.requiresPrescription ? <span className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-black uppercase text-amber-700">Exige receita</span> : null}
                </div>

                <div className="mt-6">
                  {hasPromotion ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-muted line-through">{formatCurrency(normalPrice)}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{discountPercentage}% OFF</span>
                    </div>
                  ) : null}
                  <strong className="mt-1 block text-4xl font-black text-brand">{formatCurrency(currentPrice)}</strong>
                  {hasPromotion ? <p className="mt-1 text-xs font-bold text-pharma-green">Economize {formatCurrency(saving)}</p> : null}
                </div>

                <ProductPurchasePanel product={cartProduct} />

                <div className="mt-6 grid gap-3 border-t border-line pt-5 text-xs font-semibold text-muted sm:grid-cols-3">
                  <span className="flex items-start gap-2"><PackageCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />Estoque conferido ao enviar</span>
                  <span className="flex items-start gap-2"><CreditCard className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />Pagamento combinado no pedido</span>
                  <span className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />Atendimento da equipe</span>
                </div>
              </article>

              <DeliveryEstimator />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="text-xs font-black uppercase text-brand">Informacoes do produto</p>
              <h2 className="mt-2 text-3xl font-black text-ink">Conheca antes de comprar</h2>
              <div className="mt-7 divide-y divide-line border-y border-line">
                <details className="group py-5" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-ink">Descricao<ChevronRight className="h-5 w-5 text-brand transition group-open:rotate-90" aria-hidden="true" /></summary>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted">{product.description ?? "A descricao detalhada ainda nao foi cadastrada. Consulte a embalagem e confirme as informacoes com a equipe da farmacia."}</p>
                </details>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-ink">Principios ativos e identificacao<ChevronRight className="h-5 w-5 text-brand transition group-open:rotate-90" aria-hidden="true" /></summary>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="font-bold text-muted">Principios ativos</dt><dd className="mt-1 font-black text-ink">{product.activeIngredients.join(", ") || "Nao informado"}</dd></div>
                    <div><dt className="font-bold text-muted">Marca</dt><dd className="mt-1 font-black text-ink">{product.brand ?? "Nao informada"}</dd></div>
                    <div><dt className="font-bold text-muted">Categoria</dt><dd className="mt-1 font-black text-ink">{product.category ?? "Nao informada"}</dd></div>
                    <div><dt className="font-bold text-muted">EAN</dt><dd className="mt-1 font-black text-ink">{product.ean ?? "Nao informado"}</dd></div>
                  </dl>
                </details>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-ink">Formas de pagamento<ChevronRight className="h-5 w-5 text-brand transition group-open:rotate-90" aria-hidden="true" /></summary>
                  <p className="mt-4 text-sm leading-7 text-muted">Pix apos confirmacao da equipe, dinheiro ou cartao no atendimento. O site nao solicita numero do cartao ou CVV.</p>
                </details>
              </div>
            </div>

            <aside className="h-fit border-l-4 border-brand bg-surface-subtle p-5 sm:p-6">
              <Pill className="h-6 w-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-black text-ink">Uso responsavel</h3>
              <p className="mt-3 text-sm leading-7 text-muted">Leia a embalagem e a bula. Em caso de duvida, fale com o farmaceutico. Nao use medicamentos sem orientacao adequada.</p>
              <p className="mt-3 text-xs font-semibold leading-5 text-muted">A imagem pode ter pequena variacao de embalagem conforme o lote do fabricante.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#f7f8fa] px-4 py-14 sm:px-6 lg:px-8" id="avaliacoes">
        <div className="mx-auto max-w-7xl">
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
                <div className="mt-6"><RatingStars rating={null} size="h-5 w-5" /><p className="mt-3 text-sm font-semibold leading-6 text-muted">Ainda nao ha avaliacoes publicadas. Nenhuma nota ficticia e exibida.</p></div>
              )}
            </div>

            <div className="divide-y divide-line border-y border-line">
              {reviews.length > 0 ? reviews.map((review) => (
                <article className="py-6" key={review.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><strong className="text-sm font-black text-ink">{publicReviewerName(review.customer.name)}</strong><span className="ml-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[0.68rem] font-black uppercase text-emerald-700">Compra verificada</span></div>
                    <time className="text-xs font-semibold text-muted" dateTime={review.createdAt.toISOString()}>{dateFormatter.format(review.createdAt)}</time>
                  </div>
                  <div className="mt-3"><RatingStars rating={review.rating} /></div>
                  <p className="mt-3 text-sm leading-7 text-muted">{review.comment}</p>
                </article>
              )) : <div className="flex min-h-44 items-center justify-center px-4 py-8 text-center text-sm font-semibold leading-6 text-muted">A primeira avaliacao aparecera aqui depois de uma compra concluida.</div>}
            </div>

            <ProductReviewForm
              canReview={Boolean(completedOrder)}
              existingReview={existingReview}
              isCustomer={Boolean(customerId)}
              loginHref={`/login?callbackUrl=${encodeURIComponent(`/produto/${product.slug}#avaliacoes`)}`}
              productId={product.id}
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
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
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{relatedProducts.map((relatedProduct) => <PublicProductCard key={relatedProduct.id} product={relatedProduct} />)}</div>
          ) : <div className="mt-7 flex min-h-36 items-center justify-center border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Ainda nao ha correlatos publicados para este produto.</div>}
        </div>
      </section>
    </>
  );
}
