"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, CircleDollarSign, ImageIcon, Loader2, Pencil, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CashbackProductFields } from "./cashback-product-fields";
import { productCashbackCents } from "@/features/cashback/rules";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string; name: string; brand: string | null; imageUrl: string | null;
  status: string; price: string; promotionalPrice: string | null;
  cashbackEnabled: boolean; cashbackRateBps: number; updatedAt: string;
  isPopularPharmacy: boolean; requiresPrescription: boolean;
};
type Listing = { data: Product[]; total: number; pages: number; active: number; pendingCents: number };

export function CashbackPanel() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: query, page: String(page), enabled: String(enabled) });
        const response = await fetch(`/api/cashback?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Nao foi possivel carregar os produtos.");
        const data: Listing = await response.json();
        if (!controller.signal.aborted) setListing(data);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Falha ao carregar.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, enabled, revision]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch(`/api/cashback/produtos/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashbackEnabled: data.get("cashbackEnabled") === "on",
          cashbackRateBps: Math.round(Number(data.get("cashbackPercent")) * 100), expectedUpdatedAt: editing.updatedAt }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nao foi possivel salvar.");
      toast.success("Cashback atualizado.");
      setEditing(null);
      setRevision((value) => value + 1);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Nao foi possivel salvar.");
      setRevision((value) => value + 1);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 border-b border-line pb-6 sm:grid-cols-3">
        {[{ label: "Percentual inicial", value: "2%", icon: CircleDollarSign },
          { label: "Produtos ativos com cashback", value: listing ? String(listing.active) : "...", icon: Wallet },
          { label: "Cashback pendente em pedidos", value: listing ? formatCurrency(listing.pendingCents / 100) : "...", icon: CircleDollarSign }].map((item) => (
          <div className="flex min-w-0 items-center gap-3" key={item.label}>
            <item.icon className="h-9 w-9 shrink-0 rounded-md bg-emerald-50 p-2 text-emerald-700" />
            <div><p className="text-xs font-semibold text-muted">{item.label}</p><strong className="text-2xl text-ink">{item.value}</strong></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Cashback por produto</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input checked={enabled} className="h-4 w-4 accent-brand" type="checkbox" onChange={(e) => { setEnabled(e.target.checked); setPage(1); }} /> Apenas com cashback</label>
      </div>
      <label className="relative block"><span className="sr-only">Buscar produto</span><Search className="absolute left-3 top-3 h-5 w-5 text-muted" /><Input className="pl-10" placeholder="Nome, marca, SKU ou EAN" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label>
      <div aria-busy={loading} className="min-h-48">
        {error ? <div role="alert" className="space-y-3 py-8 text-center"><p>{error}</p><Button variant="secondary" onClick={() => setRevision((v) => v + 1)}>Tentar novamente</Button></div> : loading ? <div role="status" className="flex justify-center p-12"><Loader2 aria-label="Carregando produtos" className="h-6 w-6 animate-spin text-brand" /></div> : listing?.data.length ? (
          <div className="divide-y divide-line border-y border-line">
            {listing.data.map((product) => {
              const restricted = product.isPopularPharmacy || product.requiresPrescription;
              const amount = productCashbackCents(product, Math.round(Number(product.promotionalPrice ?? product.price) * 100));
              return <button className="group flex w-full cursor-pointer flex-wrap items-center gap-4 px-2 py-4 text-left transition hover:bg-white focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={restricted && !product.cashbackEnabled} key={product.id} onClick={() => setEditing(product)} type="button">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-white p-1">{product.imageUrl ? <Image alt="" className="h-full w-full object-contain" height={64} width={64} src={product.imageUrl} /> : <ImageIcon className="h-6 w-6 text-muted" />}</span>
                <span className="min-w-0 flex-1 basis-32"><strong className="block break-words text-sm text-ink group-hover:text-brand">{product.name}</strong><span className="text-xs text-muted">{product.brand || "Sem marca"} · {product.status === "ACTIVE" ? "Publicado" : "Nao publicado"}</span><span className="mt-1 block text-sm font-semibold">{formatCurrency(Number(product.promotionalPrice ?? product.price))}</span></span>
                <span className="ml-auto min-w-32 text-right"><span className={`block text-sm font-bold ${product.cashbackEnabled && !restricted ? "text-emerald-700" : "text-muted"}`}>{restricted ? "Nao elegivel" : product.cashbackEnabled ? `${product.cashbackRateBps / 100}% de cashback` : "Sem cashback"}</span>{amount > 0 ? <span className="text-xs text-emerald-700">{formatCurrency(amount / 100)} por unidade</span> : null}</span>
                <Pencil className="h-4 w-4 shrink-0 text-muted" />
              </button>;
            })}
          </div>
        ) : <p className="py-12 text-center text-sm text-muted">Nenhum produto encontrado.</p>}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted"><span>{listing?.total ?? 0} produtos · Pagina {page} de {listing?.pages ?? 1}</span><div className="flex gap-2"><Button aria-label="Pagina anterior" title="Pagina anterior" variant="secondary" disabled={loading || page <= 1} onClick={() => setPage((v) => v - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button aria-label="Proxima pagina" title="Proxima pagina" variant="secondary" disabled={loading || page >= (listing?.pages ?? 1)} onClick={() => setPage((v) => v + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Cashback do produto</DialogTitle><DialogDescription>{editing?.name}</DialogDescription></DialogHeader>
          {editing ? <form className="space-y-5" key={editing.updatedAt} onSubmit={save}><CashbackProductFields enabled={editing.cashbackEnabled} rateBps={editing.cashbackRateBps} /><div className="flex justify-end gap-2"><Button disabled={saving} type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={saving} type="submit">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}Salvar cashback</Button></div></form> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
