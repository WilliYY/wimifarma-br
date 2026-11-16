"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { BASKET_SIDE_SLOT_COUNT, BASKET_SLOT_COUNT, CartBasketArtwork } from "@/components/site/cart-basket-artwork";
import { BasketThumbnail } from "@/components/site/cart-basket-thumbnail";
import { CartDrawer } from "@/components/site/cart-drawer";
import { type CartItem, useCart } from "@/components/site/cart-provider";
import { cn } from "@/lib/utils";

const FLIGHT_WIDTH = 48;
const FLIGHT_HEIGHT = 64;
const LANDING_CONTACT = 0.74;
const OVERFLOW_CONTACT = 0.49;
const THUMBNAIL_WAIT_MS = 260;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PREVIEW_LIMIT = BASKET_SLOT_COUNT + BASKET_SIDE_SLOT_COUNT;

type FlightPath = {
  fromY: number;
  dx: number;
  dy: number;
  landingScale: number;
  landingAngle: number;
  parked: { x: number; y: number } | null;
};

type Flight = {
  item: CartItem;
  ready: boolean;
  index: number;
  fromX: number;
} & (
  | (FlightPath & { kind: "arrival"; hideNewSlot: boolean })
  | { kind: "departure"; fromY: number; landingScale: number; landingAngle: number }
);

function previewSlot(button: HTMLButtonElement, index: number) {
  return button.querySelector<HTMLElement>(index >= BASKET_SLOT_COUNT
    ? `[data-cart-basket-side-slot="${index - BASKET_SLOT_COUNT}"]`
    : `[data-cart-basket-slot="${index}"]`);
}

function measurePath(button: HTMLButtonElement | null, index: number, fromX: number, fromY: number): FlightPath | null {
  if (!button) return null;
  const overflow = index >= BASKET_SLOT_COUNT;
  const slot = previewSlot(button, index);
  const contact = overflow ? button.querySelector("[data-cart-basket-rim]") : slot;
  if (!slot || !contact) return null;
  const to = contact.getBoundingClientRect();
  const landing = slot === contact ? to : slot.getBoundingClientRect();
  if (!landing.width || !landing.height) return null;
  return {
    fromY,
    dx: to.x + to.width / 2 - fromX,
    dy: to.y + to.height / 2 - fromY,
    landingScale: Math.min(slot.clientWidth / FLIGHT_WIDTH, slot.clientHeight / FLIGHT_HEIGHT),
    landingAngle: Number.parseFloat(window.getComputedStyle(slot).getPropertyValue("--tilt")) || 0,
    parked: overflow ? {
      x: landing.x + landing.width / 2 - fromX,
      y: landing.y + landing.height / 2 - fromY,
    } : null,
  };
}

function flightFrames({ fromY, dx, dy, landingScale, landingAngle, parked }: FlightPath): Keyframe[] {
  const move = (offset: number, x: number, y: number, scale: number, angle: number, opacity = 1, easing = "linear") => ({
    offset, transform: `translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${scale})`, opacity, easing,
  });
  const contact = parked ? OVERFLOW_CONTACT : LANDING_CONTACT;
  const contactScale = parked ? landingScale * 1.4 : landingScale * 1.14;
  const tilt = dx < 0 ? -1 : 1;
  const arcY = Math.max(8 - fromY, Math.min(0, dy) - 46);
  // Sample a cubic curve so the thumbnail approaches the basket from above.
  const arc = Array.from({ length: 13 }, (_, step) => {
    const progress = step / 12;
    const remaining = 1 - progress;
    const firstControl = 3 * remaining ** 2 * progress;
    const secondControl = 3 * remaining * progress ** 2;
    const end = progress ** 3;
    return move(
      contact * progress,
      dx * (0.24 * firstControl + 0.92 * secondControl + end),
      arcY * (firstControl + secondControl) + dy * end,
      0.92 + (contactScale - 0.92) * progress,
      tilt * Math.sin(progress * Math.PI / 2) * 15,
    );
  });

  if (!parked) {
    return [
      ...arc,
      move(0.83, dx, dy + 2, landingScale * 0.94, -tilt * 4),
      move(0.94, dx, dy, landingScale, landingAngle),
      move(1, dx, dy, landingScale, landingAngle, 0),
    ];
  }

  const bounce = parked.x < dx ? -1 : 1;
  return [
    ...arc,
    move(0.63, dx + (parked.x - dx) * 0.45, Math.min(dy, parked.y) - 15, landingScale * 1.2, bounce * 35, 1, "ease-in"),
    move(0.86, parked.x, parked.y + 1, landingScale * 0.92, landingAngle + bounce * 6, 1, "ease-out"),
    move(1, parked.x, parked.y, landingScale, landingAngle),
  ];
}

export function CartHeaderButton({ className }: Readonly<{ className?: string }>) {
  const [open, setOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const activeFlight = useRef<Flight | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flightRef = useRef<HTMLSpanElement>(null);
  const { hydrated, itemCount, items, subscribeBasketChange } = useCart();
  const label = itemCount === 1 ? "1 item no carrinho" : `${itemCount} itens no carrinho`;
  const finishFlight = useCallback((current?: Flight) => {
    if (current && activeFlight.current !== current) return;
    activeFlight.current = null;
    setFlight(null);
  }, []);
  const releaseFlight = useCallback((pending: Flight) => {
    if (activeFlight.current !== pending || pending.ready) return;
    const ready = { ...pending, ready: true };
    activeFlight.current = ready;
    setFlight(ready);
  }, []);

  useEffect(() => subscribeBasketChange(change => {
    const { item, index } = change;
    const active = activeFlight.current;
    if (active) {
      if (active.kind === "arrival" && change.kind === "departure" && index <= active.index) finishFlight(active);
      return;
    }
    const button = buttonRef.current;
    if ((change.kind === "arrival" && (open || index >= PREVIEW_LIMIT)) || !button?.getClientRects().length || document.hidden ||
      typeof Element.prototype.animate !== "function" || window.matchMedia(REDUCED_MOTION).matches) return;
    const origin = change.kind === "arrival" ? change.source : button
      .querySelector<HTMLElement>(`[data-cart-basket-product="${CSS.escape(item.id)}"]`)?.parentElement;
    if (!origin) return;
    const from = origin.getBoundingClientRect();
    if (!from.width || !from.height) return;
    const fromX = from.x + from.width / 2;
    const fromY = from.y + from.height / 2;
    const start = { item, index, ready: false, fromX };
    let next: Flight;
    if (change.kind === "departure") {
      next = {
        ...start, kind: "departure", fromY,
        landingScale: Math.min(origin.clientWidth / FLIGHT_WIDTH, origin.clientHeight / FLIGHT_HEIGHT),
        landingAngle: Number.parseFloat(window.getComputedStyle(origin).getPropertyValue("--tilt")) || 0,
      };
    } else {
      const path = measurePath(button, index, fromX, fromY);
      if (!path) return;
      next = { ...start, ...path, kind: "arrival", hideNewSlot: change.isNew };
    }
    activeFlight.current = next;
    setFlight(next);
  }), [finishFlight, open, subscribeBasketChange]);

  useEffect(() => {
    if (!flight) return;
    const stale = flight.kind === "arrival"
      ? items[flight.index]?.id !== flight.item.id
      : items.some(item => item.id === flight.item.id);
    if (stale) finishFlight(flight);
  }, [finishFlight, flight, items]);

  useEffect(() => {
    const node = flightRef.current;
    if (!flight || !node || activeFlight.current !== flight) return;
    if (!flight.ready) {
      const timer = window.setTimeout(() => releaseFlight(flight), THUMBNAIL_WAIT_MS);
      return () => window.clearTimeout(timer);
    }
    const finish = () => finishFlight(flight);
    if (flight.kind === "departure") {
      const { landingScale: scale, landingAngle: angle } = flight;
      const animation = node.animate([
        { opacity: 1, transform: `translateY(0px) rotate(${angle}deg) scale(${scale})` },
        { opacity: 0, transform: `translateY(12px) rotate(${angle - 8}deg) scale(${scale * 0.72})` },
      ], { duration: 230, easing: "ease-in", fill: "forwards" });
      void animation.finished.then(finish, () => {});
      return () => animation.cancel();
    }
    const duration = flight.parked ? 680 : 500;
    const contact = flight.parked ? OVERFLOW_CONTACT : LANDING_CONTACT;
    const measure = () => measurePath(buttonRef.current, flight.index, flight.fromX, flight.fromY);
    const path = measure() ?? flight;
    const animation = node.animate(flightFrames(path), { duration, fill: "forwards" });
    const alignLanding = window.setTimeout(() => {
      const updated = measure();
      const effect = animation.effect as KeyframeEffect | null;
      const progress = typeof animation.currentTime === "number" ? animation.currentTime / duration : 0;
      if (!updated || !effect || progress <= 0 || progress >= 0.93) return;
      const before = path.parked ?? { x: path.dx, y: path.dy };
      const after = updated.parked ?? { x: updated.dx, y: updated.dy };
      if (Math.hypot(after.x - before.x, after.y - before.y) < 1) return;

      // The header can finish collapsing during flight. Keep the current pose and adjust the remaining path once.
      const current = window.getComputedStyle(node);
      effect.setKeyframes([
        ...effect.getKeyframes().filter(frame => frame.computedOffset < progress),
        { offset: progress, transform: current.transform, opacity: current.opacity },
        ...flightFrames(updated).filter(frame => frame.offset! > progress),
      ]);
    }, duration * 0.62);
    const reaction = buttonRef.current?.querySelector("[data-cart-basket-shell]")?.animate(
      [
        { transform: "translateY(0) rotate(0)" },
        { transform: "translateY(1px) rotate(-1.5deg)", offset: 0.35 },
        { transform: "translateY(0) rotate(0)" },
      ],
      { delay: duration * contact, duration: 130, easing: "ease-out" },
    );
    const motion = window.matchMedia(REDUCED_MOTION);
    void animation.finished.then(finish, () => {});
    window.addEventListener("resize", finish);
    motion.addEventListener?.("change", finish);
    return () => {
      animation.cancel();
      reaction?.cancel();
      window.clearTimeout(alignLanding);
      window.removeEventListener("resize", finish);
      motion.removeEventListener?.("change", finish);
    };
  }, [finishFlight, flight, releaseFlight]);

  const slots = items.slice(0, PREVIEW_LIMIT).map(item => (
    <span className={cn("block h-full w-full", flight?.kind === "arrival" && flight.hideNewSlot && flight.item.id === item.id && "invisible")}
      data-cart-basket-product={item.id} key={item.id}>
      <BasketThumbnail item={item} />
    </span>
  ));

  return (
    <Dialog.Root modal={false} onOpenChange={next => { setOpen(next); if (next) finishFlight(); }} open={open}>
    <Dialog.Trigger asChild><button
      aria-label={hydrated ? `Abrir cesta: ${label}` : "Abrir cesta"}
      className={cn(
        "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        className,
      )}
      data-cart-basket-button
      ref={buttonRef}
      title="Abrir cesta"
      type="button"
    >
      <CartBasketArtwork overflow={Math.max(0, items.length - PREVIEW_LIMIT)}
        slots={slots.slice(0, BASKET_SLOT_COUNT)} sideSlots={slots.slice(BASKET_SLOT_COUNT)} />
      {hydrated && itemCount > 0 ? (
        <span aria-hidden="true" className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] font-black leading-none text-white ring-1 ring-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button></Dialog.Trigger>
    <span aria-atomic="true" aria-live="polite" className="sr-only">{hydrated ? label : ""}</span>
    <CartDrawer onClose={() => setOpen(false)} />
    {flight && createPortal(
      <span aria-hidden="true" className={cn(
        "pointer-events-none fixed block h-16 w-12 opacity-0 motion-reduce:hidden",
        flight.kind === "departure" ? "z-[152]" : "z-[150]",
      )}
        data-cart-basket-flight={flight.kind === "departure" ? "departure" : flight.parked ? "overflow" : "land"}
        ref={flightRef} style={{ left: flight.fromX - FLIGHT_WIDTH / 2, top: flight.fromY - FLIGHT_HEIGHT / 2 }}>
        <BasketThumbnail item={flight.item} onReady={() => releaseFlight(flight)} priority />
      </span>,
      document.body,
    )}
    </Dialog.Root>
  );
}
