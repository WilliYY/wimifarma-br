"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Pause,
  Play,
  ShoppingBasket,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { siteConfig } from "@/lib/site";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

type BestOfferItem = {
  label: string;
  name: string;
  detail: string;
  oldPrice?: string;
  price: string;
  accent: string;
  soft: string;
};

const bestOfferItems: BestOfferItem[] = [
  {
    label: "Leve 2 e pague menos",
    name: "Niquitin Adesivo 21mg",
    detail: "Com 7 adesivos",
    oldPrice: "R$ 116,39",
    price: "R$ 94,90",
    accent: "#2563eb",
    soft: "#dbeafe",
  },
  {
    label: "Leve mais por menos",
    name: "Hyabak Solucao Oftalmica",
    detail: "Frasco 10ml",
    oldPrice: "R$ 73,19",
    price: "R$ 59,90",
    accent: "#0891b2",
    soft: "#cffafe",
  },
  {
    label: "Oferta da semana",
    name: "Cimegripe",
    detail: "20 capsulas",
    oldPrice: "R$ 11,89",
    price: "R$ 9,90",
    accent: "#7c3aed",
    soft: "#ede9fe",
  },
  {
    label: "51% OFF",
    name: "Expec Tripla Acao",
    detail: "Xarope 120ml",
    oldPrice: "R$ 54,83",
    price: "R$ 26,89",
    accent: "#d97706",
    soft: "#fef3c7",
  },
  {
    label: "23% OFF",
    name: "Muvinlax Limao",
    detail: "20 saches 14g",
    oldPrice: "R$ 68,71",
    price: "R$ 52,71",
    accent: "#16a34a",
    soft: "#dcfce7",
  },
  {
    label: "Melhor oferta",
    name: "Produto 06",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#e11d48",
    soft: "#ffe4e6",
  },
  {
    label: "Melhor oferta",
    name: "Produto 07",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#0f766e",
    soft: "#ccfbf1",
  },
  {
    label: "Melhor oferta",
    name: "Produto 08",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#4f46e5",
    soft: "#e0e7ff",
  },
  {
    label: "Melhor oferta",
    name: "Produto 09",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#ca8a04",
    soft: "#fef9c3",
  },
  {
    label: "Melhor oferta",
    name: "Produto 10",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#14b8a6",
    soft: "#ccfbf1",
  },
  {
    label: "Melhor oferta",
    name: "Produto 11",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#2563eb",
    soft: "#dbeafe",
  },
  {
    label: "Melhor oferta",
    name: "Produto 12",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#0891b2",
    soft: "#cffafe",
  },
  {
    label: "Melhor oferta",
    name: "Produto 13",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#7c3aed",
    soft: "#ede9fe",
  },
  {
    label: "Melhor oferta",
    name: "Produto 14",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#d97706",
    soft: "#fef3c7",
  },
  {
    label: "Melhor oferta",
    name: "Produto 15",
    detail: "Espaco para cadastrar oferta",
    price: "Consulte",
    accent: "#16a34a",
    soft: "#dcfce7",
  },
];

function buildOfferWhatsAppUrl(productName: string) {
  return `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
    `Ola, gostaria de saber mais sobre ${productName} da Melhor oferta.`,
  )}`;
}

function parsePrice(value?: string) {
  if (!value?.startsWith("R$")) {
    return null;
  }

  const parsed = Number(value.replace("R$", "").replace(".", "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getDiscountLabel(item: BestOfferItem) {
  const oldPrice = parsePrice(item.oldPrice);
  const price = parsePrice(item.price);

  if (!oldPrice || !price || price >= oldPrice) {
    return null;
  }

  return `${Math.round(((oldPrice - price) / oldPrice) * 100)}% OFF`;
}

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
      animate="show"
      className={className}
      initial="hidden"
      transition={{ delay }}
      variants={entrance}
    >
      {children}
    </motion.div>
  );
}

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().then(() => setIsPlaying(true));
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.paused) {
      void video.play().then(() => setIsPlaying(true));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-white bg-white p-2 shadow-[0_26px_90px_rgba(17,24,39,0.12)]">
      <div className="relative overflow-hidden rounded-md bg-[linear-gradient(135deg,#fff_0%,#fff4f6_34%,#eff8f3_68%,#f8fafc_100%)] lg:aspect-[16/7] xl:aspect-[16/6.4]">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full scale-125 object-cover object-center opacity-20 blur-2xl saturate-[0.8]"
          loop
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
        >
          <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0.42)_32%,rgba(255,255,255,0.42)_68%,rgba(255,255,255,0.92))]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c8102e,#138a45,#064b8e)]" />

        <div className="relative z-[1] grid min-h-[360px] items-center gap-5 p-4 sm:min-h-[430px] sm:p-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(16rem,0.52fr)_minmax(16rem,0.48fr)] lg:gap-6 lg:p-7">
          <div className="hidden max-w-lg lg:block">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-brand">
              Wimifarma
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[0.98] text-ink xl:text-5xl">
              Melhores preços em medicamentos e temos Farmácia Popular.
            </h1>
            <p className="mt-5 max-w-xs text-base leading-7 text-muted">
              Medicamentos, Farmacia Popular e entrega com atendimento humano.
            </p>
            <a
              className="soft-breathe mt-7 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,211,102,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe57]"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Chamar no WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <div className="flex min-h-0 items-center justify-center py-3 sm:py-5 lg:h-full lg:min-h-[420px] lg:py-0">
            <div className="relative aspect-[9/16] w-[min(68vw,250px)] overflow-hidden rounded-md bg-[#111827] shadow-[0_28px_60px_rgba(17,24,39,0.24)] ring-1 ring-black/10 sm:w-[min(44vw,280px)] lg:h-full lg:max-h-[620px] lg:min-h-[420px] lg:w-auto">
              <video
                aria-label="Video da Wimifarma"
                autoPlay
                className="h-full w-full object-cover object-center"
                loop
                muted
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
                playsInline
                poster="/videos/thiago-poster.svg"
                preload="auto"
                ref={videoRef}
              >
                <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-ink/60 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-md lg:left-auto lg:right-4 lg:translate-x-0">
          <button
            aria-label={isPlaying ? "Pausar video" : "Reproduzir video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={togglePlay}
            title={isPlaying ? "Pausar video" : "Reproduzir video"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <button
            aria-label={isMuted ? "Ativar som do video" : "Silenciar video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={toggleMute}
            title={isMuted ? "Ativar som do video" : "Silenciar video"}
            type="button"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BestOfferCatalog() {
  const activeOffers = bestOfferItems.filter((item) => item.oldPrice).length;
  const reservedOffers = bestOfferItems.length - activeOffers;

  return (
    <section className="pharma-clouds bg-white px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <MotionBlock delay={0.04}>
          <div className="mb-5 overflow-hidden rounded-lg border border-line/80 bg-white/88 p-4 shadow-[0_22px_70px_rgba(17,24,39,0.08)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_28px_rgba(200,16,46,0.18)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalogo
                </span>
                <h2 className="mt-3 text-3xl font-black leading-none text-ink sm:text-4xl lg:text-5xl">
                  Melhores ofertas
                </h2>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted sm:text-base">
                  Destaques prontos para o cliente consultar pelo WhatsApp, com
                  espacos preparados para receber o catalogo real depois.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[24rem]">
                <div className="rounded-md bg-brand-soft px-3 py-3">
                  <strong className="block text-xl font-black text-brand">
                    {activeOffers}
                  </strong>
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-muted">
                    ativas
                  </span>
                </div>
                <div className="rounded-md bg-[#eefaf4] px-3 py-3">
                  <strong className="block text-xl font-black text-pharma-green">
                    {reservedOffers}
                  </strong>
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-muted">
                    vagas
                  </span>
                </div>
                <a
                  className="soft-breathe inline-flex min-h-full items-center justify-center gap-2 rounded-md bg-[#25d366] px-3 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,211,102,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:ring-offset-2"
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Destaques da vitrine
              </span>
              <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted">
                Consulta direta com a equipe
              </span>
            </div>
            <p className="text-sm font-semibold text-muted sm:text-right">
              {bestOfferItems.length} espacos em grade responsiva
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            {bestOfferItems.map((item, index) => {
              const discountLabel = getDiscountLabel(item);
              const isReserved = item.price === "Consulte";

              return (
                <article
                  className="group relative flex min-h-[21rem] min-w-0 flex-col overflow-hidden rounded-lg border border-line/80 bg-white shadow-[0_16px_34px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[var(--offer-accent)] hover:shadow-[0_26px_60px_rgba(17,24,39,0.15)]"
                  key={`${item.name}-${index}`}
                  style={
                    {
                      "--offer-accent": item.accent,
                      "--offer-soft": item.soft,
                    } as CSSProperties
                  }
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--offer-accent)] opacity-80" />
                  <div className="flex items-center justify-between gap-2 px-3 pt-4">
                    <span className="inline-flex min-h-7 min-w-0 flex-1 items-center justify-center rounded-full bg-[var(--offer-soft)] px-3 text-center text-[0.68rem] font-black uppercase leading-none text-[var(--offer-accent)]">
                      {item.label}
                    </span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[0.68rem] font-black text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="m-3 mb-2 grid min-h-36 place-items-center overflow-hidden rounded-md bg-[linear-gradient(145deg,var(--offer-soft)_0%,#fff_74%)] ring-1 ring-[var(--offer-soft)]">
                    <div className="relative flex aspect-[0.78] w-24 items-center justify-center rounded-[1rem_1rem_0.5rem_0.5rem] border-2 border-white bg-[linear-gradient(180deg,#fff_0_34%,var(--offer-soft)_34%_56%,var(--offer-accent)_56%_100%)] shadow-[0_20px_34px_rgba(17,24,39,0.18)] ring-1 ring-black/10 transition duration-300 group-hover:rotate-[-2deg] group-hover:scale-105">
                      <span className="absolute top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--offer-accent)] shadow-inner">
                        <ShoppingBasket className="h-4 w-4" />
                      </span>
                      <strong className="absolute bottom-3 text-xs font-black uppercase tracking-[0.12em] text-white/90">
                        {isReserved ? "novo" : "oferta"}
                      </strong>
                    </div>
                    {discountLabel ? (
                      <span className="absolute right-5 top-[5.1rem] rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-black text-[var(--offer-accent)] shadow-[0_10px_22px_rgba(17,24,39,0.12)]">
                        {discountLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid flex-1 content-start gap-2 px-3 pb-3">
                    {item.oldPrice ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400 line-through">
                          {item.oldPrice}
                        </span>
                        {discountLabel ? (
                          <span className="rounded-full bg-[var(--offer-soft)] px-2 py-0.5 text-[0.65rem] font-black text-[var(--offer-accent)]">
                            economia
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">
                        espaco reservado
                      </span>
                    )}
                    <strong className="text-2xl font-black leading-none text-[var(--offer-accent)]">
                      {item.price}
                    </strong>
                    <h3 className="min-h-10 text-sm font-black leading-5 text-ink">
                      {item.name}
                    </h3>
                    <p className="min-h-8 text-xs font-medium leading-4 text-muted">
                      {item.detail}
                    </p>
                  </div>

                  <a
                    className="mx-3 mb-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--offer-accent)] px-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(17,24,39,0.16)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    href={buildOfferWhatsAppUrl(item.name)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {isReserved ? "Reservar espaco" : "Consultar"}
                  </a>
                </article>
              );
            })}
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <section className="pharma-clouds bg-white px-4 pb-8 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <HeroVideo />
          </MotionBlock>
        </div>
      </section>

      <BestOfferCatalog />

      <section className="pharma-clouds bg-white px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <a
              aria-label="Chamar a Wimifarma no WhatsApp pela faixa de campanhas"
              className="soft-breathe block overflow-hidden rounded-lg bg-white shadow-[0_18px_70px_rgba(17,24,39,0.08)] ring-1 ring-line/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(17,24,39,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="Faixas de campanha Wimifarma: generico barato, dia do idoso e dia do bebe"
                className="h-auto w-full"
                height={1024}
                sizes="(min-width: 1280px) 1280px, 100vw"
                src="/banners/faixa-home.webp"
                width={1536}
              />
            </a>
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
