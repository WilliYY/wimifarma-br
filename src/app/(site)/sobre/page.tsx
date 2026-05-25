import {
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

const values = [
  {
    icon: HeartHandshake,
    title: "Atendimento proximo",
    text: "A equipe conversa com o cliente antes de orientar compra, retirada ou entrega.",
  },
  {
    icon: ShieldCheck,
    title: "Cuidado na informacao",
    text: "Medicamentos, Farmacia Popular e disponibilidade passam por confirmacao humana.",
  },
  {
    icon: Sparkles,
    title: "Experiencia em evolucao",
    text: "O site esta sendo preparado para campanhas, relacionamento e atendimento mais rapido.",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        description="A Wimifarma e uma farmacia local em Ivate-PR, com atendimento direto pelo WhatsApp e foco em orientar o cliente com cuidado antes de separar pedidos."
        title="Sobre a Wimifarma"
      >
        <div className="grid gap-5">
          <div className="flex gap-4">
            <HeartHandshake className="h-9 w-9 shrink-0 text-brand" />
            <div>
              <p className="text-lg font-black text-ink">
                Farmacia local, atendimento humano
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                A tecnologia entra para agilizar o contato, mas a orientacao
                continua sendo feita pela equipe.
              </p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MapPin className="h-4 w-4 text-brand" />
              Ivate-PR
            </p>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MessageCircle className="h-4 w-4 text-pharma-green" />
              WhatsApp como canal principal
            </p>
          </div>
        </div>
      </PageHero>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="rounded-lg border border-line bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.05)]"
                  key={item.title}
                >
                  <Icon className="h-7 w-7 text-brand" />
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

          <div className="mt-10 rounded-lg border border-line bg-[#121820] p-6 text-white shadow-[0_22px_70px_rgba(17,24,39,0.16)] lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.5fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-black">
                  Cuidado local com caminho simples
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                  Para ofertas, Farmacia Popular, duvidas de medicamentos ou
                  entrega, o cliente pode chamar a equipe diretamente pelo
                  WhatsApp.
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
