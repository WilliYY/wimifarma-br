"use client";

import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";
import { Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CartProduct } from "./cart-provider";
import { DeliveryEstimator } from "./delivery-estimator";

type OpenShippingPreview = (product: CartProduct, trigger: HTMLButtonElement) => void;

const CatalogShippingContext = createContext<OpenShippingPreview | null>(null);

export function CatalogShippingProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<CartProduct | null>(null);
  const [postalCode, setPostalCode] = useState<string>();
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
          <p className="text-xs leading-5 text-muted">Valores e benefícios são calculados conforme CEP, itens do pedido e modalidade.</p>
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

export function CatalogShippingButton({ product, variant = "default" }: { product: CartProduct; variant?: "default" | "benefit-badge" }) {
  const openPreview = useContext(CatalogShippingContext);
  const conditionsId = useId();
  const badge = variant === "benefit-badge";
  if (!openPreview) throw new Error("CatalogShippingButton requires CatalogShippingProvider");

  return (
    <><button
      aria-label={`Ver frete de ${product.name}${badge ? " · Frete grátis sujeito a condições" : ""}`}
      aria-describedby={conditionsId}
      aria-haspopup="dialog"
      className={`relative z-20 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${badge ? "px-0.5 text-white" : "gap-1.5 px-2 text-brand hover:bg-brand-soft"}`}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        openPreview(product, event.currentTarget);
      }}
      title={badge ? "Frete grátis em compras elegíveis. Consulte as condições para seu CEP e pedido." : undefined}
      type="button"
    >
      {badge ? <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1.5 text-[0.65rem] font-black leading-tight shadow-sm"><Truck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />Frete grátis*</span> : <><Truck aria-hidden="true" className="h-4 w-4 shrink-0" />Ver frete</>}
    </button>
    <span className="sr-only" id={conditionsId}>Benefício disponível somente para CEP, pedido e modalidade elegíveis. O valor confirmado aparece na cotação.</span></>
  );
}

export function CatalogShippingBenefitBadge() {
  return <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1.5 text-[0.65rem] font-black leading-tight text-white shadow-sm"
    title="Frete grátis em compras elegíveis. Confira CEP, pedido e modalidade em Ver frete.">
    <Truck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />Frete grátis*
  </span>;
}
