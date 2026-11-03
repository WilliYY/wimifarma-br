import { createPublicPageMetadata } from "@/lib/metadata";
import { catalogFilters, catalogFiltersPath, type CatalogParams } from "./catalog-navigation";

/** Both equivalent medicine entry points identify the same department and refinements. */
export function medicineCatalogMetadata(params: CatalogParams) {
  const filters = catalogFilters({ ...params, grupo: "medicines" });
  let path = catalogFiltersPath("/categorias/medicamentos", filters);
  if (filters.page > 1) path += `${path.includes("?") ? "&" : "?"}pagina=${filters.page}`;
  return createPublicPageMetadata({
    title: `Medicamentos em Ivaté-PR${filters.page > 1 ? ` - Página ${filters.page}` : ""}`,
    description: "Explore medicamentos na Wimifarma. Confira marcas, apresentações, preços e disponibilidade para entrega local ou retirada em Ivaté-PR.",
    path: path as `/${string}`,
  });
}
