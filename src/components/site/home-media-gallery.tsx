"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { homeMediaItems, type HomeMediaItem } from "@/features/home-media/items";
import styles from "./home-media-gallery.module.css";

function MotionPreview({ item, active, eligible, priority }: { item: HomeMediaItem; active: boolean; eligible: boolean; priority: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!eligible || (element.hasAttribute("src") && element.getAttribute("src") !== item.src)) {
      element.pause();
      if (element.hasAttribute("src")) { element.removeAttribute("src"); element.load(); }
      setReady(false);
      setPlaying(false);
    }
    if (active && eligible) {
      if (!element.hasAttribute("src")) element.src = item.src;
      void element.play().catch(() => { /* The poster remains available when playback is unavailable. */ });
    } else element.pause();
    return () => element.pause();
  }, [active, eligible, item.src]);
  return <>
    <Image alt={item.title} className={styles.poster} fill priority={priority} sizes="(max-width: 639px) 156px, (max-width: 1023px) 180px, 200px" src={item.poster} />
    {item.kind === "video" ? <video
      aria-hidden="true" className={styles.preview} data-playing={active && playing} data-ready={eligible && ready}
      loop muted onPause={() => setPlaying(false)} onPlaying={() => { setPlaying(true); setReady(true); }}
      playsInline preload="none" ref={video} tabIndex={-1}
    /> : active ? <Image alt="" aria-hidden="true" className={styles.preview} fill sizes="200px" src={item.src} unoptimized /> : null}
  </>;
}

export function HomeMediaGallery({ items = homeMediaItems }: { items?: HomeMediaItem[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pointerFocus = useRef(false);
  const frames = useRef(new Map<string, HTMLDivElement>());
  const gesture = useRef({ id: -1, x: 0, y: 0, left: 0, moved: false });
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useLayoutEffect(() => {
    const element = rail.current;
    const content = track.current;
    if (!element || !content || !items.length) return;
    const cards = [...content.querySelectorAll<HTMLElement>("[data-media-card]")];
    let cycle = 0;
    let stride = 0;
    let cardWidth = 0;
    let circular = false;
    const position = () => {
      if (!circular) return;
      const before = element.scrollLeft;
      const normalized = before < cycle / 2 ? before + cycle : before > cycle * 2 - element.clientWidth / 2 ? before - cycle : before;
      const shift = normalized - before;
      if (Math.abs(shift) > .5) {
        element.scrollLeft = normalized;
        gesture.current.left += shift;
      }
      const center = element.scrollLeft + element.clientWidth / 2;
      cards.forEach((card, index) => {
        const base = cycle + index * stride;
        const turn = Math.round((center - base - cardWidth / 2) / cycle);
        card.style.transform = `translateX(${base + turn * cycle}px)`;
      });
    };
    const measure = () => {
      const available = element.parentElement!.clientWidth;
      const gap = parseFloat(getComputedStyle(content).columnGap);
      cardWidth = cards[0].offsetWidth;
      stride = cardWidth + gap;
      cycle = stride * cards.length;
      circular = cycle - gap > available && cards.length > 1;
      content.dataset.ready = "true";
      // Keep one complete offscreen card available for recycling without clones.
      element.style.maxWidth = circular ? `${cycle - stride}px` : "";
      content.style.width = `${circular ? cycle * 3 : cycle - gap}px`;
      element.scrollLeft = circular ? cycle : 0;
      cards.forEach((card, index) => { card.style.transform = `translateX(${index * stride}px)`; });
      position();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.parentElement!);
    element.addEventListener("scroll", position, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", position); };
  }, [items]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    const updateData = () => setSaveData(Boolean(connection?.saveData));
    updateMotion(); updateVisibility(); updateData();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    connection?.addEventListener("change", updateData);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      connection?.removeEventListener("change", updateData);
    };
  }, []);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.mediaId!;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) visible.add(id);
        else visible.delete(id);
      }
      setVisibleIds(items.filter(item => visible.has(item.id)).map(item => item.id));
    }, { threshold: [0, 0.45] });
    frames.current.forEach(frame => observer.observe(frame));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const release = () => {
      const element = rail.current;
      const id = gesture.current.id;
      gesture.current.id = -1;
      if (!element) return;
      delete element.dataset.dragging;
      if (id >= 0 && element.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, []);

  const motionAllowed = !reducedMotion && !saveData && pageVisible;
  const autoPlaying = !paused && !focused && motionAllowed;
  const institutionalId = visibleIds.includes("wimifarma-institucional") ? "wimifarma-institucional" : null;
  const continuousIds = items.filter(item => item.kind === "gif" && item.continuousPreview && visibleIds.includes(item.id)).slice(0, 2).map(item => item.id);
  const rotatingIds = visibleIds.filter(id => id !== institutionalId && !continuousIds.includes(id));
  const rotatingCount = rotatingIds.length;
  const rotatingSlots = institutionalId ? 1 : 2;
  const activeIds = autoPlaying ? [
    ...continuousIds,
    ...(institutionalId ? [institutionalId] : []),
    ...Array.from({ length: Math.min(rotatingSlots, rotatingCount) }, (_, index) => rotatingIds[(previewOffset + index) % rotatingCount]),
  ] : [];

  useEffect(() => {
    if (!autoPlaying || hovered || rotatingCount <= rotatingSlots) return;
    const interval = window.setInterval(() => setPreviewOffset(offset => (offset + rotatingSlots) % rotatingCount), 3000);
    return () => window.clearInterval(interval);
  }, [autoPlaying, hovered, rotatingCount, rotatingSlots, visibleIds]);

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (!start.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.2) start.moved = true;
    if (!start.moved || event.pointerType !== "mouse") return;
    event.preventDefault();
    event.currentTarget.dataset.dragging = "true";
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.scrollLeft = start.left - dx;
  }

  if (!items.length) return null;
  return <section aria-label="Vídeos e novidades da Wimifarma" aria-describedby="home-media-motion-help" className={styles.section}
    onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
    onPointerLeave={event => { if (event.pointerType === "mouse") setHovered(false); }}
    onPointerDownCapture={() => { pointerFocus.current = true; setFocused(false); }}
    onFocusCapture={() => setFocused(!pointerFocus.current)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { pointerFocus.current = false; setFocused(false); } }}
    onKeyDown={event => {
      pointerFocus.current = false;
      setFocused(true);
      if (event.key === "Escape") { event.preventDefault(); setPaused(value => !value); }
    }}>
    <p className="sr-only" id="home-media-motion-help">As duas primeiras animações e o vídeo institucional permanecem animados enquanto estiverem visíveis. O ponteiro do mouse fixa a outra prévia de vídeo. O foco por teclado nesta seção pausa as animações. Arraste ou use as setas para percorrer as mídias em círculo. Pressione Escape para pausar ou retomar.</p>
    <div className={styles.heading}>
      <h2>Dê o play no seu cuidado <span aria-hidden="true">✨</span></h2>
    </div>
    <div className={styles.viewport}>
      <div aria-label="Explorar vídeos e animações" aria-roledescription="carrossel" className={styles.rail} ref={rail} role="region" tabIndex={0}
        onFocusCapture={event => {
          if (!pointerFocus.current && event.target !== event.currentTarget) event.target.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
        }}
        onDragStart={event => event.preventDefault()}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, moved: false };
        }} onPointerMove={pointerMove}
        onClickCapture={event => {
          if (gesture.current.moved && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
          gesture.current.moved = false;
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          event.currentTarget.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * event.currentTarget.clientWidth * 0.75, behavior: reducedMotion ? "instant" : "smooth" });
        }}>
        <div className={styles.track} ref={track}>
        {items.map((item, index) => <article className={styles.card} data-media-card key={item.id}>
          <div className={styles.frame} data-media-frame data-media-id={item.id} style={{ "--media-background": item.background ?? "#fff" } as CSSProperties}
            onPointerEnter={event => {
              if (event.pointerType !== "mouse") return;
              const offset = rotatingIds.indexOf(item.id);
              if (offset >= 0) setPreviewOffset(offset);
            }}
            ref={element => { if (element) frames.current.set(item.id, element); else frames.current.delete(item.id); }}>
            <a aria-label={item.action} className={styles.watch} href={item.href}>
              <MotionPreview active={activeIds.includes(item.id)} eligible={motionAllowed && visibleIds.includes(item.id)} item={item} priority={index === 0} />
            </a>
          </div>
          <h3>{item.title}</h3><p>{item.caption}</p>
        </article>)}
        </div>
      </div>
    </div>
  </section>;
}
