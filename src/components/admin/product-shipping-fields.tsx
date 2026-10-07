"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import Link from "next/link";
import { ExternalLink, Package, Ruler, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shippingDraftSchema, type ShippingDraft } from "@/features/shipping/product-draft";
import { shippingProfileSchema } from "@/features/shipping/schema";
import type { ShippingReference } from "@/features/shipping/product-reference";

const fields = [["weightGrams", "Peso embalado (g)"], ["lengthCm", "Comprimento (cm)"], ["widthCm", "Largura (cm)"], ["heightCm", "Altura (cm)"]] as const;
type Measures = Record<typeof fields[number][0], string>;
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const suggestedValue = (reference: ShippingReference, key: keyof Measures) => reference[key] ?? reference.estimate?.[key]?.max ?? null;

export type ProductShippingFieldsHandle = { applySuggestion: (reference: ShippingReference, identityKey: string) => number };

export const ProductShippingFields = forwardRef<ProductShippingFieldsHandle, {
  initialProfile?: unknown; identityKey: string; suggestion?: ShippingReference | null; researched: boolean;
  canEdit: boolean; medicine: boolean; integrated?: boolean;
}>(function ProductShippingFields({ initialProfile, identityKey, suggestion, researched, canEdit, medicine, integrated = false }, ref) {
  const parsed = shippingProfileSchema.or(shippingDraftSchema).safeParse(initialProfile);
  const initial = parsed.success ? parsed.data : null;
  const [draft, setDraft] = useState(() => ({
    identityKey, dirty: false, copiedKeys: [] as (keyof Measures)[], reference: initial?.reference ?? null,
    measurementBasis: initial?.measurementBasis ?? "measured",
    values: Object.fromEntries(fields.map(([key]) => [key, initial?.[key] == null ? "" : String(initial[key])])) as Measures,
  }));
  // A reference copied for a previous identity must not follow a different product.
  if (draft.identityKey !== identityKey) setDraft({ ...draft, identityKey, reference: null, values: Object.fromEntries(fields.map(([key]) => [key, draft.copiedKeys.includes(key) ? "" : draft.values[key]])) as Measures, copiedKeys: [] });
  const reference = suggestion ?? (researched ? null : draft.reference);
  const hasValues = Boolean(reference && fields.some(([key]) => suggestedValue(reference, key) != null));
  const payload: ShippingDraft = {
    enabled: false, transportReviewed: false,
    measurementBasis: draft.measurementBasis,
    ...Object.fromEntries(fields.map(([key]) => [key, draft.values[key] === "" ? null : Number(draft.values[key])])) as Pick<ShippingDraft, keyof Measures>,
    reference: draft.reference,
  };
  function copyReference(nextReference = reference, nextIdentityKey = identityKey) {
    if (!canEdit || !nextReference) return 0;
    const values = draft.identityKey === nextIdentityKey ? draft.values : Object.fromEntries(fields.map(([key]) => [key, draft.copiedKeys.includes(key) ? "" : draft.values[key]])) as Measures;
    const copiedKeys = fields.filter(([key]) => !values[key].trim() && suggestedValue(nextReference, key) != null).map(([key]) => key);
    if (!copiedKeys.length) return 0;
    setDraft({ ...draft, identityKey: nextIdentityKey, dirty: true,
      measurementBasis: copiedKeys.some(key => nextReference[key] == null && nextReference.estimate?.[key]) ? "estimated" : draft.measurementBasis,
      copiedKeys: [...new Set([...(draft.identityKey === nextIdentityKey ? draft.copiedKeys : []), ...copiedKeys])],
      reference: nextReference, values: Object.fromEntries(fields.map(([key]) => [key, values[key] || (suggestedValue(nextReference, key) == null ? "" : String(suggestedValue(nextReference, key)))])) as Measures });
    return copiedKeys.length;
  }
  useImperativeHandle(ref, () => ({ applySuggestion: copyReference }));
  return <section aria-label="Peso e medidas para frete" className={`min-w-0 overflow-hidden bg-white ${integrated ? "" : "rounded-xl border border-line"}`}>
    <div className={`flex flex-wrap items-start justify-between gap-3 ${integrated ? "px-4 pt-4 sm:px-6 sm:pt-6" : "bg-surface-subtle p-4"}`}>
      <div className="flex min-w-0 gap-3"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-black text-brand">{integrated ? "03" : <Package className="h-5 w-5" />}</span><div><h3 className="text-base font-black">Peso e medidas para frete</h3><p className="mt-1 text-xs leading-5 text-muted">Mesma pesquisa, com fontes e estimativas identificadas para conferência.</p></div></div>
    </div>
    <div className={`grid gap-4 p-4 ${integrated ? "sm:p-6" : ""}`}>
      <p className="text-xs leading-5 text-muted">A pesquisa acompanha o catálogo e SEO. Dados exatos têm prioridade; quando faltarem, uma comparação válida pode sugerir uma faixa estimada. Nos campos vazios usamos o limite superior dessa faixa como rascunho. Valores manuais são preservados. Confira a caixa e proteção finais; volume em ml e peso líquido não substituem o peso embalado.</p>
      {reference && <div className="grid min-w-0 gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
        <p className="text-xs font-bold text-sky-900">{reference.estimate ? "Pesquisa concluída · há medidas estimadas" : hasValues ? "Referência encontrada · confira a embalagem" : "Dados insuficientes para sugerir medidas"}</p>
        <p className="break-words text-xs text-muted">{reference.productName} · {reference.packageLevel === "shipping_package" ? "Volume de transporte informado pela fonte" : reference.packageLevel === "retail_kit" ? "Kit comercial completo" : "Embalagem comercial"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold"><Scale className="h-4 w-4" />Peso bruto</p><p className="mt-1 text-lg font-black">{reference.weightGrams ? `${number.format(reference.weightGrams)} g` : "Não encontrado"}</p><ReferenceSource source={reference.weightSource} /></div>
          <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold"><Ruler className="h-4 w-4" />Comprimento × largura × altura</p><p className="mt-1 text-lg font-black">{reference.widthCm && reference.lengthCm && reference.heightCm ? `${number.format(reference.lengthCm)} × ${number.format(reference.widthCm)} × ${number.format(reference.heightCm)} cm` : "Não encontradas"}</p><ReferenceSource source={reference.dimensionsSource} /></div>
        </div>
        {reference.estimate && <div className="grid min-w-0 gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black text-amber-950">Estimativa por comparação · precisa de conferência</p>
          <p className="break-words text-xs leading-5 text-amber-950">Base: {reference.estimate.comparableName}. {reference.estimate.packageDescription}</p>
          {reference.estimate.productFamily && <p className="text-xs leading-5 text-amber-950">Tipo: {reference.estimate.productFamily} · material: {reference.estimate.packageMaterial}</p>}
          <dl className="grid grid-cols-2 gap-3">{fields.map(([key, label]) => {
            const range = reference[key] == null ? reference.estimate?.[key] : null;
            return range ? <div className="min-w-0" key={key}><dt className="text-xs text-amber-900">{label}</dt><dd className="mt-1 text-sm font-black text-amber-950">{number.format(range.min)}–{number.format(range.max)} {key === "weightGrams" ? "g" : "cm"}</dd></div> : null;
          })}</dl>
          <ReferenceSource source={reference.estimate.source} />
          {reference.estimate.targetSource && <div><p className="text-xs font-bold text-amber-950">Apresentação do produto pesquisado</p><ReferenceSource source={reference.estimate.targetSource} /></div>}
          <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-amber-950">{reference.estimate.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
          <p className="text-xs leading-5 text-amber-950">A faixa não certifica a medida nem inclui uma caixa adicional desconhecida. Salvar mantém o transporte desabilitado até a revisão.</p>
        </div>}
        {reference.warnings.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-amber-900">{reference.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      </div>}
      {!reference && <p className="rounded-lg border border-dashed border-line p-3 text-xs leading-5 text-muted">{researched ? "A pesquisa não encontrou referência ou comparação utilizável. Confira a apresentação/EAN ou preencha as medidas reais abaixo." : "Informe nome, marca, versão e quantidade ou o EAN. A pesquisa procura a ficha exata e, se necessário, uma embalagem semelhante com dados comprovados."}</p>}
      {canEdit ? <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{fields.map(([key, label]) => <label className="grid min-w-0 gap-2 text-xs font-semibold" key={key}>{label}<Input aria-label={label} className="min-w-0" inputMode="decimal" min={key === "weightGrams" ? 1 : 0.01} max={key === "weightGrams" ? 30000 : 200} step={key === "weightGrams" ? 1 : "any"} placeholder="Não informado" type="number" value={draft.values[key]} onChange={event => setDraft({ ...draft, dirty: true, copiedKeys: draft.copiedKeys.filter(copied => copied !== key), values: { ...draft.values, [key]: event.target.value } })} />{draft.reference?.[key] == null && draft.reference?.estimate?.[key] && Number(draft.values[key]) === draft.reference.estimate[key].max && <span className="text-[10px] font-bold text-amber-800">Limite superior estimado</span>}</label>)}</div>
        {draft.dirty && <input name="shippingDraft" type="hidden" value={JSON.stringify(payload)} />}
        <p className="text-xs leading-5 text-muted">{draft.dirty ? "Ao salvar, estas medidas ficarão como rascunho e o frete deste produto precisará de nova revisão." : initial?.enabled ? "Este produto já possui embalagem liberada. Alterar medidas exige nova revisão." : "Salvar medidas não libera o frete automaticamente."} Confira o volume final em <Link className="font-bold text-brand underline" href="/admin/fretes" target="_blank" rel="noreferrer">Fretes e entregas</Link>.</p>
      </> : <p className="text-xs text-muted">Somente o administrador pode salvar e aprovar as medidas de transporte.</p>}
      {medicine && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Medicamentos elegíveis, inclusive os de receita comum classificados, podem usar PAC ou SEDEX após aprovação da embalagem em Fretes e entregas. O farmacêutico confere a receita antes da dispensação. Controlados, receita não classificada e Farmácia Popular seguem atendimento assistido.</p>}
    </div>
  </section>;
});

function ReferenceSource({ source }: { source: ShippingReference["weightSource"] }) {
  return source ? <div className="mt-2 min-w-0 text-xs leading-5"><a className="inline-flex max-w-full items-center gap-1 font-semibold text-brand underline" href={source.url} rel="noreferrer" target="_blank"><span className="truncate">{source.title}</span><ExternalLink className="h-3 w-3 shrink-0" /></a><p className="break-words text-muted">{source.evidence}</p></div> : null;
}
