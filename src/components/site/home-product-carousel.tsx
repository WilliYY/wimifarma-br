"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Pill } from "lucide-react";
import {
  PublicProductCard,
  type RelatedProductCardItem,
} from "@/components/site/public-product-card";
import { SHOWCASE_SLOT_COUNT } from "@/features/offers/showcase";
import { siteConfig } from "@/lib/site";

function ProductConsultationCard() {
  return (
    <article className="flex h-full min-h-[22rem] flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
      <div className="flex h-40 items-center justify-center bg-white p-3">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
          <Pill aria-hidden="true" className="h-12 w-12 text-brand" />
        </span>
      </div>
      <div className="flex flex-1 flex-col border-t border-line px-4 pb-4 pt-3">
        <span className="text-[0.68rem] font-black uppercase text-brand">Atendimento</span>
        <h3 className="mt-1 min-h-10 text-sm font-bold leading-5 text-ink">Consulte outros medicamentos</h3>
        <p className="mt-2 text-xs leading-5 text-muted">Disponibilidade e valores com a equipe.</p>
        <strong className="mt-3 text-xs uppercase text-ink">Wimifarma</strong>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <span className="text-xl font-black leading-none text-brand">Consulte</span>
          <a
            aria-label="Consultar medicamentos no WhatsApp"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
            title="Consultar medicamentos no WhatsApp"
          >
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function HomeProductCarousel({
  products,
}: {
  products: RelatedProductCardItem[];
}) {
  const slots = Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) => products[index] ?? null);
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
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
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
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
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
          className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-safe:scroll-smooth data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none data-[dragging=true]:[&_a]:cursor-grabbing"
          id="home-products-carousel"
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
          {slots.map((product, index) => (
            <div
              aria-label={`${product ? "Medicamento" : "Consulta"} ${index + 1} de ${slots.length}`}
              aria-roledescription="slide"
              className="min-w-0 shrink-0 basis-[86%] snap-start sm:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_4rem)/5)]"
              data-home-product-card
              key={product?.id ?? `consultation-${index}`}
              role="group"
            >
              {product ? <PublicProductCard product={product} /> : <ProductConsultationCard />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
