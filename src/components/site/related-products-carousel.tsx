"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PublicProductCard,
  type RelatedProductCardItem,
} from "@/components/site/public-product-card";

export function RelatedProductsCarousel({
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
  }, [products.length, updateControls]);

  function scrollProducts(direction: -1 | 1) {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>(
      "[data-related-product-card]",
    );
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

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    dragState.current.moved = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragState.current.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, select, textarea, label")
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
    if (!drag.moved) {
      if (Math.abs(movement) <= 6) return;
      drag.moved = true;
      event.currentTarget.dataset.dragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
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
    if (dragState.current.pointerId !== event.pointerId) return;
    finishPointerDrag(event);
    dragState.current.moved = false;
  }

  function preventClickAfterDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current.moved) return;
    if (event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    dragState.current.moved = false;
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex justify-end gap-2">
        <button
          aria-controls="related-products-carousel"
          aria-label="Ver produtos anteriores"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!controls.previous}
          onClick={() => scrollProducts(-1)}
          title="Produtos anteriores"
          type="button"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          aria-controls="related-products-carousel"
          aria-label="Ver proximos produtos"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!controls.next}
          onClick={() => scrollProducts(1)}
          title="Proximos produtos"
          type="button"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        aria-label="Produtos correlatos"
        aria-roledescription="carrossel"
        className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:scroll-auto data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none data-[dragging=true]:[&_a]:cursor-grabbing"
        id="related-products-carousel"
        onClickCapture={preventClickAfterDrag}
        onDragStart={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            scrollProducts(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        onLostPointerCapture={finishPointerDrag}
        onPointerCancel={cancelPointerDrag}
        onPointerDown={handlePointerDown}
        onPointerLeave={event => { if (!dragState.current.moved) cancelPointerDrag(event); }}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onScroll={updateControls}
        ref={carouselRef}
        role="region"
        tabIndex={0}
      >
        {products.map((product, index) => (
          <div
            aria-label={`Produto correlato ${index + 1} de ${products.length}`}
            aria-roledescription="slide"
            className="min-w-0 shrink-0 basis-[calc((100%_-_1rem)/2)] snap-start lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_4rem)/5)]"
            data-related-product-card
            key={product.id}
            role="group"
          >
            <PublicProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
