"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { catalogKindLabels, classificationLabels, emptyClassification, medicineClassLabels, readClassification, type CatalogClassification } from "@/features/products/catalog-operations";
import { decimalToMinorUnits } from "@/features/supplier-planning/form";
import { priceWithMarkup } from "@/features/supplier-planning/planning";
import { productDisplayName } from "@/features/products/display-name";
import { formatCurrency } from "@/lib/utils";

export type CatalogQuickProduct = {
  id: string; name: string; updatedAt: string; inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  catalogClassification?: unknown; supplierMarkupBps?: number; price: string; promotionalPrice: string | null;
  requiresPrescription: boolean;
  supplierPricing?: { supplier: string; unitCostCents?: number; unitPriceCents: number; purchaseLimit: number; demandAllowed?: boolean; validUntil: string } | null;
};
const selectStyle = "h-11 min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30";

export function ProductQuickControls({ product, canEdit, onSaved }: { product: CatalogQuickProduct; canEdit: boolean; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [classification, setClassification] = useState(() => readClassification(product.catalogClassification));
  const [markup, setMarkup] = useState(String((product.supplierMarkupBps ?? 6000) / 100));
  const [price, setPrice] = useState(product.price);
  const [promo, setPromo] = useState(product.promotionalPrice ?? "");
  const [adjustment, setAdjustment] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const distributor = product.inventorySource === "DISTRIBUTOR";
  const pricing = product.supplierPricing && Date.parse(product.supplierPricing.validUntil) > now ? product.supplierPricing : null;
  const currentPrice = distributor ? pricing?.unitPriceCents === undefined ? null : pricing.unitPriceCents / 100 : Number(product.promotionalPrice ?? product.price);
  const changedClassification = JSON.stringify(classification) !== JSON.stringify(readClassification(product.catalogClassification));
  const changed = changedClassification || (distributor ? markup !== String((product.supplierMarkupBps ?? 6000) / 100) : price !== product.price || promo !== (product.promotionalPrice ?? ""));
  let preview: number | null = null;
  try { const bps = decimalToMinorUnits(markup); if (distributor && pricing?.unitCostCents !== undefined && bps !== null) preview = priceWithMarkup(pricing.unitCostCents, bps) / 100; } catch { /* Validation is explained when saving. */ }

  function changeKind(kind: CatalogClassification["kind"]) {
    setClassification(item => kind === "MEDICINE" ? { ...item, kind } : { ...emptyClassification, kind });
  }
  function adjustPhysicalPrice(value: string) {
    setAdjustment(value);
    if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value)) return;
    const percent = Number(value.replace(",", "."));
    if (percent <= -100 || percent > 100) return;
    const cents = Math.round(Number(product.price) * 100);
    const bps = Math.round(percent * 100);
    setPrice((Number((BigInt(cents) * BigInt(10000 + bps) + BigInt(5000)) / BigInt(10000)) / 100).toFixed(2));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    try {
      setBusy(true);
      const body: Record<string, unknown> = { expectedUpdatedAt: product.updatedAt };
      if (changedClassification) body.catalogClassification = classification;
      if (distributor && markup !== String((product.supplierMarkupBps ?? 6000) / 100)) {
        const bps = decimalToMinorUnits(markup);
        if (bps === null || bps > 10000) throw new Error("Informe um acréscimo de 0 a 100%, com até duas casas decimais.");
        body.supplierMarkupBps = bps;
      }
      if (!distributor) {
        const cents = decimalToMinorUnits(price);
        const promoCents = promo.trim() ? decimalToMinorUnits(promo) : null;
        if (!cents || (promo.trim() && !promoCents)) throw new Error("Informe preços maiores que zero.");
        if (price !== product.price) body.price = cents / 100;
        if (promo !== (product.promotionalPrice ?? "")) body.promotionalPrice = promoCents === null ? null : promoCents / 100;
      }
      const response = await fetch(`/api/admin/produtos/${product.id}/operacao`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        if (response.status === 409) { setOpen(false); await onSaved(); }
        throw new Error(payload.error ?? "Não foi possível salvar o ajuste.");
      }
      setOpen(false);
      await onSaved();
      toast.success("Preço e classificação atualizados.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  function openEditor() {
    setClassification(readClassification(product.catalogClassification));
    setMarkup(String((product.supplierMarkupBps ?? 6000) / 100));
    setPrice(product.price); setPromo(product.promotionalPrice ?? ""); setAdjustment(""); setOpen(true);
  }
  return <>
    <div className="w-full rounded-xl border border-line bg-surface-subtle p-3 lg:w-64 lg:shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Preço de venda</p><p className="mt-1 text-xl font-black tabular-nums text-ink">{currentPrice === null ? "Indisponível" : formatCurrency(currentPrice)}</p></div>
        {distributor && canEdit && <span className="rounded-lg border border-brand/15 bg-white px-2 py-1 text-sm font-black tabular-nums text-brand">+{(product.supplierMarkupBps ?? 6000) / 100}%</span>}
      </div>
      {distributor && <p className="mt-1 text-xs leading-5 text-muted">{pricing ? `${pricing.supplier} · ${pricing.demandAllowed ? "quantidade a conferir com o distribuidor" : `${pricing.purchaseLimit} disponíveis`}${canEdit && pricing.unitCostCents !== undefined ? ` · custo ${formatCurrency(pricing.unitCostCents / 100)}` : ""}` : "Sem oferta válida para venda"}</p>}
      {canEdit && <Button className="mt-3 min-h-10 w-full" onClick={openEditor} size="sm" type="button" variant="secondary"><SlidersHorizontal className="h-4 w-4" />Preço e classificação</Button>}
    </div>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Ajuste rápido</DialogTitle><DialogDescription>{productDisplayName(product.name)}</DialogDescription></DialogHeader>
        <form className="grid gap-5" onSubmit={save}>
          <fieldset className="grid gap-5" disabled={busy}>
            <div className="grid gap-3 rounded-xl border border-line bg-surface-subtle p-4">
              <p className="text-xs font-black uppercase tracking-wide text-muted">Preço</p>
              {distributor ? <>
                <div className="flex flex-wrap justify-between gap-3 text-sm"><span>Custo válido: <strong>{pricing?.unitCostCents !== undefined ? formatCurrency(pricing.unitCostCents / 100) : "não disponível"}</strong></span><span>Venda após ajuste: <strong>{preview === null ? "aguarda oferta" : formatCurrency(preview)}</strong></span></div>
                <label className="grid gap-2 text-sm font-bold">Acréscimo sobre o custo (%)<Input inputMode="decimal" value={markup} onChange={event => setMarkup(event.target.value)} required /></label>
                <p className="text-xs leading-5 text-muted">O preço acompanha o menor custo válido do mesmo EAN. Acréscimo não é margem líquida. Pedidos em aberto impedem alterar o percentual.</p>
              </> : <><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Preço normal (R$)<Input inputMode="decimal" value={price} onChange={event => { setPrice(event.target.value); setAdjustment(""); }} required /></label><label className="grid gap-2 text-sm font-bold">Promocional (R$)<Input inputMode="decimal" value={promo} onChange={event => setPromo(event.target.value)} placeholder="Sem promoção" /></label></div><label className="grid gap-2 text-sm font-bold">Reajuste do preço normal (%)<Input type="number" min="-99.99" max="100" step="0.01" value={adjustment} onChange={event => adjustPhysicalPrice(event.target.value)} placeholder="Ex.: 5 ou -5" /><span className="text-xs font-normal text-muted">Calculado sobre o preço normal atual. A promoção permanece separada.</span></label></>}
            </div>
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-bold">Tipo de produto<select className={selectStyle} value={classification.kind} onChange={event => changeKind(event.target.value as CatalogClassification["kind"])}>{Object.entries(catalogKindLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
              {classification.kind === "MEDICINE" && <>
                <label className="grid gap-2 text-sm font-bold">Classificação do medicamento<select className={selectStyle} value={classification.medicineClass} onChange={event => setClassification(item => ({ ...item, medicineClass: event.target.value as CatalogClassification["medicineClass"] }))}>{Object.entries(medicineClassLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 text-sm"><input type="checkbox" checked={classification.ethical} onChange={event => setClassification(item => ({ ...item, ethical: event.target.checked }))} />Ético (segmentação comercial)</label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 text-sm"><input type="checkbox" checked={classification.otc} disabled={product.requiresPrescription} onChange={event => setClassification(item => ({ ...item, otc: event.target.checked }))} />MIP / OTC — isento de prescrição</label>
                <p className="text-xs leading-5 text-muted">Confira a apresentação na fonte oficial. “Ético” não significa automaticamente “referência”. A classificação não altera as regras de receita.</p>
              </>}
              <p className="text-xs font-semibold text-muted">{classificationLabels(classification).join(" · ")}</p>
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-line pt-4"><Button disabled={busy} onClick={() => setOpen(false)} type="button" variant="secondary">Cancelar</Button><Button disabled={busy || !changed} type="submit">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar ajuste</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
