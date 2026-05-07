import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { HeroVisual } from "@/components/motion/hero-visual";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  benefitItems,
  featuredOffers,
  heroHighlights,
  siteConfig,
  trustItems,
} from "@/lib/site";
import { formatCurrency } from "@/lib/utils";

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-subtle to-transparent" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <h1 className="text-5xl font-black leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
                Wimifarma BR
              </h1>
              <p className="mt-6 max-w-xl text-xl leading-8 text-muted">
                Plataforma comercial para vender melhor em Ivate: ofertas,
                delivery, Farmacia Popular, roleta promocional e atendimento
                direto pelo WhatsApp.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a
                    href={siteConfig.whatsappUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Comprar pelo WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/ofertas">
                    Ver ofertas
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 text-sm font-semibold text-ink sm:grid-cols-3">
                {heroHighlights.map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <CheckCircle2 className="h-4 w-4 text-pharma-green" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      <section className="bg-surface-subtle py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <h2 className="text-3xl font-black leading-tight text-ink sm:text-4xl">
                Uma base pensada para comercio, nao apenas presenca online.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted">
                A estrutura ja separa site publico, admin, banco, features e
                APIs internas, permitindo crescer sem bagunca.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefitItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Reveal delay={index * 0.06} key={item.title}>
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <Icon className="h-6 w-6 text-brand" />
                        <h3 className="mt-5 text-lg font-bold text-ink">
                          {item.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <Reveal>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-7">
              <Badge variant="green">Farmacia Popular</Badge>
              <h2 className="mt-5 text-3xl font-black text-ink">
                Um bloco proprio para orientar e converter com seguranca.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                A rota dedicada permite explicar documentos, disponibilidade,
                atendimento e chamar o cliente para confirmar tudo com a equipe.
              </p>
              <Button asChild className="mt-6" variant="success">
                <Link href="/farmacia-popular">
                  Conhecer programa
                  <ClipboardCheck className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-7">
              <Badge variant="yellow">Delivery em Ivate</Badge>
              <h2 className="mt-5 text-3xl font-black text-ink">
                Pedido rapido, conversa humana e confirmacao pelo WhatsApp.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                O delivery nasce sem checkout complexo. A prioridade e diminuir
                atrito, organizar demanda e vender com atendimento local.
              </p>
              <Button asChild className="mt-6" variant="dark">
                <Link href="/delivery">
                  Ver como funciona
                  <Bike className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface-subtle py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-ink">
                Ofertas em destaque
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Dados de exemplo para validar layout. Depois o admin controla
                produtos, campanhas e disponibilidade.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/ofertas">Ver vitrine completa</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featuredOffers.map((offer, index) => (
              <Reveal delay={index * 0.06} key={offer.title}>
                <Card className="h-full overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-brand via-pharma-yellow to-pharma-green" />
                  <CardContent className="p-5">
                    <Badge variant="muted">Oferta modelo</Badge>
                    <h3 className="mt-5 text-xl font-bold text-ink">
                      {offer.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {offer.description}
                    </p>
                    <p className="mt-6 text-3xl font-black text-brand">
                      {formatCurrency(offer.price)}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <Reveal>
            <h2 className="text-4xl font-black leading-tight">
              Roleta promocional para transformar visita em lead.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              O modulo ja nasce pensado para campanhas, premios, tentativas,
              cupons e auditoria. A versao inicial evita dados reais e deixa a
              regra de negocio documentada.
            </p>
            <Button asChild className="mt-8">
              <Link href="/roleta">
                Abrir roleta
                <Gift className="h-5 w-5" />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid gap-3">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
                    key={item.label}
                  >
                    <Icon className="h-5 w-5 text-pharma-yellow" />
                    <span className="text-sm font-semibold text-white/82">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <Reveal>
            <h2 className="text-3xl font-black text-ink">
              Confianca, atendimento e evolucao modular.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              A plataforma fica pronta para receber conteudo real, equipe,
              ofertas, regras de cupom, logs e melhorias comerciais.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Separacao clara entre site publico e admin",
                "Banco preparado para clientes, produtos e campanhas",
                "APIs internas com contratos de validacao",
                "Docker pronto para Nginx Proxy Manager",
              ].map((item) => (
                <div className="flex gap-3 rounded-lg bg-surface-subtle p-4" key={item}>
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-sm font-semibold leading-6 text-ink">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
