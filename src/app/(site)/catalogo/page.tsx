import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
import { categoryShortcuts } from "@/features/products/home-shortcuts";
import { catalogFilters, catalogFiltersPath, catalogSections, type CatalogParams } from "@/features/products/catalog-navigation";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<CatalogParams> };
const description = "Conheça os produtos da Wimifarma em Ivaté-PR. Explore medicamentos, higiene, beleza e cuidados por categoria, com preços e informações de cada produto.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Catálogo de produtos${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/catalogo${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const filters = catalogFilters(params);
  const { group } = filters;
  const path = catalogFiltersPath("/catalogo", filters);
  const intro = group === "dermo" ? "Cuidados para sua pele." : group ? "Confira os produtos desta categoria." : "Encontre o que você precisa.";
  const title = catalogSections.find(item => item.id === filters.section)?.label ?? (group === "beauty" ? "Higiene e beleza" : categoryShortcuts.find(item => item.id === group)?.label) ?? "Produtos";
  return <CatalogPage title={title} description={intro} path={path} {...filters} />;
}
