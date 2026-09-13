"use client";

import Link from "next/link";
import { useRef, useState, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Loader2, PackageCheck, QrCode, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useCheckoutSession } from "@/hooks/use-checkout-session";
import { checkoutStepError, type CheckoutDraft } from "@/features/orders/checkout-draft";
import { CheckoutDeliveryStep } from "@/components/site/checkout-delivery-step";
import { getDeliveryAvailability, normalizePostalCode } from "@/features/products/product-detail";

type Step = 0 | 1 | 2 | 3;
type FulfillmentMethod = "DELIVERY" | "PICKUP";
type PaymentMethod = "PIX" | "CARD_ON_DELIVERY" | "CASH";
type OrderResult = { number: string; totalCents: number };

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const steps = ["Identificacao", "Entrega", "Pagamento", "Revisao"];

export function CheckoutPage({ initialCustomer, draftOwner = "guest" }: { initialCustomer: { name: string; phone: string; email: string; street: string; neighborhood: string }; draftOwner?: string }) {
  const { clearCart, hydrated, items, subtotalCents } = useCart();
  const { draft, setDraft, step, goToStep, back, ready, clearDraft } = useCheckoutSession({
    customer: { name: initialCustomer.name, phone: initialCustomer.phone, email: initialCustomer.email },
    address: { postalCode: "", street: initialCustomer.street, number: "", complement: "", neighborhood: initialCustomer.neighborhood, city: "", state: "" },
    fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", notes: "",
  }, draftOwner);
  const { customer, fulfillmentMethod, address, paymentMethod, notes } = draft;
  function setPart<K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function setAddress(value: SetStateAction<CheckoutDraft["address"]>) { setDraft((current) => ({ ...current, address: typeof value === "function" ? value(current.address) : value })); }
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const sending = useRef(false);

  if (!hydrated || !ready) return <CheckoutShell><div className="h-72 animate-pulse rounded-lg border border-line bg-white" /></CheckoutShell>;
  if (order) return <CheckoutSuccess order={order} />;
  if (items.length === 0) return <CheckoutShell><div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-line bg-white px-5 text-center"><PackageCheck className="h-12 w-12 text-brand" /><h1 className="mt-4 text-2xl font-black text-ink">Nenhum item para finalizar</h1><Link className="mt-6 rounded-md bg-brand px-5 py-3 text-sm font-black text-white" href="/">Voltar para as ofertas</Link></div></CheckoutShell>;

  function validateCurrentStep() {
    const message = checkoutStepError(step, draft);
    setError(message ?? "");
    return !message;
  }

  function nextStep() {
    if (validateCurrentStep()) goToStep(step + 1);
  }

  async function submitOrder() {
    if (sending.current) return;
    const invalid = checkoutStepError(0, draft) || checkoutStepError(1, draft);
    if (invalid) { setError(invalid); return; }
    if (!privacyConsent) {
      setError("Confirme a politica de privacidade para enviar o pedido.");
      return;
    }
    sending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fulfillmentMethod === "DELIVERY" ? address : undefined,
          customer,
          fulfillmentMethod,
          items: items.map((item) => ({ productId: item.id, quantity: item.quantity, expectedUnitPriceCents: item.unitPriceCents })),
          notes,
          paymentMethod,
          privacyConsent,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Nao foi possivel confirmar o envio. Consulte a equipe antes de tentar novamente.");
      if (typeof payload?.data?.number !== "string" || !Number.isSafeInteger(payload?.data?.totalCents)) throw new Error("Nao foi possivel confirmar o envio. Consulte a equipe antes de tentar novamente.");
      setOrder({ number: payload.data.number, totalCents: payload.data.totalCents });
      clearDraft();
      clearCart();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel enviar o pedido.");
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <CheckoutShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link className="group inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-bold text-muted transition hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={step === 0 ? "/carrinho" : "#"} onClick={(event) => { if (step > 0) { event.preventDefault(); setError(""); back(); } }}>
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          Voltar
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-pharma-green"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Pedido com confirmacao</span>
      </div>
      <CheckoutProgress step={step} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_18px_50px_rgba(17,24,39,0.07)]">
          <div className="h-1 bg-brand" />
          <div className="p-5 sm:p-7">
            <div className="animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none" key={step}>
              {step === 0 ? <IdentificationStep customer={customer} onChange={(value) => setPart("customer", value)} /> : null}
              {step === 1 ? <CheckoutDeliveryStep address={address} fulfillmentMethod={fulfillmentMethod} onAddress={setAddress} onMethod={(value) => setPart("fulfillmentMethod", value)} /> : null}
              {step === 2 ? <PaymentStep fulfillmentMethod={fulfillmentMethod} method={paymentMethod} onChange={(value) => setPart("paymentMethod", value)} /> : null}
              {step === 3 ? <ReviewStep address={address} customer={customer} fulfillmentMethod={fulfillmentMethod} items={items} notes={notes} onNotes={(value) => setPart("notes", value)} onPrivacy={setPrivacyConsent} paymentMethod={paymentMethod} privacyConsent={privacyConsent} /> : null}
              {error ? <p className="mt-5 rounded-md border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-bold text-brand" role="alert">{error}</p> : null}
              <div className="mt-7 flex justify-end">
                {step < 3 ? (
                  <button className="group inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,16,46,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_16px_32px_rgba(200,16,46,0.28)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto sm:min-w-44" onClick={nextStep} type="button">
                    Continuar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </button>
                ) : (
                  <button className="group inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,16,46,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-48" disabled={submitting} onClick={submitOrder} type="button">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    {submitting ? "Enviando pedido..." : "Enviar pedido"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        <OrderSummary postalCode={address.postalCode} fulfillmentMethod={fulfillmentMethod} itemCount={items.reduce((total, item) => total + item.quantity, 0)} subtotalCents={subtotalCents} />
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <section className="min-h-[75vh] bg-[#f4f6f8] px-4 pb-24 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-52"><div className="mx-auto max-w-7xl">{children}</div></section>; }

function CheckoutProgress({ step }: { step: Step }) {
  return (
    <ol className="grid grid-cols-4 rounded-lg border border-line bg-white px-2 py-4 shadow-[0_10px_30px_rgba(17,24,39,0.05)] sm:px-6" aria-label="Etapas do checkout">
      {steps.map((label, index) => (
        <li aria-current={step === index ? "step" : undefined} className={`relative grid min-w-0 justify-items-center gap-2 text-center text-[0.68rem] font-black sm:text-xs ${index < step ? "text-pharma-green" : index === step ? "text-brand" : "text-muted"}`} key={label}>
          {index < steps.length - 1 ? <span aria-hidden="true" className={`absolute left-[calc(50%+1.125rem)] top-[1.1rem] h-0.5 w-[calc(100%-2.25rem)] transition-colors duration-300 ${index < step ? "bg-pharma-green" : "bg-line"}`} /> : null}
          <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 shadow-sm transition-all duration-300 ${index < step ? "border-pharma-green bg-pharma-green text-white" : index === step ? "border-brand bg-brand text-white shadow-[0_6px_16px_rgba(200,16,46,0.22)]" : "border-line bg-white text-muted"}`}>{index < step ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}</span>
          <span className="relative z-10 leading-4">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid gap-2 text-sm font-black text-ink"><span>{label}</span><input {...props} className="checkout-field h-12 w-full rounded-md border border-line bg-white px-3 font-body text-sm font-semibold text-ink outline-none transition-all duration-200 placeholder:text-muted/70 hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-[#f4f6f8] disabled:text-muted" /></label>; }

function IdentificationStep({ customer, onChange }: { customer: { name: string; phone: string; email: string }; onChange: (value: { name: string; phone: string; email: string }) => void }) { return <div><h1 className="text-2xl font-black text-ink">Quem esta comprando?</h1><p className="mt-2 text-sm text-muted">Usaremos estes dados para confirmar o pedido.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field autoComplete="name" label="Nome completo" maxLength={120} onChange={(event) => onChange({ ...customer, name: event.target.value })} required value={customer.name} /></div><Field autoComplete="tel" inputMode="tel" label="WhatsApp / telefone" maxLength={20} onChange={(event) => onChange({ ...customer, phone: event.target.value })} required value={customer.phone} /><Field autoComplete="email" label="E-mail (opcional)" maxLength={160} onChange={(event) => onChange({ ...customer, email: event.target.value })} type="email" value={customer.email} /></div></div>; }


function PaymentStep({ method, onChange, fulfillmentMethod }: { method: PaymentMethod; onChange: (value: PaymentMethod) => void; fulfillmentMethod: FulfillmentMethod }) {
  const when = fulfillmentMethod === "PICKUP" ? "na retirada" : "na entrega";
  const choices = [
    { value: "PIX", label: "Pix", description: "A equipe envia os dados depois de confirmar o pedido.", Icon: QrCode },
    { value: "CARD_ON_DELIVERY", label: "Cartao", description: `Credito ou debito ${when}, na maquininha.`, Icon: CreditCard },
    { value: "CASH", label: "Dinheiro", description: `Pagamento ${when}. Informe o troco na revisao.`, Icon: Banknote },
  ] as const;
  return <div><h1 className="text-2xl font-black text-ink">Como prefere pagar?</h1><p className="mt-2 text-sm leading-6 text-muted">Escolha a forma de pagamento. Nenhum valor sera cobrado agora.</p>
    <fieldset className="mt-6 grid gap-3"><legend className="sr-only">Forma de pagamento</legend>{choices.map(({ value, label, description, Icon }) => <label className={`flex min-h-24 cursor-pointer items-center gap-4 rounded-md border p-4 transition focus-within:ring-2 focus-within:ring-brand ${method === value ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40"}`} key={value}>
      <input checked={method === value} className="sr-only" name="paymentMethod" onChange={() => onChange(value)} type="radio" value={value} />
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${method === value ? "bg-brand text-white" : "bg-surface-subtle text-muted"}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0"><strong className="block text-sm text-ink">{label}</strong><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span><span className="ml-auto w-5 shrink-0 text-brand">{method === value && <Check className="h-5 w-5" aria-hidden="true" />}</span>
    </label>)}</fieldset>
    <p className="mt-5 flex items-start gap-2 border-l-4 border-pharma-green bg-emerald-50 p-4 text-xs leading-5 text-ink"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" aria-hidden="true" /><span><strong className="block">Pagamento apos confirmacao</strong>A farmacia confere o pedido antes de combinar o pagamento. Nao pedimos dados do cartao neste site.</span></p>
  </div>;
}


function ReviewStep({ address, customer, fulfillmentMethod, items, notes, onNotes, onPrivacy, paymentMethod, privacyConsent }: { address: CheckoutDraft["address"]; customer: { name: string; phone: string; email: string }; fulfillmentMethod: FulfillmentMethod; items: Array<{ id: string; name: string; quantity: number; unitPriceCents: number }>; notes: string; onNotes: (value: string) => void; onPrivacy: (value: boolean) => void; paymentMethod: PaymentMethod; privacyConsent: boolean }) { const paymentLabels = { PIX: "Pix", CARD_ON_DELIVERY: "Cartao na entrega ou retirada", CASH: "Dinheiro" }; return <div><h1 className="text-2xl font-black text-ink">Revise seu pedido</h1><div className="mt-6 grid gap-5"><ReviewBlock label="Contato"><p>{customer.name}</p><p>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p></ReviewBlock><ReviewBlock label={fulfillmentMethod === "DELIVERY" ? "Entrega" : "Retirada"}><p>{fulfillmentMethod === "DELIVERY" ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}-${address.state}${address.complement ? ` - ${address.complement}` : ""}` : "Wimifarma - Av. Minas Gerais, 2263, Ivate-PR"}</p></ReviewBlock><ReviewBlock label="Pagamento"><p>{paymentLabels[paymentMethod]}</p></ReviewBlock><ReviewBlock label="Produtos">{items.map((item) => <p className="flex justify-between gap-3" key={item.id}><span>{item.quantity}x {item.name}</span><strong>{currency.format(item.quantity * item.unitPriceCents / 100)}</strong></p>)}</ReviewBlock><label className="grid gap-2 text-sm font-black text-ink"><span>Observacao (opcional)</span><textarea className="min-h-24 resize-y rounded-md border border-line p-3 font-body text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" maxLength={500} onChange={(event) => onNotes(event.target.value)} placeholder="Ex.: ponto de referencia ou troco necessario" value={notes} /></label><label className="flex items-start gap-3 rounded-md border border-line bg-surface-subtle p-4 text-sm font-semibold leading-5 text-muted"><input checked={privacyConsent} className="mt-1 h-4 w-4 accent-brand" onChange={(event) => onPrivacy(event.target.checked)} type="checkbox" /><span>Confirmo que revisei os dados e li a <Link className="font-black text-brand underline" href="/privacidade" target="_blank">Politica de Privacidade</Link>.</span></label></div></div>; }

function ReviewBlock({ children, label }: { children: React.ReactNode; label: string }) { return <div className="border-b border-line pb-4"><p className="mb-2 text-xs font-black uppercase text-brand">{label}</p><div className="grid gap-1 text-sm font-semibold leading-5 text-ink">{children}</div></div>; }

function OrderSummary({ postalCode, fulfillmentMethod, itemCount, subtotalCents }: { postalCode: string; fulfillmentMethod: FulfillmentMethod; itemCount: number; subtotalCents: number }) { const deliveryLabel = fulfillmentMethod === "PICKUP" ? "Gratis" : normalizePostalCode(postalCode).length < 8 ? "Consultar CEP" : getDeliveryAvailability(postalCode).available ? "Gratis" : "Indisponivel"; return <aside className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_18px_50px_rgba(17,24,39,0.08)] lg:sticky lg:top-52"><div className="h-1 bg-brand" /><div className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><PackageCheck className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-black uppercase text-brand">Seu carrinho</p><h2 className="text-lg font-black text-ink">Resumo do pedido</h2></div></div><span className="rounded-full bg-[#f4f6f8] px-3 py-1 text-xs font-black text-muted">{itemCount} {itemCount === 1 ? "item" : "itens"}</span></div><div className="mt-5 grid gap-3 rounded-md bg-[#f7f8fa] p-4 text-sm"><div className="flex justify-between gap-4 text-muted"><span>Produtos</span><span className="font-bold text-ink">{currency.format(subtotalCents / 100)}</span></div><div className="flex justify-between gap-4 text-muted"><span>{fulfillmentMethod === "DELIVERY" ? "Entrega" : "Retirada na loja"}</span><span className="font-black text-pharma-green">{deliveryLabel}</span></div></div><div className="mt-5 flex items-end justify-between border-t border-line pt-5"><span className="font-black text-ink">Total</span><strong className="text-3xl font-black text-brand">{currency.format(subtotalCents / 100)}</strong></div><div className="mt-5 flex items-start gap-3 rounded-md border border-emerald-100 bg-emerald-50/70 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" aria-hidden="true" /><p className="text-xs font-semibold leading-5 text-muted"><strong className="block text-pharma-green">Sem cobranca no site</strong>Preco e estoque sao conferidos antes da confirmacao.</p></div></div></aside>; }

function CheckoutSuccess({ order }: { order: OrderResult }) { const whatsapp = buildWhatsAppUrl(`Ola, acabei de enviar o pedido ${order.number} pelo site.`); return <CheckoutShell><div className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border border-line bg-white px-5 py-12 text-center shadow-sm"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#e9f9ef] text-pharma-green"><Check className="h-8 w-8" /></span><p className="mt-6 text-xs font-black uppercase text-pharma-green">Pedido recebido</p><h1 className="mt-2 text-3xl font-black text-ink">Aguardando confirmacao</h1><p className="mt-3 text-sm leading-6 text-muted">A farmacia vai conferir estoque, valores e os detalhes do atendimento.</p><div className="mt-6 rounded-md bg-surface-subtle px-5 py-4"><span className="block text-xs font-black uppercase text-muted">Numero do pedido</span><strong className="mt-1 block text-xl font-black text-brand">{order.number}</strong><span className="mt-2 block text-sm font-bold text-ink">{currency.format(order.totalCents / 100)}</span></div><div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 py-3 text-sm font-black text-ink" href="/">Voltar ao inicio</Link><a className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#20c864] px-5 py-3 text-sm font-black text-white" href={whatsapp} rel="noreferrer" target="_blank">Falar sobre o pedido</a></div></div></CheckoutShell>; }
