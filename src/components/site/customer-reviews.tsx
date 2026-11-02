"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, MessageCircle, Quote, ShieldCheck, Star } from "lucide-react";
import type { HomeReview } from "./home-page";
import { whatsappTestimonials, type WhatsAppTestimonial } from "@/features/reviews/whatsapp-testimonials";
import styles from "./customer-reviews.module.css";

function reviewInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "C"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toLocaleUpperCase("pt-BR");
}


export function CustomerReviews({ reviews }: { reviews: HomeReview[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const dragState = useRef({ moved: false, pointerId: null as number | null, scrollLeft: 0, startX: 0 });
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
  const displayedReviews = useMemo<((HomeReview & { source: "purchase" }) | WhatsAppTestimonial)[]>(() => [
    ...reviews.map(review => ({ ...review, source: "purchase" as const })),
    ...whatsappTestimonials,
  ], [reviews]);
  const hasReviews = displayedReviews.length > 0;

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
  }, [displayedReviews, looping, settleMotion]);

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
  }, [hasReviews]);

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

  function scrollReviews(direction: -1 | 1) {
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
      // Capture after the gesture starts so a normal click still follows the product link.
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

  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}><MessageCircle aria-hidden="true" />Experiências compartilhadas por clientes</span>
          <h2 className={styles.title} id="customer-reviews-title">Avaliações de clientes</h2>
          <p className={styles.subtitle}>Sua experiência ajuda outras pessoas a escolher com mais confiança.</p>
        </header>
        {hasReviews ? (
          <div
            aria-label="Avaliações de clientes"
            aria-roledescription="carrossel"
            className={styles.viewport}
            data-looping={looping}
            data-motion="continuous"
            id="customer-reviews-carousel"
            role="region"
            tabIndex={0}
            ref={listRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={event => {
              if (!(event.target as Element).closest('li[aria-hidden="true"]')) setFocused(true);
            }}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
            }}
            onClickCapture={preventClickAfterDrag}
            onDragStart={event => event.preventDefault()}
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); scrollReviews(event.key === "ArrowLeft" ? -1 : 1); }
            }}
            onLostPointerCapture={finishPointerDrag}
            onPointerCancel={cancelPointerDrag}
            onPointerDown={handlePointerDown}
            onPointerLeave={event => {
              // Before horizontal capture, pointerup may land outside the carousel.
              if (!dragState.current.moved) finishPointerDrag(event);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            onScroll={handleScroll}
            onTouchStart={() => { settleMotion(); touchActive.current = true; manualUntil.current = performance.now() + 1800; }}
            onTouchEnd={() => { touchActive.current = false; manualUntil.current = performance.now() + 1800; settleInteraction(); }}
            onTouchCancel={() => { touchActive.current = false; manualUntil.current = performance.now() + 1800; settleInteraction(); }}
            onWheel={() => { settleMotion(); manualUntil.current = performance.now() + 1800; }}
          >
            <ul className={styles.list} ref={trackRef}>
              {(looping ? ["before", "original", "after"] : ["original"]).flatMap(copy => displayedReviews.map((review, index) => (
                <li aria-hidden={copy !== "original" ? true : undefined} data-copy={copy} key={`${copy}-${review.id}`}>
                  <article aria-label={`Avaliação ${index + 1} de ${displayedReviews.length}`} aria-roledescription="slide" className={styles.card} data-review-card role="group">
                    <div className={styles.identity}>
                      <span aria-hidden="true" className={styles.avatar} data-review-avatar>{reviewInitials(review.reviewerName)}</span>
                      <div className={styles.person}>
                        <strong>{review.reviewerName}</strong>
                        {review.source === "purchase" ? <span className={styles.verified}><ShieldCheck aria-hidden="true" />Compra verificada</span> : null}
                      </div>
                      <Quote aria-hidden="true" className={styles.quote} />
                    </div>
                    <span aria-label={`${review.rating.toFixed(1).replace(".", ",")} de 5 estrelas`} className={styles.stars}>
                      {[1, 2, 3, 4, 5].map(value => <Star aria-hidden="true" data-filled={value <= Math.round(review.rating)} key={value} />)}
                    </span>
                    <blockquote className={styles.comment}>&ldquo;{review.comment}&rdquo;</blockquote>
                    {review.source === "purchase" ? <div className={styles.product}>
                      <span>Sobre o produto</span>
                      <Link
                        href={`/produto/${review.productSlug}`}
                        draggable={false}
                        prefetch={false}
                        tabIndex={copy !== "original" ? -1 : undefined}
                        onMouseDown={copy !== "original" ? event => event.preventDefault() : undefined}
                        onFocus={copy !== "original" ? event => event.currentTarget.blur() : undefined}
                      ><span>{review.productName}</span><ChevronRight aria-hidden="true" /></Link>
                    </div> : <p className={styles.service}>Sobre o atendimento da Wimifarma.</p>}
                    {review.source === "purchase" && review.incentivized ? <p className={styles.incentive}>Avaliação com incentivo de cashback, independente da nota.</p> : null}
                  </article>
                </li>
              )))}
            </ul>
          </div>
        ) : <div className={styles.empty}>
          <Quote aria-hidden="true" />
          <div><h3>Sua experiência tem espaço aqui.</h3><p>Ainda não há avaliações verificadas publicadas. Depois de receber sua compra, conte como foi usar o produto.</p></div>
        </div>}
        <Link className={styles.cta} href="/minha-conta/avaliacoes">Avaliar minhas compras<ChevronRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
