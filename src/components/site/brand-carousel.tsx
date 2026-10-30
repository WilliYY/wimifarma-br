"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PublicBrand } from "@/features/products/brands";
import { brandLogo, featuredBrandNames } from "@/features/products/brand-logos";
import { normalizeProductSearch } from "@/features/products/public-search";
import styles from "./brand-carousel.module.css";

export function BrandCarousel({ brands }: { brands: PublicBrand[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const dragState = useRef({ moved: false, pointerId: null as number | null, scrollLeft: 0, startX: 0 });
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [looping, setLooping] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const cycleWidth = useRef(0);
  const position = useRef(0);
  const motionOffset = useRef(0);
  const scrollAnchor = useRef(0);
  const manualUntil = useRef(0);
  const touchActive = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBrands = brands.length > 0;
  const orderedBrands = useMemo(() => [...brands].sort((a, b) => {
    const aPosition = featuredBrandNames.indexOf(normalizeProductSearch(a.name));
    const bPosition = featuredBrandNames.indexOf(normalizeProductSearch(b.name));
    return (aPosition < 0 ? featuredBrandNames.length : aPosition) - (bPosition < 0 ? featuredBrandNames.length : bPosition) || a.name.localeCompare(b.name, "pt-BR");
  }), [brands]);

  const settleMotion = useCallback(() => {
    const list = listRef.current;
    const track = trackRef.current;
    if (!list || !track) return;
    // Hand the visual position back to native scrolling only at interaction boundaries.
    if (motionOffset.current) list.scrollLeft += motionOffset.current;
    motionOffset.current = 0;
    track.style.transform = "";
    position.current = scrollAnchor.current = list.scrollLeft;
  }, []);

  const normalizeLoop = useCallback(() => {
    const list = listRef.current;
    const cycle = cycleWidth.current;
    if (!list || !looping || !cycle || touchActive.current || dragState.current.pointerId !== null) return;
    settleMotion();
    if (list.scrollLeft < cycle || list.scrollLeft >= cycle * 2) {
      const offset = ((list.scrollLeft - cycle) % cycle + cycle) % cycle;
      list.scrollLeft = cycle + offset;
    }
    position.current = scrollAnchor.current = list.scrollLeft;
  }, [looping, settleMotion]);

  function settleInteraction() {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(normalizeLoop, 180);
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    function measure() {
      if (!list) return;
      settleMotion();
      const originals = list.querySelectorAll<HTMLElement>('li[data-copy="original"]');
      if (!originals.length) return;
      const first = originals[0];
      const last = originals[originals.length - 1];
      const contentWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft;
      const gap = Number.parseFloat(getComputedStyle(trackRef.current ?? list).columnGap) || 0;
      // Adjacent group starts include the final gap: scrollWidth / 3 does not.
      const duplicate = list.querySelector<HTMLElement>('li[data-copy="before"]');
      const nextCycle = duplicate ? first.offsetLeft - duplicate.offsetLeft : contentWidth + gap;
      const oldCycle = cycleWidth.current;
      cycleWidth.current = nextCycle;
      const canLoop = contentWidth > list.clientWidth + 2;
      setLooping(canLoop);
      if (canLoop && looping) {
        const phase = oldCycle ? ((list.scrollLeft - oldCycle) % oldCycle + oldCycle) % oldCycle : 0;
        list.scrollLeft = nextCycle + Math.min(phase, nextCycle - 1);
        position.current = scrollAnchor.current = list.scrollLeft;
      }
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [orderedBrands, looping, settleMotion]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false));
    observer.observe(list);
    return () => {
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer.disconnect();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [hasBrands]);

  useEffect(() => {
    const list = listRef.current;
    const track = trackRef.current;
    if (!list || !track || !looping || hovered || focused || reducedMotion || !visible || !pageVisible) return;
    let previousTime = 0;
    let frame = 0;
    settleMotion();
    track.dataset.moving = "true";
    function advance(time: number) {
      if (!track) return;
      const delta = previousTime ? Math.min(time - previousTime, 64) : 0;
      previousTime = time;
      if (!touchActive.current && dragState.current.pointerId === null && time >= manualUntil.current) {
        const cycle = cycleWidth.current;
        if (cycle) {
          position.current += delta * 0.024; // 24 CSS pixels per second, independent of refresh rate.
          if (position.current >= cycle * 2) position.current -= cycle;
          motionOffset.current = position.current - scrollAnchor.current;
          track.style.transform = `translate3d(${-motionOffset.current}px, 0, 0)`;
        }
      }
      frame = window.requestAnimationFrame(advance);
    }
    frame = window.requestAnimationFrame(advance);
    return () => {
      window.cancelAnimationFrame(frame);
      delete track.dataset.moving;
      settleMotion();
    };
  }, [looping, hovered, focused, reducedMotion, visible, pageVisible, settleMotion]);

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    if (!looping) return;
    if (touchActive.current || dragState.current.pointerId !== null || performance.now() < manualUntil.current) {
      position.current = scrollAnchor.current = list.scrollLeft;
      manualUntil.current = performance.now() + 1200;
      settleInteraction();
    } else if (!motionOffset.current && Math.abs(list.scrollLeft - position.current) > 1) {
      normalizeLoop();
    }
  }

  function scrollBrands(direction: -1 | 1) {
    const list = listRef.current;
    if (!list) return;
    settleMotion();
    manualUntil.current = performance.now() + 1800;
    list.scrollBy({
      left: direction * list.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    settleMotion();
    dragState.current.moved = false;
    manualUntil.current = performance.now() + 1800;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragState.current = { moved: false, pointerId: event.pointerId, scrollLeft: event.currentTarget.scrollLeft, startX: event.clientX };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
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

  function finishPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current.pointerId !== event.pointerId) return;
    dragState.current.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    manualUntil.current = performance.now() + 1200;
    settleInteraction();
  }

  function preventClickAfterDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current.moved) return;
    if (event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    dragState.current.moved = false;
  }

  function cancelPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current.pointerId !== event.pointerId) return;
    finishPointerDrag(event);
    dragState.current.moved = false;
  }

  if (!brands.length) return null;

  return (
    <section aria-labelledby="home-brands-title" className={styles.section} id="marcas">
        <h2 className={styles.title} id="home-brands-title">Suas marcas favoritas, aqui.</h2>
        <nav
          aria-label="Marcas dos produtos"
          className={styles.navigation}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={event => {
            if (!(event.target as Element).closest('li[aria-hidden="true"]')) setFocused(true);
          }}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
          }}
        >
          <div
            aria-label="Escolha uma marca para ver seus produtos"
            className={styles.viewport}
            data-looping={looping}
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
            onScroll={handleScroll}
            onTouchStart={() => { settleMotion(); touchActive.current = true; manualUntil.current = performance.now() + 1800; }}
            onTouchEnd={() => { touchActive.current = false; manualUntil.current = performance.now() + 1800; settleInteraction(); }}
            onTouchCancel={() => { touchActive.current = false; manualUntil.current = performance.now() + 1800; settleInteraction(); }}
            onWheel={() => { settleMotion(); manualUntil.current = performance.now() + 1800; }}
            ref={listRef}
            tabIndex={0}
          >
            <ul className={styles.list} ref={trackRef}>
            {(looping ? ["before", "original", "after"] : ["original"]).flatMap(copy => orderedBrands.map((brand) => {
              const registeredLogo = brandLogo(brand.name);
              const logo = registeredLogo && !failedImages.has(registeredLogo.src) ? registeredLogo : null;
              const imageSrc = logo?.src;
              return (
                <li aria-hidden={copy !== "original" ? true : undefined} data-copy={copy} key={`${copy}-${brand.key}`}>
                  <Link
                    aria-label={`Ver produtos de ${brand.name}`}
                    className={styles.brand}
                    data-dark={logo?.dark || undefined}
                    href={brand.href}
                    draggable={false}
                    prefetch={false}
                    tabIndex={copy !== "original" ? -1 : undefined}
                    onMouseDown={copy !== "original" ? event => event.preventDefault() : undefined}
                    onFocus={copy !== "original" ? event => event.currentTarget.blur() : undefined}
                  >
                    {imageSrc ? (
                      <Image
                        alt=""
                        className={styles.logo}
                        height={120}
                        draggable={false}
                        onError={() => setFailedImages(current => new Set(current).add(imageSrc))}
                        sizes="(min-width: 640px) 112px, 80px"
                        src={imageSrc}
                        width={320}
                      />
                    ) : <span className={styles.name}>{brand.name}</span>}
                  </Link>
                </li>
              );
            }))}
            </ul>
          </div>
        </nav>
    </section>
  );
}
