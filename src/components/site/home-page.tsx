"use client";


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
  Star,
} from "lucide-react";
import { HomeProductCarousel } from "@/components/site/home-product-carousel";
import { HeroProductStage } from "@/components/site/hero-product-stage";
import { ClubBanner } from "@/components/site/club-banner";
import { HomeShortcuts } from "@/components/site/home-shortcuts";
import { BrandCarousel } from "@/components/site/brand-carousel";
import type { PublicBrand } from "@/features/products/brands";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import campaignStyles from "./home-campaign.module.css";
import { BrandSignature } from "@/components/site/brand-signature";
import type { HomeCollections } from "@/features/products/home-collections";
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
            <h2 className={campaignStyles.title}>{slide.title}</h2>
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
      <section className="pharma-clouds bg-white px-4 pb-8 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pt-56">
        <div className="mx-auto max-w-7xl">
          <h1 className="sr-only">Wimifarma</h1>
          <HomeShortcuts items={shortcuts} />
          <HeroCarousel />
        </div>
      </section>

      <BrandCarousel brands={brands} />

      <ClubBanner />

      <HomeProductCarousel products={collections.care} id="home-care" title="Cuidados para o seu dia a dia" eyebrow="Beleza, higiene e bem-estar" href="/catalogo?grupo=beauty&ordem=preco-asc" />
      <HomeProductCarousel products={collections.otc} id="home-otc" title="Medicamentos isentos de prescrição" eyebrow="MIP / OTC" href="/catalogo?grupo=medicines&ordem=preco-asc" />
      <HomeProductCarousel products={collections.affordable} id="home-affordable" title="Menores preços para aproveitar" eyebrow="Economia no seu cuidado" href="/catalogo?ordem=preco-asc" />

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
