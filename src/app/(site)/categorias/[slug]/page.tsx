import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/site/catalog-page";
import { catalogPageNumber, getPublicCategories } from "@/features/products/storefront";
import { createPublicPageMetadata } from "@/lib/metadata";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string | string[] }> };
async function categoryFor(props: Props) {
  const { slug } = await props.params;
  const category = (await getPublicCategories()).find(item => item.slug === slug);
  if (!category) notFound();
  return category;
}
export async function generateMetadata(props: Props) {
  const category = await categoryFor(props);
  const page = catalogPageNumber((await props.searchParams).pagina);
  return createPublicPageMetadata({ title: `${category.name} em Ivaté-PR${page > 1 ? ` - Página ${page}` : ""}`, description: `Explore ${category.name.toLocaleLowerCase("pt-BR")} na Wimifarma. Confira marcas, apresentações, preços e disponibilidade para entrega local ou retirada em Ivaté-PR.`, path: `/categorias/${category.slug}${page > 1 ? `?pagina=${page}` : ""}` });
}
export default async function Page(props: Props) {
  const category = await categoryFor(props);
  return <CatalogPage title={category.name} description={`Confira os produtos de ${category.name.toLocaleLowerCase("pt-BR")} disponíveis no catálogo. Abra cada produto para conhecer a marca, a apresentação e os detalhes.`} path={`/categorias/${category.slug}`} page={catalogPageNumber((await props.searchParams).pagina)} categoryNames={category.names} />;
}
