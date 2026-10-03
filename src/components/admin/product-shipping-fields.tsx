"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import Link from "next/link";
import { ExternalLink, Package, Ruler, Scale, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shippingDraftSchema, type ShippingDraft } from "@/features/shipping/product-draft";
import { shippingProfileSchema } from "@/features/shipping/schema";
import type { ShippingReference } from "@/features/shipping/product-reference";

const fields = [["weightGrams", "Peso embalado (g)"], ["lengthCm", "Comprimento (cm)"], ["widthCm", "Largura (cm)"], ["heightCm", "Altura (cm)"]] as const;
type Measures = Record<typeof fields[number][0], string>;
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export type ProductShippingFieldsHandle = { applySuggestion: (reference: ShippingReference, identityKey: string) => number };

export const ProductShippingFields = forwardRef<ProductShippingFieldsHandle, {
  initialProfile?: unknown; identityKey: string; suggestion?: ShippingReference | null; researched: boolean;
  canEdit: boolean; busy: boolean; onResearch: () => void; medicine: boolean;
}>(function ProductShippingFields({ initialProfile, identityKey, suggestion, researched, canEdit, busy, onResearch, medicine }, ref) {
  const parsed = shippingProfileSchema.or(shippingDraftSchema).safeParse(initialProfile);
  const initial = parsed.success ? parsed.data : null;
  const [draft, setDraft] = useState(() => ({
    identityKey, dirty: false, copiedKeys: [] as (keyof Measures)[], reference: initial?.reference ?? null,
    values: Object.fromEntries(fields.map(([key]) => [key, initial?.[key] == null ? "" : String(initial[key])])) as Measures,
  }));
  // A reference copied for a previous identity must not follow a different product.
  if (draft.identityKey !== identityKey) setDraft({ ...draft, identityKey, reference: null, values: Object.fromEntries(fields.map(([key]) => [key, draft.copiedKeys.includes(key) ? "" : draft.values[key]])) as Measures, copiedKeys: [] });
  const reference = suggestion ?? (researched ? null : draft.reference);
  const hasValues = Boolean(reference && (reference.weightGrams || reference.widthCm));
  const payload: ShippingDraft = {
    enabled: false, transportReviewed: false,
    ...Object.fromEntries(fields.map(([key]) => [key, draft.values[key] === "" ? null : Number(draft.values[key])])) as Pick<ShippingDraft, keyof Measures>,
    reference: draft.reference,
  };
  function copyReference(nextReference = reference, nextIdentityKey = identityKey) {
    if (!canEdit || !nextReference) return 0;
    const values = draft.identityKey === nextIdentityKey ? draft.values : Object.fromEntries(fields.map(([key]) => [key, draft.copiedKeys.includes(key) ? "" : draft.values[key]])) as Measures;
    const copiedKeys = fields.filter(([key]) => !values[key].trim() && nextReference[key] != null).map(([key]) => key);
    if (!copiedKeys.length) return 0;
    setDraft({ ...draft, identityKey: nextIdentityKey, dirty: true,
      copiedKeys: [...new Set([...(draft.identityKey === nextIdentityKey ? draft.copiedKeys : []), ...copiedKeys])],
      reference: nextReference, values: Object.fromEntries(fields.map(([key]) => [key, values[key] || (nextReference[key] == null ? "" : String(nextReference[key]))])) as Measures });
    return copiedKeys.length;
  }
  useImperativeHandle(ref, () => ({ applySuggestion: copyReference }));
  return <section aria-label="Peso e medidas para frete" className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 bg-surface-subtle p-4">
      <div className="flex min-w-0 gap-3"><span className="rounded-lg bg-brand-soft p-2 text-brand"><Package className="h-5 w-5" /></span><div><h3 className="text-sm font-black">Peso e medidas para frete</h3><p className="mt-1 text-xs leading-5 text-muted">Referências da apresentação exata, com revisão antes de cotar.</p></div></div>
      <Button className="min-h-11" disabled={busy} onClick={onResearch} type="button" variant="secondary"><Search className="h-4 w-4" />{busy ? "Pesquisando..." : "Pesquisar peso e medidas"}</Button>
    </div>
    <div className="grid gap-4 p-4">
      <p className="text-xs leading-5 text-muted">Peso e medidas com fonte acompanham o preenchimento do cadastro quando a identidade tem alta confiança. Campos manuais são preservados. A IA pesquisa especificações; não mede pela foto. Confira a unidade pronta para envio, incluindo caixa e proteção. Volume em ml e peso líquido não substituem o peso embalado.</p>
      {reference && <div className="grid min-w-0 gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
        <p className="text-xs font-bold text-sky-900">{hasValues ? "Referência encontrada · confira a embalagem" : "Dados insuficientes para sugerir medidas"}</p>
        <p className="break-words text-xs text-muted">{reference.productName} · {reference.packageLevel === "shipping_package" ? "Volume de transporte informado pela fonte" : reference.packageLevel === "retail_kit" ? "Kit comercial completo" : "Embalagem comercial"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold"><Scale className="h-4 w-4" />Peso bruto</p><p className="mt-1 text-lg font-black">{reference.weightGrams ? `${number.format(reference.weightGrams)} g` : "Não encontrado"}</p><ReferenceSource source={reference.weightSource} /></div>
          <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold"><Ruler className="h-4 w-4" />Comprimento × largura × altura</p><p className="mt-1 text-lg font-black">{reference.widthCm && reference.lengthCm && reference.heightCm ? `${number.format(reference.lengthCm)} × ${number.format(reference.widthCm)} × ${number.format(reference.heightCm)} cm` : "Não encontradas"}</p><ReferenceSource source={reference.dimensionsSource} /></div>
        </div>
        {reference.warnings.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-amber-900">{reference.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        {canEdit && hasValues && <Button className="min-h-11 w-full whitespace-normal" onClick={() => copyReference()} type="button" variant="secondary">Usar referências nos campos vazios</Button>}
      </div>}
      {!reference && <p className="rounded-lg border border-dashed border-line p-3 text-xs leading-5 text-muted">{researched ? "A pesquisa não retornou peso e dimensões utilizáveis. Confira a apresentação/EAN ou preencha as medidas reais abaixo." : "Informe nome, marca, versão e quantidade ou o EAN. A pesquisa procura peso bruto e medidas, sem usar médias de produtos parecidos."}</p>}
      {canEdit ? <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{fields.map(([key, label]) => <label className="grid min-w-0 gap-2 text-xs font-semibold" key={key}>{label}<Input aria-label={label} className="min-w-0" inputMode="decimal" min={key === "weightGrams" ? 1 : 0.01} max={key === "weightGrams" ? 30000 : 200} step={key === "weightGrams" ? 1 : "any"} placeholder="Não informado" type="number" value={draft.values[key]} onChange={event => setDraft({ ...draft, dirty: true, copiedKeys: draft.copiedKeys.filter(copied => copied !== key), values: { ...draft.values, [key]: event.target.value } })} /></label>)}</div>
        {draft.dirty && <input name="shippingDraft" type="hidden" value={JSON.stringify(payload)} />}
        <p className="text-xs leading-5 text-muted">{draft.dirty ? "Ao salvar, estas medidas ficarão como rascunho e o frete deste produto precisará de nova revisão." : initial?.enabled ? "Este produto já possui embalagem liberada. Alterar medidas exige nova revisão." : "Salvar medidas não libera o frete automaticamente."} Confira o volume final em <Link className="font-bold text-brand underline" href="/admin/fretes" target="_blank" rel="noreferrer">Fretes e entregas</Link>.</p>
      </> : <p className="text-xs text-muted">Somente o administrador pode salvar e aprovar as medidas de transporte.</p>}
      {medicine && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Medicamentos sem receita podem usar PAC ou SEDEX após conferência da embalagem e liberação em Fretes e entregas. Itens sujeitos a receita e Farmácia Popular precisam de atendimento farmacêutico.</p>}
    </div>
  </section>;
});

function ReferenceSource({ source }: { source: ShippingReference["weightSource"] }) {
  return source ? <div className="mt-2 min-w-0 text-xs leading-5"><a className="inline-flex max-w-full items-center gap-1 font-semibold text-brand underline" href={source.url} rel="noreferrer" target="_blank"><span className="truncate">{source.title}</span><ExternalLink className="h-3 w-3 shrink-0" /></a><p className="break-words text-muted">{source.evidence}</p></div> : null;
}
