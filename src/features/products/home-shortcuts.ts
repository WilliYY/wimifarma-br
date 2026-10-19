export type HomeShortcutItem = {
  id: "offers" | "baby" | "medicines" | "vitamins" | "dermo" | "beauty" | "popular" | "delivery";
  label: string;
  href: string;
  external: boolean;
};

export const categoryShortcuts = [
  { id: "baby", label: "Infantil", names: ["infantil", "bebes", "bebe", "cuidados infantis", "fraldas"] },
  { id: "medicines", label: "Medicamentos", names: ["medicamentos", "remedios", "medicamento", "genericos", "generico", "similares", "similar", "eticos", "etico", "mip", "otc", "antimicrobianos", "antibioticos", "controlados"] },
  { id: "vitamins", label: "Vitaminas e suplementos", names: ["vitaminas e suplementos", "vitaminas", "suplementos alimentares", "suplementos"] },
  { id: "dermo", label: "Dermo", names: ["dermo", "dermocosmeticos", "dermocosmetica"] },
  { id: "beauty", label: "Perfumaria", names: ["perfumaria", "higiene e beleza", "beleza", "cosmeticos"] },
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
  return categories.filter(category => shortcut.names.some(name => ` ${normalizeName(category.name)} `.includes(` ${name} `))).flatMap(category => category.names ?? [category.name]);
}

export function buildHomeShortcuts(categories: readonly { name: string; slug: string }[], phone: string): HomeShortcutItem[] {
  const availableCategories = categories.map(category => ({ ...category, normalizedName: normalizeName(category.name) }));
  const items: HomeShortcutItem[] = [{ id: "offers", label: "Ofertas", href: "/ofertas", external: false }];

  for (const shortcut of categoryShortcuts) {
    const category = availableCategories.find(candidate => shortcut.names.some(name => ` ${candidate.normalizedName} `.includes(` ${name} `)));
    items.push({
      id: shortcut.id,
      label: shortcut.label,
      href: category
        ? `/catalogo?grupo=${shortcut.id}&ordem=preco-asc`
        : `https://wa.me/${phone}?text=${encodeURIComponent(`Olá! Gostaria de consultar a equipe sobre ${shortcut.label.toLowerCase()}.`)}`,
      external: !category,
    });
  }

  items.push(
    { id: "popular", label: "Farmácia Popular", href: "/farmacia-popular", external: false },
    { id: "delivery", label: "Delivery", href: "/delivery", external: false },
  );
  return items;
}
