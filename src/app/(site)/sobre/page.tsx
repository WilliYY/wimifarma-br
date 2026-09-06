import {
  ArrowRight,
  Bike,
  HeartHandshake,
  HeartPulse,
  MapPin,
  MessageCircle,
  Pill,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description:
    "Conheça a Wimifarma, farmácia local em Ivaté-PR com atendimento humano, delivery e apoio pelo WhatsApp.",
  path: "/sobre",
  title: "Sobre nossa farmácia em Ivaté-PR",
});

const values = [
  {
    icon: HeartHandshake,
    title: "Atendimento próximo",
    text: "A equipe conversa com você para entender o pedido e confirmar o melhor caminho para o atendimento.",
  },
  {
    icon: ShieldCheck,
    title: "Cuidado na informação",
    text: "Medicamentos, Farmácia Popular, disponibilidade e entrega passam por confirmação da equipe.",
  },
  {
    icon: HeartPulse,
    title: "Saúde no centro",
    text: "A experiência digital ajuda a agilizar a compra sem substituir a orientação profissional necessária.",
  },
];

const serviceLinks = [
  {
    href: "/ofertas",
    icon: Pill,
    label: "Ver ofertas",
    text: "Consulte produtos e preços em uma vitrine organizada para comprar com mais facilidade.",
    title: "Medicamentos e bem-estar",
  },
  {
    href: "/farmacia-popular",
    icon: HeartPulse,
    label: "Conhecer o programa",
    text: "Veja as orientações iniciais e confirme documentos e disponibilidade com a equipe.",
    title: "Farmácia Popular",
  },
  {
    href: "/delivery",
    icon: Bike,
    label: "Consultar entrega",
    text: "Informe seu CEP para consultar a cobertura atual ou combine a retirada na loja.",
    title: "Retirada e entrega",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        contentClassName="self-center"
        description="Somos uma farmácia local de Ivaté-PR. Unimos atendimento humano e praticidade digital para cuidar de cada pedido com atenção."
        eyebrow="Nossa farmácia"
        title="Wimifarma: cuidado de perto, do balcão ao digital"
      >
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <Image
            alt="Wimifarma"
            className="h-auto w-24 shrink-0 object-contain"
            height={34}
            src="/brand/logo-wimifarma.svg"
            width={144}
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
              Wimifarma
            </p>
            <p className="mt-1 text-lg font-black text-ink">
              Farmácia local, atendimento humano
            </p>
          </div>
        </div>
        <div className="grid gap-3 pt-5 sm:grid-cols-2">
          <a
            className="group flex min-h-12 items-center gap-3 rounded-md px-2 text-sm font-semibold text-ink transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href={siteConfig.mapsUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-brand" />
            <span>Ver loja em Ivaté-PR</span>
            <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </a>
          <a
            className="group flex min-h-12 items-center gap-3 rounded-md px-2 text-sm font-semibold text-ink transition hover:bg-[#e9f8ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pharma-green"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-pharma-green" />
            <span>Falar com a equipe</span>
            <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-pharma-green" />
          </a>
        </div>
      </PageHero>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
              Nosso jeito de atender
            </p>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">
              Tecnologia para facilitar. Pessoas para cuidar.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="border-b border-line py-7 md:px-6"
                  key={item.title}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-black text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                Encontre o que precisa
              </p>
              <h2 className="mt-3 text-3xl font-black text-ink">
                Serviços da Wimifarma
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {serviceLinks.map((service) => {
              const Icon = service.icon;

              return (
                <Link
                  className="group flex min-h-64 flex-col rounded-lg border border-line bg-white p-6 shadow-[0_16px_48px_rgba(17,24,39,0.06)] transition hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_22px_58px_rgba(17,24,39,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  href={service.href}
                  key={service.title}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-black text-ink">
                    {service.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                    {service.text}
                  </p>
                  <span className="mt-6 flex items-center gap-2 text-sm font-bold text-brand">
                    {service.label}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 rounded-lg bg-[#121820] p-6 text-white shadow-[0_22px_70px_rgba(17,24,39,0.16)] lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.5fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-black">
                  Sua farmácia em Ivaté, também no WhatsApp
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                  Consulte produtos, envie sua lista e combine retirada ou
                  entrega diretamente com a equipe Wimifarma.
                </p>
              </div>
              <Button asChild className="w-fit" size="lg" variant="success">
                <a
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Chamar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
