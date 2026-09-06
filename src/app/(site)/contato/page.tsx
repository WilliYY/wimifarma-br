import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description:
    "Fale com a Wimifarma em Ivaté-PR para consultar medicamentos, ofertas, Farmácia Popular, retirada e delivery.",
  path: "/contato",
  title: "Contato e WhatsApp em Ivaté-PR",
});

const contactItems = [
  {
    accent: "border-l-pharma-green",
    helper: "Converse com a equipe",
    href: siteConfig.whatsappUrl,
    icon: MessageCircle,
    label: "WhatsApp",
    newTab: true,
    iconClassName: "bg-[#e9f8ef] text-pharma-green",
    value: siteConfig.displayPhone,
  },
  {
    accent: "border-l-brand",
    helper: "Abra a rota no Google Maps",
    href: siteConfig.mapsUrl,
    icon: MapPin,
    label: "Localização",
    newTab: true,
    iconClassName: "bg-brand-soft text-brand",
    value: siteConfig.address,
  },
  {
    accent: "border-l-[#167da6]",
    helper: "Envie uma mensagem por e-mail",
    href: "mailto:contato@wimifarma.com.br",
    icon: Mail,
    label: "E-mail",
    newTab: false,
    iconClassName: "bg-[#eaf7fb] text-[#167da6]",
    value: "contato@wimifarma.com.br",
  },
];

const serviceSteps = [
  {
    icon: Pill,
    number: "01",
    title: "Conte o que precisa",
    text: "Envie o nome do produto ou uma foto legível. Quando houver receita, encaminhe-a no atendimento.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "A equipe confere",
    text: "Disponibilidade, preço, exigência de receita e forma de atendimento são confirmados com você.",
  },
  {
    icon: CheckCircle2,
    number: "03",
    title: "Combine o próximo passo",
    text: "Escolha retirada na Wimifarma ou consulte as opções de entrega disponíveis para sua região.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        contentVariant="plain"
        description="Fale diretamente com a nossa equipe para consultar produtos, ofertas, Farmácia Popular, retirada ou entrega."
        eyebrow="Atendimento Wimifarma"
        title="Cuidado e atendimento de verdade, perto de você"
      >
        <div className="grid gap-3">
          {contactItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                aria-label={`${item.label}: ${item.value}`}
                className={`group flex min-h-24 items-center gap-4 rounded-lg border border-l-4 border-line bg-white p-4 shadow-[0_16px_45px_rgba(17,24,39,0.07)] transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_20px_55px_rgba(17,24,39,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${item.accent}`}
                href={item.href}
                key={item.label}
                rel={item.newTab ? "noreferrer" : undefined}
                target={item.newTab ? "_blank" : undefined}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.iconClassName}`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words font-bold leading-6 text-ink">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-muted">{item.helper}</p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </a>
            );
          })}
        </div>
      </PageHero>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
              Atendimento simples e seguro
            </p>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">
              Para agilizar seu atendimento
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Em poucos passos, você envia o pedido e recebe a confirmação da
              equipe antes de retirar ou combinar a entrega.
            </p>
          </div>

          <div className="mt-10 grid border-y border-line md:grid-cols-3">
            {serviceSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  className={`py-7 md:px-7 ${
                    index > 0 ? "border-t border-line md:border-l md:border-t-0" : ""
                  }`}
                  key={step.number}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-black text-brand/45">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-black text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col justify-between gap-6 rounded-lg bg-[#121820] p-6 text-white shadow-[0_22px_65px_rgba(17,24,39,0.15)] sm:flex-row sm:items-center lg:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-pharma-green">
                <Clock aria-hidden="true" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black">Pronto para falar com a equipe?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  O WhatsApp é o canal mais direto para confirmar produtos,
                  valores e o próximo passo do atendimento.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0" size="lg" variant="success">
              <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
                Abrir WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
