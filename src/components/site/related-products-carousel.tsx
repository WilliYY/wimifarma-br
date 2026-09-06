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
  }, [updateControls]);

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
        className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none"
        id="related-products-carousel"
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
            aria-label={`Produto correlato ${index + 1} de ${products.length}`}
            aria-roledescription="slide"
            className="min-w-0 shrink-0 basis-[84%] snap-start sm:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_4rem)/5)]"
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
