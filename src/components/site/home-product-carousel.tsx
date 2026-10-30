"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import {
  PublicProductCard,
  type RelatedProductCardItem,
} from "@/components/site/public-product-card";
import Link from "next/link";

export function HomeProductCarousel({
  products, id, title, eyebrow, href, compactHeader = false,
}: {
  products: RelatedProductCardItem[];
  id: string; title: string; eyebrow: string; href: string;
  compactHeader?: boolean;
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      left: direction * visibleCards * cardStep,
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    dragState.current.moved = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
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
    if (event.buttons !== 1) {
      finishPointerDrag(event);
      return;
    }

    const movement = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(movement) <= 6) return;
      drag.moved = true;
      // Capture only after dragging starts so ordinary product clicks still work.
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
    if (event.detail === 0) {
      dragState.current.moved = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragState.current.moved = false;
  }

  if (!products.length) return null;

  return (
    <section className={`bg-[#f6f8fb] px-4 sm:px-6 lg:px-8 ${compactHeader ? "py-8 sm:py-12" : "py-12"}`}>
      <div className="mx-auto max-w-7xl">
        <div className={compactHeader ? "mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1" : "mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"}>
          <div className={compactHeader ? "contents" : "min-w-0"}>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-brand">
              <Pill aria-hidden="true" className="h-4 w-4" />
              {eyebrow}
            </span>
            <h2 className={`${compactHeader ? "col-span-2 row-start-2" : "mt-2"} text-2xl font-black leading-tight text-ink sm:text-3xl`}>
              {title}
            </h2>
            {!compactHeader && <p className="mt-2 max-w-[calc(100%-5rem)] text-sm leading-6 text-muted sm:max-w-2xl">
              {products.length} {products.length === 1 ? "produto selecionado" : "produtos selecionados"} · <Link className="font-bold text-brand underline underline-offset-4" href={href}>Ver catálogo</Link>
            </p>}
          </div>

          {compactHeader && <Link className="col-start-2 row-start-1 -mr-2 inline-flex min-h-11 items-center justify-end whitespace-nowrap rounded-md px-2 text-sm font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={href}>Ver catálogo</Link>}
          {!compactHeader && <div className="flex shrink-0 items-center gap-2 sm:self-auto">
            <button
              aria-controls={id}
              aria-label={`Ver produtos anteriores: ${title}`}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!controls.previous}
              onClick={() => scrollProducts(-1)}
              title="Produtos anteriores"
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              aria-controls={id}
              aria-label={`Ver próximos produtos: ${title}`}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!controls.next}
              onClick={() => scrollProducts(1)}
              title="Próximos produtos"
              type="button"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>}
        </div>

        <div
          aria-label={title}
          aria-roledescription="carrossel"
          className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-safe:scroll-smooth data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none data-[dragging=true]:[&_a]:cursor-grabbing"
          id={id}
          onClickCapture={preventClickAfterDrag}
          onDragStart={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              scrollProducts(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
          onLostPointerCapture={finishPointerDrag}
          onPointerCancel={cancelPointerDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onScroll={updateControls}
          ref={carouselRef}
          role="region"
          tabIndex={0}
        >
          {products.map((product, index) => (
            <div
              aria-label={`Produto ${index + 1} de ${products.length}`}
              aria-roledescription="slide"
              className="min-w-0 shrink-0 basis-[86%] snap-start sm:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_4rem)/5)]"
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
