"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Loader2, MapPin, RotateCw, Store } from "lucide-react";
import type { CheckoutDraft } from "@/features/orders/checkout-draft";
import { postalAddressSchema } from "@/features/orders/postal-code";
import { formatPostalCode, getDeliveryAvailability, normalizePostalCode } from "@/features/products/product-detail";

type Address = CheckoutDraft["address"];
type Props = { address: Address; fulfillmentMethod: CheckoutDraft["fulfillmentMethod"]; onAddress: Dispatch<SetStateAction<Address>>; onMethod: (method: CheckoutDraft["fulfillmentMethod"]) => void };

export function CheckoutDeliveryStep({ address, fulfillmentMethod, onAddress, onMethod }: Props) {
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
  const fieldClass = "checkout-field h-12 w-full min-w-0 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";
  function field(label: string, key: keyof Address, maxLength: number, autoComplete = "off", placeholder = "") {
    return <label className="grid min-w-0 gap-2 text-sm font-black text-ink"><span>{label}</span><input autoComplete={autoComplete} className={fieldClass} maxLength={maxLength} name={key} onChange={(event) => onAddress((current) => ({ ...current, [key]: key === "state" ? event.target.value.replace(/[^a-z]/gi, "").toUpperCase() : event.target.value }))} placeholder={placeholder} ref={key === "number" ? numberRef : undefined} required={key !== "complement"} value={address[key]} /></label>;
  }
  return <div>
    <h1 className="text-2xl font-black text-ink">Como deseja receber?</h1>
    <p className="mt-2 text-sm leading-6 text-muted">Consulte a entrega pelo CEP ou retire na Wimifarma.</p>
    <fieldset className="mt-6 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Entrega ou retirada</legend>
      {([{ value: "DELIVERY", label: "Receber em casa", detail: "Consulte a cobertura pelo CEP", Icon: MapPin }, { value: "PICKUP", label: "Retirar na farmacia", detail: "Av. Minas Gerais, 2263", Icon: Store }] as const).map(({ value, label, detail, Icon }) => <label className={`relative flex min-h-24 cursor-pointer items-center gap-3 rounded-md border p-4 transition focus-within:ring-2 focus-within:ring-brand ${fulfillmentMethod === value ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40"}`} key={value}><input checked={fulfillmentMethod === value} className="sr-only" name="fulfillment" onChange={() => onMethod(value)} type="radio" value={value} /><Icon className="h-5 w-5 shrink-0 text-brand" /><span className="min-w-0"><strong className="block text-sm text-ink">{label}</strong><span className="mt-1 block text-xs text-muted">{detail}</span></span>{fulfillmentMethod === value && <Check className="ml-auto h-4 w-4 shrink-0 text-brand" />}</label>)}
    </fieldset>
    {fulfillmentMethod === "DELIVERY" ? <>
      <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <label className="grid min-w-0 gap-2 text-sm font-black text-ink lg:col-span-3"><span>CEP</span><input autoComplete="postal-code" className={fieldClass} inputMode="numeric" maxLength={9} name="postalCode" onChange={(event) => { const postalCode = formatPostalCode(event.target.value); onAddress((current) => normalizePostalCode(current.postalCode) === normalizePostalCode(postalCode) ? { ...current, postalCode } : { ...current, postalCode, street: "", neighborhood: "", city: "", state: "" }); }} placeholder="00000-000" ref={postalRef} required value={address.postalCode} /></label>
        <div className="lg:col-span-6">{field("Endereco", "street", 120, "address-line1", "Rua ou avenida")}</div>
        <div className="lg:col-span-3">{field("Numero", "number", 20, "off", "Numero da casa")}</div>
        <div className="lg:col-span-4">{field("Complemento (opcional)", "complement", 80, "off", "Apto, bloco ou referencia")}</div>
        <div className="lg:col-span-4">{field("Bairro", "neighborhood", 80, "address-level3")}</div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem] gap-3 lg:col-span-4">{field("Cidade", "city", 80, "address-level2")}{field("UF", "state", 2, "address-level1")}</div>
      </div>
      <div aria-live="polite" className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted">{status.loading && <Loader2 className="h-4 w-4 animate-spin" />}<span>{status.message}</span>{status.failed && <button className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded px-2 font-bold text-brand focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setRetry((value) => value + 1)} type="button"><RotateCw className="h-3 w-3" />Tentar novamente</button>}</div>
      {outsideCoverage && <div className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950" role="status"><strong>Entrega pelo site indisponivel para este CEP</strong><p className="mt-1">Seu endereco foi mantido. Voce pode retirar na farmacia ou consultar a equipe.</p><button className="mt-2 min-h-10 cursor-pointer font-bold underline" onClick={() => onMethod("PICKUP")} type="button">Escolher retirada</button></div>}
    </> : <div className="mt-6 border-l-4 border-pharma-green bg-emerald-50 p-5"><p className="font-bold text-ink">Retirada gratuita na Wimifarma</p><p className="mt-1 text-sm text-muted">Av. Minas Gerais, 2263, Ivate-PR</p><p className="mt-2 text-xs text-pharma-green">Aguarde a equipe confirmar que o pedido esta pronto.</p></div>}
  </div>;
}
