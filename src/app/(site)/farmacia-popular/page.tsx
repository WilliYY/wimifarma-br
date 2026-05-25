import Image from "next/image";
import {
  ClipboardCheck,
  FileText,
  HeartPulse,
  MessageCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

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

export default function Page() {
  return (
    <>
      <PageHero
        description="Atendimento da Farmacia Popular com orientacao pelo WhatsApp, conferencia de documentos e disponibilidade confirmada pela equipe antes de separar o pedido."
        title="Farmacia Popular"
      >
        <div className="grid gap-5">
          <div className="flex items-center gap-4">
            <Image
              alt="Aqui tem Farmacia Popular"
              className="h-24 w-24 shrink-0 object-contain"
              height={320}
              src="/brand/farmacia-popular.webp"
              width={320}
            />
            <div>
              <p className="text-lg font-black text-ink">
                Atendimento orientado
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                A Wimifarma ajuda voce a entender o que precisa levar e confirma
                tudo pelo WhatsApp.
              </p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
                Documentos
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tenha CPF, documento com foto e receita quando houver.
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-pharma-green">
                Sem promessa automatica
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Disponibilidade e regras sao sempre confirmadas pela equipe.
              </p>
            </div>
          </div>
        </div>
      </PageHero>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  className="rounded-lg border border-line bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.05)]"
                  key={item.title}
                >
                  <div className="flex items-center justify-between gap-4">
                    <Icon className="h-7 w-7 text-brand" />
                    <span className="text-sm font-black text-brand-soft">
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

          <div className="mt-10 grid gap-6 rounded-lg border border-line bg-[linear-gradient(135deg,#fff_0%,#fff6f7_52%,#f0fbf5_100%)] p-6 shadow-[0_18px_60px_rgba(17,24,39,0.06)] lg:grid-cols-[1fr_0.72fr] lg:p-8">
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
