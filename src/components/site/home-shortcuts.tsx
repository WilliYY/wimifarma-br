"use client";

import Link from "next/link";
import { useEffect, useRef, type PointerEvent } from "react";
import { Baby, BadgePercent, Droplets, Leaf, Pill, Scissors, Smile, SprayCan } from "lucide-react";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import styles from "./home-shortcuts.module.css";

const shortcutIcons = {
  offers: BadgePercent,
  baby: Baby,
  medicines: Pill,
  vitamins: Leaf,
  dermo: Droplets,
  beauty: SprayCan,
  hygiene: Smile,
  hair: Scissors,
};

export function HomeShortcuts({ items }: { items: HomeShortcutItem[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ moved: false, pointerId: null as number | null, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let inView = false;
    const updateVisibility = () => {
      const active = inView && !document.hidden;
      list.dataset.motion = active ? "active" : "paused";
      if (!active) for (const link of list.querySelectorAll<HTMLElement>("[data-pressed]")) delete link.dataset.pressed;
    };
    const visibility = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === list) inView = entry.isIntersecting;
        else (entry.target as HTMLElement).dataset.visible = entry.isIntersecting ? "true" : "false";
      }
      updateVisibility();
    });
    visibility.observe(list);
    for (const item of list.children) visibility.observe(item);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { visibility.disconnect(); document.removeEventListener("visibilitychange", updateVisibility); };
  }, [items]);

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
            <li data-visible="false" key={item.id}>
              <Link
                aria-label={item.label}
                className={`${styles.link}${item.id === "offers" ? ` ${styles.offer}` : ""}`}
                draggable={false}
                href={item.href}
                onPointerDown={event => {
                  if (event.isPrimary && event.pointerType !== "mouse") event.currentTarget.dataset.pressed = "true";
                }}
                onPointerUp={event => { delete event.currentTarget.dataset.pressed; }}
                onPointerCancel={event => { delete event.currentTarget.dataset.pressed; }}
                onPointerLeave={event => { delete event.currentTarget.dataset.pressed; }}
                prefetch={false}
              >
                <span aria-hidden="true" className={styles.symbol}>
                  <span className={styles.ring} data-category-ring />
                  <span className={styles.ring} data-category-ring />
                  <span className={styles.ring} data-category-ring />
                  <Icon size={32} strokeWidth={1.6} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
