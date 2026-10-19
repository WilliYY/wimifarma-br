"use client";

import { useState, type FormEvent } from "react";
import { Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bulkProductChangesSchema, type BulkProductChanges, type BulkProductUpdate } from "@/features/products/catalog-bulk";
import { decimalToMinorUnits } from "@/features/supplier-planning/form";
import { productDisplayName } from "@/features/products/display-name";

type Item = { id: string; name: string; updatedAt: string; inventorySource?: string };
const fieldStyle = "h-11 min-w-0 rounded-lg border border-line bg-white px-3 text-sm";
const labels = { status: "Status", category: "Categoria", supplierMarkupBps: "Acréscimo distribuidor", cashbackEnabled: "Cashback", cashbackRateBps: "Percentual cashback", wimicoinsEnabled: "WimiCoins", wimicoinsRateBps: "Percentual WimiCoins" };
function describe(key: string, value: unknown) {
  if (typeof value === "boolean") return value ? "Ativar" : "Desativar";
  if (value === null) return "Sem categoria";
  if (key.endsWith("Bps")) return `${Number(value) / 100}%`;
  return ({ ACTIVE: "Publicado", DRAFT: "Rascunho", ARCHIVED: "Arquivado" } as Record<string, string>)[String(value)] ?? String(value);
}

export function ProductBulkEditor({ products, canManageFinancial, onSaved }: { products: Item[]; canManageFinancial: boolean; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ body: BulkProductUpdate; names: string[] } | null>(null);
  const [status, setStatus] = useState("");
  const [categoryAction, setCategoryAction] = useState("");
  const [category, setCategory] = useState("");
  const [markup, setMarkup] = useState("");
  const [cashback, setCashback] = useState("");
  const [cashbackRate, setCashbackRate] = useState("");
  const [coins, setCoins] = useState("");
  const [coinsRate, setCoinsRate] = useState("");
  const distributorOnly = products.every(product => product.inventorySource === "DISTRIBUTOR");

  function openEditor() {
    setStatus(""); setCategoryAction(""); setCategory(""); setMarkup(""); setCashback(""); setCashbackRate(""); setCoins(""); setCoinsRate(""); setPreview(null); setOpen(true);
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changes: BulkProductChanges = {};
    if (status) changes.status = status as BulkProductChanges["status"];
    if (categoryAction) changes.category = categoryAction === "clear" ? null : category.trim();
    if (canManageFinancial) {
      if (markup && distributorOnly) changes.supplierMarkupBps = decimalToMinorUnits(markup) ?? -1;
      if (cashback) changes.cashbackEnabled = cashback === "on";
      if (cashbackRate) changes.cashbackRateBps = decimalToMinorUnits(cashbackRate) ?? -1;
      if (coins) changes.wimicoinsEnabled = coins === "on";
      if (coinsRate) changes.wimicoinsRateBps = decimalToMinorUnits(coinsRate) ?? -1;
    }
    const parsed = bulkProductChangesSchema.safeParse(changes);
    if (!parsed.success) { toast.error("Selecione alterações válidas. Percentuais: até 100%; benefícios precisam de valor maior que zero."); return; }
    setPreview({ body: { items: products.map(({ id, updatedAt }) => ({ id, expectedUpdatedAt: updatedAt })), changes: parsed.data }, names: products.map(product => productDisplayName(product.name)) });
  }
  async function apply() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/produtos/lote", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preview.body) });
      const payload = await response.json() as { error?: string; count?: number };
      if (!response.ok) {
        if ([404, 409].includes(response.status)) { setOpen(false); await onSaved(); }
        throw new Error(payload.error ?? "Não foi possível salvar o lote.");
      }
      setOpen(false);
      await onSaved();
      toast.success(`${payload.count ?? preview.body.items.length} produtos atualizados.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o lote."); }
    finally { setBusy(false); }
  }

  return <>
    <Button disabled={!products.length} onClick={openEditor} size="sm" type="button"><ListChecks className="h-4 w-4" />Editar {products.length || "selecionados"} em massa</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{preview ? "Revisar edição em massa" : "Editar produtos em massa"}</DialogTitle><DialogDescription>{products.length} produtos selecionados. Campos mantidos não serão alterados.</DialogDescription></DialogHeader>
        {preview ? <div className="grid gap-4">
          <dl className="grid gap-2 rounded-lg border border-line bg-surface-subtle p-3 text-sm">{Object.entries(preview.body.changes).map(([key, value]) => <div className="flex flex-wrap justify-between gap-2" key={key}><dt>{labels[key as keyof typeof labels]}</dt><dd className="font-bold">{describe(key, value)}</dd></div>)}</dl>
          <p className="text-xs leading-5 text-muted">As alterações serão aplicadas a todos os itens abaixo. Uma divergência cancela todo o lote. Retirar da publicação também remove o destaque da vitrine.</p>
          <ul aria-label="Produtos que serão alterados" className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-3 text-xs">{preview.names.map((name, index) => <li key={preview.body.items[index].id}>{name}</li>)}</ul>
          <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={() => setPreview(null)} type="button" variant="secondary">Voltar</Button><Button disabled={busy} onClick={() => void apply()} type="button">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Aplicar a {preview.body.items.length} produtos</Button></div>
        </div> : <form className="grid gap-4" onSubmit={review}>
          <label className="grid gap-1.5 text-sm font-semibold">Status<select aria-label="Status" className={fieldStyle} value={status} onChange={event => setStatus(event.target.value)}><option value="">Manter status</option><option value="ACTIVE">Publicado</option><option value="DRAFT">Rascunho</option><option value="ARCHIVED">Arquivado</option></select></label>
          <label className="grid gap-1.5 text-sm font-semibold">Categoria<select aria-label="Categoria" className={fieldStyle} value={categoryAction} onChange={event => setCategoryAction(event.target.value)}><option value="">Manter categoria</option><option value="set">Definir categoria</option><option value="clear">Remover categoria</option></select></label>
          {categoryAction === "set" && <label className="grid gap-1.5 text-sm font-semibold">Nova categoria<Input value={category} maxLength={120} required onChange={event => setCategory(event.target.value)} /></label>}
          {canManageFinancial && <>
            {distributorOnly && <label className="grid gap-1.5 text-sm font-semibold">Acréscimo distribuidor (%)<Input inputMode="decimal" value={markup} onChange={event => setMarkup(event.target.value)} placeholder="Vazio mantém o percentual atual" /><span className="text-xs font-normal text-muted">0 a 100%. Pedidos em aberto impedem mudanças. Acréscimo não é margem líquida.</span></label>}
            {([{ label: "Cashback", value: cashback, change: setCashback, rate: cashbackRate, changeRate: setCashbackRate }, { label: "WimiCoins", value: coins, change: setCoins, rate: coinsRate, changeRate: setCoinsRate }]).map(field => <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2" key={field.label}><label className="grid gap-1.5 text-sm font-semibold">{field.label}<select aria-label={field.label} className={fieldStyle} value={field.value} onChange={event => field.change(event.target.value)}><option value="">Manter benefício</option><option value="on">Ativar</option><option value="off">Desativar</option></select></label><label className="grid gap-1.5 text-sm font-semibold">Percentual (%)<Input inputMode="decimal" value={field.rate} onChange={event => field.changeRate(event.target.value)} placeholder="Manter percentual" /></label></div>)}
            <p className="text-xs leading-5 text-muted">Produtos com receita ou Farmácia Popular não aceitam ativação de benefícios. Nenhum saldo já concedido será alterado.</p>
          </>}
          <div className="flex justify-end gap-2 border-t border-line pt-4"><Button onClick={() => setOpen(false)} type="button" variant="secondary">Cancelar</Button><Button type="submit">Revisar alterações</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
