import type { MetadataRoute } from "next";
import { getPrisma } from "@/lib/prisma";
import { categorySlug } from "@/lib/seo";

const baseUrl = "https://wimifarma.com.br";

export const dynamic = "force-dynamic";

const publicRoutes = [
  "",
  "/farmacia-popular",
  "/delivery",
  "/sobre",
  "/contato",
  "/catalogo",
  "/ofertas",
  "/privacidade",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
    url: `${baseUrl}${route}`,
  }));

  try {
    const products = await getPrisma().product.findMany({
      orderBy: { updatedAt: "desc" },
      select: { slug: true, updatedAt: true, category: true, imageUrl: true },
      where: { status: "ACTIVE" },
    });

    const categories = new Map<string, Date>();
    for (const product of products) if (product.category) {
      const slug = categorySlug(product.category);
      if (slug && (!categories.has(slug) || categories.get(slug)! < product.updatedAt)) categories.set(slug, product.updatedAt);
    }
    return [
      ...staticEntries,
      ...[...categories].map(([slug, updatedAt]) => ({ url: `${baseUrl}/categorias/${slug}`, lastModified: updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...products.map((product) => ({
        changeFrequency: "weekly" as const,
        lastModified: product.updatedAt,
        priority: 0.8,
        url: `${baseUrl}/produto/${encodeURIComponent(product.slug)}`,
        images: product.imageUrl ? [new URL(product.imageUrl, baseUrl).href] : undefined,
      })),
    ];
  } catch (error) {
    console.error(
      "Nao foi possivel incluir os produtos no sitemap.",
      error instanceof Error ? error.message : "Erro desconhecido.",
    );
    return staticEntries;
  }
}
