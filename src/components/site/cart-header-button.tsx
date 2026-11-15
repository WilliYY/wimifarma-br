"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { Package } from "lucide-react";
import { CartBasketArtwork } from "@/components/site/cart-basket-artwork";
import { CartDrawer } from "@/components/site/cart-drawer";
import { type CartItem, useCart } from "@/components/site/cart-provider";
import { publicProductImageUrl } from "@/features/product-images/private-supplier-policy";
import { isMedicineImagePlaceholder, medicineIllustrationUrl } from "@/features/products/image-placeholder";
import { cn } from "@/lib/utils";

const BASKET_SLOTS = 4;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function BasketThumbnail({ item }: { item: CartItem }) {
  const fallback = isMedicineImagePlaceholder(item) ? medicineIllustrationUrl(item) : null;
  const candidate = publicProductImageUrl(item);
  const photo = candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : fallback;
  const [failed, setFailed] = useState<string[]>([]);
  const image = [photo, fallback].find(src => src && !failed.includes(src));

  return image ? (
    <Image alt="" className="h-full w-full object-contain" draggable={false} height={64}
      onError={() => setFailed(previous => [...previous, image])} src={image} width={48} />
  ) : (
    <span className="grid h-full w-full place-items-center rounded bg-brand-soft text-brand">
      <Package className="h-3/4 w-3/4" />
    </span>
  );
}

type Flight = {
  item: CartItem;
  hideNewSlot: boolean;
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
  dropX: number | null;
  dropY: number;
};

function flightFrames({ dx, dy, dropX, dropY }: Flight): Keyframe[] {
  const move = (x: number, y: number, scale: number, angle: number, opacity: number, offset: number) => ({
    transform: `translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${scale})`, opacity, offset,
  });
  const arc = move(dx * 0.68, Math.min(-32, dy - 24), 0.75, -9, 1, 0.54);
  return dropX === null ? [
    move(0, 0, 0.92, 0, 1, 0), arc, move(dx, dy, 0.38, 2, 0, 1),
  ] : [
    move(0, 0, 0.92, 0, 1, 0),
    { ...arc, offset: 0.32 },
    move(dx, dy, 0.5, -12, 1, 0.54),
    move((dx + dropX) / 2, dy - 21, 0.5, 19, 1, 0.65),
    move(dropX, dropY, 0.38, 76, 0.87, 0.93),
    move(dropX, dropY, 0.32, 86, 0, 1),
  ];
}

export function CartHeaderButton({ className }: Readonly<{ className?: string }>) {
  const [open, setOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flightRef = useRef<HTMLSpanElement>(null);
  const { hydrated, itemCount, items, subscribeBasketArrival } = useCart();
  const label = itemCount === 1 ? "1 item no carrinho" : `${itemCount} itens no carrinho`;

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
    const toX = to.x + to.width / 2;
    const toY = to.y + to.height / 2;
    const fallX = toX + (toX < window.innerWidth - 100 ? 64 : -64);
    setFlight(current => current ?? ({
      item, hideNewSlot: isNew && !overflow, fromX, fromY,
      dx: toX - fromX, dy: toY - fromY,
      dropX: overflow ? fallX - fromX : null,
      dropY: window.innerHeight - 18 - fromY,
    }));
  }), [open, subscribeBasketArrival]);

  useEffect(() => {
    const node = flightRef.current;
    if (!flight || !node) return;
    const landed = flight.dropX === null;
    const animation = node.animate(flightFrames(flight), {
      duration: landed ? 480 : 740, easing: landed ? "ease-out" : "linear", fill: "forwards",
    });
    const finish = () => setFlight(current => current === flight ? null : current);
    const motion = window.matchMedia(REDUCED_MOTION);
    void animation.finished.then(() => {
      if (landed && !motion.matches) {
        buttonRef.current?.firstElementChild?.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(2px) rotate(-3deg)", offset: 0.4 }, { transform: "translateY(0)" }],
          { duration: 190, easing: "ease-out" },
        );
      }
      finish();
    }, () => {});
    window.addEventListener("resize", finish);
    motion.addEventListener?.("change", finish);
    return () => {
      animation.cancel();
      window.removeEventListener("resize", finish);
      motion.removeEventListener?.("change", finish);
    };
  }, [flight]);

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
        ref={flightRef} style={{ left: flight.fromX - 24, top: flight.fromY - 32 }}>
        <BasketThumbnail item={flight.item} />
      </span>,
      document.body,
    )}
    </Dialog.Root>
  );
}
