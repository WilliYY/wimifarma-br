"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import {
  PublicProductCard,
  type RelatedProductCardItem,
} from "@/components/site/public-product-card";

export function HomeProductCarousel({
  products,
}: {
  products: RelatedProductCardItem[];
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    moved: false,
    pointerId: null as number | null,
    scrollLeft: 0,
    startX: 0,
  });
  const [controls, setControls] = useState({ next: false, previous: false });

  const updateControls = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const maximumScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    setControls({
      next: carousel.scrollLeft < maximumScroll - 2,
      previous: carousel.scrollLeft > 2,
    });
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const animationFrame = window.requestAnimationFrame(updateControls);
    const resizeObserver = new ResizeObserver(updateControls);
    resizeObserver.observe(carousel);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [updateControls]);

  function scrollProducts(direction: -1 | 1) {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>("[data-home-product-card]");
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

  if (products.length === 0) return null;

  return (
    <section className="bg-[#f6f8fb] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-brand">
              <Pill aria-hidden="true" className="h-4 w-4" />
              Catalogo publicado
            </span>
            <h2 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl">
              Medicamentos da Wimifarma
            </h2>
            <p className="mt-2 max-w-[calc(100%-5rem)] text-sm leading-6 text-muted sm:max-w-2xl">
              Consulte detalhes, disponibilidade e as condicoes de cada produto.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:self-auto">
            <button
              aria-controls="home-products-carousel"
              aria-label="Ver medicamentos anteriores"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!controls.previous}
              onClick={() => scrollProducts(-1)}
              title="Medicamentos anteriores"
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              aria-controls="home-products-carousel"
              aria-label="Ver proximos medicamentos"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!controls.next}
              onClick={() => scrollProducts(1)}
              title="Proximos medicamentos"
              type="button"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          aria-label="Medicamentos da Wimifarma"
          aria-roledescription="carrossel"
          className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none"
          id="home-products-carousel"
          onClickCapture={preventClickAfterDrag}
          onPointerCancel={cancelPointerDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onScroll={updateControls}
          ref={carouselRef}
          role="region"
        >
          {products.map((product, index) => (
            <div
              aria-label={`Medicamento ${index + 1} de ${products.length}`}
              aria-roledescription="slide"
              className="min-w-0 shrink-0 basis-[82%] snap-start sm:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_4rem)/5)]"
              data-home-product-card
              key={product.id}
              role="group"
            >
              <PublicProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
