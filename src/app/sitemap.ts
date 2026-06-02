import type { MetadataRoute } from "next";

const baseUrl = "https://wimifarma.com.br";

const publicRoutes = [
  "",
  "/farmacia-popular",
  "/delivery",
  "/sobre",
  "/contato",
  "/login",
  "/ofertas",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    changeFrequency: route === "" ? "weekly" : "monthly",
    lastModified: now,
    priority: route === "" ? 1 : 0.7,
    url: `${baseUrl}${route}`,
  }));
}
