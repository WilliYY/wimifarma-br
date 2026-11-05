"use client";

import { HomeProductCarousel } from "@/components/site/home-product-carousel";
import { CatalogShippingProvider } from "@/components/site/catalog-shipping-preview";
import { ClubBanner } from "@/components/site/club-banner";
import { PixDiscountBanner } from "@/components/site/pix-discount-banner";
import { HomeShortcuts } from "@/components/site/home-shortcuts";
import { BrandCarousel } from "@/components/site/brand-carousel";
import { HomeMediaGallery } from "@/components/site/home-media-gallery";
import { HomeMedicineRails } from "@/components/site/home-medicine-rails";
import type { PublicBrand } from "@/features/products/brands";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import type { HomeCollections } from "@/features/products/home-collections";
import { CustomerReviews } from "./customer-reviews";

export type HomeReview = {
  comment: string;
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  reviewerName: string;
  incentivized?: boolean;
};

export function HomePage({ brands = [], collections, customerReviews, shortcuts }: {
  brands?: PublicBrand[];
  collections: HomeCollections;
  customerReviews: HomeReview[];
  shortcuts: HomeShortcutItem[];
}) {
  return <CatalogShippingProvider>
    <section className="pharma-clouds bg-white pt-36 sm:pt-40 lg:pt-56">
      <h1 className="sr-only">Wimifarma</h1>
      <HomeShortcuts items={shortcuts} />
      <div className="px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><HomeMediaGallery /></div></div>
    </section>

    <HomeMedicineRails products={collections.medicines} />
    <BrandCarousel brands={brands} />
    <HomeProductCarousel compactHeader products={collections.care} id="home-care" title="Cuidados para o dia a dia 🌸" eyebrow="Beleza" href="/catalogo?grupo=beauty&ordem=preco-asc" />
    <PixDiscountBanner />
    <HomeProductCarousel compactHeader products={collections.affordable} id="home-affordable" title="Menores preços 💛" eyebrow="Economia" href="/catalogo?ordem=preco-asc" />
    <ClubBanner />
    <CustomerReviews reviews={customerReviews} />
  </CatalogShippingProvider>;
}
