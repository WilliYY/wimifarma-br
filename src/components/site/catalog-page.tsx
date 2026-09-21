import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProductCard } from "./public-product-card";
import { getPublicCategories, getStorefrontProducts, PAGE_SIZE } from "@/features/products/storefront";
import { breadcrumbData, SITE_URL } from "@/lib/seo";
import { serializeProductStructuredData } from "@/features/products/product-detail";

export async function CatalogPage({ title, description, path, page, categoryNames, offers = false }: { title: string; description: string; path: string; page: number; categoryNames?: string[]; offers?: boolean }) {
  const [{ products, count }, categories] = await Promise.all([getStorefrontProducts({ page, categories: categoryNames, offers }), getPublicCategories()]);
  if (page > 1 && products.length === 0) notFound();
  const crumbs = [{ name: "Início", path: "/" }, ...(path !== "/catalogo" ? [{ name: "Catálogo", path: "/catalogo" }] : []), { name: title, path }];
  const structured = [breadcrumbData(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${SITE_URL}${path}${page > 1 ? `?pagina=${page}` : ""}`, mainEntity: { "@type": "ItemList", itemListElement: products.map((product, i) => ({ "@type": "ListItem", position: (page - 1) * PAGE_SIZE + i + 1, url: `${SITE_URL}/produto/${encodeURIComponent(product.slug)}`, name: product.name })) } }];
  return <section className="bg-surface-subtle pb-16 pt-36 sm:pt-40 lg:pt-56">
    <script dangerouslySetInnerHTML={{ __html: serializeProductStructuredData(structured) }} type="application/ld+json" />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav aria-label="Navegação estrutural" className="mb-6 flex flex-wrap gap-2 text-xs text-muted">{crumbs.map((crumb, i) => <span key={crumb.path}>{i > 0 && <span aria-hidden="true" className="mr-2">/</span>}<Link className="underline" href={crumb.path}>{crumb.name}</Link></span>)}</nav>
      <h1 className="text-3xl font-black text-ink sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl leading-7 text-muted">{description}</p>
      <nav aria-label="Categorias de produtos" className="my-7 flex flex-wrap gap-2"><Link className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold" href="/catalogo">Todos os produtos</Link><Link className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold" href="/ofertas">Ofertas</Link>{categories.map(category => <Link aria-current={path === `/categorias/${category.slug}` ? "page" : undefined} className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold aria-[current=page]:border-brand aria-[current=page]:text-brand" href={`/categorias/${category.slug}`} key={category.slug}>{category.name}</Link>)}</nav>
      <p className="mb-4 text-sm text-muted">{count} {count === 1 ? "produto" : "produtos"} · Preços e disponibilidade sujeitos à confirmação da farmácia.</p>
      {products.length ? <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <PublicProductCard key={product.id} product={product} />)}</div> : <div className="rounded-xl border border-line bg-white p-8"><h2 className="font-bold text-ink">{offers ? "Nenhuma oferta publicada no momento" : "Novos produtos em breve"}</h2><p className="mt-2 text-sm text-muted">Confira o catálogo ou fale com a equipe para consultar um produto.</p><Link className="mt-4 inline-flex min-h-11 items-center font-bold text-brand" href="/catalogo">Ver catálogo</Link></div>}
      <nav aria-label="Páginas do catálogo" className="mt-8 flex items-center justify-center gap-5">{page > 1 && <Link className="rounded-md border border-line bg-white px-5 py-3" href={page === 2 ? path : `${path}?pagina=${page - 1}`}>Anterior</Link>}<span className="text-sm text-muted">Página {page} de {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span>{page * PAGE_SIZE < count && <Link className="rounded-md border border-line bg-white px-5 py-3" href={`${path}?pagina=${page + 1}`}>Próxima</Link>}</nav>
    </div>
  </section>;
}
