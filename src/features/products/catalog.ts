export type ProductCatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProductCatalogSort = "newest" | "name" | "price" | "stock";

export type ProductCatalogItem = {
  brand: string | null;
  category: string | null;
  createdAt: string;
  ean: string | null;
  name: string;
  price: string;
  promotionalPrice: string | null;
  sku: string | null;
  status: ProductCatalogStatus;
  stock: number;
};

export type ProductCatalogFilters = {
  category: string;
  query: string;
  sort: ProductCatalogSort;
  status: "ALL" | ProductCatalogStatus;
};

function normalize(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function getProductCategories(products: ProductCatalogItem[]) {
  const categories = new Map<string, string>();

  for (const product of products) {
    const category = product.category?.trim();
    if (category) categories.set(normalize(category), category);
  }

  return [...categories.values()].sort((left, right) =>
    left.localeCompare(right, "pt-BR", { sensitivity: "base" }),
  );
}

export function filterAndSortProducts<T extends ProductCatalogItem>(
  products: T[],
  filters: ProductCatalogFilters,
) {
  const query = normalize(filters.query);
  const category = normalize(filters.category);

  const filtered = products.filter((product) => {
    if (filters.status !== "ALL" && product.status !== filters.status) return false;
    if (category && normalize(product.category) !== category) return false;
    if (!query) return true;

    return [product.name, product.brand, product.category, product.sku, product.ean]
      .some((value) => normalize(value).includes(query));
  });

  return filtered.sort((left, right) => {
    if (filters.sort === "name") {
      return left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
    }
    if (filters.sort === "price") {
      return Number(left.promotionalPrice ?? left.price) - Number(right.promotionalPrice ?? right.price);
    }
    if (filters.sort === "stock") return left.stock - right.stock;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}
