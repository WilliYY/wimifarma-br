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
    <section aria-labelledby="delivery-estimator-title" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink" id="delivery-estimator-title">Como você quer receber?</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Consulte a entrega ou retire na farmácia.</p>
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
            aria-invalid={result ? result.normalizedPostalCode.length !== 8 : undefined}
            maxLength={9}
            onChange={(event) => {
              setPostalCode(formatPostalCode(event.target.value));
              setResult(null);
            }}
            placeholder="00000-000"
            value={postalCode}
          />
        </div>
        <button className="h-12 shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" type="submit">
          Consultar
        </button>
      </form>

      {result ? (
        <div role="status" id="delivery-result" className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${result.available ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          {result.available ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pharma-green" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div>
            <strong className="block text-sm font-black text-ink">{result.title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              {result.available
                ? "Frete grátis a partir de R$ 99,90 na área atendida. A equipe confirma prazo, estoque e condições do pedido."
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
          <strong className="block text-sm font-bold text-ink">Retirada na loja <span className="ml-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Grátis</span></strong>
          <p className="mt-2 text-xs leading-5 text-muted">Av. Minas Gerais, 2263. Aguarde a confirmação antes de ir buscar.</p>
        </div>
      </div>
    </section>
  );
}
