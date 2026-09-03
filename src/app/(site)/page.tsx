import { HomePage } from "@/components/site/home-page";
import type { PublicShowcaseProduct } from "@/features/offers/showcase";
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
      name: true,
      price: true,
      promotionalPrice: true,
    },
    take: 15,
    where: {
      featuredPosition: { not: null },
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
