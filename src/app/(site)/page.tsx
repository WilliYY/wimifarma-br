import type { Metadata } from "next";
import { HomePage, type HomeReview } from "@/components/site/home-page";
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
  const [products, reviews] = await Promise.all([
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

  return (
    <HomePage
      customerReviews={customerReviews}
      featuredProducts={featuredProducts}
    />
  );
}
