"use client";

import { useState } from "react";
import { logisticsEvidenceSchema, type LogisticsEvidence } from "@/features/shipping/logistics-evidence";
import { packagingRecipeSchema, type PackagingRecipe } from "@/features/shipping/packaging-recipe";
import { SHIPPING_CARGO_LABELS, type ShippingCargo } from "@/features/shipping/cargo-policy";

type Recipe = { id: string; revision: number; name: string; data: PackagingRecipe };
type EvidenceData = { gtin: string | null; logisticsEvidence: unknown; updatedAt: string; evidenceStatus: string };
const field = "w-full rounded-lg border border-line bg-white p-2 text-sm text-ink";
const button = "min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const emptyRecipe: PackagingRecipe = { version: 1, name: "", compatibleGtins: [], innerSidesMm: null, outerSidesMm: null, containerTareGrams: null, protectionTareGrams: null, clearanceMm: null, protectionDescription: "", calibrated: false, calibratedAt: null, calibrationNote: "", allowedOrientations: [], unitSideOrder: null };
async function api(path: string, body?: unknown) {
  const response = await fetch(path, { method: body === undefined ? "GET" : "PUT", cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Falha ao salvar evidência.");
  return payload;
}
export function ProductLogisticsEvidence({ productId, onSaved }: { productId: string; onSaved: () => void }) {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [evidence, setEvidence] = useState<LogisticsEvidence | null>(null);
  const [raw, setRaw] = useState("");
  const [rawEdited, setRawEdited] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [recipeRaw, setRecipeRaw] = useState(JSON.stringify(emptyRecipe, null, 2));
  const [cargoKinds, setCargoKinds] = useState<ShippingCargo[]>([]);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ blockers: string[]; draft: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  const path = `/api/admin/fretes/produtos/${productId}/evidencias`;
  async function load() {
    const result = await api(path); const next = result.data as EvidenceData;
    const parsed = logisticsEvidenceSchema.safeParse(next.logisticsEvidence);
    const value = parsed.success ? parsed.data : next.gtin ? { version: 1 as const, gtin: next.gtin, observations: [], sourceDecisions: [], review: { confirmed: false, note: "" } } : null;
    setData(next); setEvidence(value); setRaw(value ? JSON.stringify(value, null, 2) : ""); setRawEdited(false); setDecisionReason("");
    setRecipes((await api("/api/admin/fretes/embalagens")).data);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage(""); setPreview(null);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na operação."); } finally { setBusy(false); }
  }
  function decide(id: string, state: "active" | "rejected" | "superseded", reason = "") {
    if (!evidence) return;
    const sourceDecisions = evidence.sourceDecisions.filter(item => item.observationId !== id);
    if (state !== "active") sourceDecisions.push({ observationId: id, state, reason });
    const value = { ...evidence, sourceDecisions, review: { ...evidence.review, confirmed: false } };
    setEvidence(value); setRaw(JSON.stringify(value, null, 2)); setPreview(null);
  }
  return <details className="mt-4 rounded-lg border border-line p-3" onToggle={event => { if (event.currentTarget.open && !data && !busy) void run(load); }}>
    <summary className="cursor-pointer text-sm font-bold">Unidade comercial e receitas de embalagem</summary>
    <p className="mt-3 text-xs leading-5 text-muted">Referências comerciais são separadas do volume protegido. Salvar ou revisar uma ficha não libera frete. Peso líquido, ml e caixa master não substituem peso bruto da unidade.</p>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {data && <div className="mt-3 space-y-3">
      <p className="text-xs">GTIN: {data.gtin ?? "não confirmado"} · Estado: {({ missing: "sem referência", partial: "parcial", conflict: "conflito", complete_reference: "referência completa; revisão necessária" })[data.evidenceStatus] ?? data.evidenceStatus}</p>
      {evidence?.observations.map(item => <div className="rounded-lg bg-surface-subtle p-3 text-xs leading-5" key={item.id}>
        <a className="font-bold underline" href={item.source.url} rel="noopener noreferrer" target="_blank">Consultar fonte de {new Date(item.source.capturedAt).toLocaleDateString("pt-BR")}</a>
        <p>{item.packagingLevel === "retail_unit" ? "Unidade comercial" : item.packagingLevel === "master_case" ? "Caixa master" : "Unidade desconhecida"} · Peso: {item.weightGrams ?? "pendente"} g ({item.weightBasis === "gross_explicit" ? "bruto declarado" : item.weightBasis === "net" ? "líquido" : "natureza não declarada"}) · Lados: {item.sidesMm?.join(" × ") ?? "pendentes"} mm ({item.sideOrder.join(" / ")})</p>
        <p className="break-words">{item.source.excerpt}</p>{item.identityConflict && <p className="font-bold text-red-700">Conflito de identidade nesta fonte; confira a decisão registrada.</p>}
        <label className="mt-2 grid gap-1">Uso desta fonte<select aria-label={`Uso da fonte ${item.id}`} className={field} disabled={busy} value={evidence.sourceDecisions.find(decision => decision.observationId === item.id)?.state ?? "active"} onChange={event => decide(item.id, event.target.value as "active" | "rejected" | "superseded")}><option value="active">Vigente</option><option value="rejected">Desconsiderada por erro</option><option value="superseded">Superada por referência posterior</option></select></label>
        {evidence.sourceDecisions.find(decision => decision.observationId === item.id) && <label className="mt-2 grid gap-1">Justificativa da decisão<input className={field} maxLength={500} value={evidence.sourceDecisions.find(decision => decision.observationId === item.id)?.reason ?? ""} onChange={event => decide(item.id, evidence.sourceDecisions.find(decision => decision.observationId === item.id)!.state, event.target.value)} /></label>}
      </div>)}
      <details><summary className="cursor-pointer text-xs font-bold">Importar ou acrescentar referência estruturada</summary><p className="my-2 text-xs text-muted">Preserve identificadores e fontes anteriores. Novas fontes removem a confirmação anterior. Edição estruturada: limite de 32 KB por solicitação; envie somente as novas observações quando necessário.</p><textarea aria-label="Referência física estruturada" className={`${field} min-h-48 font-mono`} value={raw} onChange={event => { setRaw(event.target.value); setEvidence(null); setRawEdited(true); }} /></details>
      <label className="grid gap-1 text-xs">Motivo desta alteração ou reativação de fontes<input className={field} maxLength={500} value={decisionReason} onChange={event => setDecisionReason(event.target.value)} placeholder="Obrigatório quando alterar decisões de fontes" /></label>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={evidence?.review.confirmed ?? false} disabled={!evidence || busy} onChange={event => { if (evidence) { const value = { ...evidence, review: { ...evidence.review, confirmed: event.target.checked } }; setEvidence(value); setRaw(JSON.stringify(value, null, 2)); } }} />Conferi a apresentação e as fontes desta unidade comercial; isso não aprova o transporte.</label>
      <button className={button} type="button" disabled={busy || !data.gtin} onClick={() => void run(async () => { const value = logisticsEvidenceSchema.parse(rawEdited ? JSON.parse(raw) : { ...evidence, observations: [] }); await api(path, { evidence: value, updatedAt: data.updatedAt, ...(decisionReason.trim() ? { decisionReason: decisionReason.trim() } : {}) }); await load(); onSaved(); setMessage("Evidência salva. Novas fontes ou decisões exigem confirmação em uma revisão posterior."); })}>Salvar evidência</button>
      <fieldset className="space-y-3 rounded-lg border border-line p-3" disabled={busy}><legend className="px-1 text-xs font-bold">Receita reutilizável</legend>
        <label className="grid gap-2 text-xs">Embalagem<select aria-label="Embalagem" className={field} value={recipeId} onChange={event => { const id = event.target.value; setRecipeId(id); setRecipeRaw(JSON.stringify(recipes.find(item => item.id === id)?.data ?? emptyRecipe, null, 2)); setPreview(null); }}><option value="">Nova receita sem medidas presumidas</option>{recipes.map(item => <option key={item.id} value={item.id}>{item.name} · revisão {item.revision}</option>)}</select></label>
        <details><summary className="cursor-pointer text-xs font-bold">Cadastrar ou revisar receita estruturada</summary><p className="my-2 text-xs leading-5 text-muted">Informe medidas internas/externas, tara do recipiente e da proteção, folga por lado, calibração e GTINs com compatibilidade física conferida. Folga usa milímetros por face; não copie a massa de outro produto.</p><textarea aria-label="Receita de embalagem estruturada" className={`${field} min-h-64 font-mono`} maxLength={30000} value={recipeRaw} onChange={event => setRecipeRaw(event.target.value)} /><button className={`${button} mt-2`} type="button" onClick={() => void run(async () => { const recipe = packagingRecipeSchema.parse(JSON.parse(recipeRaw)); const current = recipes.find(item => item.id === recipeId); const saved = await api("/api/admin/fretes/embalagens", { ...(current ? { id: current.id } : {}), revision: current?.revision ?? 0, recipe }); await load(); setRecipeId(saved.data.id); setMessage("Receita salva; perfis de transporte preservados."); })}>Salvar receita</button></details>
        <fieldset><legend className="mb-2 text-xs font-bold">Classificação da carga para esta prévia</legend><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(SHIPPING_CARGO_LABELS) as ShippingCargo[]).filter(kind => kind !== "unspecified").map(kind => <label className="flex gap-2 text-xs" key={kind}><input type="checkbox" checked={cargoKinds.includes(kind)} onChange={event => { setCargoKinds(event.target.checked ? [...cargoKinds, kind] : cargoKinds.filter(value => value !== kind)); setPreview(null); }} />{SHIPPING_CARGO_LABELS[kind]}</label>)}</div></fieldset>
        <button className={button} type="button" disabled={!recipeId} onClick={() => void run(async () => { const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId, cargoKinds }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setPreview(result.data); })}>Conferir preparação sem aplicar</button>
      </fieldset>
      {preview && <div className="rounded-lg bg-surface-subtle p-3 text-xs leading-5" role="status">{preview.blockers.length ? <ul className="list-disc pl-4">{preview.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul> : <><p>Prévia estimada e desativada. O perfil do produto permanece preservado; não há serviços aprovados.</p><pre className="mt-2 overflow-x-auto">{JSON.stringify(preview.draft, null, 2)}</pre></>}</div>}
    </div>}
  </details>;
}
