"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, MapPin, MessageCircle, Store, Truck, XCircle } from "lucide-react";
import {
  formatPostalCode,
  getDeliveryAvailability,
  type DeliveryAvailability,
} from "@/features/products/product-detail";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function DeliveryEstimator() {
  const [postalCode, setPostalCode] = useState("");
  const [result, setResult] = useState<DeliveryAvailability | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(getDeliveryAvailability(postalCode));
  }

  return (
    <section aria-labelledby="delivery-estimator-title" className="border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-black text-ink" id="delivery-estimator-title">Consulte entrega e retirada</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Informe o CEP para verificar a cobertura atual.</p>
        </div>
      </div>

      <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="product-postal-code">CEP</label>
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            autoComplete="postal-code"
            className="h-12 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm font-bold text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            id="product-postal-code"
            inputMode="numeric"
            maxLength={9}
            onChange={(event) => {
              setPostalCode(formatPostalCode(event.target.value));
              setResult(null);
            }}
            placeholder="00000-000"
            value={postalCode}
          />
        </div>
        <button className="h-12 rounded-md border border-brand px-5 text-sm font-black text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" type="submit">
          Calcular
        </button>
      </form>

      {result ? (
        <div aria-live="polite" className={`mt-4 flex items-start gap-3 rounded-md border p-4 ${result.available ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          {result.available ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pharma-green" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div>
            <strong className="block text-sm font-black text-ink">{result.title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              {result.available
                ? "O prazo e o estoque serao confirmados pela equipe ao receber o pedido."
                : result.normalizedPostalCode.length === 8
                  ? "Consulte a equipe para verificar outra forma de atendimento."
                  : "Use somente os numeros do seu CEP."}
            </p>
            {!result.available && result.normalizedPostalCode.length === 8 ? (
              <a className="mt-2 inline-flex items-center gap-2 text-xs font-black text-brand underline" href={buildWhatsAppUrl("Ola, gostaria de consultar entrega para o meu CEP.")} rel="noreferrer" target="_blank">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Consultar no WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
        <div>
          <strong className="block text-sm font-black text-ink">Retirada gratis na Wimifarma</strong>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">Av. Minas Gerais, 2263. Aguarde a confirmacao antes de ir buscar.</p>
        </div>
      </div>
    </section>
  );
}
