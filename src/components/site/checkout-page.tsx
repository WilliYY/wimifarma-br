"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, MapPin, PackageCheck, QrCode, ShieldCheck, Store } from "lucide-react";
import { useCart } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Step = 0 | 1 | 2 | 3;
type FulfillmentMethod = "DELIVERY" | "PICKUP";
type PaymentMethod = "PIX" | "CARD_ON_DELIVERY" | "CASH";
type OrderResult = { number: string; totalCents: number };

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const steps = ["Identificacao", "Entrega", "Pagamento", "Revisao"];

export function CheckoutPage({ initialCustomer }: { initialCustomer: { name: string; phone: string; email: string; street: string; neighborhood: string } }) {
  const { clearCart, hydrated, items, subtotalCents } = useCart();
  const [step, setStep] = useState<Step>(0);
  const [customer, setCustomer] = useState({ name: initialCustomer.name, phone: initialCustomer.phone, email: initialCustomer.email });
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("DELIVERY");
  const [address, setAddress] = useState({ postalCode: "", street: initialCustomer.street, number: "", complement: "", neighborhood: initialCustomer.neighborhood, city: "Ivate", state: "PR" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [notes, setNotes] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);

  if (!hydrated) return <CheckoutShell><div className="h-72 animate-pulse rounded-lg border border-line bg-white" /></CheckoutShell>;
  if (order) return <CheckoutSuccess order={order} />;
  if (items.length === 0) return <CheckoutShell><div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-line bg-white px-5 text-center"><PackageCheck className="h-12 w-12 text-brand" /><h1 className="mt-4 text-2xl font-black text-ink">Nenhum item para finalizar</h1><Link className="mt-6 rounded-md bg-brand px-5 py-3 text-sm font-black text-white" href="/">Voltar para as ofertas</Link></div></CheckoutShell>;

  function validateCurrentStep() {
    setError("");
    if (step === 0 && (customer.name.trim().length < 2 || customer.phone.replace(/\D/g, "").length < 10)) {
      setError("Informe seu nome e um telefone valido.");
      return false;
    }
    if (step === 0 && customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) {
      setError("Informe um e-mail valido ou deixe o campo vazio.");
      return false;
    }
    if (step === 1 && fulfillmentMethod === "DELIVERY" && (address.postalCode.replace(/\D/g, "").length !== 8 || !address.street.trim() || !address.number.trim() || !address.neighborhood.trim())) {
      setError("Preencha CEP, endereco, numero e bairro para entrega.");
      return false;
    }
    return true;
  }

  function nextStep() {
    if (validateCurrentStep()) setStep((current) => Math.min(current + 1, 3) as Step);
  }

  async function submitOrder() {
    if (!privacyConsent) {
      setError("Confirme a politica de privacidade para enviar o pedido.");
      return;
    }
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
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Nao foi possivel enviar o pedido.");
      setOrder({ number: payload.data.number, totalCents: payload.data.totalCents });
      clearCart();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CheckoutShell>
      <div className="mb-7 flex items-center justify-between gap-3"><Link className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-brand" href={step === 0 ? "/carrinho" : "#"} onClick={(event) => { if (step > 0) { event.preventDefault(); setError(""); setStep((step - 1) as Step); } }}><ArrowLeft className="h-4 w-4" />Voltar</Link><span className="text-xs font-black uppercase text-brand">Compra segura</span></div>
      <ol className="grid grid-cols-4 gap-1 border-b border-line pb-5" aria-label="Etapas do checkout">
        {steps.map((label, index) => <li aria-current={step === index ? "step" : undefined} className={`grid min-w-0 gap-2 text-center text-[0.68rem] font-black sm:text-xs ${index <= step ? "text-brand" : "text-muted"}`} key={label}><span className={`mx-auto grid h-8 w-8 place-items-center rounded-full border ${index < step ? "border-brand bg-brand text-white" : index === step ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span><span className="truncate">{label}</span></li>)}
      </ol>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-7">
          {step === 0 ? <IdentificationStep customer={customer} onChange={setCustomer} /> : null}
          {step === 1 ? <DeliveryStep address={address} fulfillmentMethod={fulfillmentMethod} onAddress={setAddress} onMethod={setFulfillmentMethod} /> : null}
          {step === 2 ? <PaymentStep method={paymentMethod} onChange={setPaymentMethod} /> : null}
          {step === 3 ? <ReviewStep address={address} customer={customer} fulfillmentMethod={fulfillmentMethod} items={items} notes={notes} onNotes={setNotes} onPrivacy={setPrivacyConsent} paymentMethod={paymentMethod} privacyConsent={privacyConsent} /> : null}
          {error ? <p className="mt-5 rounded-md border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-bold text-brand" role="alert">{error}</p> : null}
          {step < 3 ? <button className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-black text-white sm:w-auto" onClick={nextStep} type="button">Continuar <ArrowRight className="h-4 w-4" /></button> : <button className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-black text-white disabled:opacity-60 sm:w-auto" disabled={submitting} onClick={submitOrder} type="button">{submitting ? "Enviando pedido..." : "Confirmar pedido"}<Check className="h-4 w-4" /></button>}
        </div>
        <OrderSummary itemCount={items.reduce((total, item) => total + item.quantity, 0)} subtotalCents={subtotalCents} />
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <section className="min-h-[75vh] bg-surface-subtle px-4 pb-20 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pt-56"><div className="mx-auto max-w-6xl">{children}</div></section>; }

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid gap-2 text-sm font-black text-ink"><span>{label}</span><input {...props} className="h-12 rounded-md border border-line bg-white px-3 font-body text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" /></label>; }

function IdentificationStep({ customer, onChange }: { customer: { name: string; phone: string; email: string }; onChange: (value: { name: string; phone: string; email: string }) => void }) { return <div><h1 className="text-2xl font-black text-ink">Quem esta comprando?</h1><p className="mt-2 text-sm text-muted">Usaremos estes dados para confirmar o pedido.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field autoComplete="name" label="Nome completo" maxLength={120} onChange={(event) => onChange({ ...customer, name: event.target.value })} required value={customer.name} /></div><Field autoComplete="tel" inputMode="tel" label="WhatsApp / telefone" maxLength={20} onChange={(event) => onChange({ ...customer, phone: event.target.value })} required value={customer.phone} /><Field autoComplete="email" label="E-mail (opcional)" maxLength={160} onChange={(event) => onChange({ ...customer, email: event.target.value })} type="email" value={customer.email} /></div></div>; }

function DeliveryStep({ address, fulfillmentMethod, onAddress, onMethod }: { address: { postalCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string }; fulfillmentMethod: FulfillmentMethod; onAddress: (value: typeof address) => void; onMethod: (value: FulfillmentMethod) => void }) { return <div><h1 className="text-2xl font-black text-ink">Como deseja receber?</h1><div className="mt-6 grid gap-3 sm:grid-cols-2"><Choice active={fulfillmentMethod === "DELIVERY"} description="Entrega gratuita em Ivate-PR" icon={MapPin} label="Receber em casa" onClick={() => onMethod("DELIVERY")} /><Choice active={fulfillmentMethod === "PICKUP"} description="Av. Minas Gerais, 2263" icon={Store} label="Retirar na farmacia" onClick={() => onMethod("PICKUP")} /></div>{fulfillmentMethod === "DELIVERY" ? <div className="mt-6 grid gap-4 sm:grid-cols-[0.75fr_1.5fr_0.6fr]"><Field autoComplete="postal-code" inputMode="numeric" label="CEP" maxLength={10} onChange={(event) => onAddress({ ...address, postalCode: event.target.value })} value={address.postalCode} /><div className="sm:col-span-1"><Field autoComplete="address-line1" label="Endereco" maxLength={120} onChange={(event) => onAddress({ ...address, street: event.target.value })} value={address.street} /></div><Field autoComplete="address-line2" label="Numero" maxLength={20} onChange={(event) => onAddress({ ...address, number: event.target.value })} value={address.number} /><Field label="Complemento (opcional)" maxLength={80} onChange={(event) => onAddress({ ...address, complement: event.target.value })} value={address.complement} /><Field label="Bairro" maxLength={80} onChange={(event) => onAddress({ ...address, neighborhood: event.target.value })} value={address.neighborhood} /><div className="grid grid-cols-[1fr_5rem] gap-3"><Field disabled label="Cidade" value="Ivate" /><Field disabled label="UF" value="PR" /></div></div> : <div className="mt-6 rounded-md border border-pharma-green/25 bg-[#effbf4] p-4"><p className="font-black text-ink">Wimifarma</p><p className="mt-1 text-sm text-muted">Av. Minas Gerais, 2263, Ivate-PR</p><p className="mt-2 text-xs font-bold text-pharma-green">A equipe avisara quando o pedido estiver pronto.</p></div>}</div>; }

function PaymentStep({ method, onChange }: { method: PaymentMethod; onChange: (value: PaymentMethod) => void }) { return <div><h1 className="text-2xl font-black text-ink">Forma de pagamento</h1><p className="mt-2 text-sm text-muted">O pagamento acontece depois que a farmacia confirmar o pedido.</p><div className="mt-6 grid gap-3"><Choice active={method === "PIX"} description="A chave sera informada apos a confirmacao" icon={QrCode} label="Pix" onClick={() => onChange("PIX")} /><Choice active={method === "CARD_ON_DELIVERY"} description="Credito ou debito na entrega ou retirada" icon={CreditCard} label="Cartao" onClick={() => onChange("CARD_ON_DELIVERY")} /><Choice active={method === "CASH"} description="Pagamento em dinheiro na entrega ou retirada" icon={Banknote} label="Dinheiro" onClick={() => onChange("CASH")} /></div><p className="mt-5 flex items-start gap-2 text-xs font-semibold leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" />Nao solicitamos dados do cartao neste site.</p></div>; }

function Choice({ active, description, icon: Icon, label, onClick }: { active: boolean; description: string; icon: typeof MapPin; label: string; onClick: () => void }) { return <button aria-pressed={active} className={`flex min-h-20 items-center gap-4 rounded-md border p-4 text-left transition ${active ? "border-brand bg-brand-soft ring-2 ring-brand/10" : "border-line bg-white hover:border-brand/40"}`} onClick={onClick} type="button"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? "bg-brand text-white" : "bg-surface-subtle text-muted"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block text-sm font-black text-ink">{label}</strong><span className="mt-1 block text-xs font-semibold leading-4 text-muted">{description}</span></span>{active ? <Check className="ml-auto h-5 w-5 shrink-0 text-brand" /> : null}</button>; }

function ReviewStep({ address, customer, fulfillmentMethod, items, notes, onNotes, onPrivacy, paymentMethod, privacyConsent }: { address: { street: string; number: string; neighborhood: string }; customer: { name: string; phone: string; email: string }; fulfillmentMethod: FulfillmentMethod; items: Array<{ id: string; name: string; quantity: number; unitPriceCents: number }>; notes: string; onNotes: (value: string) => void; onPrivacy: (value: boolean) => void; paymentMethod: PaymentMethod; privacyConsent: boolean }) { const paymentLabels = { PIX: "Pix", CARD_ON_DELIVERY: "Cartao na entrega ou retirada", CASH: "Dinheiro" }; return <div><h1 className="text-2xl font-black text-ink">Revise seu pedido</h1><div className="mt-6 grid gap-5"><ReviewBlock label="Contato"><p>{customer.name}</p><p>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p></ReviewBlock><ReviewBlock label={fulfillmentMethod === "DELIVERY" ? "Entrega" : "Retirada"}><p>{fulfillmentMethod === "DELIVERY" ? `${address.street}, ${address.number} - ${address.neighborhood}, Ivate-PR` : "Wimifarma - Av. Minas Gerais, 2263, Ivate-PR"}</p></ReviewBlock><ReviewBlock label="Pagamento"><p>{paymentLabels[paymentMethod]}</p></ReviewBlock><ReviewBlock label="Produtos">{items.map((item) => <p className="flex justify-between gap-3" key={item.id}><span>{item.quantity}x {item.name}</span><strong>{currency.format(item.quantity * item.unitPriceCents / 100)}</strong></p>)}</ReviewBlock><label className="grid gap-2 text-sm font-black text-ink"><span>Observacao (opcional)</span><textarea className="min-h-24 resize-y rounded-md border border-line p-3 font-body text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" maxLength={500} onChange={(event) => onNotes(event.target.value)} placeholder="Ex.: ponto de referencia ou troco necessario" value={notes} /></label><label className="flex items-start gap-3 rounded-md border border-line bg-surface-subtle p-4 text-sm font-semibold leading-5 text-muted"><input checked={privacyConsent} className="mt-1 h-4 w-4 accent-brand" onChange={(event) => onPrivacy(event.target.checked)} type="checkbox" /><span>Confirmo que revisei os dados e li a <Link className="font-black text-brand underline" href="/privacidade" target="_blank">Politica de Privacidade</Link>.</span></label></div></div>; }

function ReviewBlock({ children, label }: { children: React.ReactNode; label: string }) { return <div className="border-b border-line pb-4"><p className="mb-2 text-xs font-black uppercase text-brand">{label}</p><div className="grid gap-1 text-sm font-semibold leading-5 text-ink">{children}</div></div>; }

function OrderSummary({ itemCount, subtotalCents }: { itemCount: number; subtotalCents: number }) { return <aside className="rounded-lg border border-line bg-white p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)] lg:sticky lg:top-56"><h2 className="text-lg font-black text-ink">Resumo do pedido</h2><div className="mt-5 flex justify-between text-sm text-muted"><span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span><span>{currency.format(subtotalCents / 100)}</span></div><div className="mt-3 flex justify-between text-sm text-muted"><span>Entrega ou retirada</span><span className="font-bold text-pharma-green">Gratis</span></div><div className="mt-5 flex items-end justify-between border-t border-line pt-5"><span className="font-black text-ink">Total</span><strong className="text-2xl font-black text-brand">{currency.format(subtotalCents / 100)}</strong></div><p className="mt-4 text-xs font-semibold leading-5 text-muted">Nenhum valor e cobrado agora. Preco e estoque sao conferidos ao enviar.</p></aside>; }

function CheckoutSuccess({ order }: { order: OrderResult }) { const whatsapp = buildWhatsAppUrl(`Ola, acabei de enviar o pedido ${order.number} pelo site.`); return <CheckoutShell><div className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border border-line bg-white px-5 py-12 text-center shadow-sm"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#e9f9ef] text-pharma-green"><Check className="h-8 w-8" /></span><p className="mt-6 text-xs font-black uppercase text-pharma-green">Pedido recebido</p><h1 className="mt-2 text-3xl font-black text-ink">Aguardando confirmacao</h1><p className="mt-3 text-sm leading-6 text-muted">A farmacia vai conferir estoque, valores e os detalhes do atendimento.</p><div className="mt-6 rounded-md bg-surface-subtle px-5 py-4"><span className="block text-xs font-black uppercase text-muted">Numero do pedido</span><strong className="mt-1 block text-xl font-black text-brand">{order.number}</strong><span className="mt-2 block text-sm font-bold text-ink">{currency.format(order.totalCents / 100)}</span></div><div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 py-3 text-sm font-black text-ink" href="/">Voltar ao inicio</Link><a className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#20c864] px-5 py-3 text-sm font-black text-white" href={whatsapp} rel="noreferrer" target="_blank">Falar sobre o pedido</a></div></div></CheckoutShell>; }
