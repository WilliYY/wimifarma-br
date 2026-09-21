import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ pagina?: string | string[] }> };
const description = "Confira os produtos com preço promocional da Wimifarma em Ivaté-PR. Consulte os detalhes e a disponibilidade para entrega local ou retirada.";
export async function generateMetadata({ searchParams }: Props) {
  const page = catalogPageNumber((await searchParams).pagina);
  return createPublicPageMetadata({ title: `Ofertas em Ivaté-PR${page > 1 ? ` - Página ${page}` : ""}`, description, path: `/ofertas${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page({ searchParams }: Props) {
  return <CatalogPage title="Ofertas Wimifarma" description={description} path="/ofertas" page={catalogPageNumber((await searchParams).pagina)} offers />;
}
