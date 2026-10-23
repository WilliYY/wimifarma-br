"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, Loader2, LogIn, RefreshCw, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BULK_PRODUCT_LIMIT, type BulkProductUpdate } from "@/features/products/catalog-bulk";
import { CashbackProductCard } from "./cashback-product-card";
import { CASHBACK_PAGE_SIZE, CashbackSessionError, cashbackListingSchema, cashbackSavedSchema, readCashbackResponse, selectCashbackProducts, createCashbackBulkUpdate, confirmCashbackBulkResponse, type CashbackListing, type CashbackListProduct } from "@/features/cashback/client";
import { cashbackRateSchema } from "@/features/cashback/rules";
import { decimalToMinorUnits } from "@/features/supplier-planning/form";
import { formatCurrency } from "@/lib/utils";

export function CashbackPanel() {
  const [listing, setListing] = useState<CashbackListing | null>(null);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkRate, setBulkRate] = useState("2");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [preview, setPreview] = useState<{ body: BulkProductUpdate; names: string[] } | null>(null);
  const saveLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: query, page: String(page), enabled: String(enabled) });
        const response = await fetch(`/api/cashback?${params}`, { cache: "no-store", signal: controller.signal });
        const data = await readCashbackResponse(response, cashbackListingSchema);
        if (!controller.signal.aborted) {
          setSessionExpired(false);
          setListing(data);
          setSelected([]);
          if (page > data.pages) setPage(data.pages);
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : "Falha de conexao. Tente carregar a lista novamente.");
          if (reason instanceof CashbackSessionError) { setSessionExpired(true); setListing(null); }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, enabled, revision]);

  function clearSelection() { setSelected([]); setPreview(null); }
  function refresh() { clearSelection(); setLoading(true); setRevision((value) => value + 1); }

  function reviewBulk(active: boolean) {
    if (saveLock.current || loading || error || sessionExpired) return;
    const ids = selectCashbackProducts(selected, listing?.data ?? []);
    const products = (listing?.data ?? []).filter(product => ids.includes(product.id));
    let rate: number | null = null;
    try { if (active) rate = decimalToMinorUnits(bulkRate); } catch { /* Show the same bounded input error below. */ }
    if (!products.length || (active && !cashbackRateSchema.safeParse(rate).success)) {
      toast.error("Selecione produtos e informe um percentual entre 0,01% e 100%, com ate duas casas decimais.");
      return;
    }
    setPreview({ body: createCashbackBulkUpdate(products, active, rate ?? undefined), names: products.map(product => product.name) });
  }

  async function applyBulk() {
    if (!preview || saveLock.current || loading || error || sessionExpired) return;
    saveLock.current = true;
    setBulkSaving(true);
    let reconcile = true;
    try {
      const response = await fetch("/api/admin/produtos/lote", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preview.body) });
      await confirmCashbackBulkResponse(response, preview.body);
      toast.success(`${preview.body.items.length} ${preview.body.items.length === 1 ? "produto atualizado" : "produtos atualizados"}.`);
    } catch (reason) {
      toast.error(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : "Falha de conexao. Confira a lista antes de tentar novamente.");
      if (reason instanceof CashbackSessionError) {
        reconcile = false;
        setSessionExpired(true); setListing(null); setError(reason.message);
      }
    } finally {
      // Even a lost response may follow a committed transaction. No automatic PATCH retry.
      if (reconcile) refresh();
      else clearSelection();
      saveLock.current = false;
      setBulkSaving(false);
    }
  }

  async function save(product: CashbackListProduct, cashbackEnabled: boolean, cashbackRateBps: number) {
    if (saveLock.current || loading || sessionExpired || error) return false;
    if (!cashbackRateSchema.safeParse(cashbackRateBps).success) {
      toast.error("Informe um percentual entre 0,01% e 100%.");
      return false;
    }
    saveLock.current = true;
    setSavingId(product.id);
    try {
      const response = await fetch(`/api/cashback/produtos/${encodeURIComponent(product.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashbackEnabled, cashbackRateBps, expectedUpdatedAt: product.updatedAt }),
      });
      const { data } = await readCashbackResponse(response, cashbackSavedSchema);
      if (data.id !== product.id || data.cashbackEnabled !== cashbackEnabled || data.cashbackRateBps !== cashbackRateBps) {
        throw new Error("Nao foi possivel confirmar a alteracao. Confira o produto na lista atualizada.");
      }
      setListing((current) => {
        if (!current) return current;
        const activeDelta = product.status === "ACTIVE" && !product.isPopularPharmacy && !product.requiresPrescription ? Number(data.cashbackEnabled) - Number(product.cashbackEnabled) : 0;
        return { ...current, active: Math.max(0, current.active + activeDelta), data: current.data.map((item) => item.id === data.id ? { ...item, ...data } : item) };
      });
      toast.success(cashbackEnabled ? "Cashback atualizado." : "Cashback desativado.");
      if (enabled && !cashbackEnabled) refresh();
      return true;
    } catch (reason) {
      toast.error(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : "Falha de conexao. Confira a lista antes de tentar novamente.");
      if (reason instanceof CashbackSessionError) {
        setSessionExpired(true);
        setListing(null);
        setError(reason.message);
        return false;
      }
      // A missing response can follow a committed write; reconcile before another mutation.
      refresh();
      return false;
    } finally {
      saveLock.current = false;
      setSavingId(null);
    }
  }

  const busy = loading || Boolean(savingId) || bulkSaving || sessionExpired || Boolean(error);
  const eligibleIds = selectCashbackProducts((listing?.data ?? []).map(product => product.id), listing?.data ?? []);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 border-b border-line pb-6 sm:grid-cols-3">
        {[{ label: "Percentual inicial", value: "2%", icon: CircleDollarSign },
          { label: "Produtos ativos com cashback", value: listing ? String(listing.active) : "...", icon: Wallet },
          { label: "Cashback pendente em pedidos", value: listing ? formatCurrency(listing.pendingCents / 100) : "...", icon: CircleDollarSign }].map((item) => (
          <div className="flex min-w-0 items-center gap-3" key={item.label}>
            <item.icon className="h-9 w-9 shrink-0 rounded-md bg-emerald-50 p-2 text-emerald-700" />
            <div className="min-w-0"><p className="text-xs font-semibold text-muted">{item.label}</p><strong className="text-2xl text-ink">{item.value}</strong></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Cashback por produto</h2>
        <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input checked={enabled} disabled={Boolean(savingId) || bulkSaving || sessionExpired} className="h-4 w-4 accent-emerald-700" type="checkbox" onChange={(e) => { clearSelection(); setLoading(true); setEnabled(e.target.checked); setPage(1); }} /> Apenas com cashback</label><Button aria-label="Atualizar lista" title="Atualizar lista" variant="secondary" disabled={loading || Boolean(savingId) || bulkSaving || sessionExpired} onClick={refresh}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
      </div>
      <label className="relative block"><span className="sr-only">Buscar produto</span><Search className="absolute left-3 top-3 h-5 w-5 text-muted" /><Input className="pl-10" disabled={Boolean(savingId) || bulkSaving || sessionExpired} placeholder="Nome, marca, SKU ou EAN" value={query} onChange={(e) => { clearSelection(); setLoading(true); setQuery(e.target.value); setPage(1); }} /></label>
      <div className="grid min-w-0 gap-3 rounded-md border border-line bg-white p-3 sm:flex sm:flex-wrap sm:items-end" aria-label="Cashback em massa">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-emerald-700" disabled={busy || !eligibleIds.length} checked={eligibleIds.length > 0 && eligibleIds.every(id => selected.includes(id))} onChange={event => setSelected(event.target.checked ? eligibleIds : [])} />Selecionar visiveis (ate {BULK_PRODUCT_LIMIT})</label>
        <span className="text-xs text-muted" role="status">{selected.length} selecionados · {CASHBACK_PAGE_SIZE} por pagina</span>
        <label className="grid min-w-0 gap-1 text-xs font-semibold sm:w-28">Percentual (%)<Input aria-label="Percentual em massa" inputMode="decimal" value={bulkRate} disabled={busy} onChange={event => setBulkRate(event.target.value)} /></label>
        <Button disabled={busy || !selected.length} onClick={() => reviewBulk(true)} variant="success">Aplicar percentual</Button>
        <Button disabled={busy || !selected.length} onClick={() => reviewBulk(false)} variant="secondary">Desativar selecionados</Button>
        <p className="w-full text-xs text-muted">Somente produtos elegiveis. Busca, filtros e troca de pagina limpam a selecao.</p>
      </div>
      <div aria-busy={loading} className="min-h-48">
        {error ? <div role="alert" className="space-y-3 rounded-md border border-line bg-white px-4 py-8 text-center"><p>{error}</p>{sessionExpired ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" href="/admin/login"><LogIn className="h-4 w-4" />Entrar novamente</Link> : <Button variant="secondary" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>}</div> : !listing && loading ? <div role="status" className="flex justify-center p-12"><Loader2 aria-label="Carregando produtos" className="h-6 w-6 animate-spin text-brand" /></div> : listing?.data.length ? (
          <div className="grid min-w-0 grid-cols-1 gap-2" data-cashback-grid>
            {listing.data.map((product) => <CashbackProductCard product={product} key={product.id} disabled={busy} selected={selected.includes(product.id)} selectionFull={selected.length >= BULK_PRODUCT_LIMIT} onSelect={checked => setSelected(current => selectCashbackProducts(checked ? [...current, product.id] : current.filter(id => id !== product.id), listing.data))} saving={savingId === product.id} onSave={(active, rate) => save(product, active, rate)} />)}
          </div>
        ) : <p className="py-12 text-center text-sm text-muted">Nenhum produto encontrado.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted"><span>{listing?.total ?? 0} produtos · Pagina {page} de {listing?.pages ?? 1}</span><div className="flex gap-2"><Button aria-label="Pagina anterior" title="Pagina anterior" variant="secondary" disabled={busy || page <= 1} onClick={() => { clearSelection(); setLoading(true); setPage((v) => v - 1); }}><ChevronLeft className="h-4 w-4" /></Button><Button aria-label="Proxima pagina" title="Proxima pagina" variant="secondary" disabled={busy || page >= (listing?.pages ?? 1)} onClick={() => { clearSelection(); setLoading(true); setPage((v) => v + 1); }}><ChevronRight className="h-4 w-4" /></Button></div></div>
      <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open && !bulkSaving) setPreview(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Revisar cashback em massa</DialogTitle><DialogDescription>{preview?.body.items.length} produtos: {preview?.body.changes.cashbackEnabled ? `ativar cashback de ${(preview.body.changes.cashbackRateBps ?? 0) / 100}%` : "desativar cashback"}. Saldos ja concedidos permanecem iguais.</DialogDescription></DialogHeader>
          <ul aria-label="Produtos que serao alterados" className="max-h-48 space-y-1 overflow-y-auto break-words text-sm">{preview?.names.map((name, index) => <li key={preview.body.items[index].id}>{name}</li>)}</ul>
          <p className="text-xs text-muted">Uma divergencia cancela todo o lote. A lista sera atualizada antes de outra tentativa.</p>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={bulkSaving} onClick={() => setPreview(null)}>Cancelar</Button><Button disabled={busy} onClick={() => void applyBulk()}>{bulkSaving && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar {preview?.body.items.length} produtos</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
