import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
import { catalogGroup, categoryShortcuts } from "@/features/products/home-shortcuts";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ pagina?: string | string[]; grupo?: string | string[]; ordem?: string | string[] }> };
const description = "Conheça os produtos da Wimifarma em Ivaté-PR. Explore medicamentos, higiene, beleza e cuidados por categoria, com preços e informações de cada produto.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Catálogo de produtos${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/catalogo${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const group = catalogGroup(params.grupo);
  const sort = params.ordem === "preco-asc" || group ? "preco-asc" : undefined;
  const query = new URLSearchParams();
  if (group) query.set("grupo", group);
  if (sort) query.set("ordem", sort);
  const path = `/catalogo${query.size ? `?${query}` : ""}`;
  return <CatalogPage title={categoryShortcuts.find(item => item.id === group)?.label ?? "Produtos para o seu dia a dia"} description={description} path={path} page={catalogPageNumber(params.pagina)} group={group} sort={sort} />;
}
