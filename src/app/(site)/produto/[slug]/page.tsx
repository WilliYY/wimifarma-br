import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ImageIcon, Pill, ShieldCheck } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { PublicProductCard } from "@/components/site/public-product-card";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
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
  id: true,
  imageUrl: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  searchTerms: true,
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prisma = getPrisma();
  const product = await prisma.product.findFirst({
    select: productSelect,
    where: { slug, status: "ACTIVE" },
  });

  if (!product) notFound();

  const relationFilters: Prisma.ProductWhereInput[] = [];
  relationFilters.push(
    ...product.activeIngredients.map((ingredient) => ({
      searchText: { contains: normalizeProductSearch(ingredient) },
    })),
    ...product.searchTerms.map((term) => ({
      searchText: { contains: normalizeProductSearch(term) },
    })),
  );
  if (product.category) {
    relationFilters.push({ category: { equals: product.category, mode: "insensitive" } });
  }

  const relatedCandidates = relationFilters.length
    ? await prisma.product.findMany({
        orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: productSelect,
        take: 30,
        where: {
          id: { not: product.id },
          OR: relationFilters,
          status: "ACTIVE",
        },
      })
    : [];
  const relatedProducts = rankRelatedProducts(product, relatedCandidates)
    .slice(0, 6)
    .map(serializeProduct);
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const hasPromotion = Boolean(
    product.promotionalPrice && Number(product.promotionalPrice) < Number(product.price),
  );

  return (
    <>
      <section className="pharma-clouds border-b border-line bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pb-20 lg:pt-56">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-brand" href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a vitrine
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div className="flex aspect-square max-h-[34rem] items-center justify-center overflow-hidden rounded-lg border border-line bg-white p-6 shadow-[0_24px_70px_rgba(17,24,39,0.09)]">
              {product.imageUrl ? (
                <Image
                  alt={product.name}
                  className="h-full w-full object-contain"
                  height={720}
                  priority
                  src={product.imageUrl}
                  unoptimized
                  width={720}
                />
              ) : (
                <ImageIcon className="h-14 w-14 text-muted" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                {product.category ? (
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black uppercase text-brand">
                    {product.category}
                  </span>
                ) : null}
                {product.isPopularPharmacy ? (
                  <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-black uppercase text-[#027a48]">
                    Farmacia Popular
                  </span>
                ) : null}
                {product.requiresPrescription ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
                    Exige receita
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>
              {product.brand ? <p className="mt-2 text-base font-bold text-muted">{product.brand}</p> : null}

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <strong className="text-4xl font-black text-brand">
                  {formatCurrency(currentPrice)}
                </strong>
                {hasPromotion ? (
                  <span className="pb-1 text-base font-semibold text-muted line-through">
                    {formatCurrency(Number(product.price))}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-muted">
                Preco e disponibilidade sujeitos a confirmacao no atendimento.
              </p>

              {product.activeIngredients.length > 0 ? (
                <div className="mt-7">
                  <p className="flex items-center gap-2 text-sm font-black text-ink">
                    <Pill className="h-4 w-4 text-brand" />
                    Principios ativos
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.activeIngredients.map((ingredient) => (
                      <span className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink" key={ingredient}>
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {product.description ? (
                <p className="mt-7 max-w-2xl text-base leading-7 text-muted">{product.description}</p>
              ) : null}

              <AddToCartButton
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#20c864] px-6 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(32,200,100,0.24)] transition hover:-translate-y-0.5 hover:bg-[#16ad55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20c864] focus-visible:ring-offset-2"
                product={{
                  category: product.category,
                  id: product.id,
                  imageUrl: product.imageUrl,
                  isPopularPharmacy: product.isPopularPharmacy,
                  name: product.name,
                  originalPriceCents: hasPromotion ? Math.round(Number(product.price) * 100) : null,
                  requiresPrescription: product.requiresPrescription,
                  slug: product.slug,
                  stock: product.stock,
                  unitPriceCents: Math.round(currentPrice * 100),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 border-b border-line pb-7 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase text-brand">
                <BadgeCheck className="h-5 w-5" />
                Pesquisa orientada
              </p>
              <h2 className="mt-2 text-3xl font-black text-ink">Produtos correlatos</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Itens aproximados por principio ativo, termo de busca ou categoria cadastrada.
              </p>
            </div>
            <p className="flex max-w-md items-start gap-2 rounded-md bg-white px-4 py-3 text-xs font-semibold leading-5 text-muted shadow-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" />
              Correlato nao significa substituto. Confirme a opcao adequada com a equipe da farmacia.
            </p>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <PublicProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          ) : (
            <div className="mt-7 flex min-h-36 items-center justify-center rounded-lg border border-dashed border-line bg-white px-5 text-center text-sm font-semibold text-muted">
              Ainda nao ha correlatos publicados para este produto.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
