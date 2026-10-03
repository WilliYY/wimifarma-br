"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Loader2, MapPin, RotateCw, Store } from "lucide-react";
import type { CheckoutDraft } from "@/features/orders/checkout-draft";
import { postalAddressSchema } from "@/features/orders/postal-code";
import { formatPostalCode, getDeliveryAvailability, normalizePostalCode } from "@/features/products/product-detail";
import { CheckoutShippingOptions } from "./checkout-shipping-options";
import type { ShippingSelection } from "@/features/shipping/schema";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/features/shipping/delivery-policy";

type Address = CheckoutDraft["address"];
type Props = { address: Address; fulfillmentMethod: CheckoutDraft["fulfillmentMethod"]; onAddress: Dispatch<SetStateAction<Address>>; onMethod: (method: CheckoutDraft["fulfillmentMethod"]) => void; shippingSelection?: ShippingSelection; onShipping: (option?: ShippingSelection) => void; compact?: boolean; discountCents?: number; carrierShippingAvailable?: boolean };

export function CheckoutDeliveryStep({ address, fulfillmentMethod, onAddress, onMethod, shippingSelection, onShipping, compact = false, discountCents = 0, carrierShippingAvailable = false }: Props) {
  const [status, setStatus] = useState({ loading: false, message: "", failed: false });
  const [retry, setRetry] = useState(0);
  const code = normalizePostalCode(address.postalCode);
  const numberRef = useRef<HTMLInputElement>(null);
  const postalRef = useRef<HTMLInputElement>(null);
  const setterRef = useRef(onAddress);
  useEffect(() => { setterRef.current = onAddress; }, [onAddress]);

  useEffect(() => {
    if (code.length !== 8 || fulfillmentMethod !== "DELIVERY") { setStatus({ loading: false, message: "", failed: false }); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus({ loading: true, message: "Consultando CEP...", failed: false });
      try {
        const response = await fetch(`/api/cep/${code}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Nao foi possivel consultar. Preencha o endereco e tente novamente.");
        const parsed = postalAddressSchema.safeParse(payload?.data);
        if (!parsed.success || parsed.data.postalCode !== code) throw new Error("Resposta de CEP invalida. Preencha o endereco manualmente.");
        if (controller.signal.aborted) return;
        const found = parsed.data;
        setterRef.current((current) => normalizePostalCode(current.postalCode) !== code ? current : {
          ...current, street: current.street || found.street, neighborhood: current.neighborhood || found.neighborhood,
          city: current.city || found.city, state: current.state || found.state,
        });
        setStatus({ loading: false, failed: false, message: found.street && found.neighborhood ? "Endereco encontrado. Confira os dados e informe o numero." : "CEP encontrado. Complete a rua, o bairro e o numero." });
        if (document.activeElement === postalRef.current && found.street && found.neighborhood) numberRef.current?.focus();
      } catch (error) {
        if (!controller.signal.aborted) setStatus({ loading: false, failed: true, message: error instanceof Error ? error.message : "Consulta indisponivel. Preencha o endereco manualmente." });
      }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [code, fulfillmentMethod, retry]);

  const outsideCoverage = code.length === 8 && !getDeliveryAvailability(code).available;
  const fieldClass = "checkout-field h-12 w-full min-w-0 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink outline-none transition hover:border-ink/25 focus:border-brand focus:ring-4 focus:ring-brand/10";
  function field(label: string, key: keyof Address, maxLength: number, autoComplete = "off", placeholder = "") {
    return <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink"><span>{compact && key === "complement" ? <>Complemento<span className="sr-only"> (opcional)</span></> : label}</span><input autoComplete={autoComplete} className={fieldClass} maxLength={maxLength} name={key} onChange={(event) => onAddress((current) => ({ ...current, [key]: key === "state" ? event.target.value.replace(/[^a-z]/gi, "").toUpperCase() : event.target.value }))} placeholder={placeholder} ref={key === "number" ? numberRef : undefined} required={key !== "complement"} value={address[key]} /></label>;
  }
  return <div className={compact ? "checkout-delivery-compact" : undefined}>
    {!compact && <><h2 className="text-lg font-black text-ink">Como deseja receber?</h2><p className="mt-2 text-sm leading-6 text-muted">Consulte a entrega pelo CEP ou retire na Wimifarma.</p></>}
    <fieldset className={`${compact ? "mt-0" : "mt-6 sm:grid-cols-2"} grid gap-3`}><legend className="sr-only">Entrega ou retirada</legend>
      {([{ value: "DELIVERY", label: "Receber em casa", detail: "Consulte a cobertura pelo CEP", Icon: MapPin }, { value: "PICKUP", label: "Retirar na farmacia", detail: "Av. Minas Gerais, 2263", Icon: Store }] as const).map(({ value, label, detail, Icon }) => <label className={`relative flex ${compact ? "min-h-20" : "min-h-24"} cursor-pointer items-center gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-brand ${fulfillmentMethod === value ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40 hover:bg-surface-subtle/50"}`} key={value}><input checked={fulfillmentMethod === value} className="sr-only" name="fulfillment" onChange={() => onMethod(value)} type="radio" value={value} /><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white"><Icon className="h-4 w-4 text-brand" /></span><span className="min-w-0"><strong className="block text-sm text-ink">{label}</strong><span className="mt-1 block text-xs leading-5 text-muted">{detail}</span></span>{fulfillmentMethod === value && <Check className="ml-auto h-4 w-4 shrink-0 text-brand" />}</label>)}
    </fieldset>
    {fulfillmentMethod === "DELIVERY" ? <>
      <div className={`delivery-address-grid mt-5 grid min-w-0 items-end gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-12"}`}>
        <label className={`grid min-w-0 gap-2 text-sm font-semibold text-ink ${compact ? "" : "lg:col-span-3"}`}><span>CEP</span><input autoComplete="postal-code" className={fieldClass} inputMode="numeric" maxLength={9} name="postalCode" onChange={(event) => { const postalCode = formatPostalCode(event.target.value); onAddress((current) => normalizePostalCode(current.postalCode) === normalizePostalCode(postalCode) ? { ...current, postalCode } : { ...current, postalCode, street: "", neighborhood: "", city: "", state: "" }); }} placeholder="00000-000" ref={postalRef} required value={address.postalCode} /></label>
        <div className={compact ? "" : "lg:col-span-3"}>{field("Numero", "number", 20, "off", "Nº da casa")}</div>
        <div className={compact ? "col-span-2" : "lg:col-span-6"}>{field("Endereco", "street", 120, "address-line1", "Rua ou avenida")}</div>
        <div className={compact ? "" : "lg:col-span-4"}>{field("Bairro", "neighborhood", 80, "address-level3")}</div>
        <div className={compact ? "" : "lg:col-span-4"}>{field("Complemento (opcional)", "complement", 80, "off", "Apto, bloco, referência")}</div>
        <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem] gap-3 ${compact ? "col-span-2" : "lg:col-span-4"}`}>{field("Cidade", "city", 80, "address-level2")}{field("UF", "state", 2, "address-level1")}</div>
      </div>
      <div aria-live="polite" className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted">{status.loading && <Loader2 className="h-4 w-4 animate-spin" />}<span>{status.message}</span>{status.failed && <button className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded px-2 font-bold text-brand focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setRetry((value) => value + 1)} type="button"><RotateCw className="h-3 w-3" />Tentar novamente</button>}</div>
      {code.length === 8 && !outsideCoverage && <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><strong className="block">Entrega local · Grátis</strong>Equipe Wimifarma. Prazo e disponibilidade confirmados no atendimento.</div>}
      {outsideCoverage && <CheckoutShippingOptions key={code} postalCode={code} selected={shippingSelection} onSelect={onShipping} discountCents={discountCents} available={carrierShippingAvailable} onPickup={() => onMethod("PICKUP")} />}
    </> : <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="font-bold text-ink">Retirada gratuita na Wimifarma</p><p className="mt-1 text-sm text-muted">Av. Minas Gerais, 2263, Ivate-PR</p><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-pharma-green"><Store className="mt-0.5 h-4 w-4 shrink-0" />Aguarde a equipe confirmar que o pedido esta pronto.</p></div>}
    <p className="mt-4 text-xs leading-5 text-muted">Frete grátis a partir de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(FREE_SHIPPING_THRESHOLD_CENTS / 100)} em produtos após descontos, inclusive para outras cidades com frete disponível.</p>
  </div>;
}
