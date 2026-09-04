"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgePercent,
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  MessageCircle,
  Pause,
  Play,
  ShoppingBasket,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  arrangeShowcaseProducts,
  type PublicShowcaseProduct,
} from "@/features/offers/showcase";
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
  id: string;
  label: string;
  name: string;
  detail: string;
  oldPrice?: string;
  price: string;
  accent: string;
  soft: string;
  category?: string;
  benefit?: string;
  imageUrl?: string;
  isReserved: boolean;
};

const offerPalettes = [
  { accent: "#2563eb", soft: "#dbeafe" },
  { accent: "#0891b2", soft: "#cffafe" },
  { accent: "#7c3aed", soft: "#ede9fe" },
  { accent: "#d97706", soft: "#fef3c7" },
  { accent: "#16a34a", soft: "#dcfce7" },
  { accent: "#e11d48", soft: "#ffe4e6" },
  { accent: "#0f766e", soft: "#ccfbf1" },
  { accent: "#4f46e5", soft: "#e0e7ff" },
  { accent: "#ca8a04", soft: "#fef9c3" },
  { accent: "#14b8a6", soft: "#ccfbf1" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

function formatProductPrice(value: string) {
  return currencyFormatter.format(Number(value));
}

function buildBestOfferItems(products: PublicShowcaseProduct[]): BestOfferItem[] {
  return arrangeShowcaseProducts(products).map((product, index) => {
    const palette = offerPalettes[index % offerPalettes.length];

    if (!product) {
      return {
        ...palette,
        benefit: "Atendimento pelo WhatsApp",
        category: "Farmacia",
        detail: "Fale com a equipe para consultar outros itens.",
        id: `reserved-${index + 1}`,
        isReserved: true,
        label: "Espaco disponivel",
        name: "Consulte outros produtos",
        price: "Consulte",
      };
    }

    const regularPrice = Number(product.price);
    const currentPrice = Number(product.promotionalPrice ?? product.price);
    const hasPromotion = Boolean(
      product.promotionalPrice && currentPrice < regularPrice,
    );
    const discount = hasPromotion
      ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
      : null;

    return {
      ...palette,
      benefit: hasPromotion ? "Preco promocional" : "Consulte disponibilidade",
      category: product.category ?? "Farmacia",
      detail:
        product.description ??
        product.brand ??
        "Consulte disponibilidade com a equipe.",
      id: product.id,
      imageUrl: product.imageUrl,
      isReserved: false,
      label: discount ? `${discount}% OFF` : "Melhor oferta",
      name: product.name,
      oldPrice: hasPromotion ? formatProductPrice(product.price) : undefined,
      price: formatProductPrice(product.promotionalPrice ?? product.price),
    };
  });
}

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

function getSavingLabel(item: BestOfferItem) {
  const oldPrice = parsePrice(item.oldPrice);
  const price = parsePrice(item.price);

  if (!oldPrice || !price || price >= oldPrice) {
    return null;
  }

  return `Economize R$ ${(oldPrice - price).toFixed(2).replace(".", ",")}`;
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
      <div className="relative overflow-hidden rounded-md bg-[linear-gradient(135deg,#fff_0%,#fff4f6_34%,#eff8f3_68%,#f8fafc_100%)] lg:aspect-[8/3]">
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

          <div className="flex min-h-0 items-center justify-center py-3 sm:py-5 lg:h-full lg:py-0">
            <div className="relative aspect-[9/16] w-[min(68vw,250px)] overflow-hidden rounded-md bg-[#111827] shadow-[0_28px_60px_rgba(17,24,39,0.24)] ring-1 ring-black/10 sm:w-[min(44vw,280px)] lg:h-full lg:max-h-[432px] lg:min-h-0 lg:w-auto">
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
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

function BestOfferCatalog({ products }: { products: PublicShowcaseProduct[] }) {
  const catalogChips = [
    "Ofertas da semana",
    "Leve mais por menos",
    "Farmacia Popular",
    "Retire ou entregue",
  ];
  const bestOfferItems = buildBestOfferItems(products);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    moved: false,
    pointerId: null as number | null,
    scrollLeft: 0,
    startX: 0,
  });
  const [carouselControls, setCarouselControls] = useState({
    next: false,
    previous: false,
  });

  const updateCarouselControls = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const maximumScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    setCarouselControls({
      next: carousel.scrollLeft < maximumScroll - 2,
      previous: carousel.scrollLeft > 2,
    });
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const animationFrame = window.requestAnimationFrame(updateCarouselControls);
    const resizeObserver = new ResizeObserver(updateCarouselControls);
    resizeObserver.observe(carousel);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [updateCarouselControls]);

  function scrollOffers(direction: -1 | 1) {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>("[data-offer-card]");
    if (!carousel || !firstCard) return;

    const styles = window.getComputedStyle(carousel);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const cardStep = firstCard.offsetWidth + gap;
    const visibleCards = Math.max(
      1,
      Math.round((carousel.clientWidth + gap) / cardStep),
    );

    carousel.scrollBy({
      behavior: "smooth",
      left: direction * visibleCards * cardStep,
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    dragState.current = {
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) return;

    const movement = event.clientX - drag.startX;
    if (Math.abs(movement) > 4) drag.moved = true;
    event.currentTarget.scrollLeft = drag.scrollLeft - movement;
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.pointerId = null;
    window.setTimeout(() => {
      drag.moved = false;
    }, 0);
  }

  function cancelPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current.pointerId !== event.pointerId) return;
    dragState.current.pointerId = null;
    dragState.current.moved = false;
  }

  function preventClickAfterDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragState.current.moved = false;
  }

  return (
    <section className="pharma-clouds bg-white px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <MotionBlock delay={0.04}>
          <div className="mb-5 overflow-hidden rounded-lg border border-line/80 bg-white shadow-[0_22px_70px_rgba(17,24,39,0.08)]">
            <div className="h-1 bg-[linear-gradient(90deg,#c8102e,#25d366,#2563eb)]" />
            <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_28px_rgba(200,16,46,0.18)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalogo
                </span>
                <h2 className="mt-3 text-3xl font-black leading-none text-ink sm:text-4xl lg:text-5xl">
                  Melhores ofertas
                </h2>
              </div>

              <a
                className="soft-breathe inline-flex self-start items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,211,102,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:ring-offset-2 lg:self-auto"
                href={siteConfig.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Destaques da vitrine
              </span>
              {catalogChips.map((chip) => (
                <span
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted shadow-sm"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                aria-controls="best-offers-carousel"
                aria-label="Ver ofertas anteriores"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.previous}
                onClick={() => scrollOffers(-1)}
                title="Ofertas anteriores"
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-controls="best-offers-carousel"
                aria-label="Ver proximas ofertas"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.next}
                onClick={() => scrollOffers(1)}
                title="Proximas ofertas"
                type="button"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            aria-label="Melhores ofertas"
            aria-roledescription="carrossel"
            className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none"
            id="best-offers-carousel"
            onClickCapture={preventClickAfterDrag}
            onPointerCancel={cancelPointerDrag}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            onScroll={updateCarouselControls}
            ref={carouselRef}
            role="region"
          >
            {bestOfferItems.map((item, index) => {
              const discountLabel = getDiscountLabel(item);
              const savingLabel = getSavingLabel(item);
              const isReserved = item.isReserved;
              const category = item.category ?? "Espaco";
              const benefit = item.benefit ?? "Pronto para cadastrar";

              return (
                <article
                  aria-label={`Oferta ${index + 1} de ${bestOfferItems.length}`}
                  aria-roledescription="slide"
                  className="group relative flex min-h-[24.5rem] min-w-0 shrink-0 basis-[86%] snap-start flex-col overflow-hidden rounded-lg border border-line/80 bg-white shadow-[0_14px_34px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[var(--offer-accent)] hover:shadow-[0_26px_60px_rgba(17,24,39,0.15)] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-4rem)/5)]"
                  data-offer-card
                  key={item.id}
                  role="group"
                  style={
                    {
                      "--offer-accent": item.accent,
                      "--offer-soft": item.soft,
                    } as CSSProperties
                  }
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--offer-accent)] opacity-90" />
                  <div className="flex items-start justify-between gap-2 px-3 pt-4">
                    <span className="inline-flex min-h-7 min-w-0 flex-1 items-center justify-center rounded-full bg-[var(--offer-soft)] px-3 text-center text-[0.68rem] font-black uppercase leading-none text-[var(--offer-accent)]">
                      {item.label}
                    </span>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[0.68rem] font-black text-muted shadow-sm">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative m-3 mb-3 grid min-h-36 place-items-center overflow-hidden rounded-md bg-[linear-gradient(145deg,var(--offer-soft)_0%,#fff_70%)] ring-1 ring-[var(--offer-soft)]">
                    {item.imageUrl ? (
                      <Image
                        alt={item.name}
                        className="object-contain p-3 transition duration-300 group-hover:scale-105"
                        fill
                        sizes="(min-width: 1280px) 230px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="relative flex aspect-[0.78] w-24 items-center justify-center rounded-[1rem_1rem_0.5rem_0.5rem] border-2 border-white bg-[linear-gradient(180deg,#fff_0_34%,var(--offer-soft)_34%_56%,var(--offer-accent)_56%_100%)] shadow-[0_20px_34px_rgba(17,24,39,0.18)] ring-1 ring-black/10 transition duration-300 group-hover:rotate-[-2deg] group-hover:scale-105">
                        <span className="absolute top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--offer-accent)] shadow-inner">
                          <ShoppingBasket className="h-4 w-4" />
                        </span>
                        <strong className="absolute bottom-3 text-xs font-black uppercase tracking-[0.12em] text-white/90">
                          novo
                        </strong>
                      </div>
                    )}
                    {discountLabel ? (
                      <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-black text-[var(--offer-accent)] shadow-[0_10px_22px_rgba(17,24,39,0.12)]">
                        {discountLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid flex-1 content-start gap-2 px-3 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.08em] text-muted">
                        <HeartPulse className="h-3.5 w-3.5 text-[var(--offer-accent)]" />
                        <span className="truncate">{category}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-[0.68rem] font-bold text-muted ring-1 ring-line">
                        <Bike className="h-3.5 w-3.5 text-pharma-green" />
                        Ivate
                      </span>
                    </div>
                    {item.oldPrice ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          De <span className="line-through">{item.oldPrice}</span>
                        </span>
                        {savingLabel ? (
                          <span className="max-w-[8.5rem] truncate rounded-full bg-[var(--offer-soft)] px-2 py-0.5 text-[0.65rem] font-black text-[var(--offer-accent)]">
                            {savingLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : isReserved ? (
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">
                        espaco reservado
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">
                        preco regular
                      </span>
                    )}
                    <div>
                      <span className="block text-[0.68rem] font-black uppercase tracking-[0.1em] text-muted">
                        {isReserved ? "preco" : "por"}
                      </span>
                      <strong className="text-2xl font-black leading-none text-[var(--offer-accent)]">
                        {item.price}
                      </strong>
                    </div>
                    <h3 className="min-h-10 text-sm font-black leading-5 text-ink">
                      {item.name}
                    </h3>
                    <p className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-muted">
                      {item.detail}
                    </p>
                    <div className="grid gap-1.5 border-t border-line/70 pt-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.72rem] font-bold text-muted">
                        <BadgePercent className="h-3.5 w-3.5 text-[var(--offer-accent)]" />
                        <span className="truncate">{benefit}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.72rem] font-bold text-muted">
                        <ClipboardList className="h-3.5 w-3.5 text-pharma-green" />
                        <span className="truncate">Confirmar estoque no atendimento</span>
                      </span>
                    </div>
                  </div>

                  <a
                    className="mx-3 mb-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--offer-accent)] px-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(17,24,39,0.16)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    href={buildOfferWhatsAppUrl(item.name)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {isReserved ? "Consultar produto" : "Consultar oferta"}
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

export function HomePage({
  featuredProducts,
}: {
  featuredProducts: PublicShowcaseProduct[];
}) {
  return (
    <>
      <section className="pharma-clouds bg-white px-4 pb-8 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <HeroVideo />
          </MotionBlock>
        </div>
      </section>

      <BestOfferCatalog products={featuredProducts} />

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
