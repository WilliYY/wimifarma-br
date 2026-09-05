import type { MetadataRoute } from "next";
import { getPrisma } from "@/lib/prisma";

const baseUrl = "https://wimifarma.com.br";

export const dynamic = "force-dynamic";

const publicRoutes = [
  "",
  "/farmacia-popular",
  "/delivery",
  "/sobre",
  "/contato",
  "/login",
  "/ofertas",
  "/privacidade",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    changeFrequency: route === "" ? "weekly" : "monthly",
    lastModified: now,
    priority: route === "" ? 1 : 0.7,
    url: `${baseUrl}${route}`,
  }));

  try {
    const products = await getPrisma().product.findMany({
      orderBy: { updatedAt: "desc" },
      select: { slug: true, updatedAt: true },
      where: { status: "ACTIVE" },
    });

    return [
      ...staticEntries,
      ...products.map((product) => ({
        changeFrequency: "weekly" as const,
        lastModified: product.updatedAt,
        priority: 0.8,
        url: `${baseUrl}/produto/${encodeURIComponent(product.slug)}`,
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
