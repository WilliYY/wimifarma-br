import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

const contactItems = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: siteConfig.displayPhone,
  },
  {
    icon: MapPin,
    label: "Localizacao",
    value: siteConfig.address,
  },
  {
    icon: Mail,
    label: "Email",
    value: "contato@wimifarma.com.br",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        description="Fale com a Wimifarma pelo WhatsApp para confirmar ofertas, disponibilidade, Farmacia Popular ou entrega local em Ivate."
        title="Contato Wimifarma"
      >
        <div className="grid gap-4">
          {contactItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="flex items-center gap-4 rounded-lg border border-line bg-white p-4"
                key={item.label}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 font-bold text-ink">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </PageHero>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-line bg-[linear-gradient(135deg,#fff_0%,#fff6f7_55%,#f2fbf6_100%)] p-6 shadow-[0_18px_60px_rgba(17,24,39,0.06)] lg:p-8">
            <MessageCircle className="h-8 w-8 text-pharma-green" />
            <h2 className="mt-6 text-2xl font-black text-ink">
              Atendimento mais rapido pelo WhatsApp
            </h2>
            <p className="mt-4 text-base leading-8 text-muted">
              Envie sua lista, duvida ou pedido. A equipe responde confirmando
              produtos, orientacoes e proximo passo.
            </p>
            <Button asChild className="mt-6" size="lg" variant="success">
              <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
                Abrir WhatsApp
              </a>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.05)]">
              <Phone className="h-7 w-7 text-brand" />
              <h2 className="mt-5 text-xl font-black text-ink">
                O que enviar
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Nome do medicamento, foto da receita quando houver e se deseja
                retirada ou entrega.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.05)]">
              <Clock className="h-7 w-7 text-brand" />
              <h2 className="mt-5 text-xl font-black text-ink">
                Confirmacao da equipe
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Disponibilidade, valores e prazos sao confirmados durante o
                atendimento.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-[#121820] p-6 text-white shadow-[0_18px_50px_rgba(17,24,39,0.12)] sm:col-span-2">
              <div className="flex items-start gap-4">
                <Send className="h-7 w-7 shrink-0 text-pharma-green" />
                <div>
                  <h2 className="text-xl font-black">
                    Canal principal da Wimifarma
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    O site ajuda a chegar mais rapido no atendimento, sem
                    checkout online nesta fase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
