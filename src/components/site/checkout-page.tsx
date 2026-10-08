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
import { OnlinePayment, type PaymentView } from "./online-payment";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";

type PaymentConfig = { publicKey: string; environment: string; brands: { id: string; name: string; image: string | null }[] } | null;
type Result = { id: string; number: string; totalCents: number; paymentMethod: string };
type Props = { initialCustomer: { name: string; phone: string; email: string; street: string; neighborhood: string }; draftOwner?: string; isCustomer?: boolean; paymentConfig?: PaymentConfig; carrierShippingAvailable?: boolean };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(cents / 100);
const fieldClass = "checkout-field h-13 w-full min-w-0 rounded-xl border border-line bg-white px-4 text-base font-medium text-ink outline-none transition hover:border-ink/25 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed";
const panelClass = "min-w-0 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-[0_8px_30px_-20px_rgba(17,24,39,0.18)] sm:p-6 2xl:p-7";

export function CheckoutPage({ initialCustomer, draftOwner = "guest", isCustomer = false, paymentConfig = null, carrierShippingAvailable = false }: Props) {
  const { clearCart, hydrated, items, itemCount, subtotalCents } = useCart();
  const { draft, setDraft, ready, clearDraft } = useCheckoutSession({
    customer: { name: initialCustomer.name, phone: initialCustomer.phone, email: initialCustomer.email },
    address: { postalCode: "", street: initialCustomer.street, number: "", complement: "", neighborhood: initialCustomer.neighborhood, city: "", state: "" },
    fulfillmentMethod: "DELIVERY", paymentMethod: paymentConfig ? "ONLINE" : "PIX", onlineMethod: "pix", notes: "",
  }, draftOwner, true);
  const { customer, fulfillmentMethod, address, notes, shippingSelection: storedShippingSelection } = draft;
  const requiresShippingSupport = items.some(requiresPharmacyShippingSupport);
  const shippingSelection = carrierShippingAvailable && !requiresShippingSupport ? storedShippingSelection : undefined;
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Result | null>(null);
  const [onlineOrder, setOnlineOrder] = useState<string | null>(null);
  const [initialPayment, setInitialPayment] = useState<PaymentView | null>(null);
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
  useEffect(() => {
    if (ready && hydrated && storedShippingSelection && (!carrierShippingAvailable || requiresShippingSupport)) setDraft(current => ({ ...current, shippingSelection: undefined }));
  }, [ready, hydrated, storedShippingSelection, carrierShippingAvailable, requiresShippingSupport, setDraft]);
  const local = fulfillmentMethod === "PICKUP" || (!shippingSelection && isLocalDeliveryAddress(address));
  const method = draft.paymentMethod === "CASH" && local ? "cash" : !paymentConfig && draft.paymentMethod === "CARD_ON_DELIVERY" && local ? "manual-card" : draft.onlineMethod === "card" && paymentConfig ? "card" : "pix";
  const online = Boolean(paymentConfig && method !== "cash");
  const paymentMethod = online ? "ONLINE" : method === "cash" ? "CASH" : method === "manual-card" ? "CARD_ON_DELIVERY" : "PIX";
  const deliveryKnown = fulfillmentMethod === "PICKUP" || Boolean(shippingSelection) || isLocalDeliveryAddress(address);
  const fee = fulfillmentMethod === "PICKUP" ? 0 : customerShippingFee(shippingSelection?.priceCents ?? 0, subtotalCents, discountCents);
  const total = subtotalCents - discountCents + fee;
  const contactReady = !checkoutStepError(0, draft) && (!online || Boolean(customer.email.trim()));
  const deliveryReady = !checkoutStepError(1, { ...draft, shippingSelection });
  const carrierDestination = normalizePostalCode(address.postalCode).length === 8 && !isLocalDeliveryAddress(address);
  const shippingStatus = !carrierDestination ? "Informe o CEP" : requiresShippingSupport ? "Atendimento" : !carrierShippingAvailable ? "Indisponível" : "Selecione o frete";
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
    setOnlineOrder(null); setInitialPayment(null); requestAttempt.current = null;
    try { sessionStorage.removeItem(resumeKey); sessionStorage.removeItem(`wimifarma-checkout-attempt:${draftOwner}`); } catch { /* Optional persistence. */ }
  }
  async function submitOrder() {
    if (sending.current) throw new Error("Já estamos enviando este pedido.");
    const carrierBlocked = fulfillmentMethod === "DELIVERY" && carrierDestination && !shippingSelection && (!carrierShippingAvailable || requiresShippingSupport);
    const invalid = checkoutStepError(0, draft) || (carrierBlocked ? requiresShippingSupport ? "Este carrinho precisa de atendimento farmacêutico. Escolha retirada ou fale com a equipe." : "A entrega por transportadora está indisponível. Escolha retirada ou fale com a equipe." : checkoutStepError(1, { ...draft, shippingSelection }));
    if (invalid || (online && !customer.email.trim()) || !privacyConsent) {
      const message = invalid || (online && !customer.email.trim() ? "Informe seu e-mail para receber a confirmação do pagamento." : "Revise os dados e confirme a política de privacidade.");
      setError(message); throw new Error(message);
    }
    sending.current = true; setSubmitting(true); setError("");
    try {
      const body = { address: fulfillmentMethod === "DELIVERY" ? address : undefined, customer, fulfillmentMethod,
        items: items.map(item => ({ productId: item.id, quantity: item.quantity, expectedUnitPriceCents: item.unitPriceCents })), notes, paymentMethod, privacyConsent,
        cashbackRedeemCents: discountCents, shippingToken: fulfillmentMethod === "DELIVERY" ? shippingSelection?.token : undefined,
        ...(online ? { onlineMethod: method === "card" ? "card" : "pix", onlineInstallments: method === "card" ? draft.onlineInstallments ?? 1 : 1 } : {}) };
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
          if (method === "card") return;
          const payment = await fetch(`/api/pagamentos/${result.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "pix", email: customer.email.trim() }) });
          const paymentPayload = await payment.json().catch(() => null);
          if (!payment.ok) throw new Error(paymentPayload?.error || "Consulte a situação do pagamento antes de tentar novamente.");
          if (paymentPayload?.data?.orderId === result.id) setInitialPayment(paymentPayload.data);
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
    <Link href="/carrinho" className="mb-5 inline-flex min-h-8 items-center gap-2 rounded-md text-sm font-semibold text-muted transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"><ArrowLeft className="h-4 w-4" />Voltar ao carrinho</Link>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-white px-5 py-6 sm:px-7">
      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand">Sua compra na Wimifarma</p>
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">Finalize sua compra</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Tudo em uma página. Confira seus dados e escolha como receber.</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-surface-subtle px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-pharma-green"><LockKeyhole className="h-5 w-5" /></span>
        <div><strong className="block text-sm font-bold text-ink">Conexão protegida</strong><span className="mt-1 block text-xs text-muted">Checkout Wimifarma</span></div>
      </div>
    </header>
    <div className="grid items-start gap-6 md:grid-cols-2 min-[86.25rem]:grid-cols-3 min-[86.25rem]:items-stretch">
      <section className={panelClass} data-checkout-panel="customer">
        <PanelTitle number="1" Icon={UserRound} title="Seus dados" description="Para acompanhar e receber seu pedido." complete={contactReady} />
        <fieldset disabled={Boolean(onlineOrder) || submitting} className="mt-5 grid min-w-0 gap-4 disabled:opacity-70">
          <Field label="Nome completo" autoComplete="name" maxLength={120} required value={customer.name} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, name: event.target.value } }))} />
          <Field label="WhatsApp / telefone" autoComplete="tel" inputMode="tel" maxLength={20} required placeholder="+55 (44) 99999-9999" value={customer.phone} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, phone: event.target.value } }))} />
          <Field label={online ? "E-mail" : "E-mail (opcional)"} autoComplete="email" type="email" maxLength={160} required={online} value={customer.email} onChange={event => setDraft(current => ({ ...current, customer: { ...current.customer, email: event.target.value } }))} />
          <label className="grid gap-2 text-sm font-semibold text-ink">Observação (opcional)<textarea className={`${fieldClass} h-20 resize-y py-3`} maxLength={500} value={notes} placeholder="Referência para entrega ou troco" onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></label>
        </fieldset>
        {!onlineOrder && <details className="mt-6 rounded-xl border border-line bg-surface-subtle/60 p-4" open>
          <summary className="cursor-pointer text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-brand">Sua cesta · {itemCount} {itemCount === 1 ? "item" : "itens"}</summary>
          <div className="mt-4 grid gap-4">{items.map(item => <div className="flex min-w-0 items-center gap-3" key={item.id}>
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-white p-1.5">
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={56} height={56} sizes="56px" className="h-full w-full object-contain" /> : <ShoppingBag className="h-5 w-5 text-muted" />}
              <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white" aria-label={`${item.quantity} unidades`}>{item.quantity}</span>
            </div>
            <div className="min-w-0 flex-1"><p className="text-xs font-medium leading-5 text-ink">{item.name}</p><strong className="mt-1 block text-sm font-black text-ink">{money(item.unitPriceCents * item.quantity)}</strong></div>
          </div>)}</div>
          <Link href="/carrinho" className="mt-4 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-brand hover:underline">Editar minha cesta<ArrowRight className="h-3 w-3" /></Link>
        </details>}
      </section>
      <section className={panelClass} data-checkout-panel="delivery"><PanelTitle number="2" Icon={Truck} title="Entrega ou retirada" description="Escolha a opção mais conveniente." complete={deliveryReady} /><fieldset disabled={Boolean(onlineOrder) || submitting} className="mt-5 min-w-0 disabled:opacity-70"><legend className="sr-only">Dados da entrega</legend><CheckoutDeliveryStep compact carrierShippingAvailable={carrierShippingAvailable} address={address} fulfillmentMethod={fulfillmentMethod} onAddress={setAddress} discountCents={discountCents} shippingSelection={shippingSelection} onMethod={value => setDraft(current => ({ ...current, fulfillmentMethod: value, shippingSelection: undefined }))} onShipping={value => setDraft(current => ({ ...current, shippingSelection: value }))} /></fieldset></section>
      <section className={`${panelClass} relative md:col-span-2 min-[86.25rem]:col-span-1`} data-checkout-panel="payment">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
        <PanelTitle number="3" Icon={CreditCard} title="Pagamento" description="Confira o total e finalize com segurança." />
        {onlineOrder ? <><OnlinePayment embedded orderId={onlineOrder} initialData={initialPayment} initialMethod={draft.onlineMethod ?? "pix"} onPaid={finishPayment} onTerminal={forgetActivePayment} onReview={resetPayment} />{error && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand" role="alert">{error}</p>}</> : <>
          <fieldset className="mt-5 grid grid-cols-2 gap-2" disabled={submitting}><legend className="sr-only">Forma de pagamento</legend><PaymentChoice selected={method === "pix"} onSelect={() => selectPayment("pix")} label="Pix" detail="Pagamento à vista" Icon={QrCode} /><PaymentChoice selected={method === "card" || method === "manual-card"} onSelect={() => selectPayment(paymentConfig ? "card" : "manual-card")} label="Cartão" detail={paymentConfig ? "Até 3x sem juros" : "Na maquininha"} Icon={CreditCard} disabled={!paymentConfig && !local} />{local && <div className="col-span-2"><PaymentChoice selected={method === "cash"} onSelect={() => selectPayment("cash")} label={fulfillmentMethod === "PICKUP" ? "Dinheiro na retirada" : "Dinheiro na entrega local"} detail="Pague ao receber" Icon={Banknote} /></div>}</fieldset>
          <p className="mt-3 text-xs leading-5 text-muted">{method === "cash" ? "Apenas retirada ou entrega local em Ivaté e Douradina. Informe o troco nas observações." : method === "manual-card" ? "Pague na maquininha ao receber ou retirar." : !paymentConfig ? "A farmácia enviará os dados do Pix após confirmar o pedido." : method === "pix" ? "QR Code e copia e cola aqui na tela. Você terá 2 horas para pagar." : "Até 3x sem juros. Acima de 3x, juros e total calculados pelo Mercado Pago."}</p>
          {method === "card" && paymentConfig?.brands.length ? <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Bandeiras disponíveis no Mercado Pago">{paymentConfig.brands.map(brand => <span key={brand.id} className="grid h-7 min-w-10 place-items-center rounded border border-line px-1.5">{brand.image ? <Image unoptimized src={brand.image} alt={brand.name} width={36} height={20} className="h-5 w-auto max-w-12 object-contain" /> : <span className="text-[10px] font-semibold">{brand.name}</span>}</span>)}</div> : null}
          {isCustomer && <fieldset disabled={submitting}><CheckoutCashback subtotalCents={subtotalCents} selectedCents={discountCents} onSelect={setCashbackRedeemCents} /></fieldset>}
          <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface-subtle/50" aria-label="Resumo da compra">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand"><ShoppingBag className="h-4 w-4" /></span><h3 className="flex-1 text-sm font-black text-ink">Resumo da compra</h3><span className="text-xs text-muted">{itemCount} {itemCount === 1 ? "item" : "itens"}</span></div>
            <dl className="grid gap-3 px-4 py-4 text-sm"><SummaryLine label="Produtos" value={money(subtotalCents)} /><SummaryLine label={fulfillmentMethod === "PICKUP" ? "Retirada" : shippingSelection ? `${shippingSelection.carrier} · ${shippingSelection.service}` : deliveryKnown ? "Entrega local" : "Frete"} value={!deliveryKnown ? shippingStatus : fee === 0 ? "Grátis" : money(fee)} />{discountCents > 0 && <SummaryLine label="Cashback" value={`− ${money(discountCents)}`} />}</dl>
            <div className="border-t border-line bg-white px-4 py-4"><div className="flex flex-wrap items-end justify-between gap-2"><span className="text-sm font-bold text-ink">{deliveryKnown ? "Total do pedido" : "Subtotal"}</span><strong className="text-3xl font-black tracking-tight text-brand">{money(total)}</strong></div>{!deliveryKnown && <p className="mt-2 text-xs leading-5 text-muted">O total será atualizado ao escolher uma entrega disponível.</p>}</div>
          </section>
          <FreeShippingProgress eligibleCents={subtotalCents - discountCents} />
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-muted"><input checked={privacyConsent} className="mt-1 h-5 w-5 shrink-0 accent-brand" onChange={event => setPrivacyConsent(event.target.checked)} type="checkbox" /><span>Finalizar com os dados informados, conforme a <Link className="font-bold text-brand underline" href="/privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
          {error && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand" role="alert">{error}</p>}
          {method === "card" && paymentConfig && <label className="mt-5 grid gap-2 text-sm font-semibold">Como pagar no cartão<select className={fieldClass} value={draft.onlineInstallments ?? 1} onChange={event => setDraft(current => ({ ...current, onlineInstallments: Number(event.target.value) }))}><option value={1}>À vista · uma parcela</option><option value={12}>Parcelar · escolher parcelas no formulário</option></select><span className="text-xs leading-5 text-muted">Você confere os campos seguros, as parcelas e o total antes de pagar.</span></label>}
          <button type="button" disabled={submitting} onClick={() => void submitOrder().catch(() => undefined)} className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-dark disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{submitting ? "Confirmando..." : online ? method === "card" ? "Continuar para pagar com cartão" : "Gerar Pix e finalizar" : "Confirmar pedido"}</button>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />{online ? "Pagamento protegido · Checkout Wimifarma" : "Preparação confirmada pela farmácia"}</p>
        </>}
      </section>
    </div>
  </CheckoutShell>;
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <section className="min-h-[75vh] bg-[#f5f6f8] px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-52"><div className="mx-auto max-w-[1600px]">{children}</div></section>; }
function PanelTitle({ number, Icon, title, description, complete = false }: { number: string; Icon: typeof UserRound; title: string; description: string; complete?: boolean }) {
  return <div className="border-b border-line pb-5">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-black text-brand">{number}</span><h2 className="min-w-0 flex-1 text-lg font-black leading-6 text-ink">{title}</h2>{complete ? <Check className="h-4 w-4 shrink-0 text-pharma-green" aria-label="Dados preenchidos" /> : <Icon className="h-4 w-4 shrink-0 text-muted" />}</div>
    <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
  </div>;
}
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink"><span>{label}</span><input {...props} className={fieldClass} /></label>; }
function PaymentChoice({ selected, onSelect, label, detail, Icon, disabled = false }: { selected: boolean; onSelect: () => void; label: string; detail: string; Icon: typeof QrCode; disabled?: boolean }) {
  return <label className={`relative flex min-h-24 min-w-0 cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-brand ${disabled ? "cursor-not-allowed opacity-40" : selected ? "border-brand bg-brand-soft text-brand shadow-[0_2px_8px_-5px_rgba(214,8,45,0.4)]" : "border-line text-ink hover:border-brand/40 hover:bg-surface-subtle/50"}`}>
    <input aria-label={label} type="radio" name="paymentMethod" className="sr-only" checked={selected} disabled={disabled} onChange={onSelect} />
    <Icon className="h-5 w-5 shrink-0" /><span className="min-w-0"><strong className="block text-sm font-bold leading-5">{label}</strong><span className="mt-0.5 block text-[11px] leading-4 text-muted">{detail}</span></span>
    {selected && <span className="absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full bg-brand text-white"><Check className="h-2.5 w-2.5" /></span>}
  </label>;
}
function SummaryLine({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 justify-between gap-3"><dt className="min-w-0 text-muted">{label}</dt><dd className="shrink-0 font-semibold text-ink">{value}</dd></div>; }
function FreeShippingProgress({ eligibleCents }: { eligibleCents: number }) {
  const reached = eligibleCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const percent = Math.min(100, Math.max(0, eligibleCents / FREE_SHIPPING_THRESHOLD_CENTS * 100));
  return <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
    <p className="flex items-start gap-2 text-xs leading-5 text-emerald-800"><Truck className="mt-0.5 h-4 w-4 shrink-0" /><span>{reached ? <><strong>Frete grátis alcançado.</strong> Sujeito a CEP e serviço disponível.</> : <>Faltam <strong>{money(FREE_SHIPPING_THRESHOLD_CENTS - eligibleCents)}</strong> para frete grátis por transportadora.</>}</span></p>
    <div role="progressbar" aria-label="Valor em produtos para frete grátis" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD_CENTS / 100} aria-valuenow={Math.min(FREE_SHIPPING_THRESHOLD_CENTS, Math.max(0, eligibleCents)) / 100} className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div style={{ width: `${percent}%` }} className="h-full rounded-full bg-emerald-600 transition-[width] motion-reduce:transition-none" /></div>
  </div>;
}
function CheckoutSuccess({ order }: { order: Result }) { return <CheckoutShell><div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-8 text-center"><Check className="mx-auto h-12 w-12 text-pharma-green" /><h1 className="mt-5 text-3xl font-black">Pedido recebido</h1><p className="mt-3 text-sm text-muted">A farmácia confirmará a preparação e os detalhes da entrega ou retirada.</p><p className="mt-5 break-all font-bold text-brand">{order.number}</p><strong className="mt-2 block text-2xl">{money(order.totalCents)}</strong><div className="mt-6 flex flex-wrap justify-center gap-4"><Link href="/minha-conta" className="font-bold text-brand">Ver meus pedidos</Link><a href={buildWhatsAppUrl(`Olá, enviei o pedido ${order.number} pelo site.`)} target="_blank" rel="noreferrer" className="font-bold text-pharma-green">Falar com a farmácia</a></div></div></CheckoutShell>; }
