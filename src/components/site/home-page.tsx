"use client";


import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
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
import { CustomerReviews } from "./customer-reviews";

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
    title: "Seu cuidado, todo dia. 🌸",
  },
  {
    background: "#fff7f5",
    cta: "Ver perfumaria",
    description: "Perfumaria e cuidados pessoais.",
    eyebrow: "Perfumaria e autocuidado",
    href: "/catalogo?grupo=beauty",
    art: "beauty",
    title: "Beleza no seu momento. ✨",
  },
  {
    background: "#f2f7f3",
    cta: "Ver infantil",
    description: "Fraldas e higiene para os pequenos.",
    eyebrow: "Mãe e bebê",
    href: "/catalogo?grupo=baby",
    art: "baby",
    title: "Carinho em cada cuidado. 👶",
  },
] as const;


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

      <HomeProductCarousel compactHeader products={collections.care} id="home-care" title="Cuidados para o dia a dia 🌸" eyebrow="Beleza" href="/catalogo?grupo=beauty&ordem=preco-asc" />

      <PixDiscountBanner />

      <HomeProductCarousel compactHeader products={collections.otc} id="home-otc" title="Farmacinha" eyebrow="Em casa" href="/catalogo" />

      <ClubBanner />

      <HomeProductCarousel compactHeader products={collections.affordable} id="home-affordable" title="Menores preços 💛" eyebrow="Economia" href="/catalogo?ordem=preco-asc" />

      <CustomerReviews reviews={customerReviews} />

    </>
  );
}
