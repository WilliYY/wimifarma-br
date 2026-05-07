"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgePercent,
  Bike,
  Clock3,
  HeartPulse,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BlurText } from "@/components/motion/blur-text";
import { FadingVideo } from "@/components/motion/fading-video";
import { siteConfig } from "@/lib/site";

const heroVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const capabilitiesVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { filter: "blur(10px)", opacity: 0, y: 20 },
  show: {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOut },
  },
};

const stats = [
  {
    icon: Clock3,
    label: "Atendimento como conversao inicial",
    value: "WhatsApp",
  },
  {
    icon: ShieldCheck,
    label: "Base pronta para crescer com seguranca",
    value: "Admin",
  },
];

const partners = ["Ofertas", "Delivery", "Popular", "Roleta", "WhatsApp"];

const capabilityCards: {
  body: string;
  icon: LucideIcon;
  tags: string[];
  title: string;
}[] = [
  {
    body: "Campanhas com destaque visual, chamada direta para atendimento e estrutura pronta para cupons, vitrines e promocoes locais.",
    icon: BadgePercent,
    tags: ["Campanhas", "Cupons", "Vitrine", "Conversao"],
    title: "Ofertas Inteligentes",
  },
  {
    body: "Fluxo pensado para Ivate: pedido rapido, conversa humana, confirmacao pelo WhatsApp e operacao simples para a equipe.",
    icon: Bike,
    tags: ["Pedido rapido", "Local", "WhatsApp", "Entrega"],
    title: "Delivery em Ivate",
  },
  {
    body: "Pagina dedicada para orientar documentos, disponibilidade e atendimento com clareza antes da visita ou retirada na farmacia.",
    icon: HeartPulse,
    tags: ["Orientacao", "Confianca", "Popular", "Cuidado"],
    title: "Farmacia Popular",
  },
];

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
      initial="hidden"
      variants={entrance}
      viewport={{ once: true, amount: 0.25 }}
      whileInView="show"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="relative flex min-h-screen overflow-hidden bg-black">
        <FadingVideo
          className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
          src={heroVideo}
          style={{ height: "120%", width: "120%" }}
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col px-4 pt-24 sm:px-8 lg:px-16">
          <div className="flex flex-1 items-center justify-center">
            <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
              <MotionBlock delay={0.4}>
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
                className="mt-6 w-full min-w-0 max-w-4xl font-heading text-[3.7rem] italic leading-[0.82] tracking-[-1px] text-white sm:text-6xl md:text-7xl md:tracking-[-3px] lg:text-[5.6rem]"
                text="Wimifarma Cuida de Voce em Ivate"
              />

              <MotionBlock
                className="mt-5 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base"
                delay={0.8}
              >
                Uma plataforma moderna para encontrar ofertas, Farmacia
                Popular, delivery local e campanhas promocionais com
                atendimento humano.
              </MotionBlock>

              <MotionBlock
                className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
                delay={1.1}
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

              <MotionBlock
                className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:items-stretch"
                delay={1.3}
              >
                {stats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="liquid-glass flex min-h-[146px] w-full max-w-[220px] flex-col justify-between rounded-[1.25rem] p-5 text-left"
                      key={item.value}
                    >
                      <Icon className="h-7 w-7 text-white" />
                      <div>
                        <p className="font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                          {item.value}
                        </p>
                        <p className="mt-2 font-body text-xs font-light leading-snug text-white">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </MotionBlock>
            </div>
          </div>

          <MotionBlock
            className="flex flex-col items-center gap-4 pb-8 text-center"
            delay={1.4}
          >
            <div className="liquid-glass rounded-full px-3.5 py-1 font-body text-xs font-medium text-white">
              Plataforma comercial local, pronta para crescer em modulos
            </div>
            <div className="flex max-w-4xl flex-wrap items-center justify-center gap-x-9 gap-y-2 md:gap-x-14">
              {partners.map((item) => (
                <span
                  className="font-heading text-2xl italic tracking-tight text-white md:text-3xl"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </MotionBlock>
        </div>
      </section>

      <section className="relative min-h-screen overflow-hidden bg-black">
        <FadingVideo
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={capabilitiesVideo}
        />

        <div className="relative z-10 flex min-h-screen flex-col px-8 pb-10 pt-24 md:px-16 lg:px-20">
          <MotionBlock className="mb-auto">
            <p className="mb-6 font-body text-sm text-white/80">
              {"// Capabilidades"}
            </p>
            <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">
              Atendimento
              <br />
              evoluido
            </h2>
          </MotionBlock>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {capabilityCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <MotionBlock delay={index * 0.12} key={card.title}>
                  <article className="liquid-glass flex min-h-[360px] flex-col rounded-[1.25rem] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="liquid-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.75rem] text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                        {card.tags.map((tag) => (
                          <span
                            className="liquid-glass rounded-full px-3 py-1 font-body text-[11px] text-white/90"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1" />

                    <div className="mt-6">
                      <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">
                        {card.title}
                      </h3>
                      <p className="mt-3 max-w-[32ch] font-body text-sm font-light leading-snug text-white/90">
                        {card.body}
                      </p>
                    </div>
                  </article>
                </MotionBlock>
              );
            })}
          </div>

          <MotionBlock
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            delay={0.4}
          >
            <Link
              className="liquid-glass-strong inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
              href="/roleta"
            >
              Conhecer roleta promocional
              <Sparkles className="h-5 w-5" />
            </Link>
            <a
              className="inline-flex w-fit items-center gap-2 font-body text-sm font-medium text-white"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Falar com a equipe
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
