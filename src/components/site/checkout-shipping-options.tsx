"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, Store, Truck } from "lucide-react";
import { useCart } from "./cart-provider";
import { type ShippingSelection } from "@/features/shipping/schema";
import { createCheckoutQuote, type CheckoutQuoteState } from "@/features/shipping/checkout-quote";
import { shippingCustomerPrice } from "@/features/shipping/benefit-policy";
import { ShippingBenefitNote } from "./shipping-benefit-note";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function CheckoutShippingOptions({ postalCode, selected, onSelect, discountCents = 0, available = false, onPickup }: { postalCode: string; selected?: ShippingSelection; onSelect: (option?: ShippingSelection) => void; discountCents?: number; available?: boolean; onPickup: () => void }) {
  const { items } = useCart();
  const needsSupport = items.some(requiresPharmacyShippingSupport);
  const requestKey = JSON.stringify({ discountCents, postalCode: postalCode.replace(/\D/g, ""), items: items.map((item) => ({ productId: item.id, quantity: item.quantity, expectedUnitPriceCents: item.unitPriceCents })).sort((a, b) => a.productId.localeCompare(b.productId)) });
  const request = useMemo(() => JSON.parse(requestKey) as { discountCents: number; postalCode: string; items: { productId: string; quantity: number; expectedUnitPriceCents: number }[] }, [requestKey]);
  const canQuote = available && !needsSupport && /^\d{8}$/.test(request.postalCode) && items.length > 0;
  const [quoteRunner] = useState(createCheckoutQuote);
  const [state, setState] = useState<CheckoutQuoteState & { key: string }>({ key: "", options: [], busy: false, message: "" });
  const onSelectRef = useRef(onSelect);
  const activeKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
    activeKey.current = canQuote ? requestKey : null;
  }, [onSelect, requestKey, canQuote]);
  const quote = useCallback((delay = 0) => {
    if (!canQuote) return;
    onSelectRef.current(undefined);
    quoteRunner.schedule(request, (nextState) => {
      if (activeKey.current === requestKey) setState({ ...nextState, key: requestKey });
    }, delay);
  }, [canQuote, quoteRunner, request, requestKey]);
  useEffect(() => {
    activeKey.current = canQuote ? requestKey : null;
    if (canQuote) quote(450);
    else {
      onSelectRef.current(undefined);
      setState({ key: "", options: [], busy: false, message: "" });
    }
    return () => { activeKey.current = null; quoteRunner.cancel(); };
  }, [canQuote, quote, quoteRunner, requestKey]);
  const current = canQuote && state.key === requestKey;
  const options = current ? state.options : [];
  const busy = canQuote && (!current || state.busy);
  const message = current ? state.message : "";
  const currentSelection = !busy ? options.find((option) => option.token === selected?.token) : undefined;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const displayed = [...options].sort((a, b) => shippingCustomerPrice(a) - shippingCustomerPrice(b) || a.deliveryDays - b.deliveryDays || a.serviceId - b.serviceId);
  const fastest = Math.min(...displayed.map((option) => option.deliveryDays));
  if (!available || needsSupport) return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4" role="status">
    <div className="flex items-start gap-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0"><h3 className="text-sm font-bold text-ink">{needsSupport ? "Este carrinho precisa de atendimento" : "Entrega por transportadora indisponível"}</h3><p className="mt-1.5 text-xs leading-5 text-muted">{needsSupport ? "Itens sujeitos a receita e Farmácia Popular precisam de avaliação farmacêutica. Fale com a equipe antes de comprar." : "A consulta de transportadoras está temporariamente indisponível. Escolha retirada ou consulte a equipe para combinar o recebimento."}</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><button className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-2 text-xs font-bold text-ink transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand" onClick={onPickup} type="button"><Store className="h-4 w-4 shrink-0" />Retirar na loja</button><a className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-2 text-xs font-bold text-pharma-green ring-1 ring-emerald-200 transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-pharma-green" href={buildWhatsAppUrl("Olá! Gostaria de consultar a entrega de um pedido pelo site.")} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 shrink-0" />Falar com a equipe</a></div>
  </div>;
  return <div className="mt-5 rounded-xl border border-line bg-surface-subtle p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-black text-ink"><Truck className="h-5 w-5 text-brand" />Entrega por transportadora</h2><p className="mt-1 text-xs leading-5 text-muted">Cotação automática após preencher o CEP. Escolha uma opção abaixo. Prazo em dias úteis, incluindo preparação.</p></div><button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50" disabled={busy || !canQuote} onClick={() => quote()} type="button">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Consultando..." : "Consultar novamente"}</button></div>
    {message && <p className="mt-4 text-sm text-muted" role="status">{message}</p>}
    <fieldset className="mt-4 grid gap-3"><legend className="sr-only">Opções de transportadora</legend>{displayed.map((option, index) => {
      const fee = shippingCustomerPrice(option);
      return <label className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 ${currentSelection?.token === option.token ? "border-brand ring-1 ring-brand" : "border-line"}`} key={option.serviceId}>
        <input checked={currentSelection?.token === option.token} className="mt-1 h-4 w-4 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand" name="shippingService" onChange={() => { if (activeKey.current === requestKey && !busy) onSelectRef.current(option); }} type="radio" />
        <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{option.carrier} · {option.service}</strong><span className="mt-1 block text-xs text-muted">Até {option.deliveryDays} dias úteis estimados</span><span className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-pharma-green">{options.length > 1 && index === 0 && <span>MAIS ECONÔMICO</span>}{options.length > 1 && option.deliveryDays === fastest && <span>MAIS RÁPIDO</span>}</span></span>
        <strong className="shrink-0 text-sm text-pharma-green">{fee === 0 ? "Grátis" : money.format(fee / 100)}</strong>
      </label>;
    })}</fieldset>
    {currentSelection && <ShippingBenefitNote benefit={currentSelection.benefit} />}
    {currentSelection && <p className="mt-3 text-xs text-muted">Confirmação do pagamento antes do despacho.</p>}
  </div>;
}
