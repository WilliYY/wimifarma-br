import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avaliar minhas compras", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  const customerId = sessionCustomerId(session);
  if (!customerId) redirect("/login?callbackUrl=%2Fminha-conta%2Favaliacoes");
  const db = getPrisma();
  if (!await db.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } })) redirect("/login");
  const page = Math.max(1, Math.min(10000, Number.parseInt((await searchParams).page ?? "1", 10) || 1));
  const products = await db.product.findMany({
    where: { status: "ACTIVE", orderItems: { some: { order: { customerId, status: "COMPLETED", paymentStatus: "PAID" } } } },
    select: { id: true, name: true, slug: true, imageUrl: true, requiresPrescription: true, isPopularPharmacy: true, reviews: { where: { customerId }, select: { id: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * 24, take: 25,
  });
  return <section className="bg-white px-4 pb-16 pt-40 sm:px-6 lg:pt-52"><div className="mx-auto max-w-6xl">
    <Link className="text-sm font-bold text-muted underline" href="/minha-conta">Minha conta</Link>
    <h1 className="mt-5 text-3xl font-black text-ink">Avaliar minhas compras</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Primeira avaliacao de cada produto elegivel: 1% de cashback sobre uma unidade paga, independente da nota. <Link className="font-bold text-pharma-green underline" href="/cashback">Ver regras</Link></p>
    <div className="mt-8 divide-y divide-line border-y border-line">
      {products.slice(0, 24).map((product) => <div className="flex items-center gap-4 py-5" key={product.id}>
        {product.imageUrl ? <Image alt={product.name} className="h-20 w-20 shrink-0 object-contain" height={80} width={80} src={product.imageUrl} /> : <MessageSquareText className="h-12 w-12 shrink-0 text-muted" />}
        <div className="min-w-0 flex-1"><h2 className="break-words text-sm font-bold text-ink">{product.name}</h2><p className="mt-1 text-xs text-muted">{product.reviews.length ? "Avaliacao enviada · editar nao gera novo bonus" : product.requiresPrescription || product.isPopularPharmacy ? "Compra verificada · sem bonus" : "Ganhe 1% na primeira avaliacao"}</p></div>
        <Link className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-brand px-3 text-sm font-bold text-brand hover:bg-brand-soft" href={`/produto/${product.slug}#avaliacoes`}>{product.reviews.length ? "Editar" : "Avaliar"}</Link>
      </div>)}
      {!products.length ? <p className="py-10 text-sm leading-6 text-muted">Nenhuma compra concluida e paga nesta pagina. Seus produtos ficam disponiveis aqui apos a confirmacao da farmacia.</p> : null}
    </div>
    <nav aria-label="Paginas de produtos para avaliar" className="mt-5 flex justify-between text-sm font-bold text-brand">{page > 1 ? <Link href={`?page=${page - 1}`}>Anterior</Link> : <span />}{products.length > 24 ? <Link href={`?page=${page + 1}`}>Proxima</Link> : null}</nav>
  </div></section>;
}
