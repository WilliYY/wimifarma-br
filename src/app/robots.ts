import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/admin", "/api", "/minha-conta"],
      userAgent: "*",
    },
    sitemap: "https://wimifarma.com.br/sitemap.xml",
  };
}
