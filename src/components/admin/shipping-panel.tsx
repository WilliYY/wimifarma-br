"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Link2, Loader2, Package, Truck } from "lucide-react";
import { postingLocationSchema, defaultShippingSettings, type ShippingOption, type ShippingSettings } from "@/features/shipping/schema";
import { shippingAdminProfileSchema } from "@/features/shipping/product-draft";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";
import type { PrescriptionType } from "@/features/products/purchase-policy";
import { SHIPPING_CARGO_LABELS, type ShippingCargo } from "@/features/shipping/cargo-policy";
import { ShippingOperationalCostFields, ShippingCostComparisons } from "./shipping-operational-costs";

type Product = { id: string; name: string; category: string | null; shippingProfile: unknown; requiresPrescription: boolean; prescriptionType?: PrescriptionType; isPopularPharmacy: boolean; updatedAt: string };
type Data = { settings: ShippingSettings; revision: number; applicationConfigured: boolean; connected: boolean; expiresAt: number | null; products: Product[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type Service = Pick<ShippingOption, "serviceId" | "service" | "carrier">;
const defaultServices: Service[] = [{ serviceId: 1, carrier: "Correios", service: "PAC" }, { serviceId: 2, carrier: "Correios", service: "SEDEX" }];
const field = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const cargoOptions = (Object.keys(SHIPPING_CARGO_LABELS) as ShippingCargo[]).filter(kind => kind !== "unspecified");
async function request(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, { method, cache: "no-store", signal, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
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
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogRequest, setCatalogRequest] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const catalogInitialized = useRef(false);
  const catalogUrl = `/api/admin/fretes?${new URLSearchParams({ q: catalogQuery, page: String(catalogPage) })}`;
  const [simulationCargo, setSimulationCargo] = useState<{ cargoKinds: ShippingCargo[]; acceptanceConfirmed: boolean }>({ cargoKinds: ["unspecified"], acceptanceConfirmed: false });
  const simulationSettingsChanged = !!data && ["environment", "originPostalCode", "originCity", "originState", "preparationDays"].some(key => settings[key as keyof ShippingSettings] !== data.settings[key as keyof ShippingSettings]);
  async function load(refreshSettings = true) {
    const result = await request(catalogUrl);
    if (refreshSettings) { setData(result.data); setSettings(result.data.settings); }
    else setData(current => current ? { ...current, products: result.data.products, pagination: result.data.pagination } : result.data);
  }
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("connection");
    if (status) setMessage(status === "success" ? "Conta conectada. Faça uma simulação antes de ativar no checkout." : "Não foi possível autorizar. Confira o aplicativo e tente conectar novamente.");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true); setCatalogError("");
    request(catalogUrl, "GET", undefined, controller.signal).then((result: { data: Data }) => {
      if (controller.signal.aborted) return;
      if (!catalogInitialized.current) { setSettings(result.data.settings); catalogInitialized.current = true; }
      setData(current => current ? { ...current, products: result.data.products, pagination: result.data.pagination } : result.data);
    }).catch(error => {
      if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : "Falha ao consultar os produtos.");
    }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [catalogUrl, catalogRequest]);
  async function run(action: () => Promise<void>) { setBusy(true); setMessage(""); try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na operação."); } finally { setBusy(false); } }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    await run(async () => {
      const clientId = String(values.get("clientId") || "").trim(); const clientSecret = String(values.get("clientSecret") || "").trim();
      await request("/api/admin/fretes", "PUT", { settings: { ...settings, postingLocations: settings.postingLocations.filter(location => location.city.trim()).map(location => ({ ...location, city: location.city.trim(), pointName: location.pointName?.trim() || undefined })) }, revision: data?.revision ?? 0, ...(clientId || clientSecret ? { application: { clientId, clientSecret } } : {}) });
      form.reset(); setQuotes([]); await load(); setMessage("Configuração salva.");
    });
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-soft p-3 text-brand"><Truck className="h-6 w-6" /></span><div><h1 className="text-xl font-black text-ink">Envios da Wimifarma</h1><p className="mt-1 text-sm text-muted">Origem: Av. Minas Gerais, 2263 · {settings.originCity}/{settings.originState}</p></div></div><span className={`rounded-full px-3 py-2 text-xs font-bold ${data?.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{data?.connected ? "Melhor Envio conectado" : "Conexão pendente"}</span></div>
      <p className="mt-5 text-sm leading-6 text-muted">Conecte a conta, confira a embalagem e escolha os serviços de postagem disponíveis para a farmácia. A cotação não compra etiquetas nem realiza cobranças.</p>
      <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">{["1. Conectar a conta", "2. Conferir fretes e produtos", "3. Ativar no checkout"].map((text) => <span className="rounded-lg bg-surface-subtle p-3 font-bold" key={text}>{text}</span>)}</div>
    </section>
    {message && <p className="rounded-xl border border-line bg-white p-4 text-sm" role="status">{message}</p>}
    <form className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7" onSubmit={save}>
      <fieldset className="contents" disabled={busy}>
      <h2 className="text-lg font-black">Conexão e origem</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Label text="Ambiente"><select className={field} onChange={(e) => setSettings({ ...settings, enabled: false, environment: e.target.value as ShippingSettings["environment"] })} value={settings.environment}><option value="production">Produção</option><option value="sandbox">Sandbox (teste)</option></select></Label>
        <Label text="CEP de saída"><input className={field} inputMode="numeric" maxLength={8} onChange={(e) => setSettings({ ...settings, originPostalCode: e.target.value.replace(/\D/g, "") })} required value={settings.originPostalCode} /></Label>
        <Label text="Cidade de origem"><input className={field} maxLength={100} minLength={2} onChange={event => setSettings({ ...settings, originCity: event.target.value })} required value={settings.originCity} /></Label>
        <Label text="UF de origem"><select className={field} onChange={event => setSettings({ ...settings, originState: event.target.value as ShippingSettings["originState"] })} value={settings.originState}>{postingLocationSchema.shape.state.options.map(state => <option key={state} value={state}>{state}</option>)}</select></Label>
        <Label text="Dias úteis para preparar"><input className={field} max={15} min={0} onChange={(e) => setSettings({ ...settings, preparationDays: Number(e.target.value) })} required type="number" value={settings.preparationDays} /></Label>
        <Label text="E-mail do responsável pela integração"><input className={field} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} required type="email" value={settings.contactEmail} /></Label>
        <Label text="Client ID do aplicativo"><input autoComplete="off" className={field} name="clientId" placeholder={data?.applicationConfigured ? "Já configurado — deixe vazio para manter" : "Informado pelo Melhor Envio"} /></Label>
        <Label text="Client Secret"><input autoComplete="new-password" className={field} name="clientSecret" placeholder="Guardado com criptografia" type="password" /></Label>
      </div>
      <p className="break-all rounded-lg bg-surface-subtle p-3 text-xs text-muted">URL de redirecionamento para cadastrar no aplicativo: <strong className="text-ink">{callbackUrl}</strong></p>
      <p className="text-xs leading-5 text-muted">Permissões solicitadas: cotar fretes, consultar transportadoras e rastreamento. O aplicativo não recebe permissão para gastar o saldo da carteira.</p>
      {data?.expiresAt && <p className="text-xs text-muted">Acesso válido até {new Date(data.expiresAt).toLocaleDateString("pt-BR")}. A renovação é automática durante o uso; após longa inatividade pode ser necessário reconectar.</p>}
      <label className="flex items-start gap-3 rounded-lg border border-line p-4 text-sm"><input checked={settings.enabled} className="mt-1 h-4 w-4 accent-brand" onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} type="checkbox" /><span><strong>Exibir frete por transportadora no checkout</strong><span className="mt-1 block text-xs text-muted">Ative após validar a origem, os serviços, a documentação fiscal e as embalagens dos produtos.</span></span></label>
      <fieldset className="grid min-w-0 gap-4 rounded-xl border border-line p-4"><legend className="px-1 text-sm font-black">Locais de postagem por serviço</legend>
        <p className="text-xs leading-5 text-muted">Informe o local confirmado de cada serviço selecionado. Deixe a cidade vazia para remover o local e manter a confirmação pendente. O endereço do destinatário é separado. Salvar não altera o local registrado em pedidos anteriores.</p>
        {settings.serviceIds.length === 0 && <p className="text-sm text-muted">Selecione os serviços na simulação abaixo para configurar a postagem.</p>}
        {settings.serviceIds.map(serviceId => {
          const service = [...defaultServices, ...services, ...quotes].find(service => service.serviceId === serviceId);
          const location = settings.postingLocations.find(location => location.serviceId === serviceId);
          function updateLocation(patch: Partial<ShippingSettings["postingLocations"][number]>) {
            setSettings(current => {
              const existing = current.postingLocations.find(location => location.serviceId === serviceId);
              return { ...current, postingLocations: [...current.postingLocations.filter(location => location.serviceId !== serviceId), { serviceId, city: "", state: current.originState, ...existing, ...patch }] };
            });
          }
          return <fieldset className="grid min-w-0 gap-3 rounded-lg bg-surface-subtle p-3" key={serviceId}><legend className="px-1 text-xs font-bold">{service ? `${service.carrier} · ${service.service}` : `Serviço ${serviceId}`}</legend>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]">
              <Label text={`Cidade de postagem · serviço ${serviceId}`}><input className={field} disabled={busy} maxLength={100} minLength={2} onChange={event => updateLocation({ city: event.target.value })} value={location?.city ?? ""} /></Label>
              <Label text={`UF de postagem · serviço ${serviceId}`}><select className={field} disabled={busy} onChange={event => updateLocation({ state: event.target.value as ShippingSettings["originState"] })} value={location?.state ?? settings.originState}>{postingLocationSchema.shape.state.options.map(state => <option key={state} value={state}>{state}</option>)}</select></Label>
              <Label text={`Ponto de postagem (opcional) · serviço ${serviceId}`}><input className={field} disabled={busy} maxLength={160} onChange={event => updateLocation({ pointName: event.target.value })} value={location?.pointName ?? ""} /></Label>
            </div>
            {!location?.city.trim() && <p className="text-xs font-semibold text-amber-800">Local de postagem: confirmação pendente</p>}
          </fieldset>;
        })}
      </fieldset>
      <ShippingOperationalCostFields settings={settings} services={[...defaultServices, ...services, ...quotes]} disabled={busy} onChange={setSettings} />
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} type="submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Salvar configuração</button><button className={`${button} bg-ink`} disabled={busy || !data?.applicationConfigured} onClick={() => run(async () => { const result = await request("/api/admin/fretes/conectar", "POST", {}); window.location.assign(result.url); })} type="button"><Link2 className="h-4 w-4" />Conectar Melhor Envio</button><a className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-brand" href="https://app.melhorenvio.com.br/integracoes/area-dev" rel="noreferrer" target="_blank">Área de aplicativos<ArrowUpRight className="h-4 w-4" /></a></div>
      </fieldset>
    </form>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="text-lg font-black">Simular e selecionar serviços</h2><p className="mt-2 text-sm leading-6 text-muted">Informe uma encomenda embalada. A simulação consulta preços; não cria envio. Marque apenas serviços com postagem ou coleta viável para Ivaté e aceitação confirmada das mercadorias.</p>
      <form className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" onChange={() => setQuotes([])} onSubmit={(event) => { event.preventDefault(); setQuotes([]); const values = new FormData(event.currentTarget); run(async () => { const kinds = values.getAll("cargoKinds") as ShippingCargo[]; const cargoKinds: ShippingCargo[] = kinds.length ? kinds : ["unspecified"]; const acceptanceConfirmed = values.has("acceptanceConfirmed"); const body = { postalCode: String(values.get("postalCode")).replace(/\D/g, ""), cargoKinds, acceptanceConfirmed, ...Object.fromEntries(["width", "height", "length", "weight", "insurance"].map((key) => [key, Number(values.get(key))])) }; const result = await request("/api/admin/fretes/simular", "POST", body); setSimulationCargo({ cargoKinds, acceptanceConfirmed }); setQuotes(result.data); setServices(result.services ?? result.data); setMessage(result.data.length ? "Cotação recebida. Compare custo completo, aceitação e viabilidade da rota antes de selecionar." : "Nenhum serviço disponível para essa encomenda."); }); }}>
        <Label text="CEP de destino"><input className={field} disabled={busy} name="postalCode" inputMode="numeric" maxLength={9} required /></Label>
        {[["weight", "Peso (kg)"], ["width", "Largura (cm)"], ["height", "Altura (cm)"], ["length", "Comprimento (cm)"], ["insurance", "Valor (R$)"]].map(([name, label]) => <Label key={name} text={label}><input className={field} disabled={busy} name={name} min="0.01" step="0.01" type="number" required /></Label>)}
        <fieldset className="rounded-xl border border-line p-3 sm:col-span-3 lg:col-span-6" disabled={busy}><legend className="px-1 text-xs font-bold">Mercadorias nesta encomenda</legend><p className="mb-3 text-xs text-muted">Marque todos os tipos presentes. Perfumaria é uma categoria ampla: marque “Perfume” somente quando a encomenda contiver perfume. Sem classificação, a aceitação fica pendente.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cargoOptions.map(kind => <label className="flex gap-2 text-xs" key={kind}><input name="cargoKinds" type="checkbox" value={kind} />{SHIPPING_CARGO_LABELS[kind]}</label>)}</div><label className="mt-4 flex items-start gap-2 text-xs text-muted"><input name="acceptanceConfirmed" type="checkbox" />Conferi as condições do Melhor Envio e a aceitação desta carga e embalagem para os serviços condicionados exibidos. Esta confirmação vale apenas para a simulação.</label></fieldset>
        {simulationSettingsChanged && <p className="text-xs text-amber-900 sm:col-span-3 lg:col-span-6">Salve a origem, o ambiente e o prazo de preparação antes de simular novamente.</p>}
        <button className={`${button} sm:col-span-3 lg:col-span-6`} disabled={busy || !data?.connected || simulationSettingsChanged} type="submit">Comparar preços, custos e aceitação</button>
      </form>
      <ShippingCostComparisons quotes={simulationSettingsChanged ? [] : quotes} settings={settings} cargoKinds={simulationCargo.cargoKinds} acceptanceConfirmed={simulationCargo.acceptanceConfirmed} disabled={busy} onToggleService={(id, selected) => setSettings({ ...settings, serviceIds: selected ? [...new Set([...settings.serviceIds, id])] : settings.serviceIds.filter(serviceId => serviceId !== id) })} />
      <p className="mt-3 text-xs text-muted">Serviços selecionados: {settings.serviceIds.join(", ") || "nenhum"}. Use “Salvar configuração” para aplicar.</p>
    </section>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-black"><Package className="h-5 w-5 text-brand" />Produtos e embalagens</h2><p className="mt-2 text-sm leading-6 text-muted">Cadastre o peso e as medidas externas de cada unidade já protegida. O Melhor Envio recebe a quantidade e calcula os pacotes, sem forçar uma remessa por unidade. Os dados existentes já incluem caixa e proteção: não some tara novamente nem substitua por peso líquido ou medidas internas. O empacotamento é uma previsão; pese e meça a caixa final antes de emitir a etiqueta. Medicamentos sem receita e de receita comum classificada pelo administrador usam PAC ou SEDEX após revisão do transporte; a receita comum é conferida pelo farmacêutico antes da dispensação. Controlados, receita ainda não classificada e Farmácia Popular seguem no atendimento assistido. Líquidos, aerossóis e produtos sensíveis ao calor precisam de revisão de conservação e transporte.</p>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setCatalogQuery(search.trim()); setCatalogPage(1); setCatalogRequest(current => current + 1); }}>
        <div className="min-w-0 flex-1"><Label text="Buscar produto por nome, EAN ou SKU"><input className={field} disabled={busy} maxLength={120} onChange={event => setSearch(event.target.value)} type="search" value={search} /></Label></div>
        <button className={button} disabled={busy || catalogLoading} type="submit">Buscar produtos</button>
        {(search || catalogQuery) && <button className={`${button} bg-ink`} disabled={busy || catalogLoading} onClick={() => { setSearch(""); setCatalogQuery(""); setCatalogPage(1); }} type="button">Limpar busca</button>}
      </form>
      <p className="mt-3 text-xs text-muted">A busca consulta todo o catálogo, incluindo rascunhos. Salve as alterações do produto antes de trocar de página ou buscar.</p>
      <nav aria-label="Páginas de produtos para transporte" className="mt-4 flex flex-wrap items-center gap-3">
        <button className={`${button} bg-ink`} disabled={busy || catalogLoading || !data || (data.pagination?.page ?? 1) <= 1} onClick={() => setCatalogPage((data?.pagination?.page ?? 1) - 1)} type="button">Anterior</button>
        <p aria-live="polite" className="text-sm text-muted">Página {data?.pagination?.page ?? 1} de {data?.pagination?.totalPages ?? 1} · {data?.pagination?.total ?? data?.products.length ?? 0} produtos · até 100 por página</p>
        <button className={button} disabled={busy || catalogLoading || !data || (data.pagination?.page ?? 1) >= (data.pagination?.totalPages ?? 1)} onClick={() => setCatalogPage((data?.pagination?.page ?? 1) + 1)} type="button">Próxima</button>
      </nav>
      {catalogLoading && <p className="mt-4 text-sm text-muted" role="status">Carregando produtos…</p>}
      {catalogError && <p className="mt-4 text-sm text-red-700" role="alert">{catalogError}</p>}
      {!catalogLoading && !catalogError && data?.products.length === 0 && <p className="mt-4 text-sm text-muted">Nenhum produto encontrado.</p>}
      <div className="mt-5 grid gap-4">{!catalogLoading && !catalogError && data?.products.map((product) => <ProductShippingForm key={`${product.id}:${product.updatedAt}`} product={product} busy={busy} services={[...defaultServices, ...services, ...quotes]} configured={settings.serviceIds} onSave={(profile) => run(async () => { await request(`/api/admin/fretes/produtos/${product.id}`, "PUT", { profile, updatedAt: product.updatedAt }); await load(false); setMessage("Dados de transporte salvos."); })} />)}</div></section>
  </div>;
}
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-2 text-xs font-bold text-muted"><span>{text}</span>{children}</label>; }
function ProductShippingForm({ product, busy, services, configured, onSave }: { product: Product; busy: boolean; services: Service[]; configured: number[]; onSave: (profile: unknown) => void }) {
  const parsed = shippingAdminProfileSchema.safeParse(product.shippingProfile); const profile = parsed.success ? parsed.data : null;
  const [measurements, setMeasurements] = useState(() => ({
    weightGrams: String(profile?.weightGrams ?? ""), widthCm: String(profile?.widthCm ?? ""),
    heightCm: String(profile?.heightCm ?? ""), lengthCm: String(profile?.lengthCm ?? ""),
  }));
  const [reviewed, setReviewed] = useState(profile?.transportReviewed ?? false);
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [measurementBasis, setMeasurementBasis] = useState<"measured" | "estimated">(profile?.measurementBasis ?? "measured");
  const [reference, setReference] = useState(profile?.reference ?? null);
  const [approvedServiceIds, setApprovedServiceIds] = useState(profile?.approvedServiceIds ?? [1, 2]);
  const [cargoKinds, setCargoKinds] = useState<ShippingCargo[]>(profile?.cargoKinds ?? []);
  const options = [...new Map([
    ...configured.map(serviceId => ({ serviceId, carrier: "Transportadora", service: `Serviço ${serviceId}` })),
    ...approvedServiceIds.map(serviceId => ({ serviceId, carrier: "Transportadora", service: `Serviço ${serviceId}` })),
    ...services,
  ].map(service => [service.serviceId, service])).values()];
  const [validationMessage, setValidationMessage] = useState("");
  const blocked = requiresPharmacyShippingSupport(product);
  function invalidateReview() { setReviewed(false); setEnabled(false); setReference(null); setValidationMessage(""); }
  return <form className="rounded-xl border border-line p-4" onSubmit={(event) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const draft = submitter?.value !== "approve";
    const result = shippingAdminProfileSchema.safeParse({
      enabled: draft ? false : enabled, transportReviewed: draft ? false : reviewed, measurementBasis, reference, approvedServiceIds, cargoKinds,
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
        <button className={`${button} mb-2`} disabled={busy} onClick={() => { setMeasurements({ ...measurements, lengthCm: "24", widthCm: "15", heightCm: "10" }); setMeasurementBasis("estimated"); invalidateReview(); }} type="button">Usar referência 24 × 15 × 10 cm no rascunho</button>
        <p>Caixa informada pelo responsável: C24 × L15 × A10 cm. Medidas externas e peso da caixa vazia ainda precisam de confirmação. Aplica somente as dimensões neste rascunho e preserva o peso informado; não comprova encaixe nem libera o envio. Confira proteção, medidas externas e peso do volume final antes de aprovar. Caixas maiores ainda não estão definidas.</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">{([["weightGrams", "Peso embalado (g)"], ["widthCm", "Largura (cm)"], ["heightCm", "Altura (cm)"], ["lengthCm", "Comprimento (cm)"]] as const).map(([name, label]) => <Label key={name} text={label}><input className={field} disabled={busy} max={name === "weightGrams" ? 30000 : 200} min={name === "weightGrams" ? 1 : 0.01} name={name} onChange={(event) => { setMeasurements({ ...measurements, [name]: event.target.value }); invalidateReview(); }} step={name === "weightGrams" ? 1 : "any"} type="number" value={measurements[name]} /></Label>)}</div>
      <div className="mt-3"><Label text="Origem do peso e das medidas"><select className={field} disabled={busy} onChange={(event) => { setMeasurementBasis(event.target.value as "measured" | "estimated"); invalidateReview(); }} value={measurementBasis}><option value="measured">Medidos no volume pronto para envio</option><option value="estimated">Estimativa operacional autorizada</option></select></Label></div>
      <fieldset className="mt-3 rounded-lg border border-line p-3" disabled={busy}><legend className="px-1 text-xs font-bold">Características para transporte</legend><p className="mb-3 text-xs leading-5 text-muted">Marque as características desta mercadoria. Elas restringem os serviços; não substituem as regras de medicamentos nem liberam transporte proibido. “Não informado” mantém a aceitação pendente até ser removido e a carga classificada. Alterações exigem nova revisão.</p><div className="grid gap-3 sm:grid-cols-2">{(["unspecified", ...cargoOptions] as ShippingCargo[]).map(kind => <label className="flex gap-2 text-xs" key={kind}><input checked={cargoKinds.includes(kind)} type="checkbox" onChange={event => { setCargoKinds(event.target.checked ? [...cargoKinds, kind] : cargoKinds.filter(value => value !== kind)); invalidateReview(); }} />{SHIPPING_CARGO_LABELS[kind]}</label>)}</div></fieldset>
      {measurementBasis === "estimated" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Estimativa operacional autorizada. Confira peso/dimensões reais antes da postagem; a transportadora pode ajustar o frete.</p>}
      <fieldset className="mt-3 rounded-lg border border-line p-3"><legend className="px-1 text-xs font-bold">Serviços aprovados para este produto</legend><p className="mb-3 text-xs leading-5 text-muted">Confirme a aceitação desta mercadoria e embalagem em cada serviço. A seleção global também precisa permitir o serviço. Sem marcações, este produto não recebe cotação. Faça uma simulação para carregar os nomes das transportadoras.</p><div className="grid gap-3 sm:grid-cols-2">{options.map(service => <label className="flex items-start gap-2 text-xs" key={service.serviceId}><input type="checkbox" disabled={busy} checked={approvedServiceIds.includes(service.serviceId)} onChange={event => { setApprovedServiceIds(event.target.checked ? [...approvedServiceIds, service.serviceId] : approvedServiceIds.filter(id => id !== service.serviceId)); invalidateReview(); }} /><span>{service.carrier} · {service.service}</span></label>)}</div></fieldset>
      <label className="mt-3 flex items-start gap-2 text-xs text-muted"><input checked={reviewed} disabled={busy} name="reviewed" onChange={(event) => { setReviewed(event.target.checked); setEnabled(event.target.checked && !blocked); }} type="checkbox" />Revisei as medidas/peso informados e a adequação da embalagem, conservação e aceitação nos serviços selecionados.</label>
      {validationMessage && <p className="mt-3 text-xs text-red-700" role="alert">{validationMessage}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input checked={enabled} disabled={busy || !reviewed || blocked} name="enabled" onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />Liberar para transportadora</label><div className="flex flex-wrap gap-2"><button className={`${button} bg-ink`} disabled={busy} name="intent" type="submit" value="draft">Salvar rascunho</button><button className={button} disabled={busy || blocked} name="intent" type="submit" value="approve">Aprovar dados completos</button></div></div>
    </>
  </form>;
}
