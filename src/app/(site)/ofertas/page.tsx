import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
import { catalogFilters, catalogFiltersPath, type CatalogParams } from "@/features/products/catalog-navigation";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<CatalogParams> };
const description = "Confira os produtos com preço promocional da Wimifarma em Ivaté-PR. Consulte os detalhes e a disponibilidade para entrega local ou retirada.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Ofertas em Ivaté-PR${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/ofertas${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  const filters = catalogFilters(await searchParams);
  return <CatalogPage title="Ofertas" description={description} path={catalogFiltersPath("/ofertas", filters)} {...filters} offers />;
}
