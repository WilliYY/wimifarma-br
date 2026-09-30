"use client";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, CreditCard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { useCart } from "./cart-provider";

type View = { orderId: string; number: string; amountCents: number; status: string; statusDetail: string | null; pixCode: string | null; qrDataUrl: string | null; environment: string; publicKey: string };
type CardData = { token: string; payment_method_id: string; installments: number; payer: { email: string; identification?: { type: string; number: string } } };
type BrickController = { unmount: () => Promise<void> };
declare global { interface Window { MercadoPago?: new (key: string, options: { locale: string }) => { bricks: () => { create: (type: string, container: string, settings: unknown) => Promise<BrickController> } }; } }
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function OnlinePayment({ orderId }: { orderId: string }) {
  const [data, setData] = useState<View | null>(null); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [method, setMethod] = useState<"pix" | "card">("pix"); const [email, setEmail] = useState("");
  const [sdkReady, setSdkReady] = useState(false); const [cardReady, setCardReady] = useState(false);
  const inflight = useRef(false); const { items, hydrated, clearCart } = useCart();
  const publicKey = data?.publicKey;
  const amountCents = data?.amountCents;
  const status = data?.status;
  const request = useCallback(async (body?: unknown) => {
    const response = await fetch(`/api/pagamentos/${orderId}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o pagamento.");
    setData(payload.data); return payload.data as View;
  }, [orderId]);
  useEffect(() => { void request().catch(e => setError(e.message)); }, [request]);
  useEffect(() => {
    if (!data || !["PAID", "FAILED", "CANCELED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(data.status)) return;
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
  useEffect(() => {
    if (!sdkReady || !window.MercadoPago || !publicKey || !amountCents || status !== "NEW" || method !== "card") return;
    let disposed = false; let controller: BrickController | undefined;
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    void mp.bricks().create("cardPayment", "wimifarma-card-payment", {
      initialization: { amount: amountCents / 100 },
      customization: { paymentMethods: { maxInstallments: 1 } },
      callbacks: { onReady: () => { if (!disposed) setCardReady(true); },
        onSubmit: (form: CardData, additional: { paymentTypeId: string }) => send({ method: "card", email: form.payer.email, token: form.token, paymentMethodId: form.payment_method_id, paymentType: additional.paymentTypeId, installments: form.installments, identification: form.payer.identification }),
        onError: () => { if (!disposed) setError("Não foi possível carregar o cartão. Recarregue ou escolha Pix."); },
      },
    }).then(value => { controller = value; if (disposed) void value.unmount(); }).catch(() => { if (!disposed) setError("Não foi possível abrir o pagamento por cartão."); });
    return () => { disposed = true; setCardReady(false); if (controller) void controller.unmount(); };
  }, [sdkReady, publicKey, amountCents, status, method, send]);
  const finalFailure = data && ["FAILED", "CANCELED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(data.status);
  return <section className="min-h-[75vh] bg-[#f4f6f8] px-4 pb-20 pt-36 lg:pt-52"><div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
    <div className="flex items-center gap-3 text-brand"><ShieldCheck /><span className="text-xs font-black uppercase tracking-widest">Pagamento seguro · Mercado Pago</span></div>
    <h1 className="mt-4 text-2xl font-black text-ink">{data?.status === "PAID" ? "Pagamento confirmado" : finalFailure ? "Situação do pagamento" : "Finalize seu pagamento"}</h1>
    {data ? <><p className="mt-2 break-all text-sm text-muted">Pedido {data.number}</p><p className="mt-4 text-3xl font-black text-ink">{currency(data.amountCents)}</p>
      {data.environment === "test" && <p className="mt-4 rounded-lg bg-amber-50 p-3 font-bold text-amber-800">HOMOLOGAÇÃO · Apenas dados fictícios. Sem cobrança, estoque ou cashback reais.</p>}
      {data.status === "NEW" ? <><div className="my-6 grid grid-cols-2 gap-3" role="group" aria-label="Meio de pagamento">{([{ id: "pix", label: "Pix", Icon: QrCode }, { id: "card", label: "Cartão", Icon: CreditCard }] as const).map(({ id, label, Icon }) => <button type="button" key={id} disabled={busy} aria-pressed={method === id} onClick={() => { setMethod(id); setError(""); }} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border font-bold ${method === id ? "border-brand bg-brand-soft text-brand" : "border-line"}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
        {method === "pix" ? <form className="grid gap-4" onSubmit={e => { e.preventDefault(); void send({ method: "pix", email }).catch(() => undefined); }}><label className="grid gap-2 text-sm font-bold">E-mail do pagador<input required type="email" autoComplete="email" maxLength={160} value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-lg border border-line px-3" /></label><button disabled={busy} className="min-h-12 rounded-lg bg-brand p-3 font-black text-white disabled:opacity-50">{busy ? "Gerando Pix..." : "Gerar QR Code Pix"}</button><p className="text-xs leading-5 text-muted">O QR Code vence em 30 minutos. Confirme o recebedor no aplicativo do seu banco antes de pagar.</p></form> : <><Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkReady(true)} onError={() => setError("Não foi possível carregar o Mercado Pago.")} />{!cardReady && <p className="flex gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Carregando formulário seguro...</p>}<div id="wimifarma-card-payment" /></>}
        <button type="button" className="mt-6 text-sm font-bold underline" disabled={busy} onClick={() => void send({ action: "cancel" }).catch(() => undefined)}>Cancelar e revisar o carrinho</button>
      </> : data.status === "PAID" ? <div className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 className="mb-3" /><p className="font-black">Recebemos a confirmação do Mercado Pago.</p><p className="mt-2 text-sm">A farmácia dará continuidade à preparação e ao atendimento do pedido.</p></div> : finalFailure ? <div className="mt-6 rounded-xl bg-surface-subtle p-5"><p className="font-bold">{data.status === "FAILED" ? "Pagamento não aprovado." : data.status === "REFUNDED" ? "Pagamento reembolsado." : data.status === "PARTIALLY_REFUNDED" ? "Parte do pagamento foi reembolsada. Fale com a equipe para conferir os valores." : data.status === "DISPUTED" ? "Pagamento em contestação. Fale com a equipe." : "Pagamento cancelado ou expirado."}</p><Link className="mt-4 inline-block font-bold text-brand underline" href="/carrinho">Voltar ao carrinho</Link></div> : <div className="mt-6 grid gap-4"><p className="font-bold">{data.pixCode ? "Aguardando seu Pix" : "Aguardando confirmação do Mercado Pago"}</p>{data.qrDataUrl && <Image unoptimized alt="QR Code para pagar este pedido com Pix" src={data.qrDataUrl} className="mx-auto h-60 w-60 max-w-full" width={240} height={240} />}{data.pixCode && <><input aria-label="Código Pix copia e cola" value={data.pixCode} readOnly className="min-w-0 rounded-lg border border-line p-3 text-xs" /><button className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand p-3 font-bold text-white" onClick={() => void navigator.clipboard.writeText(data.pixCode!).then(() => setError("Código Pix copiado.")).catch(() => setError("Selecione e copie o código acima."))}><Copy className="h-4 w-4" />Copiar código Pix</button></>}<p className="text-sm leading-6 text-muted">A confirmação aparece aqui automaticamente. Não refaça a compra enquanto o pagamento estiver em análise.</p><button disabled={busy} onClick={() => void send({ action: "refresh" }).catch(() => undefined)} className="min-h-11 rounded-lg border border-line font-bold">Consultar pagamento</button></div>}
      <Link href="/minha-conta" className="mt-7 inline-block text-sm font-bold text-brand">Ver meus pedidos →</Link>
    </> : !error && <p className="mt-5">Carregando pedido...</p>}
    {error && <p role="status" className="mt-5 rounded-lg bg-brand-soft p-4 text-sm text-brand">{error}</p>}
  </div></section>;
}
