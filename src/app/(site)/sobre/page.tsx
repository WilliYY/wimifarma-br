import { ArrowRight, Bike, HeartHandshake, HeartPulse, MapPin, MessageCircle, Pill, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { InstitutionalHero } from "@/components/site/institutional-hero";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description: "Conheça a Wimifarma, farmácia em Ivaté-PR. Atendimento próximo, medicamentos, bem-estar e contato direto com a equipe pelo WhatsApp.",
  path: "/sobre",
  title: "Sobre nossa farmácia em Ivaté-PR",
});

const values = [
  { icon: HeartHandshake, title: "Gente que escuta", text: "Conte o que precisa. Nossa equipe conversa com você e acompanha cada etapa do atendimento.", color: "bg-brand-soft text-brand" },
  { icon: ShieldCheck, title: "Atenção em cada pedido", text: "Preço, disponibilidade e condições de entrega são conferidos com você antes da confirmação.", color: "bg-[#eaf7ef] text-pharma-green" },
  { icon: HeartPulse, title: "Cuidado no dia a dia", text: "Medicamentos, higiene e bem-estar, com a praticidade do digital e o apoio da equipe da farmácia.", color: "bg-[#eaf5f9] text-[#146b86]" },
];

const services = [
  { href: "/ofertas", icon: Pill, title: "Medicamentos e bem-estar", text: "Produtos, preços e detalhes para você consultar com calma.", label: "Explorar produtos", color: "text-brand bg-brand-soft" },
  { href: "/farmacia-popular", icon: HeartPulse, title: "Farmácia Popular", text: "Confira as orientações e fale com a equipe sobre documentos e disponibilidade.", label: "Conhecer o atendimento", color: "text-pharma-green bg-[#eaf7ef]" },
  { href: "/delivery", icon: Bike, title: "Retirada e entrega", text: "Retire na loja ou consulte as opções de entrega para o seu CEP.", label: "Consultar entrega", color: "text-[#146b86] bg-[#eaf5f9]" },
];

export default function Page() {
  return (
    <>
      <InstitutionalHero
        title="Wimifarma"
        headline="Cuidado de perto, do balcão ao digital."
        description="Somos uma farmácia de Ivaté-PR. Aqui, a facilidade de comprar online vem acompanhada de uma conversa e atenção de verdade."
        image="/banners/sobre-atendimento.webp"
        imageAlt="Cena ilustrativa de um farmacêutico conversando com uma mulher no balcão."
      >
        <Button asChild variant="success">
          <a href={siteConfig.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" className="h-4 w-4" />Falar com a equipe</a>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/ofertas">Ver produtos<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </Button>
      </InstitutionalHero>

      <section aria-label="Nossa loja" className="border-b border-line bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin aria-hidden="true" className="h-6 w-6 shrink-0 text-brand" />
            <div><p className="font-bold text-ink">Perto de você, em Ivaté</p><p className="mt-1 text-sm text-muted">Avenida Minas Gerais, 2263</p></div>
          </div>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={siteConfig.mapsUrl} target="_blank" rel="noreferrer">
            Como chegar<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold text-brand">Nosso jeito de atender</p>
          <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight text-ink">Uma farmácia feita de relações.</h2>
          <div className="mt-8 grid gap-7 md:grid-cols-3 md:gap-10">
            {values.map(({ icon: Icon, title, text, color }) => (
              <div key={title} className="border-t border-line pt-6">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${color}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <h3 className="mt-4 text-xl font-bold text-ink">{title}</h3>
                <p className="mt-2 max-w-sm text-base leading-7 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#f7f9f8] px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-pharma-green">Para o seu dia a dia</p><h2 className="mt-2 text-3xl font-extrabold text-ink">Encontre o que precisa</h2></div>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href="/contato">Fale com a Wimifarma<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {services.map(({ icon: Icon, href, title, text, label, color }) => (
              <Link key={href} href={href} className="group flex flex-col rounded-lg border border-line bg-white p-6 transition duration-200 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-md ${color}`}><Icon aria-hidden="true" className="h-6 w-6" /></span>
                <h3 className="mt-5 text-xl font-bold text-ink">{title}</h3>
                <p className="mt-2 flex-1 text-base leading-7 text-muted">{text}</p>
                <span className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm font-bold text-brand">{label}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
