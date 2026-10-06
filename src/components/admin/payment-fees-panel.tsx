"use client";
import { useEffect, useState } from "react";
import { compareFees, type FeeRule, type FeeComparison } from "@/features/payments/fee-policy";

type Settings = { revision: number; rules: FeeRule[]; environment: "production" | "sandbox"; zeroInterestInstallments: number; connected: boolean; lastSyncAt: string | null };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const names = { "mercado-pago": "Mercado Pago", asaas: "Asaas", pagbank: "PagBank", stripe: "Stripe" };
const field = "min-h-12 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-base";
export function PaymentFeesPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("100");
  const [method, setMethod] = useState<"pix" | "card">("card");
  const [installments, setInstallments] = useState(1);
  const [deadline, setDeadline] = useState(35);
  const [manual, setManual] = useState({ provider: "mercado-pago" as FeeRule["provider"], percentage: "", fixed: "", days: "", installments: 1, zeroInterest: 1, source: "", confirmed: false });
  async function load() {
    const response = await fetch("/api/admin/pagamentos/taxas");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setSettings(payload.data);
  }
  useEffect(() => { void load().catch(() => setMessage("Não foi possível carregar as tarifas.")); }, []);
  async function request(action: "save" | "sync", next = settings) {
    if (!next || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/pagamentos/taxas", { method: action === "save" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "save" ? {
        revision: next.revision, rules: next.rules, environment: next.environment, zeroInterestInstallments: next.zeroInterestInstallments,
        ...(apiKey ? { apiKey } : {}),
      } : {}) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSettings(payload.data); setApiKey(""); setMessage("Tarifas registradas. Nenhuma cobrança foi criada ou alterada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível consultar as tarifas."); }
    finally { setBusy(false); }
  }
  function addManual() {
    if (!settings || !manual.confirmed || !manual.source.startsWith("https://") || [manual.percentage, manual.fixed, manual.days].some(value => value.trim() === "")) { setMessage("Informe todos os componentes, fonte e confirme o contrato da conta."); return; }
    const numbers = [manual.percentage, manual.fixed, manual.days].map(value => Number(value.replace(",", ".")));
    if (numbers.some(value => !Number.isFinite(value) || value < 0) || numbers[0] > 100 || numbers[2] > 365
      || !Number.isInteger(numbers[2]) || numbers.slice(0, 2).some(value => Math.abs(value * 100 - Math.round(value * 100)) > 1e-7)) { setMessage("Use até duas casas decimais nas tarifas e dias inteiros."); return; }
    const now = Date.now();
    const rule: FeeRule = { id: `manual-${manual.provider}-${method}-${manual.installments}`, provider: manual.provider, method, currency: "BRL",
      minInstallments: method === "pix" ? 1 : manual.installments, maxInstallments: method === "pix" ? 1 : manual.installments,
      percentageBps: Math.round(numbers[0] * 100), fixedCents: Math.round(numbers[1] * 100), settlementDays: numbers[2], zeroInterestInstallments: manual.zeroInterest,
      checkedAt: new Date(now).toISOString(), validUntil: new Date(now + 7 * 24 * 60 * 60_000).toISOString(), source: manual.source };
    void request("save", { ...settings, rules: [...settings.rules.filter(item => item.id !== rule.id), rule] });
  }
  let comparison: FeeComparison = { best: null, options: [], excluded: [] };
  try { comparison = compareFees({ amountCents: Math.round(Number(amount.replace(",", ".")) * 100), method,
    installments: method === "pix" ? 1 : installments, maxSettlementDays: deadline }, settings?.rules ?? []); }
  catch { /* Empty or incomplete inputs do not rank providers. */ }
  return <section className="grid gap-5 rounded-2xl border border-line bg-white p-6" aria-label="Comparar taxas de pagamento">
    <div><h2 className="text-xl font-black">Compare o custo dos pagamentos</h2><p className="mt-2 text-sm leading-6 text-muted">Simulação administrativa com tarifas da conta. O checkout continua usando Mercado Pago; o segundo gateway exige conta aprovada e homologação. Taxas públicas não são importadas como contrato.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Valor da compra (R$)<input className={field} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-semibold">Método<select className={field} value={method} onChange={event => setMethod(event.target.value as "pix" | "card")}><option value="card">Cartão</option><option value="pix">Pix</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">Parcelas<select className={field} value={method === "pix" ? 1 : installments} disabled={method === "pix"} onChange={event => setInstallments(Number(event.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}x</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Prazo máximo da primeira parcela (dias)<input className={field} type="number" min={0} max={365} value={deadline} onChange={event => setDeadline(Number(event.target.value))} /></label></div>
    {comparison.best ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900"><strong>Menor custo estimado entre tarifas válidas: {names[comparison.best.provider]}</strong><p className="mt-2 text-sm">Taxa {money(comparison.best.feeCents)} · líquido {money(comparison.best.netCents)} · primeira parcela em {comparison.best.settlementDays} dias. Sem antecipação; descontos promocionais podem mudar o custo efetivo.</p></div> : <p className="rounded-xl bg-surface-subtle p-4 text-sm">Sem tarifa válida para estas condições. Cadastre o contrato da conta ou conecte o Asaas; custo desconhecido nunca é considerado zero.</p>}
    <ul className="grid gap-2 text-sm">{comparison.options.map(option => <li key={option.ruleId} className="flex flex-wrap justify-between gap-2 rounded-lg border border-line p-3"><span>{names[option.provider]} · {option.settlementDays} dias</span><strong>{money(option.feeCents)} de taxa</strong></li>)}</ul>
    <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-bold">Tarifas manuais registradas</summary><p className="mt-3 text-sm text-muted">Retire uma tarifa se a condição não estiver confirmada. Isso altera somente a comparação; pagamentos existentes são preservados.</p><ul className="mt-3 grid gap-3">{settings?.rules.filter(rule => rule.id.startsWith("manual-")).map(rule => <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3" key={rule.id}><span className="min-w-0 text-sm"><strong>{names[rule.provider]} · {rule.method === "pix" ? "Pix" : `Cartão ${rule.minInstallments}x`}</strong><span className="mt-1 block text-muted">{(rule.percentageBps / 100).toLocaleString("pt-BR")}% + {money(rule.fixedCents)} · validade até {new Date(rule.validUntil).toLocaleDateString("pt-BR")}</span></span><button type="button" disabled={busy} onClick={() => settings && void request("save", { ...settings, rules: settings.rules.filter(item => item.id !== rule.id) })} className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold text-brand disabled:opacity-50" aria-label={`Retirar tarifa ${names[rule.provider]} ${rule.method === "pix" ? "Pix" : `Cartão ${rule.minInstallments}x`}`}>Retirar da comparação</button></li>)}</ul></details>
    <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-bold">Cadastrar tarifa confirmada da conta</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">Provedor<select className={field} value={manual.provider} onChange={event => setManual({ ...manual, provider: event.target.value as FeeRule["provider"] })}>{Object.entries(names).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="grid gap-2 text-sm">Percentual (%)<input className={field} inputMode="decimal" value={manual.percentage} onChange={event => setManual({ ...manual, percentage: event.target.value })} /></label>
      <label className="grid gap-2 text-sm">Tarifa fixa (R$)<input className={field} inputMode="decimal" value={manual.fixed} onChange={event => setManual({ ...manual, fixed: event.target.value })} /></label>
      <label className="grid gap-2 text-sm">Primeiro recebimento (dias)<input className={field} type="number" min={0} max={365} value={manual.days} onChange={event => setManual({ ...manual, days: event.target.value })} /></label>
      <label className="grid gap-2 text-sm">Parcelas deste contrato<input className={field} type="number" min={1} max={12} value={manual.installments} onChange={event => setManual({ ...manual, installments: Number(event.target.value) })} /></label>
      <label className="grid gap-2 text-sm">Sem juros para o cliente até<input className={field} type="number" min={1} max={12} value={manual.zeroInterest} onChange={event => setManual({ ...manual, zeroInterest: Number(event.target.value) })} /></label>
      <label className="grid gap-2 text-sm sm:col-span-2">Fonte do contrato (URL https)<input className={field} type="url" value={manual.source} onChange={event => setManual({ ...manual, source: event.target.value })} /></label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input className="mt-1" type="checkbox" checked={manual.confirmed} onChange={event => setManual({ ...manual, confirmed: event.target.checked })} />Conferi taxa fixa, percentual, parcelas, prazo e custo para oferecer até 3x sem juros. Antecipação não está incluída.</label>
      <button className="min-h-12 rounded-xl bg-brand px-4 font-bold text-white disabled:opacity-50" disabled={busy || !settings} onClick={addManual}>Registrar tarifa por sete dias</button></div></details>
    <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-bold">Conectar consulta de tarifas Asaas</summary><div className="mt-4 grid gap-3"><p className="text-sm text-muted">Consulta das tarifas padrão de cartão, sem criar pagamentos. Credencial cifrada; revisão automática a cada seis horas. Pix exige contrato confirmado no cadastro manual. Descontos promocionais e antecipação não estão nesta estimativa conservadora.</p>
      <label className="grid gap-2 text-sm">Ambiente<select className={field} value={settings?.environment ?? "production"} onChange={event => settings && setSettings({ ...settings, environment: event.target.value as Settings["environment"] })}><option value="production">Produção</option><option value="sandbox">Sandbox · não compara compras reais</option></select></label>
      <label className="grid gap-2 text-sm">API Key<input className={field} type="password" autoComplete="new-password" value={apiKey} placeholder={settings?.connected ? "Configurada; preencha apenas para trocar" : "Chave da conta Asaas"} onChange={event => setApiKey(event.target.value)} /></label>
      <label className="grid gap-2 text-sm">Parcelas sem juros confirmadas para esta conta<input className={field} type="number" min={1} max={12} value={settings?.zeroInterestInstallments ?? 1} onChange={event => settings && setSettings({ ...settings, zeroInterestInstallments: Number(event.target.value) })} /></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy || !settings} onClick={() => void request("save")} className="min-h-12 rounded-xl bg-brand px-4 font-bold text-white disabled:opacity-50">Salvar e consultar</button><button disabled={busy || !settings?.connected} onClick={() => void request("sync")} className="min-h-12 rounded-xl border border-line px-4 font-bold disabled:opacity-50">Revisar agora</button></div>
      {settings?.lastSyncAt && <p className="text-xs text-muted">Última consulta: {new Date(settings.lastSyncAt).toLocaleString("pt-BR")}. Snapshot automático válido por até 24 horas.</p>}</div></details>
    {message && <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm font-bold text-brand">{message}</p>}
  </section>;
}
