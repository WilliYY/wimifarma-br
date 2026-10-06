"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Link2, Loader2, Package, Truck } from "lucide-react";
import { defaultShippingSettings, type ShippingOption, type ShippingSettings } from "@/features/shipping/schema";
import { shippingAdminProfileSchema } from "@/features/shipping/product-draft";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";
import type { PrescriptionType } from "@/features/products/purchase-policy";

type Product = { id: string; name: string; category: string | null; shippingProfile: unknown; requiresPrescription: boolean; prescriptionType?: PrescriptionType; isPopularPharmacy: boolean; updatedAt: string };
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
      <form className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" onChange={() => setQuotes([])} onSubmit={(event) => { event.preventDefault(); setQuotes([]); const values = new FormData(event.currentTarget); run(async () => { const body = { postalCode: String(values.get("postalCode")).replace(/\D/g, ""), ...Object.fromEntries(["width", "height", "length", "weight", "insurance"].map((key) => [key, Number(values.get(key))])) }; const result = await request("/api/admin/fretes/simular", "POST", body); setQuotes(result.data); setMessage(result.data.length ? "Cotação recebida. Confira o ponto de postagem e marque os serviços que deseja oferecer." : "Nenhum serviço disponível para essa encomenda."); }); }}>
        <Label text="CEP de destino"><input className={field} disabled={busy} name="postalCode" inputMode="numeric" maxLength={9} required /></Label>
        {[["weight", "Peso (kg)"], ["width", "Largura (cm)"], ["height", "Altura (cm)"], ["length", "Comprimento (cm)"], ["insurance", "Valor (R$)"]].map(([name, label]) => <Label key={name} text={label}><input className={field} disabled={busy} name={name} min="0.01" step="0.01" type="number" required /></Label>)}
        <button className={`${button} sm:col-span-3 lg:col-span-6`} disabled={busy || !data?.connected} type="submit">Consultar preços e prazos</button>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{quotes.map((quote) => <label className="flex items-start gap-3 rounded-xl border border-line p-4" key={quote.serviceId}><input checked={settings.serviceIds.includes(quote.serviceId)} className="mt-1 h-4 w-4 accent-brand" onChange={(e) => setSettings({ ...settings, serviceIds: e.target.checked ? [...settings.serviceIds, quote.serviceId] : settings.serviceIds.filter((id) => id !== quote.serviceId) })} type="checkbox" /><span className="flex-1 text-sm"><strong>{quote.carrier} · {quote.service}</strong><span className="mt-1 block text-muted">Até {quote.deliveryDays} dias úteis estimados, com preparação</span></span><strong className="text-brand">{money.format(quote.priceCents / 100)}</strong></label>)}</div>
      <p className="mt-3 text-xs text-muted">Serviços selecionados: {settings.serviceIds.join(", ") || "nenhum"}. Use “Salvar configuração” para aplicar.</p>
    </section>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-black"><Package className="h-5 w-5 text-brand" />Produtos e embalagens</h2><p className="mt-2 text-sm leading-6 text-muted">Meça e pese cada unidade já embalada. Nesta integração, cada unidade é cotada como um volume separado. Medicamentos sem receita usam PAC ou SEDEX após revisão. Itens sujeitos a receita e Farmácia Popular seguem no atendimento farmacêutico. Líquidos, aerossóis e produtos sensíveis ao calor precisam de revisão de conservação e transporte.</p><div className="mt-5 grid gap-4">{data?.products.map((product) => <ProductShippingForm key={`${product.id}:${product.updatedAt}`} product={product} busy={busy} onSave={(profile) => run(async () => { await request(`/api/admin/fretes/produtos/${product.id}`, "PUT", { profile, updatedAt: product.updatedAt }); await load(); setMessage("Dados de transporte salvos."); })} />)}</div></section>
  </div>;
}
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-2 text-xs font-bold text-muted"><span>{text}</span>{children}</label>; }
function ProductShippingForm({ product, busy, onSave }: { product: Product; busy: boolean; onSave: (profile: unknown) => void }) {
  const parsed = shippingAdminProfileSchema.safeParse(product.shippingProfile); const profile = parsed.success ? parsed.data : null;
  const [measurements, setMeasurements] = useState(() => ({
    weightGrams: String(profile?.weightGrams ?? ""), widthCm: String(profile?.widthCm ?? ""),
    heightCm: String(profile?.heightCm ?? ""), lengthCm: String(profile?.lengthCm ?? ""),
  }));
  const [reviewed, setReviewed] = useState(profile?.transportReviewed ?? false);
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [measurementBasis, setMeasurementBasis] = useState<"measured" | "estimated">(profile?.measurementBasis ?? "measured");
  const [reference, setReference] = useState(profile?.reference ?? null);
  const [validationMessage, setValidationMessage] = useState("");
  const blocked = requiresPharmacyShippingSupport(product);
  function invalidateReview() { setReviewed(false); setEnabled(false); setReference(null); setValidationMessage(""); }
  return <form className="rounded-xl border border-line p-4" onSubmit={(event) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const draft = submitter?.value !== "approve";
    const result = shippingAdminProfileSchema.safeParse({
      enabled: draft ? false : enabled, transportReviewed: draft ? false : reviewed, measurementBasis, reference,
      ...Object.fromEntries(Object.entries(measurements).map(([key, value]) => [key, value.trim() === "" ? null : Number(value)])),
    });
    if (!result.success || (!draft && !reviewed)) {
      setValidationMessage(draft ? "Confira os números informados. Campos sem medida podem ficar vazios no rascunho." : "Informe peso e todas as medidas válidas e confirme a revisão antes de aprovar.");
      return;
    }
    setValidationMessage(""); onSave(result.data);
  }}>
    {!reviewed && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Rascunho: dados parciais podem ser salvos sem liberar o transporte. Confira o volume pronto para envio, com proteção e caixa, antes de aprovar. Referências da IA podem descrever apenas a embalagem comercial.</p>}
    <strong className="text-sm text-ink">{product.name}</strong>{blocked && <p className="mt-2 text-xs text-muted">Você pode preparar peso e medidas deste produto. A venda e o envio exigem atendimento farmacêutico; o rascunho não libera cotação ou cobrança automática.</p>}<>
      <div className="mt-3 rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-muted">
        <button className={`${button} mb-2`} disabled={busy} onClick={() => { setMeasurements({ ...measurements, lengthCm: "20.8", widthCm: "20.8", heightCm: "21.6" }); setMeasurementBasis("estimated"); invalidateReview(); }} type="button">Caixa média 20 cm</button>
        <p>Referência Packit: caixa interna de 20 × 20 × 20 cm; medidas externas C20,8 × L20,8 × A21,6 cm. Preenche somente dimensões em rascunho; o peso informado é preservado. Confira encaixe, proteção e peso final.</p>
        <a className="mt-1 inline-flex items-center gap-1 font-bold text-brand" href="https://www.packit.com.br/10-caixas-de-papelao-20x20x20-cm" rel="noreferrer" target="_blank">Consultar caixa e medidas no fornecedor<ArrowUpRight className="h-3 w-3" /></a>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">{([["weightGrams", "Peso embalado (g)"], ["widthCm", "Largura (cm)"], ["heightCm", "Altura (cm)"], ["lengthCm", "Comprimento (cm)"]] as const).map(([name, label]) => <Label key={name} text={label}><input className={field} disabled={busy} max={name === "weightGrams" ? 30000 : 200} min={name === "weightGrams" ? 1 : 0.01} name={name} onChange={(event) => { setMeasurements({ ...measurements, [name]: event.target.value }); invalidateReview(); }} step={name === "weightGrams" ? 1 : "any"} type="number" value={measurements[name]} /></Label>)}</div>
      <div className="mt-3"><Label text="Origem do peso e das medidas"><select className={field} disabled={busy} onChange={(event) => { setMeasurementBasis(event.target.value as "measured" | "estimated"); invalidateReview(); }} value={measurementBasis}><option value="measured">Medidos no volume pronto para envio</option><option value="estimated">Estimativa operacional autorizada</option></select></Label></div>
      {measurementBasis === "estimated" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Estimativa operacional autorizada. Confira peso/dimensões reais antes da postagem; a transportadora pode ajustar o frete.</p>}
      <label className="mt-3 flex items-start gap-2 text-xs text-muted"><input checked={reviewed} disabled={busy} name="reviewed" onChange={(event) => { setReviewed(event.target.checked); if (!event.target.checked) setEnabled(false); }} type="checkbox" />Revisei as medidas/peso informados e a adequação da embalagem, conservação e aceitação nos serviços selecionados.</label>
      {validationMessage && <p className="mt-3 text-xs text-red-700" role="alert">{validationMessage}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input checked={enabled} disabled={busy || !reviewed || blocked} name="enabled" onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />Liberar para transportadora</label><div className="flex flex-wrap gap-2"><button className={`${button} bg-ink`} disabled={busy} name="intent" type="submit" value="draft">Salvar rascunho</button><button className={button} disabled={busy || blocked} name="intent" type="submit" value="approve">Aprovar dados completos</button></div></div>
    </>
  </form>;
}
