"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Baby,
  HeartHandshake,
  MessageCircle,
  Pause,
  Pill,
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
import { ProductCardActions } from "@/components/site/product-card-actions";
import { ProductShippingBadge } from "@/components/site/product-shipping-badge";
import { ProductCashback } from "@/components/site/product-cashback";
import type { CashbackProduct } from "@/features/cashback/rules";
import type { CartProduct } from "@/components/site/cart-provider";
import { HomeProductCarousel } from "@/components/site/home-product-carousel";
import { PerfumeryCarousel } from "@/components/site/perfumery-carousel";
import { HeroProductStage } from "@/components/site/hero-product-stage";
import campaignStyles from "./home-campaign.module.css";
import { BrandSignature } from "@/components/site/brand-signature";
import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import { siteConfig } from "@/lib/site";
import { whatsappTestimonials, type WhatsAppTestimonial } from "@/features/reviews/whatsapp-testimonials";

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
  incentivized?: boolean;
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
    background: "#f2f7fa",
    cta: "Ver produtos",
    description: "Higiene, beleza e bem-estar.",
    eyebrow: "Para o seu dia a dia",
    href: "/catalogo",
    art: "care",
    title: "Seu cuidado, todo dia.",
  },
  {
    background: "#fff7f5",
    cta: "Consultar perfumaria",
    description: "Perfumaria e cuidados pessoais.",
    eyebrow: "Perfumaria e autocuidado",
    href: `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
      "Ola, gostaria de consultar os produtos de perfumaria e autocuidado da Wimifarma.",
    )}`,
    art: "beauty",
    title: "Beleza no seu momento.",
  },
  {
    background: "#f2f7f3",
    cta: "Consultar linha infantil",
    description: "Fraldas e higiene para os pequenos.",
    eyebrow: "Mãe e bebê",
    href: `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
      "Ola, gostaria de consultar os produtos para mae e bebe da Wimifarma.",
    )}`,
    art: "baby",
    title: "Carinho em cada cuidado.",
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
        prescriptionType: product.prescriptionType,
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
  const [hasFocus, setHasFocus] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const slide = heroSlides[activeSlide];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setShouldReduceMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.2 });
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  const changeSlide = useCallback((direction: -1 | 1) => {
    setActiveSlide((current) =>
      (current + direction + heroSlides.length) % heroSlides.length,
    );
  }, []);

  useEffect(() => {
    if (!isInView || isInteracting || hasFocus || isManuallyPaused || shouldReduceMotion) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") changeSlide(1);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [activeSlide, changeSlide, hasFocus, isInView, isInteracting, isManuallyPaused, shouldReduceMotion]);

  function finishTouch(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const end = event.changedTouches[0];

    if (start && end) {
      const distance = start.x - end.clientX;
      if (Math.abs(distance) >= 40 && Math.abs(distance) > Math.abs(start.y - end.clientY) * 1.25) {
        changeSlide(distance > 0 ? 1 : -1);
      }
    }

    touchStart.current = null;
    setIsInteracting(false);
  }

  return (
    <div
      aria-label="Campanhas da Wimifarma"
      aria-roledescription="carrossel"
      className={campaignStyles.campaign}
      style={{ "--campaign-tint": slide.background } as CSSProperties}
      ref={carouselRef}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setHasFocus(false);
        }
      }}
      onFocusCapture={() => setHasFocus(true)}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchCancel={() => {
        touchStart.current = null;
        setIsInteracting(false);
      }}
      onTouchEnd={finishTouch}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        setIsInteracting(true);
      }}
      role="region"
    >
      <div className={campaignStyles.surface}>
        <div
          aria-label={`${activeSlide + 1} de ${heroSlides.length}: ${slide.eyebrow}`}
          aria-roledescription="slide"
          aria-live={hasFocus || isInteracting || isManuallyPaused || shouldReduceMotion ? "polite" : "off"}
          className={campaignStyles.copy}
          role="group"
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
            initial={false}
            key={activeSlide}
            transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: easeOut }}
          >
            <div className={campaignStyles.signature}><BrandSignature /></div>
            <p className={campaignStyles.eyebrow}>{slide.eyebrow}</p>
            <h1 className={campaignStyles.title}>{slide.title}</h1>
            <p className={campaignStyles.description}>{slide.description}</p>
            <div className={campaignStyles.actions}>
              <a
                className={campaignStyles.cta}
                href={slide.href}
                rel={slide.href.startsWith("http") ? "noreferrer" : undefined}
                target={slide.href.startsWith("http") ? "_blank" : undefined}
              >
                {slide.cta}
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
        <div className={campaignStyles.visual}>
          <HeroProductStage priority={activeSlide === 0} variant={slide.art} />
        </div>
      </div>

      <div className={campaignStyles.footer}>
        <div className={campaignStyles.selectors}>
          {heroSlides.map((item, index) => (
            <button
              aria-label={`Mostrar campanha ${index + 1}: ${item.eyebrow}`}
              aria-pressed={activeSlide === index}
              className={campaignStyles.selector}
              key={item.art}
              onClick={() => setActiveSlide(index)}
              type="button"
            >
              <span aria-hidden="true">0{index + 1}</span>
              <span>{["Cuidados", "Beleza", "Mãe e bebê"][index]}</span>
            </button>
          ))}
        </div>

        <div className={campaignStyles.controls}>
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
    if (!event.isPrimary) return;
    dragState.current.moved = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, select, textarea, label, [data-product-controls]")
    ) {
      return;
    }

    dragState.current = {
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) return;
    if (event.buttons !== 1) { finishPointerDrag(event); return; }

    const movement = event.clientX - drag.startX;
    if (Math.abs(movement) > 6 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.dataset.dragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - movement;
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) return;

    drag.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    finishPointerDrag(event);
    dragState.current.moved = false;
  }

  function preventClickAfterDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current.moved || event.detail === 0) return;
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
            className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 select-none motion-safe:scroll-smooth data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none data-[dragging=true]:[&_a]:cursor-grabbing"
            id="best-offers-carousel"
            onClickCapture={preventClickAfterDrag}
            onDragStart={(event) => event.preventDefault()}
            onPointerCancel={cancelPointerDrag}
            onLostPointerCapture={finishPointerDrag}
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
                  {item.product ? <ProductShippingBadge /> : <div className="flex min-h-9 items-start px-3 pt-3">
                    <span className="inline-flex min-h-7 max-w-full items-center rounded-sm bg-brand-soft px-2.5 text-[0.68rem] font-bold leading-none text-brand">
                      {item.label}
                    </span>
                  </div>}

                  {productHref ? (
                    <div
                      className={`relative mx-3 mt-2 grid h-40 place-items-center overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      item.imageUrl
                        ? "bg-white"
                        : "bg-surface-subtle"
                    }`}
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
                    </div>
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
                          aria-label={`Ver ${item.name}`}
                          className="line-clamp-2 after:absolute after:inset-0 after:z-10 after:cursor-pointer hover:text-brand focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
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
                      ) : null}
                    </div>
                    {item.product ? <ProductCashback product={item.product} unitPriceCents={item.product.unitPriceCents} /> : null}
                    {item.product ? <ProductCardActions product={item.product} /> : null}
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

function reviewInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "C"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toLocaleUpperCase("pt-BR");
}

function CustomerReviews({ reviews }: { reviews: HomeReview[] }) {
  const displayedReviews: ((HomeReview & { source: "purchase" }) | WhatsAppTestimonial)[] = [
    ...reviews.map((review) => ({ ...review, source: "purchase" as const })),
    ...whatsappTestimonials,
  ];
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      left: direction * visibleCards * cardStep,
    });
  }

  return (
    <section className="bg-surface-subtle px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="customer-reviews-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-pharma-green/20 bg-white px-3 py-1.5 text-xs font-bold text-ink">
              <MessageCircle aria-hidden="true" className="h-4 w-4 text-pharma-green" />
              Experiências compartilhadas por clientes
            </span>
            <h2 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-4xl" id="customer-reviews-title">
              Avaliações de clientes
            </h2>
            <p className="mt-3 max-w-xl text-base leading-6 text-muted">Sua experiência ajuda outras pessoas a escolher com mais confiança.</p>
          </div>

          {displayedReviews.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                aria-controls="customer-reviews-carousel"
                aria-label="Ver avaliações anteriores"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.previous}
                onClick={() => scrollReviews(-1)}
                title="Avaliações anteriores"
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-controls="customer-reviews-carousel"
                aria-label="Ver próximas avaliações"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!carouselControls.next}
                onClick={() => scrollReviews(1)}
                title="Próximas avaliações"
                type="button"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        {displayedReviews.length > 0 ? (
          <div
            aria-label="Avaliações de clientes"
            aria-roledescription="carrossel"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            id="customer-reviews-carousel"
            onScroll={updateCarouselControls}
            ref={carouselRef}
            role="region"
          >
            {displayedReviews.map((review, index) => (
              <article
                aria-label={`Avaliação ${index + 1} de ${displayedReviews.length}`}
                aria-roledescription="slide"
                className="relative flex min-h-72 min-w-0 shrink-0 basis-[88%] snap-start flex-col rounded-3xl border border-line bg-white p-6 shadow-sm transition-colors hover:border-brand/30 sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]"
                data-review-card
                key={review.id}
                role="group"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand/10 bg-brand-soft text-base font-black text-brand" data-review-avatar>
                    {reviewInitials(review.reviewerName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-ink">{review.reviewerName}</strong>
                    {review.source === "purchase" ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink/75"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-pharma-green" />Compra verificada</span>
                    ) : null}
                  </div>
                  <Quote aria-hidden="true" className="h-6 w-6 shrink-0 text-brand/20" />
                </div>
                <RatingStars rating={review.rating} size="h-4 w-4" />
                <blockquote className="mb-6 mt-3 break-words text-base font-medium leading-7 text-ink">
                  &ldquo;{review.comment}&rdquo;
                </blockquote>
                {review.source === "purchase" ? <div className="mt-auto min-w-0 border-t border-line pt-4">
                  <span className="block text-xs text-muted">Sobre o produto</span>
                  <Link
                    className="mt-1 inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm text-sm font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    href={`/produto/${review.productSlug}#avaliacoes`}
                  >
                    <span className="line-clamp-2 break-words">{review.productName}</span><ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </Link>
                </div> : <p className="mt-auto border-t border-line pt-4 text-xs leading-5 text-muted">Sobre o atendimento da Wimifarma.</p>}
                {review.source === "purchase" && review.incentivized ? <p className="mt-3 text-xs leading-5 text-muted">Avaliação com incentivo de cashback, independente da nota.</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-5 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:p-8">
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Quote className="h-8 w-8" /></span>
            <div className="max-w-xl">
              <h3 className="text-xl font-bold text-ink">Sua experiência tem espaço aqui.</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Ainda não há avaliações verificadas publicadas. Depois de receber sua compra, conte como foi usar o produto.</p>
            </div>
          </div>
        )}
        <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand/20 bg-white px-5 py-3 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" href="/minha-conta/avaliacoes">Avaliar minhas compras<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
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
      <section className="pharma-clouds bg-white px-4 pb-8 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pt-56">
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
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wider text-brand">Perto de você</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Cuidado para cada fase.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-muted">Consulte as campanhas e as condições com a nossa equipe.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Dia do Genérico Barato", description: "Consulte as opções de genéricos com a orientação da nossa equipe.", icon: Pill, color: "bg-[#edf7ef] text-emerald-800" },
                { title: "Dia do Idoso", description: "Respeito, atenção e cuidado para quem já cuidou tanto de nós.", icon: HeartHandshake, color: "bg-[#f3f0fa] text-violet-800" },
                { title: "Dia do Bebê", description: "Fraldas, higiene e carinho para acompanhar cada descoberta.", icon: Baby, color: "bg-[#fff1ee] text-rose-800" },
              ].map((campaign) => (
                <a className={`group rounded-2xl border border-black/5 p-6 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${campaign.color}`} href={siteConfig.whatsappUrl} key={campaign.title} rel="noreferrer" target="_blank">
                  <campaign.icon className="h-7 w-7" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-bold text-ink">{campaign.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{campaign.description}</p>
                  <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold">Consultar campanha<ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
                </a>
              ))}
            </div>
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
