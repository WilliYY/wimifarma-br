import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { SiteVisitTracker } from "@/components/site/site-visit-tracker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { CartProvider } from "@/components/site/cart-provider";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <SmoothScroll />
      <SiteVisitTracker />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <FloatingWhatsApp />
      <SiteFooter />
    </CartProvider>
  );
}
