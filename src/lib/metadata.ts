import type { Metadata } from "next";

type PublicPageMetadataInput = {
  description: string;
  path: `/${string}`;
  title: string;
};

export function createPublicPageMetadata({
  description,
  path,
  title,
}: PublicPageMetadataInput): Metadata {
  const socialTitle = `${title} | Wimifarma`;

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: "Wimifarma",
          height: 1024,
          url: "/banners/faixa-home.webp",
          width: 1536,
        },
      ],
      locale: "pt_BR",
      siteName: "Wimifarma",
      title: socialTitle,
      type: "website",
      url: path,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: ["/banners/faixa-home.webp"],
      title: socialTitle,
    },
  };
}
