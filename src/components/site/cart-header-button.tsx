"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CartDrawer } from "@/components/site/cart-drawer";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/site/cart-provider";
import { cn } from "@/lib/utils";

export function CartHeaderButton({ className }: Readonly<{ className?: string }>) {
  const [open, setOpen] = useState(false);
  const { hydrated, itemCount } = useCart();
  const label = itemCount === 1 ? "1 item no carrinho" : `${itemCount} itens no carrinho`;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
    <Dialog.Trigger asChild><button
      aria-label={hydrated ? `Abrir cesta: ${label}` : "Abrir cesta"}
      className={cn(
        "relative ml-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white text-ink shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#121820]",
        className,
      )}
      title="Abrir cesta"
      type="button"
    >
      <ShoppingCart className="h-5 w-5" />
      {hydrated && itemCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] font-black leading-none text-white shadow-sm">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button></Dialog.Trigger>
    <CartDrawer onClose={() => setOpen(false)} />
    </Dialog.Root>
  );
}
