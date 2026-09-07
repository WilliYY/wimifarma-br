import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartPulse,
  Info,
  MessageCircle,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description:
    "Atendimento para Farmácia Popular em Ivaté-PR com orientação da equipe, conferência de documentos e disponibilidade.",
  path: "/farmacia-popular",
  title: "Farmácia Popular em Ivaté-PR",
});

const steps = [
  {
    icon: MessageCircle,
    title: "Chame no WhatsApp",
    text: "Envie sua duvida ou lista para a equipe iniciar a orientacao.",
  },
  {
    icon: FileText,
    title: "Separe os documentos",
    text: "CPF, documento com foto e receita quando for aplicavel.",
  },
  {
    icon: ClipboardCheck,
    title: "Aguarde a confirmacao",
    text: "A equipe confere regras, disponibilidade e a melhor forma de retirada.",
  },
];

const highlights: Array<{
  icon: LucideIcon;
  label: string;
  text: string;
}> = [
  {
    icon: BadgeCheck,
    label: "Orientacao segura",
    text: "A equipe confere o que precisa antes de separar qualquer pedido.",
  },
  {
    icon: Clock3,
    label: "Atendimento pelo WhatsApp",
    text: "Voce envia a lista e recebe o proximo passo pelo canal principal.",
  },
  {
    icon: ShieldCheck,
    label: "Sem promessa automatica",
    text: "Disponibilidade e regras sao confirmadas caso a caso.",
  },
];

const checklist = [
  "CPF e documento com foto",
  "Receita quando houver",
  "Nome do medicamento",
  "Forma de retirada desejada",
];

export default function Page() {
  return (
    <>
      <section className="pharma-clouds overflow-hidden border-b border-line bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-36 sm:px-6 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_30rem] lg:px-8 lg:pb-20 lg:pt-56">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/90 px-3 py-1 text-xs font-black uppercase text-brand shadow-sm">
              <HeartPulse className="h-4 w-4" />
              Atendimento Wimifarma
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight text-ink sm:text-5xl lg:text-6xl">
              Farmacia Popular
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              Atendimento da Farmacia Popular com orientacao pelo WhatsApp,
              conferencia de documentos e disponibilidade confirmada pela equipe
              antes de separar o pedido.
            </p>

            <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-lg border border-line bg-white/88 p-4 pr-16 shadow-[0_14px_40px_rgba(17,24,39,0.05)] backdrop-blur sm:pr-4"
                    key={item.label}
                  >
                    <Icon className="h-5 w-5 text-brand" />
                    <p className="mt-3 text-sm font-black text-ink">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-5 w-5" />
                  Falar no WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="/ofertas">
                  Ver ofertas
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-white/95 shadow-[0_28px_80px_rgba(17,24,39,0.11)] backdrop-blur">
            <div className="relative aspect-[16/9] overflow-hidden bg-surface-subtle">
              <Image
                alt="Imagem ilustrativa de uma farmaceutica atendendo uma cliente"
                className="object-cover object-center"
                fill
                priority
                sizes="(max-width: 1024px) calc(100vw - 2rem), 480px"
                src="/banners/farmacia-popular-atendimento.webp"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.74)_36%,rgba(255,255,255,0.08)_72%)]"
              />

              <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                <div className="grid h-14 w-14 place-items-center rounded-md bg-ink p-1.5 shadow-lg ring-1 ring-white/80 sm:h-16 sm:w-16">
                  <Image
                    alt="Aqui tem Farmacia Popular"
                    className="h-full w-full rounded-sm object-contain"
                    height={160}
                    src="/brand/farmacia-popular.webp"
                    width={160}
                  />
                </div>

                <div className="max-w-[15rem]">
                  <span className="inline-flex rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-black uppercase text-[#027a48] shadow-sm">
                    Atendimento orientado
                  </span>
                  <p className="mt-2 text-xl font-black leading-tight text-ink sm:text-2xl">
                    A equipe confere antes de confirmar
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-brand-soft p-4">
                  <p className="text-xs font-black uppercase text-brand">
                    Documentos
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink">
                    Tenha CPF, documento com foto e receita quando houver.
                  </p>
                </div>
                <div className="rounded-lg bg-[#ecfdf3] p-4">
                  <p className="text-xs font-black uppercase text-[#027a48]">
                    Confirmacao humana
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink">
                    Disponibilidade e regras sao sempre confirmadas pela equipe.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-surface-subtle p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p className="pr-14 text-sm leading-6 text-muted sm:pr-0">
                  A pagina orienta o atendimento. A separacao do pedido so
                  acontece apos a confirmacao da equipe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-brand">
                Como funciona
              </p>
              <h2 className="mt-2 text-3xl font-black text-ink">
                Um caminho simples para evitar retrabalho
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              O cliente envia as informacoes, a equipe confere os requisitos e
              combina o proximo passo pelo WhatsApp.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  className="group rounded-lg border border-line bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.05)] transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_22px_60px_rgba(17,24,39,0.09)]"
                  key={item.title}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-surface-subtle px-3 py-1 text-sm font-black text-brand">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="mt-6 text-xl font-black text-ink">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-6 rounded-lg border border-line bg-[linear-gradient(135deg,#fff_0%,#fff6f7_52%,#f0fbf5_100%)] p-6 shadow-[0_18px_60px_rgba(17,24,39,0.06)] lg:grid-cols-[1fr_0.82fr] lg:p-8">
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-pharma-green" />
                <h2 className="text-2xl font-black text-ink">
                  Para agilizar seu atendimento
                </h2>
              </div>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
                Envie pelo WhatsApp o nome do medicamento, documentos
                necessarios e como deseja retirar. A equipe responde com o
                proximo passo.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {checklist.map((item) => (
                  <p
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm"
                    key={item}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-pharma-green" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="grid gap-3 text-sm font-semibold text-ink">
              <p className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-brand" />
                Retirada ou entrega sob confirmacao
              </p>
              <p className="flex items-center gap-3">
                <HeartPulse className="h-5 w-5 text-brand" />
                Orientacao humana antes do pedido
              </p>
              <Button asChild className="mt-2 w-fit" size="lg">
                <a
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-5 w-5" />
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
