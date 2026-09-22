import { isValidGtin } from "./identity";
import { productTypeHint } from "./product-types";
import { SITE_URL } from "@/lib/seo";

export type MarketingProduct = { id: string; slug: string; name: string; brand: string | null; category: string | null; description: string | null; ean: string | null; imageUrl: string | null; price: string | number; promotionalPrice: string | number | null; stock: number; status: string; requiresPrescription: boolean; isPopularPharmacy: boolean; activeIngredients: string[]; imageAsset?: { width: number; height: number; originalName: string } | null };
export function marketingIssues(product: MarketingProduct) {
  const issues: string[] = [];
  if (product.status !== "ACTIVE") issues.push("Publique o produto para compartilhar a página.");
  if (!product.brand?.trim()) issues.push("Informe a marca real do produto.");
  if (!product.category?.trim()) issues.push("Escolha uma categoria específica.");
  if (!product.description || product.description.trim().length < 60) issues.push("Complete a descrição com apresentação e características confirmadas.");
  if (!product.imageUrl) issues.push("Adicione uma foto nítida da embalagem.");
  if (!product.ean) issues.push("Confira o EAN na embalagem; não invente identificadores.");
  else if (!isValidGtin(product.ean)) issues.push("Corrija o EAN: o dígito verificador não confere.");
  return issues;
}
export function merchantIssues(product: MarketingProduct) {
  const issues = marketingIssues(product);
  const type = productTypeHint(`${product.category ?? ""} ${product.name} ${product.activeIngredients.join(" ")}`);
  const unreviewedIngredients = product.activeIngredients.length > 0 && !["beauty", "hygiene"].includes(type);
  if (product.requiresPrescription || product.isPopularPharmacy || unreviewedIngredients || !["beauty", "hygiene", "food"].includes(type)) issues.push("Tipo regulado ou não classificado: revisar separadamente as políticas do Google.");
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0 || (product.promotionalPrice !== null && (!Number.isFinite(Number(product.promotionalPrice)) || Number(product.promotionalPrice) <= 0 || Number(product.promotionalPrice) > Number(product.price)))) issues.push("Confira o preço normal e promocional.");
  if (!product.imageAsset || Math.min(product.imageAsset.width, product.imageAsset.height) < 500) issues.push("Para esta exportação, use foto cadastrada com pelo menos 500 × 500 px.");
  if (product.imageAsset && /arte-ilustrativa|arte-gerada/i.test(product.imageAsset.originalName)) issues.push("Use uma foto real como capa para esta exportação; reserve a arte para campanhas.");
  try { if (!product.imageUrl || new URL(product.imageUrl, SITE_URL).origin !== SITE_URL) issues.push("A foto precisa estar hospedada no site."); } catch { issues.push("URL da foto inválida."); }
  return [...new Set(issues)];
}
export function campaignUrl(slug: string, source: "whatsapp" | "instagram" | "google", campaign: string) {
  const url = new URL(`/produto/${encodeURIComponent(slug)}`, SITE_URL);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", source === "google" ? "cpc" : "social");
  url.searchParams.set("utm_campaign", campaign.trim().slice(0, 100) || "catalogo");
  return url.href;
}
const xml = (value: string | number) => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
export const MERCHANT_FEED_OPEN = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Wimifarma - catálogo de produtos</title><link>${SITE_URL}</link><description>Produtos publicados e atualizados automaticamente pela Wimifarma.</description>`;
export const MERCHANT_FEED_CLOSE = "</channel></rss>";

export function merchantFeedItems(products: MarketingProduct[]) {
  const eligible = products.filter(product => merchantIssues(product).length === 0);
  const items = eligible.map(product => {
    const fields: [string, string | number][] = [["id", product.id], ["link", `${SITE_URL}/produto/${encodeURIComponent(product.slug)}`], ["image_link", new URL(product.imageUrl!, SITE_URL).href], ["availability", product.stock > 0 ? "in_stock" : "out_of_stock"], ["condition", "new"], ["price", `${Number(product.price).toFixed(2)} BRL`], ["brand", product.brand!], ["gtin", product.ean!], ["product_type", product.category!]];
    if (product.promotionalPrice !== null && Number(product.promotionalPrice) < Number(product.price)) fields.push(["sale_price", `${Number(product.promotionalPrice).toFixed(2)} BRL`]);
    const structured = (tag: string, content: string) => `<g:${tag}><g:digital_source_type>trained_algorithmic_media</g:digital_source_type><g:content>${xml(content)}</g:content></g:${tag}>`;
    return `<item>${structured("structured_title", product.name)}${structured("structured_description", product.description!)}${fields.map(([key, value]) => `<g:${key}>${xml(value)}</g:${key}>`).join("")}</item>`;
  });
  return { count: eligible.length, excluded: products.length - eligible.length, items: items.join("") };
}

export function buildMerchantFeed(products: MarketingProduct[]) {
  const result = merchantFeedItems(products);
  return { count: result.count, excluded: result.excluded, xml: `${MERCHANT_FEED_OPEN}${result.items}${MERCHANT_FEED_CLOSE}` };
}
