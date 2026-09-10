"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Pause,
  Play,
  Quote,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Star,
} from "lucide-react";
import {
  arrangeShowcaseProducts,
  type PublicShowcaseProduct,
} from "@/features/offers/showcase";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { ProductCashback } from "@/components/site/product-cashback";
import type { CashbackProduct } from "@/features/cashback/rules";
import type { CartProduct } from "@/components/site/cart-provider";
import { HomeProductCarousel } from "@/components/site/home-product-carousel";
import { PerfumeryCarousel } from "@/components/site/perfumery-carousel";
import type { RelatedProductCardItem } from "@/components/site/public-product-card";
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
  brand: string;
  id: string;
  label: string;
  name: string;
  oldPrice?: string;
  price: string;
  accent: string;
  soft: string;
  imageUrl?: string;
  isReserved: boolean;
  product?: CartProduct & CashbackProduct;
  ratingAverage: number | null;
  ratingCount: number;
};

export type HomeReview = {
  comment: string;
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  reviewerName: string;
};

const offerPalette = { accent: "#c8102e", soft: "#fff1f2" };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

function formatProductPrice(value: string) {
  return currencyFormatter.format(Number(value));
}

const heroSlides = [
  {
    accent: "#c8102e",
    cta: "Ver melhores ofertas",
    description:
      "Consulte medicamentos, disponibilidade e entrega com a equipe da Wimifarma.",
    eyebrow: "Medicamentos e cuidado diario",
    href: "#melhores-ofertas",
    image: "/banners/hero-medicamentos.webp",
    title: "Cuidado para a rotina, perto de voce.",
  },
  {
    accent: "#d7496f",
    cta: "Consultar perfumaria",
    description:
      "Perfumes, higiene e beleza para deixar seus momentos de autocuidado ainda melhores.",
    eyebrow: "Perfumaria e autocuidado",
    href: `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
      "Ola, gostaria de consultar os produtos de perfumaria e autocuidado da Wimifarma.",
    )}`,
    image: "/banners/hero-perfumaria.webp",
    title: "Seu cuidado tambem merece um momento.",
  },
  {
    accent: "#138a45",
    cta: "Consultar linha infantil",
    description:
      "Fraldas, higiene e cuidados infantis com atendimento proximo da nossa equipe.",
    eyebrow: "Mae e bebe",
    href: `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
      "Ola, gostaria de consultar os produtos para mae e bebe da Wimifarma.",
    )}`,
    image: "/banners/hero-mae-bebe.webp",
    title: "Carinho para cada fase da familia.",
  },
] as const;

function buildBestOfferItems(products: PublicShowcaseProduct[]): BestOfferItem[] {
  return arrangeShowcaseProducts(products).map((product, index) => {
    if (!product) {
      return {
        ...offerPalette,
        brand: "Wimifarma",
        id: `reserved-${index + 1}`,
        isReserved: true,
        label: "Espaco disponivel",
        name: "Consulte outros produtos",
        price: "Consulte",
        ratingAverage: null,
        ratingCount: 0,
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
      ...offerPalette,
      brand: product.brand ?? product.category ?? "Wimifarma",
      id: product.id,
      imageUrl: product.imageUrl,
      isReserved: false,
      label: discount ? `${discount}% OFF` : "Melhor oferta",
      name: product.name,
      oldPrice: hasPromotion ? formatProductPrice(product.price) : undefined,
      price: formatProductPrice(product.promotionalPrice ?? product.price),
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      product: {
        cashbackEnabled: product.cashbackEnabled,
        cashbackRateBps: product.cashbackRateBps,
        category: product.category,
        id: product.id,
        imageUrl: product.imageUrl,
        isPopularPharmacy: product.isPopularPharmacy,
        name: product.name,
        originalPriceCents: hasPromotion ? Math.round(regularPrice * 100) : null,
        requiresPrescription: product.requiresPrescription,
        slug: product.slug,
        stock: product.stock,
        unitPriceCents: Math.round(currentPrice * 100),
      },
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

function RatingStars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  const roundedRating = Math.round(rating);

  return (
    <span
      aria-label={`${rating.toFixed(1).replace(".", ",")} de 5 estrelas`}
      className="inline-flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          aria-hidden="true"
          className={`${size} ${
            value <= roundedRating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-slate-300"
          }`}
          key={value}
        />
      ))}
    </span>
  );
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

function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const slide = heroSlides[activeSlide];

  const changeSlide = useCallback((direction: -1 | 1) => {
    setActiveSlide((current) =>
      (current + direction + heroSlides.length) % heroSlides.length,
    );
  }, []);

  useEffect(() => {
    if (isInteracting || isManuallyPaused || shouldReduceMotion) return;

    const interval = window.setInterval(() => changeSlide(1), 6500);
    return () => window.clearInterval(interval);
  }, [activeSlide, changeSlide, isInteracting, isManuallyPaused, shouldReduceMotion]);

  function finishTouch(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;

    if (startX !== null && endX !== undefined) {
      const distance = startX - endX;
      if (Math.abs(distance) >= 40) changeSlide(distance > 0 ? 1 : -1);
    }

    touchStartX.current = null;
    setIsInteracting(false);
  }

  return (
    <div
      aria-label="Campanhas da Wimifarma"
      aria-roledescription="carrossel"
      className="relative isolate min-h-[540px] touch-pan-y overflow-hidden rounded-lg bg-white shadow-[0_26px_90px_rgba(17,24,39,0.14)] lg:aspect-[8/3] lg:min-h-0"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsInteracting(false);
        }
      }}
      onFocusCapture={() => setIsInteracting(true)}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchCancel={() => {
        touchStartX.current = null;
        setIsInteracting(false);
      }}
      onTouchEnd={finishTouch}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        setIsInteracting(true);
      }}
      role="region"
    >
      {heroSlides.map((item, index) => (
        <Image
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-[72%_center] transition-opacity duration-700 motion-reduce:transition-none lg:object-center ${
            activeSlide === index ? "opacity-100" : "opacity-0"
          }`}
          fill
          key={item.image}
          priority={index === 0}
          quality={88}
          sizes="(max-width: 1024px) 100vw, 1280px"
          src={item.image}
        />
      ))}

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.18)_34%,rgba(255,255,255,0.94)_62%,#fff_100%)] lg:bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_35%,rgba(255,255,255,0.5)_55%,rgba(255,255,255,0)_78%)]" />
      <div
        className="absolute inset-x-0 top-0 h-1.5 transition-colors duration-500"
        style={{ backgroundColor: slide.accent }}
      />

      <div
        aria-label={`${activeSlide + 1} de ${heroSlides.length}: ${slide.eyebrow}`}
        aria-roledescription="slide"
        className="flex min-h-[540px] items-end px-6 pb-24 pt-56 sm:px-8 lg:h-full lg:min-h-0 lg:items-center lg:px-12 lg:py-10 xl:px-16"
        role="group"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
          key={activeSlide}
          transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: easeOut }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-xs font-black uppercase text-ink shadow-sm backdrop-blur-sm">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: slide.accent }}
            />
            {slide.eyebrow}
          </p>
          <h1 className="mt-4 max-w-[15ch] text-3xl font-black leading-[1.02] text-ink sm:text-4xl lg:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-muted sm:text-base sm:leading-7">
            {slide.description}
          </p>
          <a
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(17,24,39,0.2)] transition duration-300 hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            href={slide.href}
            rel={slide.href.startsWith("http") ? "noreferrer" : undefined}
            style={{ backgroundColor: slide.accent }}
            target={slide.href.startsWith("http") ? "_blank" : undefined}
          >
            {slide.cta}
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </motion.div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 lg:left-auto lg:right-6">
        <div className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 p-2 shadow-md backdrop-blur-md">
          {heroSlides.map((item, index) => (
            <button
              aria-label={`Mostrar campanha ${index + 1}: ${item.eyebrow}`}
              aria-pressed={activeSlide === index}
              className={`h-2.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
                activeSlide === index ? "w-7" : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
              key={item.image}
              onClick={() => setActiveSlide(index)}
              style={activeSlide === index ? { backgroundColor: item.accent } : undefined}
              type="button"
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 p-1.5 shadow-md backdrop-blur-md">
          <button
            aria-label="Campanha anterior"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => changeSlide(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>

          <button
            aria-label={isManuallyPaused ? "Retomar campanhas" : "Pausar campanhas"}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(shouldReduceMotion)}
            onClick={() => setIsManuallyPaused((current) => !current)}
            type="button"
          >
            {isManuallyPaused ? (
              <Play aria-hidden="true" className="h-4 w-4 fill-current" />
            ) : (
              <Pause aria-hidden="true" className="h-4 w-4" />
            )}
          </button>

          <button
            aria-label="Proxima campanha"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => changeSlide(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
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
    if (
      event.target instanceof Element &&
      event.target.closest("a, button, input, select, textarea, label")
    ) {
      return;
    }

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
    <section id="melhores-ofertas" className="pharma-clouds scroll-mt-40 bg-white px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div>
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
              const productHref = item.product
                ? `/produto/${item.product.slug}`
                : null;

              return (
                <article
                  aria-label={`Oferta ${index + 1} de ${bestOfferItems.length}`}
                  aria-roledescription="slide"
                  className="group relative flex min-h-[23.5rem] min-w-0 shrink-0 basis-[86%] snap-start flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.07)] transition duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_20px_44px_rgba(17,24,39,0.12)] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-4rem)/5)]"
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
                  <div className="flex min-h-9 items-start px-3 pt-3">
                    <span className="inline-flex min-h-7 max-w-full items-center rounded-sm bg-brand-soft px-2.5 text-[0.68rem] font-bold leading-none text-brand">
                      {item.label}
                    </span>
                  </div>

                  {productHref ? (
                    <Link
                      aria-label={`Ver ${item.name}`}
                      className={`relative mx-3 mt-2 grid h-40 place-items-center overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      item.imageUrl
                        ? "bg-white"
                        : "bg-surface-subtle"
                    }`}
                      href={productHref}
                    >
                      <Image
                        alt={item.name}
                        className="object-contain object-center p-2 transition duration-300 group-hover:scale-105"
                        fill
                        sizes="(min-width: 1280px) 230px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                        src={item.imageUrl as string}
                      />
                      {discountLabel ? (
                        <span className="absolute right-2 top-2 rounded-sm bg-white px-2 py-1 text-[0.68rem] font-black text-brand shadow-sm">
                          {discountLabel}
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <div className="relative mx-3 mt-2 grid h-40 place-items-center overflow-hidden rounded-sm bg-surface-subtle">
                      <div className="relative flex aspect-[0.78] w-24 items-center justify-center rounded-[1rem_1rem_0.5rem_0.5rem] border-2 border-white bg-[linear-gradient(180deg,#fff_0_34%,var(--offer-soft)_34%_56%,var(--offer-accent)_56%_100%)] shadow-[0_20px_34px_rgba(17,24,39,0.18)] ring-1 ring-black/10 transition duration-300 group-hover:rotate-[-2deg] group-hover:scale-105">
                        <span className="absolute top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--offer-accent)] shadow-inner">
                          <ShoppingBasket className="h-4 w-4" />
                        </span>
                        <strong className="absolute bottom-3 text-xs font-black uppercase text-white/90">
                          novo
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    <h3 className="min-h-10 text-sm font-bold leading-5 text-ink">
                      {productHref ? (
                        <Link
                          className="line-clamp-2 transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          href={productHref}
                        >
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </h3>

                    <div className="mt-1 flex min-h-5 items-center gap-1.5 text-[0.7rem] font-semibold text-muted">
                      {item.ratingAverage !== null && item.ratingCount > 0 ? (
                        <>
                          <RatingStars rating={item.ratingAverage} size="h-3.5 w-3.5" />
                          <span>({item.ratingCount})</span>
                        </>
                      ) : isReserved ? (
                        <span>Atendimento pelo WhatsApp</span>
                      ) : (
                        <span>Novo</span>
                      )}
                    </div>

                    <p className="mt-2 truncate text-xs font-black uppercase text-ink">
                      {item.brand}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                      <div className="min-w-0">
                        {item.oldPrice ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem]">
                            <span className="font-semibold text-muted line-through">
                              {item.oldPrice}
                            </span>
                            {savingLabel ? (
                              <span className="font-bold text-brand">
                                {savingLabel}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <strong className="mt-1 block text-2xl font-black leading-none text-brand">
                          {item.price}
                        </strong>
                      </div>

                      {isReserved || !item.product ? (
                        <a
                          aria-label={`Consultar ${item.name} pelo WhatsApp`}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_22px_rgba(200,16,46,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a80d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                          href={buildOfferWhatsAppUrl(item.name)}
                          rel="noreferrer"
                          target="_blank"
                          title={`Consultar ${item.name}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      ) : (
                        <AddToCartButton
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_22px_rgba(200,16,46,0.2)] transition hover:-translate-y-0.5 hover:bg-[#a80d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                          iconOnly
                          product={item.product}
                        />
                      )}
                    </div>
                    {item.product ? <ProductCashback product={item.product} unitPriceCents={item.product.unitPriceCents} /> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerReviews({ reviews }: { reviews: HomeReview[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
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

  function scrollReviews(direction: -1 | 1) {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>("[data-review-card]");
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

  return (
    <section className="bg-surface-subtle px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-brand">
              <ShieldCheck className="h-4 w-4" />
              Compra verificada
            </span>
            <h2 className="mt-2 text-3xl font-black leading-tight text-ink sm:text-4xl">
              Avaliacoes de clientes
            </h2>
          </div>

          {reviews.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                aria-controls="customer-reviews-carousel"
                aria-label="Ver avaliacoes anteriores"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.previous}
                onClick={() => scrollReviews(-1)}
                title="Avaliacoes anteriores"
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-controls="customer-reviews-carousel"
                aria-label="Ver proximas avaliacoes"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.next}
                onClick={() => scrollReviews(1)}
                title="Proximas avaliacoes"
                type="button"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        {reviews.length > 0 ? (
          <div
            aria-label="Avaliacoes verificadas de clientes"
            aria-roledescription="carrossel"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            id="customer-reviews-carousel"
            onScroll={updateCarouselControls}
            ref={carouselRef}
            role="region"
          >
            {reviews.map((review, index) => (
              <article
                aria-label={`Avaliacao ${index + 1} de ${reviews.length}`}
                aria-roledescription="slide"
                className="relative flex min-h-56 min-w-0 shrink-0 basis-[88%] snap-start flex-col rounded-md border border-line bg-white p-5 shadow-[0_12px_32px_rgba(17,24,39,0.06)] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]"
                data-review-card
                key={review.id}
                role="group"
              >
                <Quote
                  aria-hidden="true"
                  className="absolute right-5 top-5 h-7 w-7 text-brand/15"
                />
                <RatingStars rating={review.rating} size="h-4 w-4" />
                <blockquote className="mt-4 line-clamp-4 text-base font-semibold leading-6 text-ink">
                  &ldquo;{review.comment}&rdquo;
                </blockquote>
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-ink">
                      {review.reviewerName}
                    </strong>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-pharma-green">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Compra verificada
                    </span>
                  </div>
                  <Link
                    className="max-w-[9rem] truncate text-xs font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    href={`/produto/${review.productSlug}#avaliacoes`}
                  >
                    {review.productName}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-line bg-white px-5 py-8 text-sm font-semibold text-muted">
            Ainda nao ha avaliacoes verificadas publicadas.
          </div>
        )}
      </div>
    </section>
  );
}

export function HomePage({
  catalogProducts,
  customerReviews,
  featuredProducts,
}: {
  catalogProducts: RelatedProductCardItem[];
  customerReviews: HomeReview[];
  featuredProducts: PublicShowcaseProduct[];
}) {
  return (
    <>
      <section className="pharma-clouds bg-white px-4 pb-8 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <HeroCarousel />
        </div>
      </section>

      <BestOfferCatalog products={featuredProducts} />

      <PerfumeryCarousel />

      <HomeProductCarousel products={catalogProducts} />

      <CustomerReviews reviews={customerReviews} />

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
