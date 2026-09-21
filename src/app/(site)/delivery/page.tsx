import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Bike, MapPin, MessageCircle, Plus, Store, Truck } from "lucide-react";
import { DeliveryEstimator } from "@/components/site/delivery-estimator";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { breadcrumbData } from "@/lib/seo";
import { serializeProductStructuredData } from "@/features/products/product-detail";

const imageUrl = "/banners/delivery-em-casa.webp";
const pageMetadata = createPublicPageMetadata({
  description: "Peça seus produtos na Wimifarma e consulte a entrega em Ivaté-PR. Confira seu CEP, escolha entrega ou retirada e acompanhe a confirmação com a equipe.",
  path: "/delivery",
  title: "Delivery de farmácia em Ivaté-PR",
});
export const metadata = {
  ...pageMetadata,
  openGraph: { ...pageMetadata.openGraph, images: [{ url: imageUrl, width: 1280, height: 960, alt: "Cena ilustrativa de uma entrega de farmácia na porta de casa" }] },
  twitter: { ...pageMetadata.twitter, images: [imageUrl] },
};

const steps = [
  { title: "Escolha seus produtos", text: "Explore o catálogo e adicione ao carrinho o que você precisa." },
  { title: "Envie seu pedido", text: "Informe o endereço ou escolha retirar na loja. A equipe confirma estoque, entrega e pagamento." },
  { title: "Receba com tranquilidade", text: "Depois da confirmação, combinamos a entrega ou avisamos quando seu pedido estiver pronto para retirar." },
];
const questions = [
  { title: "A Wimifarma entrega no meu endereço?", text: "Atendemos a região de Ivaté. Consulte seu CEP nesta página e informe o endereço completo no pedido. A equipe confirma a disponibilidade de entrega antes de finalizar." },
  { title: "Como funciona o frete grátis?", text: "Em compras a partir de R$ 99,90, o frete é grátis dentro da área atendida. Para outros valores ou endereços, consulte as condições com a equipe antes de confirmar o pedido." },
  { title: "Qual é o prazo de entrega?", text: "O prazo e o horário são combinados com a equipe conforme o endereço, o estoque e a disponibilidade de atendimento. Fale pelo WhatsApp para consultar seu pedido." },
  { title: "E os medicamentos com receita?", text: "Medicamentos com receita e itens da Farmácia Popular precisam de atendimento pelo WhatsApp. A equipe confere a receita e orienta sobre documentos e disponibilidade antes da confirmação." },
];

export default function Page() {
  const whatsappUrl = buildWhatsAppUrl("Olá! Gostaria de consultar a entrega da Wimifarma para meu endereço.");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeProductStructuredData(breadcrumbData([{ name: "Início", path: "/" }, { name: "Delivery", path: "/delivery" }])) }} />
      <section className="bg-white pb-12 pt-36 sm:pb-16 sm:pt-40 lg:pt-56">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Caminho da página" className="mb-7 flex items-center gap-2 text-xs text-muted sm:mb-10">
            <Link className="inline-flex min-h-11 items-center hover:text-brand focus-visible:outline-brand" href="/">Início</Link><span aria-hidden="true">/</span><span aria-current="page">Delivery</span>
          </nav>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand"><Bike className="h-5 w-5" aria-hidden="true" />Delivery Wimifarma · Ivaté</p>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl xl:text-6xl">O cuidado de sempre.<br /><span className="text-brand">Na sua porta.</span></h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">Seus medicamentos, produtos de higiene e cuidados do dia a dia, sem precisar sair de casa. Peça pelo site e conte com a nossa equipe.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-xl" size="lg"><Link href="/catalogo">Escolher produtos<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
                <Button asChild className="rounded-xl" size="lg" variant="secondary"><a href="#consultar-entrega">Consultar meu CEP<ArrowDown className="h-4 w-4" aria-hidden="true" /></a></Button>
              </div>
              <a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-brand focus-visible:outline-brand" href={whatsappUrl} rel="noreferrer" target="_blank"><MessageCircle className="h-4 w-4 text-pharma-green" aria-hidden="true" />Prefere pedir pelo WhatsApp?<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
            </div>
            <figure className="min-w-0">
              <div className="overflow-hidden rounded-3xl bg-surface-subtle">
                <Image alt="Cena ilustrativa: entregador entrega uma sacola de farmácia a uma cliente na porta de casa" className="aspect-[4/3] w-full object-cover" height={960} priority sizes="(min-width: 1280px) 584px, (min-width: 1024px) 48vw, 100vw" src={imageUrl} width={1280} />
                <div className="flex items-center justify-between gap-3 bg-brand px-5 py-4 text-white sm:px-6">
                  <span className="flex items-center gap-3"><Truck className="h-6 w-6 shrink-0" aria-hidden="true" /><span className="text-sm font-bold">Da nossa farmácia<br /><span className="font-normal text-white/90">para a sua casa.</span></span></span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"><MapPin className="h-4 w-4" aria-hidden="true" />Ivaté · PR</span>
                </div>
              </div>
              <figcaption className="mt-2 text-right text-xs text-muted">Imagem ilustrativa.</figcaption>
            </figure>
          </div>
          <div className="mt-9 grid divide-y divide-line rounded-2xl border border-line bg-surface-subtle px-5 sm:mt-12 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
            {[{ icon: Truck, title: "Frete grátis a partir de R$ 99,90", text: "Para endereços na área atendida." }, { icon: Store, title: "Também pode retirar na loja", text: "Sem taxa de retirada." }, { icon: MessageCircle, title: "Atendimento de perto", text: "A equipe confirma os detalhes com você." }].map(item => <div className="flex items-start gap-3 py-5 sm:px-5" key={item.title}><item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" /><div><p className="text-sm font-bold text-ink">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.text}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-subtle py-12 sm:py-16" aria-labelledby="delivery-steps-title">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Do pedido à entrega</p>
            <h2 id="delivery-steps-title" className="mt-3 text-3xl font-black tracking-tight text-ink">É simples pedir por aqui.</h2>
            <ol className="mt-8 space-y-7">
              {steps.map((step, index) => <li className="flex gap-4" key={step.title}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-white text-sm font-black text-brand" aria-hidden="true">{index + 1}</span><div><h3 className="flex items-center gap-2 text-base font-bold text-ink">{step.title}</h3><p className="mt-1.5 max-w-md text-sm leading-6 text-muted">{step.text}</p></div></li>)}
            </ol>
          </div>
          <div className="scroll-mt-40 lg:scroll-mt-60" id="consultar-entrega">
            <DeliveryEstimator />
            <p className="px-5 pt-3 text-xs leading-5 text-muted">A consulta de CEP indica a área de atendimento. O prazo e as condições do pedido são confirmados pela equipe.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16" aria-labelledby="delivery-questions-title">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Pode contar com a gente</p>
            <h2 id="delivery-questions-title" className="mt-3 text-3xl font-black tracking-tight text-ink">Ficou alguma dúvida?</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">Nossa equipe ajuda com o pedido, a entrega e a retirada na farmácia.</p>
            <Button asChild className="mt-5 rounded-xl" variant="success"><a href={whatsappUrl} rel="noreferrer" target="_blank"><MessageCircle className="h-4 w-4" aria-hidden="true" />Falar com a equipe<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></Button>
            <div className="mt-7 border-t border-line pt-5"><p className="flex items-center gap-2 text-sm font-bold text-ink"><Store className="h-4 w-4 text-brand" aria-hidden="true" />Visite a Wimifarma</p><p className="mt-2 text-sm leading-6 text-muted">Av. Minas Gerais, 2263<br />Ivaté · Paraná</p><a className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-brand" href={siteConfig.mapsUrl} rel="noreferrer" target="_blank">Ver como chegar<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></div>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {questions.map(question => <details className="group" key={question.title}><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-bold text-ink outline-offset-4 marker:hidden focus-visible:outline-brand [&::-webkit-details-marker]:hidden">{question.title}<Plus className="h-5 w-5 shrink-0 text-brand group-open:rotate-45" aria-hidden="true" /></summary><p className="pb-6 pr-4 text-sm leading-7 text-muted">{question.text}</p></details>)}
          </div>
        </div>
      </section>
    </>
  );
}
