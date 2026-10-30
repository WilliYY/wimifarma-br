"use client";


import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Quote,
  ShieldCheck,
  Star,
} from "lucide-react";
import { HomeProductCarousel } from "@/components/site/home-product-carousel";
import { HeroProductStage } from "@/components/site/hero-product-stage";
import { ClubBanner } from "@/components/site/club-banner";
import { PixDiscountBanner } from "@/components/site/pix-discount-banner";
import { HomeShortcuts } from "@/components/site/home-shortcuts";
import { BrandCarousel } from "@/components/site/brand-carousel";
import type { PublicBrand } from "@/features/products/brands";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import campaignStyles from "./home-campaign.module.css";
import { BrandSignature } from "@/components/site/brand-signature";
import type { HomeCollections } from "@/features/products/home-collections";
import { whatsappTestimonials, type WhatsAppTestimonial } from "@/features/reviews/whatsapp-testimonials";

export type HomeReview = {
  comment: string;
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  reviewerName: string;
  incentivized?: boolean;
};

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
    cta: "Ver perfumaria",
    description: "Perfumaria e cuidados pessoais.",
    eyebrow: "Perfumaria e autocuidado",
    href: "/catalogo?grupo=beauty",
    art: "beauty",
    title: "Beleza no seu momento.",
  },
  {
    background: "#f2f7f3",
    cta: "Ver infantil",
    description: "Fraldas e higiene para os pequenos.",
    eyebrow: "Mãe e bebê",
    href: "/catalogo?grupo=baby",
    art: "baby",
    title: "Carinho em cada cuidado.",
  },
] as const;

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

function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(true);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const canAutoRotate = isInView && isPageVisible && !isInteracting && !isPointerActive && !hasFocus && !shouldReduceMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setShouldReduceMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
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
    if (!canAutoRotate) return;
    const timer = window.setTimeout(() => changeSlide(1), 6500);
    return () => window.clearTimeout(timer);
  }, [activeSlide, canAutoRotate, changeSlide]);

  useEffect(() => {
    if (!isPointerActive) return;
    const release = (event: PointerEvent | FocusEvent) => {
      const start = pointer.current;
      if (!start || ("pointerId" in event && event.pointerId !== start.id)) return;
      pointer.current = null;
      suppressClick.current = start.moved;
      setIsPointerActive(false);
      setIsDragging(false);
      const carousel = carouselRef.current;
      if (carousel?.hasPointerCapture(start.id)) carousel.releasePointerCapture(start.id);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [isPointerActive]);

  function finishPointer(event: React.PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    suppressClick.current = start.moved;
    setIsPointerActive(false);
    setIsDragging(false);
    if (!cancelled && start.moved) {
      const distance = start.x - event.clientX;
      if (Math.abs(distance) >= 40 && Math.abs(distance) > Math.abs(start.y - event.clientY) * 1.25) {
        changeSlide(distance > 0 ? 1 : -1);
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      aria-label="Campanhas da Wimifarma"
      aria-roledescription="carrossel"
      aria-live={hasFocus || isPointerActive || shouldReduceMotion ? "polite" : "off"}
      className={campaignStyles.campaign}
      data-dragging={isDragging || undefined}
      data-auto-rotate={canAutoRotate}
      ref={carouselRef}
      tabIndex={0}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setHasFocus(false);
        }
      }}
      onFocusCapture={() => setHasFocus(true)}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        if (event.target !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
        changeSlide(event.key === "ArrowRight" ? 1 : -1);
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        suppressClick.current = false;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        setIsPointerActive(true);
      }}
      onPointerMove={(event) => {
        const start = pointer.current;
        if (!start || start.id !== event.pointerId) return;
        const distance = Math.abs(event.clientX - start.x);
        if (!start.moved && distance > 8 && distance > Math.abs(event.clientY - start.y) * 1.25) {
          start.moved = true;
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (start.moved) event.preventDefault();
      }}
      onPointerUp={(event) => finishPointer(event)}
      onPointerCancel={(event) => finishPointer(event, true)}
      onLostPointerCapture={(event) => {
        if (event.target === event.currentTarget) finishPointer(event, true);
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (!suppressClick.current || event.detail === 0) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}
      role="region"
    >
      <div className={campaignStyles.surface}>
        {heroSlides.map((slide, index) => (
          <div
            aria-hidden={index !== activeSlide}
            aria-label={`${index + 1} de ${heroSlides.length}: ${slide.eyebrow}`}
            aria-roledescription="slide"
            className={campaignStyles.panel}
            data-active={index === activeSlide}
            inert={index !== activeSlide}
            key={slide.art}
            role="group"
            style={{ "--campaign-tint": slide.background } as CSSProperties}
          >
            <div className={campaignStyles.copy}>
              <div>
                <div className={campaignStyles.signature}><BrandSignature /></div>
                <p className={campaignStyles.eyebrow}>{slide.eyebrow}</p>
                <h2 className={campaignStyles.title}>{slide.title}</h2>
                <p className={campaignStyles.description}>{slide.description}</p>
                <div className={campaignStyles.actions}>
                  <a className={campaignStyles.cta} href={slide.href}>
                    {slide.cta}<ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
            <div className={campaignStyles.visual}>
              <HeroProductStage compact priority={index === 0} variant={slide.art} />
            </div>
          </div>
        ))}
      </div>
    </div>
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
                    href={`/produto/${review.productSlug}`}
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
  brands = [],
  collections,
  customerReviews,
  shortcuts,
}: {
  brands?: PublicBrand[];
  collections: HomeCollections;
  customerReviews: HomeReview[];
  shortcuts: HomeShortcutItem[];
}) {
  return (
    <>
      <section className="pharma-clouds bg-white pb-5 pt-36 sm:pt-40 lg:pt-56">
        <h1 className="sr-only">Wimifarma</h1>
        <HomeShortcuts items={shortcuts} />
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <HeroCarousel />
          </div>
        </div>
      </section>

      <BrandCarousel brands={brands} />

      <HomeProductCarousel compactHeader products={collections.care} id="home-care" title="Cuidados para o dia a dia" eyebrow="Beleza" href="/catalogo?grupo=beauty&ordem=preco-asc" />

      <PixDiscountBanner />

      <HomeProductCarousel compactHeader products={collections.otc} id="home-otc" title="Farmacinha" eyebrow="Em casa" href="/catalogo" />

      <ClubBanner />

      <HomeProductCarousel compactHeader products={collections.affordable} id="home-affordable" title="Menores preços" eyebrow="Economia" href="/catalogo?ordem=preco-asc" />

      <CustomerReviews reviews={customerReviews} />

    </>
  );
}
