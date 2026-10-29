import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import { isDiscountedOffer } from "@/features/offers/daily-rotation";
import { classificationIsConsistent, readClassification } from "./catalog-operations";
import { brasiliaDay, commercialPrice, dailyRank } from "./home-collections";

export type HomeShortcutItem = {
  id: "offers" | "hygiene" | "hair" | CatalogGroup;
  label: string;
  href: string;
  imageUrl?: string | null;
};

export const categoryShortcuts = [
  { id: "baby", label: "Infantil", names: ["infantil", "bebes", "bebe", "cuidados infantis", "fraldas infantis"] },
  { id: "medicines", label: "Medicamentos", names: ["medicamentos", "remedios", "medicamento", "genericos", "generico", "similares", "similar", "eticos", "etico", "mip", "otc", "antimicrobianos", "antibioticos", "controlados"] },
  { id: "vitamins", label: "Vitaminas e suplementos", names: ["vitaminas e suplementos", "vitaminas", "suplementos alimentares", "suplementos"] },
  { id: "dermo", label: "Dermo", names: ["dermo", "dermocosmeticos", "dermocosmetica", "protecao solar", "cuidados com a pele"] },
  { id: "beauty", label: "Perfumaria", names: ["perfumaria", "higiene e beleza", "beleza", "cosmeticos", "cabelos", "cuidados com os cabelos", "lencos e toalhas umedecidas"] },
] as const;

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type CatalogGroup = typeof categoryShortcuts[number]["id"];
export function catalogGroup(value: unknown): CatalogGroup | undefined {
  return categoryShortcuts.find(shortcut => shortcut.id === value)?.id;
}
export function groupCategoryNames(categories: readonly { name: string; names?: string[] }[], group: CatalogGroup) {
  const shortcut = categoryShortcuts.find(item => item.id === group)!;
  return categories.filter(category => {
    const name = normalizeName(category.name);
    return (group === "baby" && name === "fraldas")
      || shortcut.names.some(alias => ` ${name} `.includes(` ${alias} `));
  }).flatMap(category => category.names ?? [category.name]);
}

export function buildHomeShortcuts(products: readonly RelatedProductCardItem[] = [], verifiedPhotos: ReadonlySet<string> = new Set(), date = new Date()): HomeShortcutItem[] {
  const day = brasiliaDay(date);
  const eligible = products.filter(product => product.imageUrl && verifiedPhotos.has(product.imageUrl)
    && /^\/(uploads\/products|banners\/products)\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g|avif)$/.test(product.imageUrl)
    && product.stock > 0 && Number.isFinite(commercialPrice(product)) && commercialPrice(product) > 0
    && !product.requiresPrescription && !product.isPopularPharmacy
    && (!product.prescriptionType || product.prescriptionType === "UNREVIEWED"))
    .slice().sort((a, b) => dailyRank(day, a.id) - dailyRank(day, b.id) || a.id.localeCompare(b.id));
  const categories = [...new Set(eligible.flatMap(product => product.category ? [product.category] : []))].map(name => ({ name }));
  const shortcuts: (HomeShortcutItem & { id: "offers" | CatalogGroup })[] = [
    { id: "offers", label: "Ofertas", href: "/ofertas" },
    ...categoryShortcuts.map(({ id, label }) => ({ id, label, href: `/catalogo?grupo=${id}&ordem=preco-asc` })),
  ];
  return [...shortcuts.map(item => {
    const names = item.id === "offers" ? [] : groupCategoryNames(categories, item.id);
    const product = eligible.find(product => {
      if (item.id === "offers") return isDiscountedOffer(product);
      if (!product.category || !names.includes(product.category)) return false;
      if (item.id !== "medicines") return true;
      const classification = readClassification(product.catalogClassification);
      return classification.kind === "MEDICINE" && classification.otc && classificationIsConsistent(classification, product);
    });
    return { ...item, imageUrl: product?.imageUrl ?? null };
  }),
    { id: "hygiene", label: "Higiene bucal", href: "/catalogo?grupo=beauty&assunto=oral&ordem=preco-asc" },
    { id: "hair", label: "Cabelos", href: "/catalogo?grupo=beauty&assunto=hair&ordem=preco-asc" },
  ];
}
