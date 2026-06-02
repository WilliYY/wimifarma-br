import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wimifarma.com.br"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Wimifarma | Farmacia em Ivate-PR",
    template: "%s | Wimifarma",
  },
  description:
    "Plataforma comercial da Wimifarma em Ivate-PR: delivery, Farmacia Popular e atendimento pelo WhatsApp.",
  icons: {
    apple: "/favicon.svg",
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    description:
      "Delivery em Ivate e atendimento farmaceutico com a Wimifarma.",
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
    title: "Wimifarma",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Delivery em Ivate e atendimento farmaceutico com a Wimifarma.",
    images: ["/banners/faixa-home.webp"],
    title: "Wimifarma | Farmacia em Ivate-PR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
