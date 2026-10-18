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
import { getPublicCategories } from "@/features/products/storefront";
import { buildHomeShortcuts } from "@/features/products/home-shortcuts";
import { siteConfig } from "@/lib/site";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Page() {
  const prisma = getPrisma();
  const [products, catalogProductsData, reviews, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { featuredPosition: "asc" },
      select: {
        ...supplierOfferInclude, ean: true, inventorySource: true,
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
        cashbackEnabled: true,
        cashbackRateBps: true,
        requiresPrescription: true,
        prescriptionType: true,
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
        NOT: { inventorySource: "DISTRIBUTOR", requiresPrescription: true },
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
        ...supplierOfferInclude, ean: true, inventorySource: true,
        brand: true,
        category: true,
        id: true,
        imageUrl: true,
        isPopularPharmacy: true,
        name: true,
        price: true,
        promotionalPrice: true,
        cashbackEnabled: true,
        cashbackRateBps: true,
        requiresPrescription: true,
        prescriptionType: true,
        searchTerms: true,
        slug: true,
        stock: true,
      },
      take: 10,
      where: {
        category: { contains: "medic", mode: "insensitive" },
        status: "ACTIVE",
      },
    }),
    prisma.productReview.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        cashbackRewardCents: true,
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
    getPublicCategories(),
  ]);
  const featuredProducts = products.map(({ reviews: productReviews, ...product }) => {
    const rating = summarizeProductReviews(
      productReviews.map((review) => review.rating),
    );

    return {
      ...toSaleProduct(product),
      featuredPosition: product.featuredPosition as number,
      imageUrl: product.imageUrl as string,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    };
  }) satisfies PublicShowcaseProduct[];
  const customerReviews = reviews.map((review) => ({
    incentivized: review.cashbackRewardCents > 0,
    comment: review.comment,
    id: review.id,
    productName: review.product.name,
    productSlug: review.product.slug,
    rating: review.rating,
    reviewerName: publicReviewerName(review.customer.name),
  })) satisfies HomeReview[];
  const catalogProducts = catalogProductsData.map(product => toSaleProduct(product)) satisfies RelatedProductCardItem[];

  return (
    <HomePage
      catalogProducts={catalogProducts}
      customerReviews={customerReviews}
      featuredProducts={featuredProducts}
      shortcuts={buildHomeShortcuts(categories, siteConfig.phone)}
    />
  );
}
