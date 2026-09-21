import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ pagina?: string | string[] }> };
const description = "Conheça os produtos da Wimifarma em Ivaté-PR. Explore medicamentos, higiene, beleza e cuidados por categoria, com preços e informações de cada produto.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Catálogo de produtos${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/catalogo${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  return <CatalogPage title="Produtos para o seu dia a dia" description={description} path="/catalogo" page={catalogPageNumber((await searchParams).pagina)} />;
}
