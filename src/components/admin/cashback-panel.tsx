"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleDollarSign, Loader2, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CashbackProductCard } from "./cashback-product-card";
import { cashbackListingSchema, cashbackSavedSchema, readCashbackResponse, type CashbackListing, type CashbackListProduct } from "@/features/cashback/client";
import { cashbackRateSchema } from "@/features/cashback/rules";
import { formatCurrency } from "@/lib/utils";

export function CashbackPanel() {
  const [listing, setListing] = useState<CashbackListing | null>(null);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
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
          setListing(data);
          if (page > data.pages) setPage(data.pages);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : "Falha de conexao. Tente carregar a lista novamente.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, enabled, revision]);

  function refresh() { setLoading(true); setRevision((value) => value + 1); }

  async function save(product: CashbackListProduct, cashbackEnabled: boolean, cashbackRateBps: number) {
    if (saveLock.current || loading) return false;
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
      // A missing response can follow a committed write; reconcile before another mutation.
      refresh();
      return false;
    } finally {
      saveLock.current = false;
      setSavingId(null);
    }
  }

  const busy = loading || Boolean(savingId);
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
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input checked={enabled} disabled={Boolean(savingId)} className="h-4 w-4 accent-emerald-700" type="checkbox" onChange={(e) => { setLoading(true); setEnabled(e.target.checked); setPage(1); }} /> Apenas com cashback</label>
      </div>
      <label className="relative block"><span className="sr-only">Buscar produto</span><Search className="absolute left-3 top-3 h-5 w-5 text-muted" /><Input className="pl-10" disabled={Boolean(savingId)} placeholder="Nome, marca, SKU ou EAN" value={query} onChange={(e) => { setLoading(true); setQuery(e.target.value); setPage(1); }} /></label>
      <div aria-busy={loading} className="min-h-48">
        {error ? <div role="alert" className="space-y-3 py-8 text-center"><p>{error}</p><Button variant="secondary" onClick={refresh}>Tentar novamente</Button></div> : !listing && loading ? <div role="status" className="flex justify-center p-12"><Loader2 aria-label="Carregando produtos" className="h-6 w-6 animate-spin text-brand" /></div> : listing?.data.length ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" data-cashback-grid>
            {listing.data.map((product) => <CashbackProductCard product={product} key={product.id} disabled={busy} saving={savingId === product.id} onSave={(active, rate) => save(product, active, rate)} />)}
          </div>
        ) : <p className="py-12 text-center text-sm text-muted">Nenhum produto encontrado.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted"><span>{listing?.total ?? 0} produtos · Pagina {page} de {listing?.pages ?? 1}</span><div className="flex gap-2"><Button aria-label="Pagina anterior" title="Pagina anterior" variant="secondary" disabled={busy || page <= 1} onClick={() => { setLoading(true); setPage((v) => v - 1); }}><ChevronLeft className="h-4 w-4" /></Button><Button aria-label="Proxima pagina" title="Proxima pagina" variant="secondary" disabled={busy || page >= (listing?.pages ?? 1)} onClick={() => { setLoading(true); setPage((v) => v + 1); }}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </div>
  );
}
