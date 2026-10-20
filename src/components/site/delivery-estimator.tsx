"use client";

import Link from "next/link";
import { useContext, useLayoutEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MapPin, MessageCircle, Store, Truck, XCircle } from "lucide-react";
import {
  formatPostalCode,
  getDeliveryAvailability,
} from "@/features/products/product-detail";
import { createCheckoutQuote, type CheckoutQuoteState } from "@/features/shipping/checkout-quote";
import { customerShippingFee } from "@/features/shipping/delivery-policy";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/utils";
import { useCart, type CartProduct } from "./cart-provider";
import { ProductQuantityContext } from "./product-quantity";

type DeliveryEstimate = CheckoutQuoteState & { key: string; title: string; local: boolean; invalid: boolean };

export function DeliveryEstimator({ product, quantity }: { product?: CartProduct; quantity?: number }) {
  const { items: cartItems } = useCart();
  const sharedQuantity = useContext(ProductQuantityContext);
  const selectedQuantity = quantity ?? sharedQuantity?.quantity ?? 1;
  const items = useMemo(() => product ? [{ ...product, quantity: selectedQuantity }] : cartItems, [cartItems, product, selectedQuantity]);
  const [postalCode, setPostalCode] = useState("");
  const [quoteRunner] = useState(createCheckoutQuote);
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const normalizedPostalCode = postalCode.replace(/\D/g, "");
  const request = { postalCode: normalizedPostalCode, items: items.map(item => ({ productId: item.id, quantity: item.quantity, expectedUnitPriceCents: item.unitPriceCents })) };
  const requestKey = JSON.stringify(request);
  const result = estimate?.key === requestKey ? estimate : null;
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useLayoutEffect(() => {
    setEstimate(null);
    return () => quoteRunner.cancel();
  }, [quoteRunner, requestKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    quoteRunner.cancel();
    const availability = getDeliveryAvailability(postalCode);
    const showMessage = (title: string, message: string, local = false, invalid = false) => {
      setEstimate({ key: requestKey, title, message, local, invalid, busy: false, options: [] });
    };
    if (normalizedPostalCode.length !== 8) {
      showMessage(availability.title, "Informe um CEP com 8 números.", false, true);
    } else if (availability.available) {
      showMessage(availability.title, "Entrega local grátis. Informe o endereço completo no checkout; a equipe confirma o atendimento.", true);
    } else if (!items.length) {
      showMessage("Escolha os produtos para calcular o frete", "Adicione os produtos ao carrinho e consulte novamente. O valor depende dos itens, da quantidade e do CEP.");
    } else if (items.some(requiresPharmacyShippingSupport)) {
      showMessage("Entrega com atendimento da farmácia", "Um dos itens precisa de atendimento da farmácia para confirmar o envio. Consulte a equipe ou escolha retirada.");
    } else {
      quoteRunner.schedule(request, next => setEstimate({
        ...next, key: requestKey, local: false, invalid: false,
        title: next.busy ? "Consultando o frete" : next.options.length ? "Opções de entrega" : "Confira as condições de entrega",
      }), 0);
    }
  }

  return (
    <section aria-labelledby="delivery-estimator-title" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink" id="delivery-estimator-title">Como você quer receber?</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Consulte o frete e o prazo ou retire na farmácia.</p>
          {items.length > 0 && <p className="mt-1 text-xs text-muted">Simulação para {itemCount} {itemCount === 1 ? "unidade" : "unidades"}{product ? " deste produto" : " do carrinho"}.</p>}
        </div>
      </div>

      <form className="mt-5 flex gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="product-postal-code">CEP</label>
        <div className="relative min-w-0 flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            autoComplete="postal-code"
            className="h-12 w-full rounded-xl border border-line bg-surface-subtle pl-10 pr-3 text-base font-semibold text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            id="product-postal-code"
            inputMode="numeric"
            aria-describedby={result ? "delivery-result" : undefined}
            aria-invalid={result?.invalid || undefined}
            maxLength={9}
            onChange={(event) => {
              setPostalCode(formatPostalCode(event.target.value));
              quoteRunner.cancel();
              setEstimate(null);
            }}
            placeholder="00000-000"
            value={postalCode}
          />
        </div>
        <button className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60" disabled={result?.busy} type="submit">
          {result?.busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
          {result?.busy ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {result ? (
        <div role="status" aria-live="polite" aria-busy={result.busy} id="delivery-result" className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${result.local || result.options.length ? "border-emerald-200 bg-emerald-50" : "border-line bg-surface-subtle"}`}>
          {result.local || result.options.length ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pharma-green" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-black text-ink">{result.title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              {result.message}
            </p>
            {result.local && <strong className="mt-2 block text-sm text-pharma-green">Grátis</strong>}
            {result.options.length > 0 && <>
              <ul className="mt-3 grid gap-2">
                {result.options.map(option => {
                  const fee = customerShippingFee(option.priceCents, subtotalCents, 0);
                  return <li className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-white p-3 text-sm" key={option.serviceId}>
                    <span><strong className="block">{option.carrier} · {option.service}</strong><span className="mt-1 block text-xs text-muted">Até {option.deliveryDays} dias úteis estimados, incluindo preparação</span></span>
                    <strong className="text-pharma-green">{fee === 0 ? "Grátis" : formatCurrency(fee / 100)}</strong>
                  </li>;
                })}
              </ul>
              <p className="mt-3 text-xs leading-5 text-muted">Estimativa para os itens informados. Frete, descontos e disponibilidade são conferidos novamente no checkout.</p>
            </>}
            {!result.busy && !result.local && !result.invalid && !result.options.length ? (
              <a className="mt-2 inline-flex items-center gap-2 text-xs font-black text-brand underline" href={buildWhatsAppUrl("Ola, gostaria de consultar entrega para o meu CEP.")} rel="noreferrer" target="_blank">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Consultar no WhatsApp
              </a>
            ) : null}
            {!items.length && !result.invalid && !result.local && <Link className="mt-2 block text-xs font-bold text-brand underline" href="/catalogo">Escolher produtos</Link>}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
        <div>
          <strong className="block text-sm font-bold text-ink">Retirada na loja <span className="ml-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Grátis</span></strong>
          <p className="mt-2 text-xs leading-5 text-muted">Av. Minas Gerais, 2263. Aguarde a confirmação antes de ir buscar.</p>
        </div>
      </div>
    </section>
  );
}
