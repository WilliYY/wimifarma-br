import type { Metadata } from "next";
import { HomePage, type HomeReview } from "@/components/site/home-page";
import {
  publicReviewerName,
} from "@/features/products/product-detail";
import { getPrisma } from "@/lib/prisma";
import { buildHomeShortcuts } from "@/features/products/home-shortcuts";
import { buildHomeCollections } from "@/features/products/home-collections";
import { validatedHomePhotos } from "@/features/products/home-photos";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { getPublicBrands } from "@/features/products/storefront";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Page() {
  const prisma = getPrisma();
  const [products, reviews, brands] = await Promise.all([
    prisma.product.findMany({
      select: {
        ...supplierOfferInclude, ean: true, inventorySource: true,
        id: true, name: true, slug: true, brand: true, category: true,
        imageUrl: true, price: true, promotionalPrice: true, stock: true,
        activeIngredients: true, searchTerms: true, requiresPrescription: true,
        prescriptionType: true, isPopularPharmacy: true, cashbackEnabled: true, cashbackRateBps: true,
      },
      where: { status: "ACTIVE", imageUrl: { not: null }, requiresPrescription: false },
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
    getPublicBrands(),
  ]);
  const now = new Date();
  const saleProducts = products.map(product => toSaleProduct(product, now.getTime()));
  const photos = await validatedHomePhotos(saleProducts.map(product => product.imageUrl));
  const collections = buildHomeCollections(saleProducts, photos, now);
  const customerReviews = reviews.map((review) => ({
    incentivized: review.cashbackRewardCents > 0,
    comment: review.comment,
    id: review.id,
    productName: review.product.name,
    productSlug: review.product.slug,
    rating: review.rating,
    reviewerName: publicReviewerName(review.customer.name),
  })) satisfies HomeReview[];

  return (
    <HomePage
      brands={brands}
      collections={collections}
      customerReviews={customerReviews}
      shortcuts={buildHomeShortcuts()}
    />
  );
}
