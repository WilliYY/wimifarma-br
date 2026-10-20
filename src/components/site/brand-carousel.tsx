"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicBrand } from "@/features/products/brands";
import { brandLogo, featuredBrandNames } from "@/features/products/brand-logos";
import { normalizeProductSearch } from "@/features/products/public-search";

export function BrandCarousel({ brands }: { brands: PublicBrand[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const dragState = useRef({ moved: false, pointerId: null as number | null, scrollLeft: 0, startX: 0 });
  const [controls, setControls] = useState({ previous: false, next: false });
  const [failedLogos, setFailedLogos] = useState<Set<string>>(() => new Set());
  const orderedBrands = [...brands].sort((a, b) => {
    const aPosition = featuredBrandNames.indexOf(normalizeProductSearch(a.name));
    const bPosition = featuredBrandNames.indexOf(normalizeProductSearch(b.name));
    return (aPosition < 0 ? featuredBrandNames.length : aPosition) - (bPosition < 0 ? featuredBrandNames.length : bPosition) || a.name.localeCompare(b.name, "pt-BR");
  });

  const updateControls = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const maximum = Math.max(0, list.scrollWidth - list.clientWidth);
    setControls({ previous: list.scrollLeft > 2, next: list.scrollLeft < maximum - 2 });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const frame = window.requestAnimationFrame(updateControls);
    const observer = new ResizeObserver(updateControls);
    observer.observe(list);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [brands, updateControls]);

  function scrollBrands(direction: -1 | 1) {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLUListElement>) {
    if (!event.isPrimary) return;
    dragState.current.moved = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragState.current = { moved: false, pointerId: event.pointerId, scrollLeft: event.currentTarget.scrollLeft, startX: event.clientX };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLUListElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) return;
    if (event.buttons !== 1) { finishPointerDrag(event); return; }
    const movement = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(movement) <= 6) return;
      drag.moved = true;
      // Capture after the gesture starts so a normal click still follows the brand link.
      event.currentTarget.dataset.dragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - movement;
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLUListElement>) {
    if (dragState.current.pointerId !== event.pointerId) return;
    dragState.current.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function preventClickAfterDrag(event: React.MouseEvent<HTMLUListElement>) {
    if (!dragState.current.moved) return;
    if (event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    dragState.current.moved = false;
  }

  function cancelPointerDrag(event: React.PointerEvent<HTMLUListElement>) {
    if (dragState.current.pointerId !== event.pointerId) return;
    finishPointerDrag(event);
    dragState.current.moved = false;
  }

  if (!brands.length) return null;

  return (
    <section aria-labelledby="home-brands-title" className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8" id="marcas">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Explore por marca</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl" id="home-brands-title">Suas marcas favoritas, aqui.</h2>
          <p className="mt-2 text-sm text-muted">Perfumaria, medicamentos e mais para a sua rotina.</p>
        </div>
        <nav aria-label="Marcas dos produtos" className="relative px-10 sm:px-12">
          <button
            aria-controls="home-brands-list"
            aria-label="Ver marcas anteriores"
            className="absolute -left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-surface-subtle text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none sm:left-0"
            disabled={!controls.previous}
            onClick={() => scrollBrands(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <ul
            aria-label="Escolha uma marca para ver seus produtos"
            className="flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain py-1 select-none scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:scroll-auto data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:scroll-auto sm:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden data-[dragging=true]:[&_a]:cursor-grabbing"
            id="home-brands-list"
            onClickCapture={preventClickAfterDrag}
            onDragStart={event => event.preventDefault()}
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); scrollBrands(event.key === "ArrowLeft" ? -1 : 1); }
            }}
            onLostPointerCapture={finishPointerDrag}
            onPointerCancel={cancelPointerDrag}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            onScroll={updateControls}
            ref={listRef}
            tabIndex={0}
          >
            {orderedBrands.map((brand) => {
              const logo = failedLogos.has(brand.key) ? null : brandLogo(brand.name);
              return (
                <li className="shrink-0 snap-start" key={brand.key}>
                  <Link
                    aria-label={`Ver produtos de ${brand.name}`}
                    className={`group flex h-28 w-28 items-center justify-center rounded-2xl border border-transparent p-4 text-center transition-colors hover:border-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand motion-reduce:transition-none sm:h-40 sm:w-40 sm:p-6 ${logo?.dark ? "bg-ink text-white" : "bg-surface-subtle text-ink hover:bg-brand-soft"}`}
                    href={brand.href}
                    draggable={false}
                    prefetch={false}
                  >
                    {logo ? (
                      <Image
                        alt=""
                        className="h-16 w-full object-contain sm:h-24"
                        height={120}
                        draggable={false}
                        onError={() => setFailedLogos(current => new Set(current).add(brand.key))}
                        sizes="(min-width: 640px) 112px, 80px"
                        src={logo.src}
                        width={320}
                      />
                    ) : <span className="text-lg font-bold leading-tight [overflow-wrap:anywhere] sm:text-xl">{brand.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            aria-controls="home-brands-list"
            aria-label="Ver próximas marcas"
            className="absolute -right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-surface-subtle text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none sm:right-0"
            disabled={!controls.next}
            onClick={() => scrollBrands(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </section>
  );
}
