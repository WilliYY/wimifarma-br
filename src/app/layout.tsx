import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const barlow = Barlow({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wimifarma.com.br"),
  title: {
    default: "Wimifarma | Farmacia em Ivate-PR",
    template: "%s | Wimifarma",
  },
  description:
    "Farmácia Wimifarma em Ivaté-PR. Medicamentos, higiene, beleza e cuidados para o dia a dia. Consulte produtos, entrega local e atendimento pelo WhatsApp.",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
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
    <html lang="pt-BR" className={`${barlow.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
