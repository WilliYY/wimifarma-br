import type { Metadata } from "next";
import { HomePage, type HomeReview } from "@/components/site/home-page";
import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import {
  SHOWCASE_SLOT_COUNT,
  type PublicShowcaseProduct,
} from "@/features/offers/showcase";
import {
  publicReviewerName,
  summarizeProductReviews,
} from "@/features/products/product-detail";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Page() {
  const prisma = getPrisma();
  const [products, catalogProductsData, reviews] = await Promise.all([
    prisma.product.findMany({
      orderBy: { featuredPosition: "asc" },
      select: {
        brand: true,
        category: true,
        description: true,
        featuredPosition: true,
        id: true,
        imageUrl: true,
        isPopularPharmacy: true,
        name: true,
        price: true,
        promotionalPrice: true,
        requiresPrescription: true,
        reviews: {
          select: { rating: true },
          where: { isPublished: true, order: { status: "COMPLETED" } },
        },
        slug: true,
        stock: true,
      },
      take: SHOWCASE_SLOT_COUNT,
      where: {
        featuredPosition: { gte: 1, lte: SHOWCASE_SLOT_COUNT },
        imageUrl: { not: null },
        status: "ACTIVE",
      },
    }),
    prisma.product.findMany({
      orderBy: [
        { featuredPosition: "asc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        activeIngredients: true,
        brand: true,
        category: true,
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
      },
      take: 10,
      where: {
        category: { contains: "medic", mode: "insensitive" },
        imageUrl: { not: null },
        status: "ACTIVE",
      },
    }),
    prisma.productReview.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        comment: true,
        customer: { select: { name: true } },
        id: true,
        product: { select: { name: true, slug: true } },
        rating: true,
      },
      take: 10,
      where: {
        isPublished: true,
        order: { status: "COMPLETED" },
        product: { status: "ACTIVE" },
      },
    }),
  ]);
  const featuredProducts = products.map(({ reviews: productReviews, ...product }) => {
    const rating = summarizeProductReviews(
      productReviews.map((review) => review.rating),
    );

    return {
      ...product,
      featuredPosition: product.featuredPosition as number,
      imageUrl: product.imageUrl as string,
      price: product.price.toString(),
      promotionalPrice: product.promotionalPrice?.toString() ?? null,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    };
  }) satisfies PublicShowcaseProduct[];
  const customerReviews = reviews.map((review) => ({
    comment: review.comment,
    id: review.id,
    productName: review.product.name,
    productSlug: review.product.slug,
    rating: review.rating,
    reviewerName: publicReviewerName(review.customer.name),
  })) satisfies HomeReview[];
  const catalogProducts = catalogProductsData.map((product) => ({
    ...product,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
  })) satisfies RelatedProductCardItem[];

  return (
    <HomePage
      catalogProducts={catalogProducts}
      customerReviews={customerReviews}
      featuredProducts={featuredProducts}
    />
  );
}
