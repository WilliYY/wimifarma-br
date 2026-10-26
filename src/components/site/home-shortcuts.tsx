"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowRight, ArrowUpRight, Baby, BadgePercent, ChevronLeft, ChevronRight, Droplets, Leaf, Pill, SprayCan } from "lucide-react";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import styles from "./home-shortcuts.module.css";

const shortcutIcons = {
  offers: BadgePercent,
  baby: Baby,
  medicines: Pill,
  vitamins: Leaf,
  dermo: Droplets,
  beauty: SprayCan,
};

export function HomeShortcuts({ items }: { items: HomeShortcutItem[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ moved: false, pointerId: null as number | null, startX: 0, scrollLeft: 0 });
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = { start: list.scrollLeft <= 1, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1 };
        setEdges(previous => previous.start === next.start && previous.end === next.end ? previous : next);
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); list.removeEventListener("scroll", update); cancelAnimationFrame(frame); };
  }, [items.length]);

  const scroll = (direction: number) => {
    const list = listRef.current;
    list?.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const finishDrag = (event: PointerEvent<HTMLUListElement>) => {
    if (drag.current.pointerId !== event.pointerId) return;
    drag.current.pointerId = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <nav aria-label="Categorias de produtos" className={styles.panel}>
      <div className={styles.heading}>
        <p className={styles.title}>Encontre seu cuidado</p>
        <Link className={styles.catalog} href="/catalogo">
          Ver catálogo <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>

      <ul
        aria-label="Explorar categorias"
        className={styles.list}
        id="home-shortcuts"
        onClickCapture={event => {
          if (drag.current.moved && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
          drag.current.moved = false;
        }}
        onDragStart={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          scroll(event.key === "ArrowRight" ? 1 : -1);
        }}
        onLostPointerCapture={finishDrag}
        onPointerCancel={event => { finishDrag(event); drag.current.moved = false; }}
        onPointerDown={event => {
          if (!event.isPrimary) return;
          drag.current.moved = false;
          if (event.pointerType === "mouse" && event.button === 0) drag.current = { moved: false, pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
        }}
        onPointerMove={event => {
          const state = drag.current;
          if (state.pointerId !== event.pointerId) return;
          if (event.buttons !== 1) { finishDrag(event); return; }
          const delta = event.clientX - state.startX;
          if (!state.moved && Math.abs(delta) <= 6) return;
          if (!state.moved) { state.moved = true; event.currentTarget.dataset.dragging = "true"; event.currentTarget.setPointerCapture(event.pointerId); }
          event.preventDefault();
          event.currentTarget.scrollLeft = state.scrollLeft - delta;
        }}
        onPointerUp={finishDrag}
        ref={listRef}
        tabIndex={0}
      >
        {items.map(item => {
          const Icon = shortcutIcons[item.id];
          return (
            <li key={item.id}>
              <Link
                aria-label={item.label}
                className={`${styles.link}${item.id === "offers" ? ` ${styles.offer}` : ""}`}
                draggable={false}
                href={item.href}
                prefetch={false}
              >
                <span aria-hidden="true" className={styles.symbol}><Icon size={64} strokeWidth={1.5} /></span>
                <span className={styles.label}>{item.label}</span>
                <span aria-hidden="true" className={styles.open}><ArrowUpRight size={14} /></span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.footer}>
        <span className={styles.hint}>{edges.start && edges.end ? "Escolha por onde começar" : "Arraste ou deslize para explorar"}</span>
        <div className={styles.controls} data-static={edges.start && edges.end}>
          <button aria-controls="home-shortcuts" aria-label="Ver categorias anteriores" className={styles.arrow} disabled={edges.start} onClick={() => scroll(-1)} type="button"><ChevronLeft aria-hidden="true" size={18} /></button>
          <button aria-controls="home-shortcuts" aria-label="Ver próximas categorias" className={styles.arrow} disabled={edges.end} onClick={() => scroll(1)} type="button"><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
      </div>
    </nav>
  );
}
