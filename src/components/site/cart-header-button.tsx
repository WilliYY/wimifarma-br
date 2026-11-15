"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { BASKET_SLOT_COUNT as BASKET_SLOTS, CartBasketArtwork } from "@/components/site/cart-basket-artwork";
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

type Flight = {
  item: CartItem;
  ready: boolean;
  hideNewSlot: boolean;
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
  landingScale: number;
  dropX: number | null;
  dropY: number;
};

function flightFrames({ fromY, dx, dy, landingScale, dropX, dropY }: Flight): Keyframe[] {
  const move = (offset: number, x: number, y: number, scale: number, angle: number, opacity = 1, easing = "linear") => ({
    offset, transform: `translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${scale})`, opacity, easing,
  });
  const contact = dropX === null ? LANDING_CONTACT : OVERFLOW_CONTACT;
  const contactScale = dropX === null ? landingScale * 1.14 : 0.42;
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

  if (dropX === null) {
    return [
      ...arc,
      move(0.83, dx, dy + 2, landingScale * 0.94, -tilt * 4),
      move(0.94, dx, dy, landingScale, 0),
      move(1, dx, dy, landingScale, 0, 0),
    ];
  }

  const bounce = dropX < dx ? -1 : 1;
  return [
    ...arc,
    move(0.65, dx + (dropX - dx) * 0.43, dy - 22, 0.4, bounce * 37, 1, "ease-in"),
    move(0.92, dropX, dropY, 0.31, bounce * 89, 1, "ease-out"),
    move(0.96, dropX, dropY - 4, 0.28, bounce * 99, 0.75),
    move(1, dropX, dropY, 0.28, bounce * 106, 0),
  ];
}

export function CartHeaderButton({ className }: Readonly<{ className?: string }>) {
  const [open, setOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flightRef = useRef<HTMLSpanElement>(null);
  const { hydrated, itemCount, items, subscribeBasketArrival } = useCart();
  const label = itemCount === 1 ? "1 item no carrinho" : `${itemCount} itens no carrinho`;
  const releaseFlight = useCallback((pending: Flight) => {
    setFlight(current => current === pending && !current.ready ? { ...current, ready: true } : current);
  }, []);

  useEffect(() => subscribeBasketArrival(({ item, source, index, isNew }) => {
    const button = buttonRef.current;
    if (open || !button?.getClientRects().length || document.hidden ||
      typeof Element.prototype.animate !== "function" || window.matchMedia(REDUCED_MOTION).matches) return;
    const overflow = index >= BASKET_SLOTS;
    const target = button.querySelector(overflow ? "[data-cart-basket-mouth]" : `[data-cart-basket-slot="${index}"]`);
    if (!target) return;
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return;
    const fromX = from.x + from.width / 2;
    const fromY = from.y + from.height / 2;
    const mouthX = to.x + to.width / 2;
    const side = mouthX + 80 < window.innerWidth ? 1 : -1;
    const toX = mouthX + (overflow ? side * to.width * 0.4 : 0);
    const toY = to.y + to.height / 2;
    const fallX = Math.max(16, Math.min(window.innerWidth - 16, toX + side * 64));
    setFlight(current => current ?? ({
      item, ready: false, hideNewSlot: isNew && !overflow, fromX, fromY,
      dx: toX - fromX, dy: toY - fromY,
      landingScale: Math.min(to.width / FLIGHT_WIDTH, to.height / FLIGHT_HEIGHT),
      dropX: overflow ? fallX - fromX : null,
      dropY: window.innerHeight - 12 - fromY,
    }));
  }), [open, subscribeBasketArrival]);

  useEffect(() => {
    const node = flightRef.current;
    if (!flight || !node) return;
    if (!flight.ready) {
      const timer = window.setTimeout(() => releaseFlight(flight), THUMBNAIL_WAIT_MS);
      return () => window.clearTimeout(timer);
    }
    const landed = flight.dropX === null;
    const duration = landed ? 500 : 760;
    const contact = landed ? LANDING_CONTACT : OVERFLOW_CONTACT;
    const animation = node.animate(flightFrames(flight), { duration, fill: "forwards" });
    const reaction = buttonRef.current?.firstElementChild?.animate(
      [
        { transform: "translateY(0) rotate(0)" },
        { transform: "translateY(1px) rotate(-1.5deg)", offset: 0.35 },
        { transform: "translateY(0) rotate(0)" },
      ],
      { delay: duration * contact, duration: 130, easing: "ease-out" },
    );
    const finish = () => setFlight(current => current === flight ? null : current);
    const motion = window.matchMedia(REDUCED_MOTION);
    void animation.finished.then(finish, () => {});
    window.addEventListener("resize", finish);
    motion.addEventListener?.("change", finish);
    return () => {
      animation.cancel();
      reaction?.cancel();
      window.removeEventListener("resize", finish);
      motion.removeEventListener?.("change", finish);
    };
  }, [flight, releaseFlight]);

  const slots = items.slice(0, BASKET_SLOTS).map(item => (
    <span className={cn("block h-full w-full", flight?.hideNewSlot && flight.item.id === item.id && "invisible")}
      data-cart-basket-product={item.id} key={item.id}>
      <BasketThumbnail item={item} />
    </span>
  ));

  return (
    <Dialog.Root modal={false} onOpenChange={next => { setOpen(next); if (next) setFlight(null); }} open={open}>
    <Dialog.Trigger asChild><button
      aria-label={hydrated ? `Abrir cesta: ${label}` : "Abrir cesta"}
      className={cn(
        "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:w-[108px]",
        className,
      )}
      data-cart-basket-button
      ref={buttonRef}
      title="Abrir cesta"
      type="button"
    >
      <CartBasketArtwork overflow={Math.max(0, items.length - BASKET_SLOTS)} slots={slots} />
      {hydrated && itemCount > 0 ? (
        <span aria-hidden="true" className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] font-black leading-none text-white ring-1 ring-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button></Dialog.Trigger>
    <span aria-atomic="true" aria-live="polite" className="sr-only">{hydrated ? label : ""}</span>
    <CartDrawer onClose={() => setOpen(false)} />
    {flight && createPortal(
      <span aria-hidden="true" className="pointer-events-none fixed z-[150] block h-16 w-12 opacity-0 motion-reduce:hidden"
        data-cart-basket-flight={flight.dropX === null ? "land" : "overflow"}
        ref={flightRef} style={{ left: flight.fromX - FLIGHT_WIDTH / 2, top: flight.fromY - FLIGHT_HEIGHT / 2 }}>
        <BasketThumbnail item={flight.item} onReady={() => releaseFlight(flight)} priority />
      </span>,
      document.body,
    )}
    </Dialog.Root>
  );
}
