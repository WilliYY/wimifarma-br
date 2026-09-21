import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { SiteVisitTracker } from "@/components/site/site-visit-tracker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { CartProvider } from "@/components/site/cart-provider";
import { siteStructuredData } from "@/lib/seo";
import { serializeProductStructuredData } from "@/features/products/product-detail";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <script dangerouslySetInnerHTML={{ __html: serializeProductStructuredData(siteStructuredData()) }} type="application/ld+json" />
      <SiteVisitTracker />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <FloatingWhatsApp />
      <SiteFooter />
    </CartProvider>
  );
}
