import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import { getPublicCatalogIdentityByGtin } from "@/features/catalog-identities/public-query";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ ean: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getPublicCatalogIdentityByGtin((await params).ean);
  if (!product) notFound();
  return { title: product.name, description: `Consulte o preço e a disponibilidade de ${product.name} na Wimifarma. EAN ${product.ean}.`,
    alternates: { canonical: product.href } };
}

export default async function ConsultationProductPage({ params }: Props) {
  const { ean } = await params;
  const product = await getPublicCatalogIdentityByGtin(ean);
  if (!product) notFound();

  const whatsappUrl = buildWhatsAppUrl(`Olá! Gostaria de consultar o preço e a disponibilidade de ${product.name}, EAN ${product.ean}.`);

  return (
    <section className="bg-surface-subtle pb-16 pt-36 sm:pt-40 lg:pt-56">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Navegação estrutural" className="mb-6 flex flex-wrap gap-2 text-xs text-muted">
          <Link className="underline" href="/">Início</Link><span aria-hidden="true">/</span>
          <Link className="underline" href="/catalogo">Catálogo</Link><span aria-hidden="true">/</span>
          <span aria-current="page">Consulta de produto</span>
        </nav>
        <article className="grid gap-6 rounded-2xl border border-line bg-white p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <span className="flex min-h-60 items-center justify-center rounded-xl bg-surface-subtle">
            <ProductImagePlaceholder className="h-60 w-full p-8" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">{product.categoryName ?? "Catálogo"}</p>
            <h1 className="mt-3 break-words text-2xl font-black leading-tight text-ink sm:text-3xl">{product.name}</h1>
            <p className="mt-4 break-all text-sm text-muted">EAN: {product.ean}</p>
            <h2 className="mt-6 text-lg font-bold text-brand">Preço e disponibilidade sob consulta</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Converse com a equipe da farmácia para confirmar o preço e a disponibilidade deste item.</p>
            <a className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
              <MessageCircle aria-hidden="true" className="h-5 w-5 shrink-0" />Consultar pelo WhatsApp
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
