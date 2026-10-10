"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { readPaymentView, type PaymentView } from "@/features/payments/client-recovery";
import { useCart } from "./cart-provider";
import { PaymentCardForm } from "./payment-card-form";

export type { PaymentView } from "@/features/payments/client-recovery";
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function OnlinePayment({ orderId, embedded = false, initialData = null, initialMethod = "pix", onPaid, onTerminal, onReview }: { orderId: string; embedded?: boolean; initialData?: PaymentView | null; initialMethod?: "pix" | "card"; onPaid?: () => void; onTerminal?: () => void; onReview?: () => void }) {
  const [data, setData] = useState<PaymentView | null>(initialData?.orderId === orderId ? initialData : null); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [method, setMethod] = useState<"pix" | "card">(initialMethod); const [email, setEmail] = useState("");
  const [now, setNow] = useState(Date.now());
  const paidCallback = useRef(onPaid);
  const terminalCallback = useRef(onTerminal);
  useEffect(() => { paidCallback.current = onPaid; }, [onPaid]);
  useEffect(() => { terminalCallback.current = onTerminal; }, [onTerminal]);
  const inflight = useRef(false); const { items, hydrated, clearCart } = useCart();
  const request = useCallback(async (body?: unknown) => {
    if (!body) { const payment = await readPaymentView(orderId); setData(payment); return payment; }
    const response = await fetch(`/api/pagamentos/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o pagamento.");
    setData(payload.data); return payload.data as PaymentView;
  }, [orderId]);
  useEffect(() => { void request().catch(e => setError(e.message)); }, [request]);
  useEffect(() => { if (data?.payerEmail) setEmail(data.payerEmail); }, [data?.payerEmail]);
  useEffect(() => { if (data?.method === "pix" || data?.method === "card") setMethod(data.method); }, [data?.method]);
  useEffect(() => {
    if (!data?.pixExpiresAt || data.status !== "PENDING") return;
    setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data?.pixExpiresAt, data?.status]);
  useEffect(() => { if (data?.status === "PAID") paidCallback.current?.(); }, [data?.status]);
  useEffect(() => {
    if (!data || !["PAID", "FAILED", "CANCELED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(data.status)) return;
    terminalCallback.current?.();
    try { const pointer = `wimifarma-payment-attempt:${orderId}`; const key = sessionStorage.getItem(pointer); if (key) sessionStorage.removeItem(key); sessionStorage.removeItem(pointer); } catch { /* Armazenamento opcional. */ }
  }, [data, orderId]);
  useEffect(() => {
    if (!data || !["PENDING", "UNKNOWN", "SUBMITTING"].includes(data.status)) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void request({ action: "refresh" }).catch(() => setError("A confirmação está demorando. Aguarde ou consulte novamente.")); }, 30_000);
    return () => clearInterval(timer);
  }, [data, request]);
  useEffect(() => {
    if (data?.status !== "PAID" || !hydrated) return;
    try {
      const key = `wimifarma-payment-cart:${orderId}`;
      if (sessionStorage.getItem(key) === JSON.stringify(items.map(item => [item.id, item.quantity, item.unitPriceCents]))) clearCart();
      sessionStorage.removeItem(key);
      window.dispatchEvent(new Event("wimifarma:cashback-updated"));
    } catch { /* A confirmação financeira não depende do armazenamento do navegador. */ }
  }, [data?.status, hydrated, items, orderId, clearCart]);
  const send = useCallback(async (body: unknown) => {
    if (inflight.current) return; inflight.current = true; setBusy(true); setError("");
    try { await request(body); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível confirmar o pagamento."); await request().catch(() => undefined); throw e; }
    finally { setBusy(false); inflight.current = false; }
  }, [request]);
  const retryConsultation = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true; setBusy(true); setError("");
    try { await request(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar o pagamento."); }
    finally { setBusy(false); inflight.current = false; }
  }, [request]);
  const expiration = data?.pixExpiresAt ? new Date(data.pixExpiresAt).getTime() : null;
  const seconds = expiration ? Math.max(0, Math.ceil((expiration - now) / 1000)) : null;
  const expired = seconds === 0;
  const countdown = seconds === null ? null : `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const finalFailure = data && ["FAILED", "CANCELED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(data.status);
  const content = <div className={embedded ? "mt-5 min-w-0" : "mx-auto max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8"}>
    <div className="flex items-center gap-3 text-brand"><ShieldCheck /><span className="text-xs font-black uppercase tracking-widest">Sua compra · Wimifarma</span></div>
    <h2 className="mt-4 text-2xl font-black text-ink">{data?.status === "PAID" ? "Pagamento confirmado" : finalFailure ? "Situação do pagamento" : "Finalize seu pagamento"}</h2>
    {data ? <><p className="mt-2 break-all text-sm text-muted">Pedido {data.number}</p><p className="mt-4 text-3xl font-black text-ink">{currency(data.amountCents)}</p>
      {data.environment === "test" && <p className="mt-4 rounded-lg bg-amber-50 p-3 font-bold text-amber-800">HOMOLOGAÇÃO · Apenas dados fictícios. Sem cobrança, estoque ou cashback reais.</p>}
      {data.status === "NEW" ? <>{!data.method && <div className="my-6 grid grid-cols-2 gap-3" role="group" aria-label="Meio de pagamento">{([{ id: "pix", label: "Pix", Icon: QrCode }, { id: "card", label: "Cartão", Icon: CreditCard }] as const).map(({ id, label, Icon }) => <button type="button" key={id} disabled={busy} aria-pressed={method === id} onClick={() => { setMethod(id); setError(""); }} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border font-bold ${method === id ? "border-brand bg-brand-soft text-brand" : "border-line"}`}><Icon className="h-5 w-5" />{label}</button>)}</div>}
        {method === "pix" ? <form className="mt-5 grid gap-4" onSubmit={e => { e.preventDefault(); void send({ method: "pix", email }).catch(() => undefined); }}><label className="grid gap-2 text-sm font-bold">E-mail do pagador<input required type="email" autoComplete="email" maxLength={160} value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-lg border border-line px-3" /></label><button disabled={busy} className="min-h-12 rounded-lg bg-brand p-3 font-black text-white disabled:opacity-50">{busy ? "Gerando Pix..." : "Gerar QR Code Pix"}</button><p className="text-xs leading-5 text-muted">O QR Code vence em 2 horas. Confirme o recebedor no aplicativo do seu banco antes de pagar.</p></form> : data.provider === "asaas" ? <div className="mt-5 grid gap-4"><p className="text-sm leading-6 text-muted">Cartão de crédito à vista. Os dados são preenchidos na página protegida do Asaas; a confirmação fica neste pedido.</p><button disabled={busy} className="min-h-12 rounded-xl bg-brand p-3 font-black text-white disabled:opacity-50" onClick={() => void send({ method: "hosted-card", email }).catch(() => undefined)}>{busy ? "Preparando pagamento..." : "Abrir pagamento seguro no cartão"}</button></div> : <div className="mt-5"><PaymentCardForm publicKey={data.publicKey} amountCents={data.amountCents} email={email} onSubmit={send} /></div>}
        <button type="button" className="mt-6 text-sm font-bold underline" disabled={busy} onClick={() => void send({ action: "cancel" }).then(() => onReview?.()).catch(() => undefined)}>Cancelar e revisar o carrinho</button>
      </> : data.status === "PAID" ? <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 className="mb-3" /><p className="text-lg font-black">Tudo certo, seu pagamento foi confirmado!</p><p className="mt-2 text-sm leading-6">A Wimifarma dará continuidade à preparação do pedido. Acompanhe os próximos passos em sua conta.</p></div> : finalFailure ? <div className="mt-6 rounded-xl bg-surface-subtle p-5">
        <p className="font-bold">{data.status === "FAILED" ? data.statusDetail === "processing_error" ? "Não foi possível gerar o pagamento por um erro de processamento." : "Pagamento não aprovado." : data.status === "REFUNDED" ? "Pagamento reembolsado." : data.status === "PARTIALLY_REFUNDED" ? "Parte do pagamento foi reembolsada. Fale com a equipe para conferir os valores." : data.status === "DISPUTED" ? "Pagamento em contestação. Fale com a equipe." : "Pagamento cancelado ou expirado."}</p>
        {data.status === "FAILED" && <p className="mt-2 text-sm leading-6 text-muted">Esta tentativa não foi aprovada. Você pode revisar o pedido e escolher outra forma de pagamento ou falar com a Wimifarma.</p>}
        {onReview && ["FAILED", "CANCELED"].includes(data.status) ? <button onClick={onReview} className="mt-4 min-h-11 font-bold text-brand underline">Revisar dados e tentar novamente</button> : <Link className="mt-4 inline-block font-bold text-brand underline" href="/carrinho">Voltar ao carrinho</Link>}
      </div> : <div className="mt-6 grid gap-4">
        <p className="text-lg font-bold">{data.status === "REVIEW" ? "Pagamento em conferência" : data.pixCode ? expired ? "Prazo do Pix encerrado" : "Aguardando seu Pix" : "Aguardando confirmação do pagamento"}</p>
        {data.checkoutUrl && data.provider === "asaas" && <a className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-brand p-3 text-base font-bold text-white" href={data.checkoutUrl} target="_blank" rel="noopener noreferrer"><CreditCard className="h-5 w-5" />Pagar com cartão à vista</a>}
        {countdown && <p className={`rounded-xl p-4 text-center text-sm ${expired ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}><span className="block">{expired ? "Consulte o pagamento para confirmar a situação." : "Tempo restante para pagar"}</span><strong className="mt-1 block font-mono text-2xl tabular-nums">{countdown}</strong></p>}
        {data.qrDataUrl && !expired && <div className="rounded-2xl border border-line bg-white p-3"><Image unoptimized alt="QR Code para pagar este pedido com Pix" src={data.qrDataUrl} className="mx-auto h-auto w-64 max-w-full" width={256} height={256} /></div>}
        {data.pixCode && !expired && <><input aria-label="Código Pix copia e cola" value={data.pixCode} readOnly className="min-w-0 rounded-xl border border-line p-4 text-sm" /><button className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-brand p-3 text-base font-bold text-white" onClick={() => void navigator.clipboard.writeText(data.pixCode!).then(() => setError("Código Pix copiado.")).catch(() => setError("Selecione e copie o código acima."))}><Copy className="h-4 w-4" />Copiar código Pix</button><p className="text-sm leading-6 text-muted">Abra o aplicativo do seu banco, escolha Pix e escaneie o QR Code ou cole o código. Confira o recebedor antes de confirmar.</p></>}
        <p className="text-sm leading-6 text-muted">A confirmação aparece aqui automaticamente. Não refaça a compra enquanto o pagamento estiver em análise.</p>
        <button disabled={busy} onClick={() => void send({ action: "refresh" }).catch(() => undefined)} className="min-h-12 rounded-xl border border-line font-bold">Consultar pagamento</button>
        {embedded && <Link href={`/checkout/pagamento/${orderId}`} className="min-h-10 text-center text-sm font-bold text-brand underline">Abrir este pagamento em uma página própria</Link>}
      </div>}
      <Link href="/minha-conta" className="mt-7 inline-block text-sm font-bold text-brand">Ver meus pedidos →</Link>
    </> : !error && <p className="mt-5">Carregando pedido...</p>}
    {error && <p role="status" className="mt-5 rounded-lg bg-brand-soft p-4 text-sm text-brand">{error}</p>}
    {!data && <div className="mt-5 grid gap-3">
      {error && <p className="text-sm leading-6 text-muted">Não conseguimos verificar a situação deste pedido. Entre na conta que fez o pedido ou use o navegador em que iniciou a compra. Consulte a situação antes de tentar pagar novamente.</p>}
      {(error || busy) && <button type="button" disabled={busy} onClick={() => void retryConsultation()} className="min-h-12 rounded-xl border border-line font-bold disabled:opacity-50">{busy ? "Consultando pagamento..." : "Tentar consultar novamente"}</button>}
      {error && <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-brand"><Link href="/minha-conta" className="min-h-11 content-center underline">Entrar na conta e ver pedidos</Link><Link href="/carrinho" className="min-h-11 content-center underline">Ver meu carrinho</Link></div>}
    </div>}
  </div>;
  return embedded ? content : <section className="min-h-[75vh] bg-[#f4f6f8] px-4 pb-20 pt-36 lg:pt-52">{content}</section>;
}
