"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { homeMediaItems, type HomeMediaItem } from "@/features/home-media/items";
import styles from "./home-media-gallery.module.css";

function MotionPreview({ item, active, priority }: { item: HomeMediaItem; active: boolean; priority: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (active) void element.play().catch(() => { /* The poster remains available when playback is unavailable. */ });
    else element.pause();
    return () => element.pause();
  }, [active]);
  return <>
    <Image alt={item.title} className={styles.poster} fill priority={priority} sizes="(max-width: 639px) 156px, (max-width: 1023px) 180px, 200px" src={item.poster} />
    {item.kind === "video" ? <video
      aria-hidden="true" className={styles.preview} data-playing={active && playing}
      loop muted onPause={() => setPlaying(false)} onPlaying={() => setPlaying(true)}
      playsInline preload="none" ref={video} src={active ? item.src : undefined} tabIndex={-1}
    /> : active ? <Image alt="" aria-hidden="true" className={styles.preview} fill sizes="200px" src={item.src} unoptimized /> : null}
  </>;
}

export function HomeMediaGallery({ items = homeMediaItems }: { items?: HomeMediaItem[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const frames = useRef(new Map<string, HTMLDivElement>());
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const gesture = useRef({ id: -1, x: 0, y: 0, left: 0, moved: false });
  const [selected, setSelected] = useState<HomeMediaItem | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

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

  const autoPlaying = !paused && !reducedMotion && !saveData && pageVisible && !selected;
  const activeIds = autoPlaying ? visibleIds.slice(0, 2) : [];

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
  return <section aria-label="Vídeos e novidades da Wimifarma" className={styles.section}>
    <div className={styles.heading}>
      <h2>Dê o play no seu cuidado <span aria-hidden="true">✨</span></h2>
      <button aria-label={paused || reducedMotion || saveData ? "Reproduzir animações" : "Pausar animações"} className={styles.motionControl}
        disabled={reducedMotion || saveData} onClick={() => setPaused(value => !value)} type="button"
        title={reducedMotion || saveData ? "Abra um vídeo para assistir quando quiser" : paused ? "Reproduzir animações" : "Pausar animações"}>
        {paused || reducedMotion || saveData ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
        <span>{paused || reducedMotion || saveData ? "Reproduzir" : "Pausar"}</span>
      </button>
    </div>
    <div className={styles.viewport}>
      <div aria-label="Explorar vídeos e animações" aria-roledescription="carrossel" className={styles.rail} ref={rail} role="region" tabIndex={0}
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
        {items.map((item, index) => <article className={styles.card} data-media-card key={item.id}>
          <div className={styles.frame} data-media-frame data-media-id={item.id} style={{ "--media-background": item.background ?? "#fff" } as CSSProperties}
            ref={element => { if (element) frames.current.set(item.id, element); else frames.current.delete(item.id); }}>
            <button aria-label={`Assistir ${item.title}`} className={styles.watch} onClick={event => { lastTrigger.current = event.currentTarget; setSelected(item); }} type="button">
              <MotionPreview active={activeIds.includes(item.id)} item={item} priority={index === 0} />
              <span aria-hidden="true" className={styles.play}><Play fill="currentColor" size={16} /></span>
            </button>
          </div>
          <h3>{item.title}</h3><p>{item.caption}</p>
        </article>)}
      </div>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
      {selected && <DialogContent className={styles.dialog} onCloseAutoFocus={event => { event.preventDefault(); lastTrigger.current?.focus({ preventScroll: true }); }}>
        <DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.caption}</DialogDescription></DialogHeader>
        {selected.kind === "video"
          ? <video aria-label={selected.title} autoPlay className={styles.dialogMedia} controls loop muted playsInline poster={selected.poster} src={selected.src} />
          // Animated GIFs are mounted only after the customer explicitly opens them.
          : <Image alt={selected.title} className={styles.dialogMedia} height={720} src={selected.src} unoptimized width={540} />}
        <a className={styles.catalogLink} href={selected.href}>{selected.action}</a>
      </DialogContent>}
    </Dialog>
  </section>;
}
