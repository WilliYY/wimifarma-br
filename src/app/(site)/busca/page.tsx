import type { Metadata } from "next";
import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Search, SearchX, TrendingUp } from "lucide-react";
import { PublicProductCard } from "@/components/site/public-product-card";
import { getSearchCatalog, getSearchSidebar, SEARCH_PAGE_SIZE } from "@/features/products/search-catalog";
import { isProductAssociation, productSearchHref } from "@/features/products/public-search";
import { catalogPageNumber } from "@/features/products/storefront";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string | string[]; pagina?: string | string[] }> };

function searchQuery(value: string | string[] | undefined) {
  return (typeof value === "string" ? value : "").trim().slice(0, 80);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchQuery((await searchParams).q);
  return { title: query ? `Busca por ${query}` : "Buscar produtos", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = searchQuery(params.q);
  const page = catalogPageNumber(params.pagina);
  const result = await getSearchCatalog(query, { page });
  if (page > 1 && !result.products.length) notFound();
  const singles = result.products.filter(product => !isProductAssociation(product));
  const associations = result.products.filter(isProductAssociation);
  const sidebar = await getSearchSidebar([...result.products, ...result.relatedProducts]);
  const pages = Math.max(1, Math.ceil(result.count / SEARCH_PAGE_SIZE));
  const sections = [
    { id: "resultados", title: "Produtos encontrados", products: singles, description: null },
    { id: "associacoes", title: "Associações", products: associations, description: "Produtos com mais de um princípio ativo. Confira a composição e a dosagem." },
    { id: "relacionados", title: "Outras marcas e apresentações", products: result.relatedProducts, description: "Relacionados pelo princípio ativo cadastrado. Podem ter dosagens e composições diferentes." },
  ].filter(section => section.products.length);

  return (
    <section className="bg-surface-subtle pb-16 pt-36 sm:pt-40 lg:pt-56">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Navegação estrutural" className="mb-7 flex items-center gap-2 text-xs font-semibold text-muted">
          <Link className="hover:text-brand" href="/">Início</Link><ChevronRight aria-hidden="true" className="h-3 w-3" /><span>Busca</span>
        </nav>
        <header className="border-b border-line pb-7">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand"><span className="h-1.5 w-6 rounded-full bg-brand" /> Catálogo Wimifarma</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="max-w-3xl break-words text-3xl font-black tracking-tight text-ink sm:text-4xl">{query ? <>Você buscou <span className="text-brand">“{query}”</span></> : "Encontre o que você procura"}</h1>
              <p className="mt-3 text-sm text-muted">{query.length >= 2 ? `${result.count} ${result.count === 1 ? "produto encontrado" : "produtos encontrados"}` : "Busque pelo nome, pela marca ou pelo princípio ativo."}</p>
            </div>
            <form action="/busca" className="flex min-h-12 w-full items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-4 sm:max-w-sm" role="search">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
              <input aria-label="Pesquisar no catálogo" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand" defaultValue={query} maxLength={80} name="q" placeholder="Nome, marca ou princípio ativo" type="search" />
              <button aria-label="Pesquisar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" type="submit"><ArrowRight className="h-4 w-4" /></button>
            </form>
          </div>
          {sections.length > 1 ? <nav aria-label="Seções da busca" className="mt-6 flex flex-wrap gap-2">{sections.map(section => <a className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={`#${section.id}`} key={section.id}>{section.title} <span className="ml-1 text-muted">{section.products.length}</span></a>)}</nav> : null}
        </header>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-10">
            {sections.length ? sections.map(section => (
              <section className="scroll-mt-44" id={section.id} key={section.id}>
                <h2 className="text-xl font-black text-ink">{section.title}</h2>
                {section.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{section.description}</p> : null}
                <div className="mt-5 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-3">{section.products.map(product => <PublicProductCard key={product.id} product={product} />)}</div>
              </section>
            )) : (
              <div className="rounded-2xl border border-line bg-white px-6 py-12 sm:px-10">
                <SearchX aria-hidden="true" className="mb-5 h-9 w-9 text-brand" />
                <h2 className="text-2xl font-black text-ink">{query.length >= 2 ? "Não encontramos esse produto" : "Qual produto você procura?"}</h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted">Tente outro nome, confira a grafia ou pesquise pelo princípio ativo. Aqui aparecem os produtos publicados no nosso catálogo.</p>
                <Link className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-brand" href="/catalogo">Explorar catálogo <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
            {pages > 1 ? <nav aria-label="Páginas da busca" className="flex flex-wrap items-center justify-center gap-4 border-t border-line pt-7">
              {page > 1 ? <Link className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-white px-4 text-sm font-semibold" href={productSearchHref(query, page - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Link> : null}
              <span className="text-sm text-muted">Página {page} de {pages}</span>
              {page < pages ? <Link className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-white px-4 text-sm font-semibold" href={productSearchHref(query, page + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Link> : null}
            </nav> : null}
            {sections.some(section => section.id !== "resultados") ? <p className="text-xs leading-6 text-muted">Produtos relacionados ajudam a encontrar apresentações e marcas. A escolha ou troca de medicamento deve seguir a orientação do profissional de saúde.</p> : null}
          </div>

          <aside aria-label={sidebar.title} className="min-w-0 rounded-2xl border border-line bg-white lg:sticky lg:top-40">
            <div className="border-b border-line px-5 py-5"><TrendingUp aria-hidden="true" className="mb-3 h-5 w-5 text-brand" /><h2 className="text-lg font-black leading-6 text-ink">{sidebar.title}</h2><p className="mt-2 text-xs leading-5 text-muted">{sidebar.title.startsWith("Mais vendidos") ? "Pedidos concluídos e pagos da Wimifarma." : "Uma seleção de produtos encontrados no catálogo."}</p></div>
            <ol className="divide-y divide-line px-4">{sidebar.products.map((product, index) => <li key={product.id}>
              <Link className="group flex min-h-28 items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={`/produto/${product.slug}`}>
                <span aria-hidden="true" className="self-start pt-1 text-xs font-bold text-muted">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex h-16 w-14 shrink-0 items-center justify-center">{product.imageUrl ? <Image alt="" className="h-full w-full object-contain" height={64} src={product.imageUrl} width={56} /> : <ProductImagePlaceholder category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} className="h-full w-full" />}</span>
                <span className="min-w-0"><span className="line-clamp-3 text-xs font-semibold leading-5 text-ink group-hover:text-brand">{product.name}</span><strong className="mt-2 block text-base text-brand">{formatCurrency(Number(product.promotionalPrice ?? product.price))}</strong></span>
              </Link>
            </li>)}</ol>
            <Link className="flex min-h-12 items-center justify-between gap-3 border-t border-line px-5 py-4 text-sm font-bold text-brand" href="/catalogo">Ver catálogo completo <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
