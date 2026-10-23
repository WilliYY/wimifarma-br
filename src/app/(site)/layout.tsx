import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { SiteVisitTracker } from "@/components/site/site-visit-tracker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { CartProvider } from "@/components/site/cart-provider";
import { siteStructuredData } from "@/lib/seo";
import { serializeProductStructuredData } from "@/features/products/product-detail";
import { createHash } from "node:crypto";
import { auth } from "@/features/auth/auth";
import { safeMiaubyFirstName } from "@/features/miauby/greetings";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const viewer = session?.user?.id ? {
    key: createHash("sha256").update(`miauby:${session.user.id}`).digest("hex").slice(0, 24),
    name: safeMiaubyFirstName(session.user.name) ?? "",
  } : null;
  return (
    <CartProvider>
      <script dangerouslySetInnerHTML={{ __html: serializeProductStructuredData(siteStructuredData()) }} type="application/ld+json" />
      <SiteVisitTracker />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <FloatingWhatsApp viewer={viewer} />
      <SiteFooter />
    </CartProvider>
  );
}
