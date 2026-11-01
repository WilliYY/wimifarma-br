"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CartProduct } from "./cart-provider";
import { DeliveryEstimator } from "./delivery-estimator";

type OpenShippingPreview = (product: CartProduct, trigger: HTMLButtonElement) => void;

const CatalogShippingContext = createContext<OpenShippingPreview | null>(null);

export function CatalogShippingProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<CartProduct | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openPreview = useCallback<OpenShippingPreview>((product, trigger) => {
    triggerRef.current = trigger;
    setSelectedProduct(product);
  }, []);

  return (
    <CatalogShippingContext.Provider value={openPreview}>
      {children}
      <Dialog open={selectedProduct !== null} onOpenChange={open => { if (!open) setSelectedProduct(null); }}>
        <DialogContent
          className="max-w-lg rounded-3xl"
          onCloseAutoFocus={event => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Frete e prazo</DialogTitle>
            <DialogDescription>{selectedProduct?.name} · 1 unidade</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <DeliveryEstimator
              key={selectedProduct.id}
              product={selectedProduct}
              quantity={1}
              compact
              initialPostalCode={postalCode}
              onPostalCodeChange={setPostalCode}
            />
          )}
        </DialogContent>
      </Dialog>
    </CatalogShippingContext.Provider>
  );
}

export function CatalogShippingButton({ product }: { product: CartProduct }) {
  const openPreview = useContext(CatalogShippingContext);
  if (!openPreview) throw new Error("CatalogShippingButton requires CatalogShippingProvider");

  return (
    <button
      aria-label={`Ver frete de ${product.name}`}
      aria-haspopup="dialog"
      className="relative z-20 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        openPreview(product, event.currentTarget);
      }}
      type="button"
    >
      <Truck aria-hidden="true" className="h-4 w-4 shrink-0" />
      Ver frete
    </button>
  );
}
