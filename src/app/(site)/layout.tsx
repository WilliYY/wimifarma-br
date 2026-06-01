import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { SiteVisitTracker } from "@/components/site/site-visit-tracker";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SmoothScroll />
      <SiteVisitTracker />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <FloatingWhatsApp />
      <SiteFooter />
    </>
  );
}
