"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Link2, Loader2, Package, Truck } from "lucide-react";
import { defaultShippingSettings, shippingProfileSchema, type ShippingOption, type ShippingSettings } from "@/features/shipping/schema";

type Product = { id: string; name: string; category: string | null; shippingProfile: unknown; requiresPrescription: boolean; isPopularPharmacy: boolean; updatedAt: string };
type Data = { settings: ShippingSettings; revision: number; applicationConfigured: boolean; connected: boolean; expiresAt: number | null; products: Product[] };
const field = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Não foi possível concluir a operação.");
  return payload;
}
export function ShippingPanel({ callbackUrl }: { callbackUrl: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<ShippingSettings>(defaultShippingSettings);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [quotes, setQuotes] = useState<ShippingOption[]>([]);
  async function load() {
    const result = await request("/api/admin/fretes");
    setData(result.data); setSettings(result.data.settings);
  }
  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    const status = new URLSearchParams(window.location.search).get("connection");
    if (status) setMessage(status === "success" ? "Conta conectada. Faça uma simulação antes de ativar no checkout." : "Não foi possível autorizar. Confira o aplicativo e tente conectar novamente.");
  }, []);
  async function run(action: () => Promise<void>) { setBusy(true); setMessage(""); try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na operação."); } finally { setBusy(false); } }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    await run(async () => {
      const clientId = String(values.get("clientId") || "").trim(); const clientSecret = String(values.get("clientSecret") || "").trim();
      await request("/api/admin/fretes", "PUT", { settings, revision: data?.revision ?? 0, ...(clientId || clientSecret ? { application: { clientId, clientSecret } } : {}) });
      form.reset(); await load(); setMessage("Configuração salva.");
    });
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-soft p-3 text-brand"><Truck className="h-6 w-6" /></span><div><h1 className="text-xl font-black text-ink">Envios da Wimifarma</h1><p className="mt-1 text-sm text-muted">Origem: Av. Minas Gerais, 2263 · Ivaté/PR</p></div></div><span className={`rounded-full px-3 py-2 text-xs font-bold ${data?.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{data?.connected ? "Melhor Envio conectado" : "Conexão pendente"}</span></div>
      <p className="mt-5 text-sm leading-6 text-muted">Conecte a conta, confira a embalagem e escolha os serviços de postagem disponíveis para a farmácia. A cotação não compra etiquetas nem realiza cobranças.</p>
      <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">{["1. Conectar a conta", "2. Conferir fretes e produtos", "3. Ativar no checkout"].map((text) => <span className="rounded-lg bg-surface-subtle p-3 font-bold" key={text}>{text}</span>)}</div>
    </section>
    {message && <p className="rounded-xl border border-line bg-white p-4 text-sm" role="status">{message}</p>}
    <form className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7" onSubmit={save}>
      <h2 className="text-lg font-black">Conexão e origem</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Label text="Ambiente"><select className={field} onChange={(e) => setSettings({ ...settings, enabled: false, environment: e.target.value as ShippingSettings["environment"] })} value={settings.environment}><option value="production">Produção</option><option value="sandbox">Sandbox (teste)</option></select></Label>
        <Label text="CEP de saída"><input className={field} inputMode="numeric" maxLength={8} onChange={(e) => setSettings({ ...settings, originPostalCode: e.target.value.replace(/\D/g, "") })} required value={settings.originPostalCode} /></Label>
        <Label text="Dias úteis para preparar"><input className={field} max={15} min={0} onChange={(e) => setSettings({ ...settings, preparationDays: Number(e.target.value) })} required type="number" value={settings.preparationDays} /></Label>
        <Label text="E-mail do responsável pela integração"><input className={field} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} required type="email" value={settings.contactEmail} /></Label>
        <Label text="Client ID do aplicativo"><input autoComplete="off" className={field} name="clientId" placeholder={data?.applicationConfigured ? "Já configurado — deixe vazio para manter" : "Informado pelo Melhor Envio"} /></Label>
        <Label text="Client Secret"><input autoComplete="new-password" className={field} name="clientSecret" placeholder="Guardado com criptografia" type="password" /></Label>
      </div>
      <p className="break-all rounded-lg bg-surface-subtle p-3 text-xs text-muted">URL de redirecionamento para cadastrar no aplicativo: <strong className="text-ink">{callbackUrl}</strong></p>
      <p className="text-xs leading-5 text-muted">Permissões solicitadas: cotar fretes, consultar transportadoras e rastreamento. O aplicativo não recebe permissão para gastar o saldo da carteira.</p>
      {data?.expiresAt && <p className="text-xs text-muted">Acesso válido até {new Date(data.expiresAt).toLocaleDateString("pt-BR")}. A renovação é automática durante o uso; após longa inatividade pode ser necessário reconectar.</p>}
      <label className="flex items-start gap-3 rounded-lg border border-line p-4 text-sm"><input checked={settings.enabled} className="mt-1 h-4 w-4 accent-brand" onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} type="checkbox" /><span><strong>Exibir frete por transportadora no checkout</strong><span className="mt-1 block text-xs text-muted">Ative após validar a origem, os serviços, a documentação fiscal e as embalagens dos produtos.</span></span></label>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} type="submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Salvar configuração</button><button className={`${button} bg-ink`} disabled={busy || !data?.applicationConfigured} onClick={() => run(async () => { const result = await request("/api/admin/fretes/conectar", "POST", {}); window.location.assign(result.url); })} type="button"><Link2 className="h-4 w-4" />Conectar Melhor Envio</button><a className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-brand" href="https://app.melhorenvio.com.br/integracoes/area-dev" rel="noreferrer" target="_blank">Área de aplicativos<ArrowUpRight className="h-4 w-4" /></a></div>
    </form>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="text-lg font-black">Simular e selecionar serviços</h2><p className="mt-2 text-sm leading-6 text-muted">Informe uma encomenda embalada. A simulação consulta preços; não cria envio. Marque apenas serviços com postagem ou coleta viável para Ivaté e aceitação confirmada das mercadorias.</p>
      <form className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); run(async () => { const body = { postalCode: String(values.get("postalCode")).replace(/\D/g, ""), ...Object.fromEntries(["width", "height", "length", "weight", "insurance"].map((key) => [key, Number(values.get(key))])) }; const result = await request("/api/admin/fretes/simular", "POST", body); setQuotes(result.data); setMessage(result.data.length ? "Cotação recebida. Confira o ponto de postagem e marque os serviços que deseja oferecer." : "Nenhum serviço disponível para essa encomenda."); }); }}>
        <Label text="CEP de destino"><input className={field} name="postalCode" inputMode="numeric" maxLength={9} required /></Label>
        {[["weight", "Peso (kg)"], ["width", "Largura (cm)"], ["height", "Altura (cm)"], ["length", "Comprimento (cm)"], ["insurance", "Valor (R$)"]].map(([name, label]) => <Label key={name} text={label}><input className={field} name={name} min="0.01" step="0.01" type="number" required /></Label>)}
        <button className={`${button} sm:col-span-3 lg:col-span-6`} disabled={busy || !data?.connected} type="submit">Consultar preços e prazos</button>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{quotes.map((quote) => <label className="flex items-start gap-3 rounded-xl border border-line p-4" key={quote.serviceId}><input checked={settings.serviceIds.includes(quote.serviceId)} className="mt-1 h-4 w-4 accent-brand" onChange={(e) => setSettings({ ...settings, serviceIds: e.target.checked ? [...settings.serviceIds, quote.serviceId] : settings.serviceIds.filter((id) => id !== quote.serviceId) })} type="checkbox" /><span className="flex-1 text-sm"><strong>{quote.carrier} · {quote.service}</strong><span className="mt-1 block text-muted">Até {quote.deliveryDays} dias úteis estimados, com preparação</span></span><strong className="text-brand">{money.format(quote.priceCents / 100)}</strong></label>)}</div>
      <p className="mt-3 text-xs text-muted">Serviços selecionados: {settings.serviceIds.join(", ") || "nenhum"}. Use “Salvar configuração” para aplicar.</p>
    </section>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-black"><Package className="h-5 w-5 text-brand" />Produtos e embalagens</h2><p className="mt-2 text-sm leading-6 text-muted">Meça e pese cada unidade já embalada. Nesta integração, cada unidade é cotada como um volume separado. Medicamentos e itens com receita seguem no atendimento da farmácia. Líquidos, aerossóis e produtos sensíveis ao calor precisam de revisão de transporte.</p><div className="mt-5 grid gap-4">{data?.products.map((product) => <ProductShippingForm key={`${product.id}:${product.updatedAt}`} product={product} busy={busy} onSave={(profile) => run(async () => { await request(`/api/admin/fretes/produtos/${product.id}`, "PUT", { profile, updatedAt: product.updatedAt }); await load(); setMessage("Dados de transporte salvos."); })} />)}</div></section>
  </div>;
}
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-2 text-xs font-bold text-muted"><span>{text}</span>{children}</label>; }
function ProductShippingForm({ product, busy, onSave }: { product: Product; busy: boolean; onSave: (profile: unknown) => void }) {
  const parsed = shippingProfileSchema.safeParse(product.shippingProfile); const profile = parsed.success ? parsed.data : null;
  const blocked = product.requiresPrescription || product.isPopularPharmacy || /medicament|farm[aá]ci/i.test(product.category ?? "");
  return <form className="rounded-xl border border-line p-4" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); onSave({ enabled: values.get("enabled") === "on", transportReviewed: values.get("reviewed") === "on", ...Object.fromEntries(["weightGrams", "widthCm", "heightCm", "lengthCm"].map((key) => [key, Number(values.get(key))])) }); }}>
    <strong className="text-sm text-ink">{product.name}</strong>{blocked ? <p className="mt-2 text-xs text-muted">Envio sujeito a atendimento farmacêutico; indisponível para cotação automática.</p> : <><div className="mt-3 grid gap-3 sm:grid-cols-4">{[["weightGrams", "Peso embalado (g)"], ["widthCm", "Largura (cm)"], ["heightCm", "Altura (cm)"], ["lengthCm", "Comprimento (cm)"]].map(([name, label]) => <Label key={name} text={label}><input className={field} defaultValue={profile?.[name as "weightGrams" | "widthCm"]} min={name === "weightGrams" ? 1 : 0.1} name={name} required step={name === "weightGrams" ? 1 : 0.1} type="number" /></Label>)}</div><label className="mt-3 flex items-start gap-2 text-xs text-muted"><input defaultChecked={profile?.transportReviewed} name="reviewed" required type="checkbox" />Conferi embalagem, conservação e aceitação deste produto em todos os serviços selecionados.</label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input defaultChecked={profile?.enabled} name="enabled" type="checkbox" />Liberar para transportadora</label><button className={button} disabled={busy} type="submit">Salvar embalagem</button></div></>}
  </form>;
}
