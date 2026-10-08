"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { PaymentFeesPanel } from "./payment-fees-panel";
import { AsaasSandboxPanel } from "./asaas-sandbox-panel";
type Settings = { revision: number; enabled: boolean; environment: string; publicKey: string; connected: boolean };
export function PaymentPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [accessToken, setAccessToken] = useState(""); const [webhookSecret, setWebhookSecret] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const r = await fetch("/api/admin/pagamentos"); const p = await r.json(); if (!r.ok) throw new Error(p.error); setSettings(p.data); }
  useEffect(() => { void load().catch(() => setMessage("Não foi possível carregar a conexão.")); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!settings || busy) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/pagamentos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, accessToken: accessToken || undefined, webhookSecret: webhookSecret || undefined }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setAccessToken(""); setWebhookSecret(""); await load(); setMessage(payload.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); } finally { setBusy(false); }
  }
  return <div className="mx-auto grid max-w-4xl gap-6"><div className="rounded-2xl border border-line bg-white p-6"><CreditCard className="text-brand" /><h1 className="mt-3 text-2xl font-black">Pagamentos com Mercado Pago</h1><p className="mt-2 text-sm leading-6 text-muted">Pix e cartão no checkout. A confirmação é automática pelo Mercado Pago; a preparação e a entrega continuam sob controle da farmácia.</p></div>
    <form onSubmit={save} className="grid gap-5 rounded-2xl border border-line bg-white p-6">
      <h2 className="font-black">{settings?.connected ? "Conexão configurada" : "Conectar a conta"}</h2>
      <label className="grid gap-2 text-sm font-bold">Ambiente<select className="rounded-lg border border-line p-3" value={settings?.environment ?? "test"} onChange={e => settings && setSettings({ ...settings, environment: e.target.value, enabled: false })}><option value="test">Teste — somente administrador</option><option value="production">Produção</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Public Key<input className="rounded-lg border border-line p-3" value={settings?.publicKey ?? ""} onChange={e => settings && setSettings({ ...settings, publicKey: e.target.value })} required autoComplete="off" /></label>
      <label className="grid gap-2 text-sm font-bold">Access Token<input className="rounded-lg border border-line p-3" type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder={settings?.connected ? "Já configurado — preencha apenas para trocar" : "Credencial privada do vendedor"} autoComplete="new-password" /></label>
      <label className="grid gap-2 text-sm font-bold">Assinatura secreta do webhook<input className="rounded-lg border border-line p-3" type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder={settings?.connected ? "Já configurada" : "Segredo gerado em Webhooks"} autoComplete="new-password" /></label>
      <div className="rounded-lg bg-surface-subtle p-4 text-sm"><p className="font-black">URL de notificações · evento Orders</p><code className="mt-2 block break-all">https://wimifarma.com.br/api/pagamentos/mercado-pago/webhook</code><p className="mt-2 text-muted">Cadastre no Mercado Pago no ambiente correspondente. No modo teste, use a conta de vendedor de teste e dados fictícios.</p></div>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={settings?.enabled ?? false} disabled={!settings?.connected || settings.environment !== "production"} onChange={e => settings && setSettings({ ...settings, enabled: e.target.checked })} /><span>Liberar pagamento online para clientes após homologação de Pix, cartão e notificações.</span></label>
      {message && <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand">{message}</p>}
      <button disabled={!settings || busy} className="min-h-12 rounded-lg bg-brand px-5 py-3 font-black text-white disabled:opacity-50">{busy ? "Verificando..." : "Salvar conexão"}</button>
    </form>
    <PaymentFeesPanel />
    <AsaasSandboxPanel />
    <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6"><ShieldCheck className="shrink-0 text-emerald-700" /><p>As chaves privadas ficam cifradas no servidor. O site não recebe número nem código de segurança do cartão. Reembolsos são realizados no painel do Mercado Pago e sincronizados com o pedido. <Link href="/checkout" className="font-bold underline">Abrir checkout</Link></p></div>
  </div>;
}
