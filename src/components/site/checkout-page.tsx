"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Loader2, LockKeyhole, PackageCheck, QrCode, ShoppingBag, Truck, UserRound } from "lucide-react";
import { useCart } from "./cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useCheckoutSession } from "@/hooks/use-checkout-session";
import { checkoutStepError, type CheckoutDraft } from "@/features/orders/checkout-draft";
import { CheckoutDeliveryStep } from "./checkout-delivery-step";
import { CheckoutCashback } from "./checkout-cashback";
import { normalizePostalCode } from "@/features/products/product-detail";
import { customerShippingFee, FREE_SHIPPING_THRESHOLD_CENTS, isLocalDeliveryAddress } from "@/features/shipping/delivery-policy";
import { OnlinePayment } from "./online-payment";
import { PaymentCardForm, type SecureCardInput } from "./payment-card-form";

type PaymentConfig = { publicKey: string; environment: string; brands: { id: string; name: string; image: string | null }[] } | null;
type Result = { id: string; number: string; totalCents: number; paymentMethod: string };
type Props = { initialCustomer: { name: string; phone: string; email: string; street: string; neighborhood: string }; draftOwner?: string; isCustomer?: boolean; paymentConfig?: PaymentConfig };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(cents / 100);
const fieldClass = "checkout-field h-12 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";

export function CheckoutPage({ initialCustomer, draftOwner = "guest", isCustomer = false, paymentConfig = null }: Props) {
  const { clearCart, hydrated, items, subtotalCents } = useCart();
  const { draft, setDraft, ready, clearDraft } = useCheckoutSession({
    customer: { name: initialCustomer.name, phone: initialCustomer.phone, email: initialCustomer.email },
    address: { postalCode: "", street: initialCustomer.street, number: "", complement: "", neighborhood: initialCustomer.neighborhood, city: "", state: "" },
    fulfillmentMethod: "DELIVERY", paymentMethod: paymentConfig ? "ONLINE" : "PIX", onlineMethod: "pix", notes: "",
  }, draftOwner, true);
  const { customer, fulfillmentMethod, address, notes, shippingSelection } = draft;
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Result | null>(null);
  const [onlineOrder, setOnlineOrder] = useState<string | null>(null);
  const [cashbackRedeemCents, setCashbackRedeemCents] = useState(0);
  const sending = useRef(false);
  const requestAttempt = useRef<{ signature: string; id: string } | null>(null);
  const discountCents = Math.min(cashbackRedeemCents, subtotalCents);
  const cartKey = JSON.stringify(items.map(item => [item.id, item.quantity, item.unitPriceCents]));
  const previousCart = useRef(cartKey);
  const resumeKey = `wimifarma-active-payment:${draftOwner}`;
  useEffect(() => {
    try { const value = sessionStorage.getItem(resumeKey); if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) setOnlineOrder(value); } catch { /* Cookie authorization still permits the payment URL. */ }
  }, [resumeKey]);
  useEffect(() => {
    if (previousCart.current !== cartKey) { previousCart.current = cartKey; setDraft(current => ({ ...current, shippingSelection: undefined })); }
  }, [cartKey, setDraft]);
  const local = fulfillmentMethod === "PICKUP" || (!shippingSelection && isLocalDeliveryAddress(address));
  const method = draft.paymentMethod === "CASH" && local ? "cash" : !paymentConfig && draft.paymentMethod === "CARD_ON_DELIVERY" && local ? "manual-card" : draft.onlineMethod === "card" && paymentConfig ? "card" : "pix";
  const online = Boolean(paymentConfig && method !== "cash");
  const paymentMethod = online ? "ONLINE" : method === "cash" ? "CASH" : method === "manual-card" ? "CARD_ON_DELIVERY" : "PIX";
  const deliveryKnown = fulfillmentMethod === "PICKUP" || Boolean(shippingSelection) || isLocalDeliveryAddress(address);
  const fee = fulfillmentMethod === "PICKUP" ? 0 : customerShippingFee(shippingSelection?.priceCents ?? 0, subtotalCents, discountCents);
  const total = subtotalCents - discountCents + fee;
  const contactReady = !checkoutStepError(0, draft) && Boolean(customer.email.trim());
  const deliveryReady = !checkoutStepError(1, draft);
  function setAddress(value: SetStateAction<CheckoutDraft["address"]>) {
    setDraft(current => { const next = typeof value === "function" ? value(current.address) : value; return { ...current, address: next, shippingSelection: normalizePostalCode(next.postalCode) === normalizePostalCode(current.address.postalCode) ? current.shippingSelection : undefined }; });
  }
  function selectPayment(value: string) {
    setError(""); setDraft(current => ({ ...current, onlineMethod: value === "card" ? "card" : "pix", paymentMethod: value === "cash" ? "CASH" : value === "manual-card" ? "CARD_ON_DELIVERY" : paymentConfig ? "ONLINE" : "PIX" }));
  }
  function forgetActivePayment() {
    try { sessionStorage.removeItem(resumeKey); } catch { /* Optional persistence. */ }
  }
  function finishPayment() {
    forgetActivePayment(); setError("");
    clearDraft();
  }
  function resetPayment() {
    setOnlineOrder(null); requestAttempt.current = null;
    try { sessionStorage.removeItem(resumeKey); sessionStorage.removeItem(`wimifarma-checkout-attempt:${draftOwner}`); } catch { /* Optional persistence. */ }
  }
  async function submitOrder(card?: SecureCardInput) {
    if (sending.current) throw new Error("Já estamos enviando este pedido.");
    const invalid = checkoutStepError(0, draft) || checkoutStepError(1, draft);
    if (invalid || (online && !customer.email.trim()) || !privacyConsent) {
      const message = invalid || (online && !customer.email.trim() ? "Informe seu e-mail para receber a confirmação do pagamento." : "Revise os dados e confirme a política de privacidade.");
      setError(message); throw new Error(message);
    }
    sending.current = true; setSubmitting(true); setError("");
    try {
      const body = { address: fulfillmentMethod === "DELIVERY" ? address : undefined, customer, fulfillmentMethod,
        items: items.map(item => ({ productId: item.id, quantity: item.quantity, expectedUnitPriceCents: item.unitPriceCents })), notes, paymentMethod, privacyConsent,
        cashbackRedeemCents: discountCents, shippingToken: fulfillmentMethod === "DELIVERY" ? shippingSelection?.token : undefined };
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
      const signature = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
      const storageKey = `wimifarma-checkout-attempt:${draftOwner}`;
      try { const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); if (saved?.signature === signature && typeof saved.id === "string") requestAttempt.current = saved; } catch { /* In-memory attempt remains idempotent. */ }
      if (requestAttempt.current?.signature !== signature) requestAttempt.current = { signature, id: crypto.randomUUID() };
      try { sessionStorage.setItem(storageKey, JSON.stringify(requestAttempt.current)); } catch { /* Optional persistence. */ }
      const response = await fetch("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, checkoutRequestId: requestAttempt.current.id }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.data?.id !== "string" || typeof payload.data.number !== "string" || !Number.isSafeInteger(payload.data.totalCents)) throw new Error(payload?.error || "Não foi possível confirmar o envio. Consulte a equipe antes de repetir.");
      const result = payload.data as Result;
      if (result.paymentMethod === "ONLINE") {
        try { sessionStorage.setItem(resumeKey, result.id); sessionStorage.setItem(`wimifarma-payment-cart:${result.id}`, cartKey); sessionStorage.setItem(`wimifarma-payment-attempt:${result.id}`, storageKey); } catch { /* Secure cookie authorizes the payment page. */ }
        try {
          const payment = await fetch(`/api/pagamentos/${result.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card ?? { method: "pix", email: customer.email.trim() }) });
          const paymentPayload = await payment.json().catch(() => null);
          if (!payment.ok) throw new Error(paymentPayload?.error || "Consulte a situação do pagamento antes de tentar novamente.");
        } finally { setOnlineOrder(result.id); }
        return;
      }
      setOrder(result); requestAttempt.current = null;
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional persistence. */ }
      window.dispatchEvent(new Event("wimifarma:cashback-updated")); clearDraft(); clearCart();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível enviar o pedido."); throw caught; }
    finally { sending.current = false; setSubmitting(false); }
  }
  if (!hydrated || !ready) return <CheckoutShell><div className="h-96 animate-pulse rounded-2xl border border-line bg-white" /></CheckoutShell>;
  if (order) return <CheckoutSuccess order={order} />;
  if (!items.length && !onlineOrder) return <CheckoutShell><div className="rounded-2xl border border-line bg-white px-5 py-12 text-center"><PackageCheck className="mx-auto h-12 w-12 text-brand" /><h1 className="mt-4 text-2xl font-black">Seu carrinho está vazio</h1><Link className="mt-5 inline-block font-bold text-brand" href="/produtos">Encontrar produtos →</Link></div></CheckoutShell>;
  return <CheckoutShell>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link href="/carrinho" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"><ArrowLeft className="h-4 w-4" />Voltar ao carrinho</Link><h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">Finalize sua compra</h1><p className="mt-2 text-sm text-muted">Seus dados, entrega e pagamento em um só lugar.</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-pharma-green"><LockKeyhole className="h-4 w-4" />Conexão protegida · Mercado Pago</span></div>
    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,1.1fr)]">
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <PanelTitle number="1" Icon={UserRound} title="Seus dados" />
        <fieldset disabled={Boolean(onlineOrder) || submitting} className="mt-5 grid min-w-0 gap-4 disabled:opacity-70">
          <Field label="Nome completo" autoComplete="name" maxLength={120} required value={customer.name} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, name: event.target.value } }))} />
          <Field label="WhatsApp / telefone" autoComplete="tel" inputMode="tel" maxLength={20} required placeholder="+55 (44) 99999-9999" value={customer.phone} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, phone: event.target.value } }))} />
          <Field label={paymentConfig ? "E-mail" : "E-mail (opcional)"} autoComplete="email" type="email" maxLength={160} required={Boolean(paymentConfig)} value={customer.email} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, email: event.target.value } }))} />
          <label className="grid gap-2 text-sm font-semibold text-ink">Observação (opcional)<textarea className={`${fieldClass} h-20 resize-y py-3`} maxLength={500} value={notes} placeholder="Referência para entrega ou troco" onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></label>
        </fieldset>
        {!onlineOrder && <details className="mt-6 border-t border-line pt-4" open><summary className="cursor-pointer text-sm font-bold text-ink">Sua cesta · {items.reduce((n, item) => n + item.quantity, 0)} itens</summary><div className="mt-4 grid gap-3">{items.map(item => <div className="flex min-w-0 items-start gap-3" key={item.id}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-subtle text-xs font-bold">{item.quantity}×</span><p className="min-w-0 flex-1 text-xs leading-5 text-ink">{item.name}<strong className="block">{money(item.unitPriceCents * item.quantity)}</strong></p></div>)}</div></details>}
      </section>
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6"><PanelTitle number="2" Icon={Truck} title="Entrega ou retirada" /><fieldset disabled={Boolean(onlineOrder) || submitting} className="mt-5 min-w-0 disabled:opacity-70"><legend className="sr-only">Dados da entrega</legend><CheckoutDeliveryStep compact address={address} fulfillmentMethod={fulfillmentMethod} onAddress={setAddress} discountCents={discountCents} shippingSelection={shippingSelection} onMethod={value => setDraft(current => ({ ...current, fulfillmentMethod: value, shippingSelection: undefined }))} onShipping={value => setDraft(current => ({ ...current, shippingSelection: value }))} /></fieldset></section>
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6 md:col-span-2 xl:col-span-1">
        <PanelTitle number="3" Icon={ShoppingBag} title="Pagamento" />
        {onlineOrder ? <><OnlinePayment embedded orderId={onlineOrder} initialMethod={draft.onlineMethod ?? "pix"} onPaid={finishPayment} onTerminal={forgetActivePayment} onReview={resetPayment} />{error && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand" role="alert">{error}</p>}</> : <>
          <fieldset className="mt-5 grid grid-cols-2 gap-2" disabled={submitting}><legend className="sr-only">Forma de pagamento</legend><PaymentChoice selected={method === "pix"} onSelect={() => selectPayment("pix")} label="Pix" Icon={QrCode} /><PaymentChoice selected={method === "card" || method === "manual-card"} onSelect={() => selectPayment(paymentConfig ? "card" : "manual-card")} label="Cartão" Icon={CreditCard} disabled={!paymentConfig && !local} />{local && <div className="col-span-2"><PaymentChoice selected={method === "cash"} onSelect={() => selectPayment("cash")} label={fulfillmentMethod === "PICKUP" ? "Dinheiro na retirada" : "Dinheiro na entrega local"} Icon={Banknote} /></div>}</fieldset>
          <p className="mt-3 text-xs leading-5 text-muted">{method === "cash" ? "Apenas retirada ou entrega local em Ivaté e Douradina. Informe o troco nas observações." : method === "manual-card" ? "Pague na maquininha ao receber ou retirar." : !paymentConfig ? "A farmácia enviará os dados do Pix após confirmar o pedido." : method === "pix" ? "QR Code e copia e cola aqui na tela. Você terá 2 horas para pagar." : "Até 3x sem juros. Acima de 3x, juros e total calculados pelo Mercado Pago."}</p>
          {method === "card" && paymentConfig?.brands.length ? <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Bandeiras disponíveis no Mercado Pago">{paymentConfig.brands.map(brand => <span key={brand.id} className="grid h-7 min-w-10 place-items-center rounded border border-line px-1.5">{brand.image ? <Image unoptimized src={brand.image} alt={brand.name} width={36} height={20} className="h-5 w-auto max-w-12 object-contain" /> : <span className="text-[10px] font-semibold">{brand.name}</span>}</span>)}</div> : null}
          {isCustomer && <fieldset disabled={submitting}><CheckoutCashback subtotalCents={subtotalCents} selectedCents={discountCents} onSelect={setCashbackRedeemCents} /></fieldset>}
          <dl className="mt-5 grid gap-3 border-t border-line pt-5 text-sm"><SummaryLine label="Produtos" value={money(subtotalCents)} /><SummaryLine label={fulfillmentMethod === "PICKUP" ? "Retirada" : shippingSelection ? `${shippingSelection.carrier} · ${shippingSelection.service}` : "Entrega local"} value={!deliveryKnown ? "Consultar CEP" : fee === 0 ? "Grátis" : money(fee)} />{discountCents > 0 && <SummaryLine label="Cashback" value={`− ${money(discountCents)}`} />}</dl>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-5"><span className="text-sm font-semibold">{deliveryKnown ? "Total" : "Produtos · frete a calcular"}</span><strong className="text-3xl font-black tracking-tight text-ink">{money(total)}</strong></div>
          <p className="mt-3 text-xs text-pharma-green">{subtotalCents - discountCents >= FREE_SHIPPING_THRESHOLD_CENTS ? "Seu carrinho alcançou o frete grátis, sujeito a CEP e serviço disponível." : `Faltam ${money(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents + discountCents)} para frete grátis por transportadora.`}</p>
          <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted"><input checked={privacyConsent} className="mt-1 h-4 w-4 shrink-0 accent-brand" onChange={event => setPrivacyConsent(event.target.checked)} type="checkbox" /><span>Revisei meus dados e li a <Link className="font-bold text-brand underline" href="/privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
          {error && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand" role="alert">{error}</p>}
          {method === "card" && paymentConfig ? <div className="mt-5">{contactReady && deliveryReady && privacyConsent && total > 0 ? <PaymentCardForm publicKey={paymentConfig.publicKey} amountCents={total} email={customer.email.trim()} onSubmit={submitOrder} /> : <p className="rounded-lg bg-surface-subtle p-4 text-xs leading-5 text-muted">Preencha seus dados, selecione a entrega e confirme a política de privacidade para abrir os campos do cartão.</p>}</div> : <button type="button" disabled={submitting} onClick={() => void submitOrder().catch(() => undefined)} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-dark disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{submitting ? "Confirmando..." : online ? "Gerar Pix e finalizar" : "Confirmar pedido"}</button>}
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted"><LockKeyhole className="h-3 w-3" />{online ? "Dados do cartão protegidos pelo Mercado Pago" : "Preparação confirmada pela farmácia"}</p>
        </>}
      </section>
    </div>
  </CheckoutShell>;
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <section className="min-h-[75vh] bg-[#f5f6f8] px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-52"><div className="mx-auto max-w-[1440px]">{children}</div></section>; }
function PanelTitle({ number, Icon, title }: { number: string; Icon: typeof UserRound; title: string }) { return <div className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-black text-brand">{number}</span><h2 className="flex flex-1 items-center justify-between gap-2 text-lg font-black text-ink">{title}<Icon className="h-4 w-4 text-muted" /></h2></div>; }
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink"><span>{label}</span><input {...props} className={fieldClass} /></label>; }
function PaymentChoice({ selected, onSelect, label, Icon, disabled = false }: { selected: boolean; onSelect: () => void; label: string; Icon: typeof QrCode; disabled?: boolean }) { return <label className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus-within:ring-2 focus-within:ring-brand ${disabled ? "opacity-40" : selected ? "border-brand bg-brand-soft text-brand" : "border-line text-ink hover:border-brand/40"}`}><input type="radio" name="paymentMethod" className="sr-only" checked={selected} disabled={disabled} onChange={onSelect} /><Icon className="h-4 w-4 shrink-0" />{label}{selected && <Check className="h-3 w-3 shrink-0" />}</label>; }
function SummaryLine({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 justify-between gap-3"><dt className="min-w-0 text-muted">{label}</dt><dd className="shrink-0 font-semibold text-ink">{value}</dd></div>; }
function CheckoutSuccess({ order }: { order: Result }) { return <CheckoutShell><div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-8 text-center"><Check className="mx-auto h-12 w-12 text-pharma-green" /><h1 className="mt-5 text-3xl font-black">Pedido recebido</h1><p className="mt-3 text-sm text-muted">A farmácia confirmará a preparação e os detalhes da entrega ou retirada.</p><p className="mt-5 break-all font-bold text-brand">{order.number}</p><strong className="mt-2 block text-2xl">{money(order.totalCents)}</strong><div className="mt-6 flex flex-wrap justify-center gap-4"><Link href="/minha-conta" className="font-bold text-brand">Ver meus pedidos</Link><a href={buildWhatsAppUrl(`Olá, enviei o pedido ${order.number} pelo site.`)} target="_blank" rel="noreferrer" className="font-bold text-pharma-green">Falar com a farmácia</a></div></div></CheckoutShell>; }
