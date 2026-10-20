import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
import { catalogGroup, categoryShortcuts } from "@/features/products/home-shortcuts";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ pagina?: string | string[]; grupo?: string | string[]; ordem?: string | string[]; marca?: string | string[] }> };
const description = "Conheça os produtos da Wimifarma em Ivaté-PR. Explore medicamentos, higiene, beleza e cuidados por categoria, com preços e informações de cada produto.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Catálogo de produtos${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/catalogo${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const group = catalogGroup(params.grupo);
  const brand = typeof params.marca === "string" ? params.marca.trim() || undefined : undefined;
  const sort = params.ordem === "preco-asc" || group || brand ? "preco-asc" : undefined;
  const query = new URLSearchParams();
  if (group) query.set("grupo", group);
  if (sort) query.set("ordem", sort);
  if (brand) query.set("marca", brand);
  const path = `/catalogo${query.size ? `?${query}` : ""}`;
  const intro = group === "dermo" ? "Cuidados para sua pele." : group ? "Confira os produtos desta categoria." : "Encontre o que você precisa.";
  return <CatalogPage title={categoryShortcuts.find(item => item.id === group)?.label ?? "Produtos"} description={intro} path={path} page={catalogPageNumber(params.pagina)} group={group} sort={sort} brand={brand} />;
}
