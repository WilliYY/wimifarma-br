"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
type Settings = { revision: number; connected: boolean; enabled: boolean; webhookRegistered: boolean; methods: ("pix" | "card")[]; pixKeyActive: boolean };
export function AsaasProductionPanel() {
  const [settings, setSettings] = useState<Settings | null>(null), [email, setEmail] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [pix, setPix] = useState(false), [card, setCard] = useState(true);
  useEffect(() => { void fetch("/api/admin/pagamentos/asaas", { cache: "no-store" }).then(async response => {
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
    setSettings(payload.data); if (payload.data.enabled) { setPix(payload.data.methods.includes("pix")); setCard(payload.data.methods.includes("card")); }
  }).catch(() => setMessage("Não foi possível consultar a conexão Asaas.")); }, []);
  async function save(action: "prepare" | "activate", enabled = true) {
    if (!settings || busy) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/pagamentos/asaas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(
        action === "prepare" ? { action, revision: settings.revision, email } : { action, revision: settings.revision, enabled, methods: [ ...(pix ? ["pix"] : []), ...(card ? ["card"] : []) ] }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setSettings(payload.data); setMessage(action === "prepare" ? "Conta e notificações verificadas. Confira os meios homologados antes de liberar clientes." : enabled ? "Asaas disponível para os meios selecionados no checkout." : "Novos pagamentos Asaas pausados. Pedidos existentes continuam sendo consultados.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a conexão."); } finally { setBusy(false); }
  }
  return <section className="grid gap-4 rounded-2xl border border-line bg-white p-6" aria-label="Asaas para clientes">
    <h2 className="flex items-center gap-3 text-xl font-black"><ShieldCheck className="text-brand" />Asaas · pagamentos para clientes</h2>
    <p className="text-sm leading-6 text-muted">Pix na tela e cartão de crédito à vista em página segura. A chave produtiva já salva nas tarifas é reutilizada no servidor. Somente os meios com recebimento confirmado no Sandbox podem ser liberados.</p>
    <p className="text-sm font-bold">{settings?.enabled ? "Ativo para clientes" : settings?.connected ? "Conectado · aguardando liberação" : "Preparar conexão produtiva"}{settings?.webhookRegistered ? " · notificações registradas" : ""}</p>
    <label className="grid gap-2 text-sm font-semibold">E-mail para avisos da integração<input className="min-h-12 rounded-xl border border-line px-4" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="E-mail comercial da farmácia" /></label>
    <button disabled={busy || !settings || !email} className="min-h-12 rounded-xl border border-line px-4 font-bold disabled:opacity-50" onClick={() => void save("prepare")}>Verificar conta e registrar notificações</button>
    <div className="flex flex-wrap gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" checked={card} onChange={event => setCard(event.target.checked)} />Crédito à vista</label><label className="flex items-center gap-2"><input type="checkbox" checked={pix} onChange={event => setPix(event.target.checked)} />Pix · exige recebimento homologado</label></div>
    <button disabled={busy || !settings?.webhookRegistered} className="min-h-12 rounded-xl bg-brand px-4 font-black text-white disabled:opacity-50" onClick={() => void save("activate")}>{busy ? "Verificando..." : "Liberar meios homologados para clientes"}</button>
    {settings?.enabled && <button disabled={busy} className="min-h-11 font-bold text-brand underline" onClick={() => void save("activate", false)}>Pausar novos pagamentos Asaas</button>}
    {message && <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm font-semibold text-brand">{message}</p>}
  </section>;
}
