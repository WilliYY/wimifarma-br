import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
import { catalogFilters, catalogFiltersPath, type CatalogParams } from "@/features/products/catalog-navigation";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<CatalogParams> };
const description = "Uma seleção diferente a cada dia, com descontos reais e produtos disponíveis. Confira as ofertas e os preços abaixo do PMC, quando aplicável.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Ofertas em Ivaté-PR${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/ofertas${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  const filters = catalogFilters(await searchParams);
  return <CatalogPage title="Ofertas" description={description} path={catalogFiltersPath("/ofertas", filters)} {...filters} offers />;
}
