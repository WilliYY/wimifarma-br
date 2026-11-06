"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrandSignature } from "./brand-signature";
import { PublicProductCard, type RelatedProductCardItem } from "./public-product-card";
import styles from "./home-medicine-rails.module.css";

export function HomeMedicineRails({ products }: { products: RelatedProductCardItem[] }) {
  const [paused, setPaused] = useState(false);
  const unique = useMemo(() => [...new Map(products.map(product => [product.id, product])).values()].slice(0, 40), [products]);
  if (!unique.length) return null;
  return <section aria-labelledby="home-medicines-title" aria-describedby="home-medicines-motion-help" className={styles.section}
    onKeyDown={event => { if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) { event.preventDefault(); setPaused(value => !value); } }}>
    <p className="sr-only" id="home-medicines-motion-help">O movimento pausa com o ponteiro ou foco na fileira. Pressione Escape para pausar ou retomar todas as fileiras.</p>
    <div className={styles.heading}>
      <h2 id="home-medicines-title"><span>Sua farmácia</span><BrandSignature className={styles.brand} /><span>tem tudo</span></h2>
    </div>
    <MedicineRail products={unique.slice(0, 20)} direction={-1} paused={paused} label="Medicamentos sem receita, primeira fileira" />
    {unique.length > 20 ? <MedicineRail products={unique.slice(20)} direction={1} paused={paused} label="Medicamentos sem receita, segunda fileira" /> : null}
  </section>;
}

function MedicineRail({ products, direction, paused, label }: { products: RelatedProductCardItem[]; direction: -1 | 1; paused: boolean; label: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [looping, setLooping] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const cycleWidth = useRef(0);
  const motionOffset = useRef(0);
  const position = useRef(0);
  const anchor = useRef(0);
  const manualUntil = useRef(0);
  const touchActive = useRef(false);
  const drag = useRef({ moved: false, pointerId: null as number | null, startX: 0, scrollLeft: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    if (motionOffset.current) viewport.scrollLeft += motionOffset.current;
    motionOffset.current = 0;
    track.style.transform = "";
    position.current = anchor.current = viewport.scrollLeft;
  }, []);

  const normalize = useCallback(() => {
    const viewport = viewportRef.current;
    const cycle = cycleWidth.current;
    if (!viewport || !looping || !cycle || touchActive.current || drag.current.pointerId !== null) return;
    settle();
    if (viewport.scrollLeft < cycle || viewport.scrollLeft >= cycle * 2) viewport.scrollLeft = cycle + ((viewport.scrollLeft - cycle) % cycle + cycle) % cycle;
    position.current = anchor.current = viewport.scrollLeft;
  }, [looping, settle]);

  function finishInteraction() {
    manualUntil.current = performance.now() + 1500;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(normalize, 180);
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => {
      settle();
      const originals = track.querySelectorAll<HTMLElement>('li[data-copy="original"]');
      const first = originals[0];
      const last = originals[originals.length - 1];
      if (!first || !last) return;
      const width = last.offsetLeft + last.offsetWidth - first.offsetLeft;
      const before = track.querySelector<HTMLElement>('li[data-copy="before"]');
      const previous = cycleWidth.current;
      cycleWidth.current = before ? first.offsetLeft - before.offsetLeft : width + (parseFloat(getComputedStyle(track).columnGap) || 0);
      const canLoop = width > viewport.clientWidth + 2;
      setLooping(canLoop);
      if (canLoop && looping) {
        const phase = previous ? ((viewport.scrollLeft - previous) % previous + previous) % previous : 0;
        viewport.scrollLeft = cycleWidth.current + Math.min(phase, cycleWidth.current - 1);
        position.current = anchor.current = viewport.scrollLeft;
      }
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    resize.observe(track);
    // Copies retain pointer actions but only the original cards enter the tab order.
    const hideCopyTabStops = () => track.querySelectorAll<HTMLElement>('li[aria-hidden="true"] a, li[aria-hidden="true"] button, li[aria-hidden="true"] input').forEach(element => { element.tabIndex = -1; });
    hideCopyTabStops();
    const mutations = new MutationObserver(hideCopyTabStops);
    mutations.observe(track, { childList: true, subtree: true });
    return () => { resize.disconnect(); mutations.disconnect(); };
  }, [products, looping, settle]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion(); updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const intersection = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false));
    intersection.observe(viewport);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      intersection.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping || paused || hovered || focused || reducedMotion || !visible || !pageVisible) return;
    let previous = 0;
    let frame = 0;
    settle();
    track.dataset.moving = "true";
    const advance = (time: number) => {
      const delta = previous ? Math.min(time - previous, 64) : 0;
      previous = time;
      if (!touchActive.current && drag.current.pointerId === null && time >= manualUntil.current) {
        const cycle = cycleWidth.current;
        if (cycle) {
          position.current += direction * delta * 0.011;
          if (position.current >= cycle * 2) position.current -= cycle;
          if (position.current < cycle) position.current += cycle;
          motionOffset.current = position.current - anchor.current;
          track.style.transform = `translate3d(${-motionOffset.current}px, 0, 0)`;
        }
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => { cancelAnimationFrame(frame); delete track.dataset.moving; settle(); };
  }, [looping, paused, hovered, focused, reducedMotion, visible, pageVisible, direction, settle]);

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current.pointerId !== event.pointerId) return;
    drag.current.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    finishInteraction();
  }

  return <div className={styles.frame}>
    <div aria-label={label} className={styles.viewport} data-medicine-rail data-looping={looping} ref={viewportRef} tabIndex={0}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={event => {
        const target = event.target as HTMLElement;
        const copy = target.closest<HTMLElement>('li[aria-hidden="true"]');
        if (copy) {
          // Dialogs opened from a visual copy return focus to the same original action.
          const original = Array.from(trackRef.current?.querySelectorAll<HTMLElement>('li[data-copy="original"]') ?? []).find(row => row.dataset.productId === copy.dataset.productId);
          const index = Array.from(copy.querySelectorAll("a,button,input")).indexOf(target);
          const originalControl = original?.querySelectorAll<HTMLElement>("a,button,input")[index];
          if (original && originalControl) {
            settle();
            // Exchange identical copies at the same visual position before moving focus.
            event.currentTarget.scrollLeft += original.offsetLeft - copy.offsetLeft;
            position.current = anchor.current = event.currentTarget.scrollLeft;
            originalControl.focus({ preventScroll: true });
          }
          return;
        }
        setFocused(true);
      }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onDragStart={event => event.preventDefault()}
      onClickCapture={event => { if (drag.current.moved) { if (event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } drag.current.moved = false; } }}
      onPointerDown={event => {
        if (!event.isPrimary) return;
        if ((event.target as Element).closest("input,textarea,select")) { drag.current.moved = false; return; }
        settle(); drag.current.moved = false; manualUntil.current = performance.now() + 1500;
        if (event.pointerType === "mouse" && event.button === 0) drag.current = { moved: false, pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
      }}
      onPointerMove={event => {
        if (drag.current.pointerId !== event.pointerId) return;
        if (event.buttons !== 1) { finishDrag(event); return; }
        const distance = event.clientX - drag.current.startX;
        if (!drag.current.moved) {
          if (Math.abs(distance) <= 6) return;
          drag.current.moved = true; event.currentTarget.dataset.dragging = "true"; event.currentTarget.setPointerCapture(event.pointerId);
        }
        event.preventDefault(); event.currentTarget.scrollLeft = drag.current.scrollLeft - distance;
      }}
      onPointerUp={finishDrag} onLostPointerCapture={finishDrag}
      onPointerCancel={event => { finishDrag(event); drag.current.moved = false; }}
      onTouchStart={() => { settle(); touchActive.current = true; manualUntil.current = performance.now() + 1500; }}
      onTouchEnd={() => { touchActive.current = false; finishInteraction(); }}
      onTouchCancel={() => { touchActive.current = false; finishInteraction(); }}
      onWheel={() => { settle(); finishInteraction(); }}
      onScroll={() => {
        if (touchActive.current || drag.current.pointerId !== null || performance.now() < manualUntil.current) { position.current = anchor.current = viewportRef.current?.scrollLeft ?? 0; finishInteraction(); }
        else if (!motionOffset.current) normalize();
      }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); settle(); finishInteraction();
        const viewport = event.currentTarget;
        if (event.key === "Home" || event.key === "End") viewport.scrollLeft = cycleWidth.current * (looping ? 1 : 0) + (event.key === "End" ? cycleWidth.current - viewport.clientWidth : 0);
        else viewport.scrollBy({ left: (event.key === "ArrowLeft" ? -1 : 1) * viewport.clientWidth * 0.8, behavior: reducedMotion ? "auto" : "smooth" });
      }}>
      <ul className={styles.track} data-medicine-track ref={trackRef}>
        {(looping ? ["before", "original", "after"] : ["original"]).flatMap(copy => products.map(product => <li aria-hidden={copy !== "original" ? true : undefined} data-copy={copy} data-product-id={product.id} key={`${copy}-${product.id}`}
          onMouseDown={copy !== "original" ? event => { if (!(event.target as Element).closest("input,textarea,select")) event.preventDefault(); } : undefined}>
          <PublicProductCard product={product} showShippingEstimate variant="medicine-rail" />
        </li>))}
      </ul>
    </div>
  </div>;
}
