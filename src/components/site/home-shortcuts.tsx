"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Baby,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Droplets,
  HeartHandshake,
  Leaf,
  Pill,
  SprayCan,
  Truck,
} from "lucide-react";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";

const shortcutIcons = {
  offers: BadgePercent,
  baby: Baby,
  medicines: Pill,
  vitamins: Leaf,
  dermo: Droplets,
  beauty: SprayCan,
  popular: HeartHandshake,
  delivery: Truck,
};

export function HomeShortcuts({ items }: { items: HomeShortcutItem[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [controls, setControls] = useState({ previous: false, next: false });

  const updateControls = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const maximumScroll = Math.max(0, list.scrollWidth - list.clientWidth);
    setControls({ previous: list.scrollLeft > 2, next: list.scrollLeft < maximumScroll - 2 });
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
  }, [items, updateControls]);

  function scrollShortcuts(direction: -1 | 1) {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <nav aria-label="Atalhos de compras e serviços" className="relative mb-7 px-11 sm:mb-9 sm:px-12">
      <button
        aria-controls="home-shortcuts"
        aria-label="Ver atalhos anteriores"
        className="absolute left-0 top-6 flex h-11 w-11 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:invisible sm:top-8"
        disabled={!controls.previous}
        onClick={() => scrollShortcuts(-1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="h-6 w-6" />
      </button>

      <ul
        className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:scroll-auto sm:gap-4 lg:justify-between [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        id="home-shortcuts"
        onScroll={updateControls}
        ref={listRef}
        tabIndex={0}
      >
        {items.map((item) => {
          const Icon = shortcutIcons[item.id];
          return (
            <li className="w-24 shrink-0 snap-start sm:w-28" key={item.id}>
              <Link
                aria-label={item.external ? `Consultar ${item.label} pelo WhatsApp (abre em nova aba)` : item.label}
                className="group flex flex-col items-center gap-3 rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                href={item.href}
                rel={item.external ? "noreferrer" : undefined}
                target={item.external ? "_blank" : undefined}
                title={item.external ? `Consultar ${item.label} pelo WhatsApp` : undefined}
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-subtle text-brand ring-1 ring-transparent transition duration-200 group-hover:-translate-y-1 group-hover:bg-brand-soft group-hover:ring-brand/20 motion-reduce:transform-none motion-reduce:transition-none sm:h-24 sm:w-24">
                  <Icon aria-hidden="true" className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.6} />
                </span>
                <span className="min-h-10 text-sm font-semibold leading-5 text-ink transition-colors group-hover:text-brand">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        aria-controls="home-shortcuts"
        aria-label="Ver próximos atalhos"
        className="absolute right-0 top-6 flex h-11 w-11 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:invisible sm:top-8"
        disabled={!controls.next}
        onClick={() => scrollShortcuts(1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" className="h-6 w-6" />
      </button>
    </nav>
  );
}
