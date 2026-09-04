import { HomePage } from "@/components/site/home-page";
import {
  SHOWCASE_SLOT_COUNT,
  type PublicShowcaseProduct,
} from "@/features/offers/showcase";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
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
      slug: true,
      stock: true,
    },
    take: SHOWCASE_SLOT_COUNT,
    where: {
      featuredPosition: { gte: 1, lte: SHOWCASE_SLOT_COUNT },
      imageUrl: { not: null },
      status: "ACTIVE",
    },
  });
  const featuredProducts = products.map((product) => ({
    ...product,
    featuredPosition: product.featuredPosition as number,
    imageUrl: product.imageUrl as string,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
  })) satisfies PublicShowcaseProduct[];

  return <HomePage featuredProducts={featuredProducts} />;
}
