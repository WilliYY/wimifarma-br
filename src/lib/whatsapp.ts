import { siteConfig } from "@/lib/site";

export function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.phone}?text=${encoded}`;
}
