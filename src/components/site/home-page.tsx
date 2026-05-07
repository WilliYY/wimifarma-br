"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgePercent,
  Bike,
  HeartPulse,
  MapPin,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import { BlurText } from "@/components/motion/blur-text";
import { FadingVideo } from "@/components/motion/fading-video";
import { featuredOffers, siteConfig } from "@/lib/site";

const heroVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const continuationVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { filter: "blur(10px)", opacity: 0.2, y: 20 },
  show: {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOut },
  },
};

function MotionBlock({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      animate="show"
      initial="hidden"
      variants={entrance}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

const serviceLines = [
  {
    description:
      "Campanhas e produtos em destaque com chamada direta para atendimento humano.",
    href: "/ofertas",
    icon: BadgePercent,
    label: "Ofertas",
  },
  {
    description:
      "Orientacao simples para documentos, disponibilidade e retirada na farmacia.",
    href: "/farmacia-popular",
    icon: HeartPulse,
    label: "Farmacia Popular",
  },
  {
    description:
      "Pedido rapido para Ivate com confirmacao pelo WhatsApp antes da entrega.",
    href: "/delivery",
    icon: Bike,
    label: "Delivery local",
  },
];

const trustLines = [
  "Farmacia local em Ivate-PR",
  "Atendimento pelo WhatsApp",
  "Ofertas com confirmacao da equipe",
  "Admin preparado para crescer",
];

export function HomePage() {
  return (
    <>
      <section className="relative flex min-h-screen overflow-hidden bg-black">
        <FadingVideo
          className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
          src={heroVideo}
          style={{ height: "120%", width: "120%" }}
        />

        <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-28 sm:px-8 lg:px-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <MotionBlock delay={0.25}>
              <div className="liquid-glass inline-flex max-w-full items-center gap-2 rounded-full p-1">
                <span className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-black">
                  Novo
                </span>
                <span className="truncate pr-3 font-body text-sm font-medium text-white/90">
                  Ofertas, delivery e atendimento pelo WhatsApp
                </span>
              </div>
            </MotionBlock>

            <BlurText
              className="mt-7 w-full min-w-0 max-w-5xl font-heading text-[5.4rem] italic leading-[0.78] tracking-[-2px] text-white sm:text-8xl md:text-[8.5rem] lg:text-[10rem]"
              text="Wimifarma"
            />

            <MotionBlock
              className="mt-5 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base"
              delay={0.65}
            >
              Ofertas, Farmacia Popular, delivery em Ivate e atendimento humano
              com a equipe da farmacia.
            </MotionBlock>

            <MotionBlock
              className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
              delay={0.9}
            >
              <a
                className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
                href={siteConfig.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                Comprar pelo WhatsApp
                <MessageCircle className="h-5 w-5" />
              </a>
              <Link
                className="inline-flex items-center gap-2 font-body text-sm font-medium text-white"
                href="/ofertas"
              >
                Ver ofertas
                <Play className="h-4 w-4 fill-current" />
              </Link>
            </MotionBlock>
          </div>
        </div>
      </section>

      <section className="relative min-h-screen overflow-hidden bg-black">
        <FadingVideo
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={continuationVideo}
        />

        <div className="relative z-10 flex min-h-screen flex-col justify-between px-5 pb-12 pt-28 sm:px-8 md:px-16 lg:px-20">
          <MotionBlock className="max-w-4xl">
            <p className="mb-5 font-body text-sm font-medium text-white/78">
              Atendimento em movimento
            </p>
            <h2 className="font-heading text-6xl italic leading-[0.88] tracking-[-2px] text-white sm:text-7xl lg:text-[6rem]">
              Da oferta ao atendimento,
              <br />
              tudo mais rapido.
            </h2>
          </MotionBlock>

          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <MotionBlock
              className="liquid-glass rounded-[1.5rem] p-6 text-white sm:p-8"
              delay={0.15}
            >
              <MessageCircle className="h-8 w-8" />
              <p className="mt-8 font-heading text-4xl italic leading-none tracking-[-1px]">
                WhatsApp primeiro
              </p>
              <p className="mt-4 max-w-md font-body text-sm font-light leading-6 text-white/86">
                A plataforma foi pensada para transformar interesse em conversa:
                o cliente ve a oferta, chama a equipe e confirma disponibilidade,
                preco e entrega sem atrito.
              </p>
              <a
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-body text-sm font-semibold text-black"
                href={siteConfig.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                Iniciar atendimento
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </MotionBlock>

            <MotionBlock
              className="liquid-glass rounded-[1.5rem] p-2 text-white sm:p-3"
              delay={0.3}
            >
              <div className="divide-y divide-white/14">
                {serviceLines.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className="group grid gap-4 rounded-[1rem] px-4 py-5 transition hover:bg-white/8 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:px-5"
                      href={item.href}
                      key={item.href}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-heading text-3xl italic leading-none tracking-[-1px]">
                          {item.label}
                        </span>
                        <span className="mt-2 block max-w-xl font-body text-sm font-light leading-6 text-white/80">
                          {item.description}
                        </span>
                      </span>
                      <ArrowUpRight className="hidden h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
                    </Link>
                  );
                })}
              </div>
            </MotionBlock>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 text-ink sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <MotionBlock>
            <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Vitrine comercial
            </p>
            <h2 className="mt-4 font-heading text-5xl italic leading-[0.92] tracking-[-1px] sm:text-6xl">
              Ofertas com cara de farmacia moderna.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              A home volta a ter conteudo para vender: categorias, preco de
              chamada e acao direta para o WhatsApp.
            </p>
          </MotionBlock>

          <div className="divide-y divide-line border-y border-line">
            {featuredOffers.map((offer, index) => (
              <MotionBlock delay={index * 0.08} key={offer.title}>
                <div className="grid gap-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h3 className="text-xl font-bold text-ink">
                      {offer.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {offer.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 sm:justify-end">
                    <p className="font-heading text-3xl italic text-brand">
                      R$ {offer.price.toFixed(2).replace(".", ",")}
                    </p>
                    <a
                      className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong"
                      href={siteConfig.whatsappUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pedir
                    </a>
                  </div>
                </div>
              </MotionBlock>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand px-5 py-20 text-white sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <MotionBlock>
            <HeartPulse className="h-10 w-10 text-pharma-yellow" />
            <h2 className="mt-6 font-heading text-5xl italic leading-[0.92] tracking-[-1px] sm:text-6xl">
              Farmacia Popular com orientacao clara.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/82">
              A pagina dedicada ajuda o cliente a entender o atendimento,
              documentos e disponibilidade antes de sair de casa.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand"
              href="/farmacia-popular"
            >
              Ver Farmacia Popular
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </MotionBlock>

          <MotionBlock className="grid gap-4" delay={0.15}>
            {trustLines.map((line) => (
              <div
                className="flex items-center gap-4 border-b border-white/18 py-5"
                key={line}
              >
                <ShieldCheck className="h-5 w-5 shrink-0 text-pharma-yellow" />
                <p className="text-base font-medium text-white">{line}</p>
              </div>
            ))}
          </MotionBlock>
        </div>
      </section>

      <section className="bg-surface-subtle px-5 py-20 text-ink sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <MotionBlock>
            <MapPin className="h-9 w-9 text-brand" />
            <h2 className="mt-6 font-heading text-5xl italic leading-[0.92] tracking-[-1px] sm:text-6xl">
              Delivery em Ivate sem complicar a rotina.
            </h2>
          </MotionBlock>
          <MotionBlock delay={0.15}>
            <p className="text-lg leading-8 text-muted">
              O cliente chama pelo WhatsApp, a equipe confirma o pedido e o
              atendimento segue do jeito certo para a operacao local da
              Wimifarma.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 text-sm font-bold text-white"
                href={siteConfig.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                Chamar no WhatsApp
                <MessageCircle className="h-5 w-5" />
              </a>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-bold text-ink"
                href="/delivery"
              >
                Como funciona
              </Link>
            </div>
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
