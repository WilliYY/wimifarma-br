"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ASAAS_MIN_CARD_AMOUNT_CENTS } from "@/features/payments/schema";

const endpoint = "/api/admin/pagamentos/asaas-homologacao";
const intentKey = "wimifarma-asaas-homologacao-intent";
const intentSchema = z.object({ requestId: z.uuid(), productId: z.string().min(1).max(128), method: z.enum(["pix", "card"]) });
const stateSchema = z.object({ prepared: z.boolean(), revision: z.number().int().nonnegative(), webhookReady: z.boolean(),
  products: z.array(z.object({ id: z.string(), name: z.string(), priceCents: z.number().int().positive() })).max(100),
  attempts: z.array(z.object({ orderId: z.string(), number: z.union([z.string(), z.number()]), amountCents: z.number().int().positive(),
    method: z.enum(["pix", "card"]), status: z.string(), statusDetail: z.string().nullish(),
    requestId: z.uuid(), pixExpiresAt: z.string().nullish(), pixCode: z.string().max(5000).nullish(),
    qrDataUrl: z.string().max(256000).nullish(), checkoutUrl: z.string().max(2000).nullish(),
    fundsAvailable: z.boolean(), createdAt: z.string(),
  })).max(100),
});
type State = z.infer<typeof stateSchema>;
type Intent = z.infer<typeof intentSchema>;
const labels: Record<string, string> = { PENDING: "Aguardando pagamento fictício", NEW: "Ensaio preparado · consulte o estado", SUBMITTING: "Criação em andamento",
  UNKNOWN: "Resultado incerto · consulte antes de continuar", REVIEW: "Conferência necessária", PAID: "Pagamento fictício confirmado",
  FAILED: "Pagamento recusado", CANCELED: "Ensaio cancelado", REFUNDED: "Estorno confirmado",
  PARTIALLY_REFUNDED: "Estorno parcial · conferência necessária", DISPUTED: "Pagamento em disputa" };
const currency = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function sandboxLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "sandbox.asaas.com" && !url.port && !url.username && !url.password
      && !url.hash && ((/^\/(?:000\/)?checkoutSession\/show\/[a-zA-Z0-9-]+$/.test(url.pathname) && !url.search)
        || (url.pathname === "/checkoutSession/show" && /^\?id=[a-zA-Z0-9-]+$/.test(url.search)));
  } catch { return false; }
}
function countdown(expiresAt: string, now: number | null) {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return "Validade indisponível; consulte o ensaio.";
  if (now === null) return `Expira em ${new Date(expires).toLocaleString("pt-BR")}`;
  const seconds = Math.max(0, Math.floor((expires - now) / 1000));
  if (!seconds) return "QR expirado. Consulte o estado antes de continuar.";
  return `Expira em ${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}min ${seconds % 60}s`;
}

export function AsaasHomologationPanel({ credentialId }: { credentialId: string }) {
  const [state, setState] = useState<State | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [email, setEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const lock = useRef(false);
  const intentRef = useRef<Intent | null>(null);

  function accept(next: State) {
    setState(next);
    const pending = intentRef.current;
    if (pending && next.attempts.some(attempt => attempt.requestId === pending.requestId)) {
      // Only the matching server attempt resolves a persisted creation intent.
      try { sessionStorage.removeItem(intentKey); } catch { /* Keep the retained intent if storage is unavailable. */ return; }
      intentRef.current = null;
      setIntent(null);
    }
  }
  async function fetchState(body?: object) {
    const response = await fetch(endpoint, { cache: "no-store", ...(body ? { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error("Homologation request unconfirmed");
    const payload = await response.json();
    return stateSchema.parse(payload.data);
  }

  useEffect(() => {
    let active = true;
    try {
      const stored = sessionStorage.getItem(intentKey);
      if (stored) {
        const parsed = intentSchema.safeParse(JSON.parse(stored));
        if (parsed.success) { intentRef.current = parsed.data; setIntent(parsed.data); }
        else { setStorageBlocked(true); setMessage("O identificador anterior precisa de conferência. A criação de ensaios está bloqueada."); }
      }
    } catch {
      setStorageBlocked(true);
      if (active) setMessage("Não foi possível recuperar o ensaio anterior. Confira o histórico antes de criar outro.");
    }
    void fetchState().then(next => { if (active) accept(next); }).catch(() => {
      if (active) setMessage("Não foi possível carregar a homologação. Consulte novamente antes de continuar.");
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  async function operate(body?: object, creation = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(""); setNotice("");
    try {
      accept(await fetchState(body));
      setNotice(creation ? "Ensaio registrado. Acompanhe a confirmação pelo provedor." : "Estado da homologação atualizado.");
    } catch {
      setMessage(creation ? "A criação não foi confirmada. O identificador foi preservado. Consulte os ensaios; não crie outra cobrança."
        : "Não foi possível confirmar a operação. Consulte novamente antes de continuar.");
      if (creation) {
        try { accept(await fetchState()); }
        catch { /* Preserve the intent until a successful read identifies its server attempt. */ }
      }
    } finally { lock.current = false; setBusy(false); }
  }
  const requiresReview = state?.attempts.some(attempt => !["PENDING", "PAID", "FAILED", "CANCELED", "REFUNDED"].includes(attempt.status)) ?? false;
  const blocked = Boolean(intent) || requiresReview || storageBlocked;
  const product = state?.products.find(item => item.id === productId);
  const belowCardMinimum = method === "card" && Boolean(product && product.priceCents < ASAAS_MIN_CARD_AMOUNT_CENTS);

  function create(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || blocked || belowCardMinimum || !state?.prepared || !state.webhookReady || !product) return;
    const pending: Intent = { requestId: crypto.randomUUID(), productId: product.id, method };
    try { sessionStorage.setItem(intentKey, JSON.stringify(pending)); }
    catch { setMessage("Não foi possível preservar o identificador do ensaio. Nenhuma criação foi enviada."); return; }
    intentRef.current = pending; setIntent(pending);
    void operate({ action: "create", ...pending }, true);
  }

  return <section className="grid gap-5 rounded-2xl border border-line bg-white p-6" aria-labelledby="asaas-homologation-title">
    <div><h2 id="asaas-homologation-title" className="font-black">Homologação Asaas · somente Sandbox</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Ensaios fictícios de uma unidade, com cartão à vista ou Pix. Não movimentam estoque, cashback nem mensagens comerciais. O checkout público continua com Mercado Pago.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-subtle p-4 text-sm">
      <p>{state?.prepared ? "Estrutura de teste preparada" : "Preparação pendente"} · {state?.webhookReady ? "Notificações configuradas" : "Notificações pendentes"}</p>
      <button type="button" disabled={busy} onClick={() => void operate()} className="min-h-11 rounded-lg border border-line px-4 py-2 font-bold disabled:opacity-50">Consultar ensaios</button>
    </div>
    <form onSubmit={event => { event.preventDefault(); if (credentialId && state && !blocked) void operate({ action: "prepare", credentialId, email, revision: state.revision }); }} className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold">E-mail do responsável pelo teste<input type="email" required maxLength={160} autoComplete="email" value={email}
        onChange={event => setEmail(event.target.value)} disabled={busy || blocked} className="min-w-0 rounded-lg border border-line p-3" /></label>
      <p className="text-xs leading-5 text-muted">A preparação usa a credencial Sandbox selecionada acima e não cria cobranças. Use o e-mail do responsável, sem dados de clientes.</p>
      <button type="submit" disabled={!credentialId || !state || busy || blocked} className="min-h-12 rounded-lg border border-line px-5 py-3 font-black disabled:opacity-50">Estruturar homologação</button>
    </form>
    <form onSubmit={create} className="grid gap-3 border-t border-line pt-5">
      <label className="grid gap-2 text-sm font-bold">Produto do ensaio · uma unidade<select value={productId} onChange={event => setProductId(event.target.value)}
        disabled={busy || blocked} className="min-w-0 rounded-lg border border-line p-3"><option value="">Selecione o produto</option>
        {state?.products.map(item => <option key={item.id} value={item.id}>{item.name} · {currency(item.priceCents)}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Forma de teste<select value={method} onChange={event => setMethod(event.target.value as "pix" | "card")}
        disabled={busy || blocked} className="rounded-lg border border-line p-3"><option value="pix">Pix fictício · validade de duas horas</option><option value="card">Cartão fictício · à vista (1x)</option></select></label>
      {product && <p className="text-sm font-bold">Valor do ensaio: {currency(product.priceCents)}. O servidor confere o preço atual.</p>}
      {belowCardMinimum && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">O cartão Asaas exige no mínimo {currency(ASAAS_MIN_CARD_AMOUNT_CENTS)}. Escolha outro produto ou teste Pix.</p>}
      {blocked && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">Há um ensaio aguardando confirmação ou conferência. Consulte seu estado antes de continuar; a criação de outro ensaio está bloqueada.</p>}
      <button type="submit" disabled={!state?.prepared || !state.webhookReady || !product || belowCardMinimum || busy || blocked}
        className="min-h-12 rounded-lg bg-brand px-5 py-3 font-black text-white disabled:opacity-50">{busy ? "Verificando..." : "Criar ensaio fictício"}</button>
    </form>
    {message && <p role="alert" className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand">{message}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-4"><h3 className="font-black">Últimos ensaios</h3>
      {state && !state.attempts.length && <p className="text-sm text-muted">Nenhum ensaio registrado.</p>}
      {state?.attempts.map(attempt => {
        const pending = attempt.status === "PENDING";
        const expires = attempt.pixExpiresAt ? Date.parse(attempt.pixExpiresAt) : NaN;
        const validPix = pending && attempt.method === "pix" && Number.isFinite(expires) && (now === null || expires > now);
        const qr = attempt.qrDataUrl && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(attempt.qrDataUrl) ? attempt.qrDataUrl : null;
        return <article key={attempt.orderId} className="grid gap-3 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold">Ensaio #{attempt.number} · {currency(attempt.amountCents)}</h4>
            <p className="mt-1 text-sm text-muted">{attempt.method === "pix" ? "Pix" : "Cartão 1x"} · {labels[attempt.status] ?? "Conferência necessária"}</p>
            <p className="mt-1 text-xs text-muted">{new Date(attempt.createdAt).toLocaleString("pt-BR")}</p></div>
            <button type="button" disabled={busy} onClick={() => void operate({ action: "refresh", orderId: attempt.orderId })}
              className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-bold disabled:opacity-50">Consultar estado</button></div>
          {attempt.status === "PAID" && <p className="text-sm text-emerald-800">{attempt.fundsAvailable ? "Saldo fictício disponível no Sandbox." : "Pagamento fictício confirmado; saldo ainda não disponível."}</p>}
          {attempt.method === "pix" && attempt.pixExpiresAt && <p className="text-sm font-bold">{countdown(attempt.pixExpiresAt, now)}</p>}
          {validPix && qr && <Image src={qr} width={220} height={220} unoptimized alt={`QR Pix fictício do ensaio ${attempt.number}`} className="mx-auto h-auto max-w-full rounded-lg" />}
          {validPix && attempt.pixCode && <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">Pix copia e cola de teste<textarea readOnly value={attempt.pixCode} rows={3} className="min-w-0 resize-none rounded-lg border border-line p-3 text-xs font-normal" /></label>
            <button type="button" onClick={() => void navigator.clipboard.writeText(attempt.pixCode!).then(() => setNotice("Código Pix de teste copiado.")).catch(() => setMessage("Não foi possível copiar o código. Selecione o campo manualmente."))}
              className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-bold">Copiar Pix de teste</button></div>}
          {pending && attempt.method === "card" && attempt.checkoutUrl && sandboxLink(attempt.checkoutUrl)
            && <a href={attempt.checkoutUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand px-4 py-3 text-center text-sm font-bold text-white">Abrir checkout seguro de teste</a>}
        </article>;
      })}
    </div>
  </section>;
}
