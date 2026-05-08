import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wimifarma.com.br"),
  title: {
    default: "Wimifarma | Farmacia em Ivate-PR",
    template: "%s | Wimifarma",
  },
  description:
    "Plataforma comercial da Wimifarma em Ivate-PR: ofertas, delivery, Farmacia Popular e atendimento pelo WhatsApp.",
  icons: {
    apple: "/favicon.svg",
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Wimifarma",
    description:
      "Ofertas, delivery em Ivate e atendimento farmaceutico com a Wimifarma.",
    siteName: "Wimifarma",
    locale: "pt_BR",
    type: "website",
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
