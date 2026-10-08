"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

type Credential = { id: string; title: string; updatedAt: string };
type CheckResult = { validated: true; feeRuleCount: number; checkedAt: string };

export function AsaasSandboxPanel() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialId, setCredentialId] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/pagamentos/asaas-sandbox", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        if (active) setCredentials(payload.data);
      } catch {
        if (active) setMessage("Não foi possível carregar as credenciais Sandbox.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!credentialId || busy) return;
    setBusy(true); setMessage(""); setResult(null);
    try {
      const response = await fetch("/api/admin/pagamentos/asaas-sandbox", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setResult(payload.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível validar o Sandbox."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={check} className="grid gap-4 rounded-2xl border border-line bg-white p-6">
    <div className="flex items-center gap-3"><FlaskConical className="shrink-0 text-brand" /><h2 className="font-black">Asaas Sandbox · conexão de testes</h2></div>
    <p className="text-sm leading-6 text-muted">Selecione a chave de testes guardada no cofre para verificar o acesso às tarifas. Esta consulta não cria cobranças e não ativa o Asaas no checkout.</p>
    <label className="grid gap-2 text-sm font-bold">Credencial Sandbox
      <select className="min-w-0 rounded-lg border border-line p-3" value={credentialId} disabled={loading || busy}
        onChange={event => { setCredentialId(event.target.value); setResult(null); setMessage(""); }}>
        <option value="">{loading ? "Carregando..." : "Selecione a credencial do cofre"}</option>
        {credentials.map(credential => <option key={credential.id} value={credential.id}>{credential.title}</option>)}
      </select>
    </label>
    {!loading && !credentials.length && <p className="text-sm text-muted">Guarde no cofre uma chave com serviço Asaas e identificador sandbox. <Link href="/admin/api-senhas" className="font-bold text-brand underline">Abrir API e Senhas</Link></p>}
    {message && <p role="alert" className="rounded-lg bg-brand-soft p-3 text-sm font-bold text-brand">{message}</p>}
    {result && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Conexão Sandbox validada em {new Date(result.checkedAt).toLocaleString("pt-BR")}. {result.feeRuleCount} regras de tarifas verificadas. A homologação de pagamentos ainda está pendente.</p>}
    <button disabled={loading || !credentialId || busy} className="min-h-12 rounded-lg bg-brand px-5 py-3 font-black text-white disabled:opacity-50">{busy ? "Verificando Sandbox..." : "Verificar conexão Sandbox"}</button>
  </form>;
}
