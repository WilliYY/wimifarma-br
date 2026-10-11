export const SITE_URL = "https://wimifarma.com.br";
export const SITE_TITLE = "Wimifarma | Farmácia em Ivaté-PR";
export const SITE_DESCRIPTION = "Farmácia Wimifarma em Ivaté-PR, na Avenida Minas Gerais, 2263. Medicamentos, higiene e beleza. Consulte produtos, entrega e retirada com nossa equipe.";
export const STORE_ID = `${SITE_URL}/#farmacia`;

export function categorySlug(category: string) {
  return category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function categoryPath(category: string) { return `/categorias/${categorySlug(category)}`; }

export function breadcrumbData(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, SITE_URL).href })) };
}

export function siteStructuredData() {
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "Pharmacy", "@id": STORE_ID, name: "Wimifarma", legalName: "W Y Yoshiura Willian Produtos Farmacêuticos e Perfumaria", taxID: "07.676.534/0001-81", description: SITE_DESCRIPTION, url: `${SITE_URL}/`, telephone: "+5544984134971", logo: `${SITE_URL}/brand/logo-wimifarma-compact.webp`, image: `${SITE_URL}/banners/faixa-home.webp`, address: { "@type": "PostalAddress", streetAddress: "Avenida Minas Gerais, 2263", addressLocality: "Ivaté", addressRegion: "PR", postalCode: "87525-000", addressCountry: "BR" }, hasMap: "https://maps.app.goo.gl/DFZLnV3ps3Br84PXA" },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: "Wimifarma", alternateName: ["Wimifarma Ivaté", "wimifarma.com.br"], inLanguage: "pt-BR", publisher: { "@id": STORE_ID } },
  ] };
}
