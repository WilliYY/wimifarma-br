"use client";

import { useEffect, useRef, useState } from "react";
import { ArchiveRestore, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
type TrashItem = { id: string; name: string; imageUrl: string | null; deletedAt: string; purgeAt: string; updatedAt: string };

export function ProductDeleteButton({ product, onChanged }: { product: { id: string; name: string; updatedAt: string }; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/produtos/${product.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: product.updatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível excluir o produto.");
      setOpen(false);
      toast.success(`Produto na lixeira. Restaure até ${date(payload.data.purgeAt)}.`);
      await onChanged();
    } catch (error) { setError(error instanceof Error ? error.message : "Verifique sua conexão e tente novamente."); }
    finally { setBusy(false); }
  }
  return <><Button className="text-brand" size="sm" variant="ghost" type="button" onClick={() => { setError(""); setOpen(true); }}><Trash2 className="h-4 w-4" />Excluir produto</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Mover produto para a lixeira?</DialogTitle><DialogDescription>O produto sai da loja e suas ofertas são arquivadas. Você poderá restaurá-lo por dois meses; depois, a exclusão será automática e definitiva.</DialogDescription></DialogHeader>
      <p className="break-words rounded-xl bg-surface-subtle p-4 text-sm font-bold">{product.name}</p><p className="text-xs leading-5 text-muted">O histórico de compras e os lançamentos de cashback são preservados.</p>
      {error && <p role="alert" className="text-sm text-brand">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={busy} onClick={() => setOpen(false)} variant="secondary" type="button">Cancelar</Button><Button disabled={busy} onClick={() => void remove()} type="button">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Mover para lixeira</Button></div>
    </DialogContent></Dialog></>;
}

export function ProductTrashDialog({ onChanged }: { onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function load(nextPage = 1) {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/produtos/lixeira?page=${nextPage}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a lixeira.");
      if (!controller.signal.aborted) { setItems(payload.data); setPage(payload.page); setHasMore(payload.hasMore); }
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { if (pending.current === controller) setLoading(false); }
  }
  async function restore(product: TrashItem) {
    setRestoring(product.id); setError("");
    try {
      const response = await fetch(`/api/produtos/${product.id}/restaurar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: product.updatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível restaurar.");
      toast.success("Produto restaurado como rascunho. Revise os dados antes de publicar.");
      await load(items.length === 1 && page > 1 ? page - 1 : page);
      await onChanged();
    } catch (error) { setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
    finally { setRestoring(null); }
  }
  return <><Button variant="secondary" type="button" onClick={() => { setOpen(true); void load(); }}><Trash2 className="h-4 w-4" />Lixeira</Button>
    <Dialog open={open} onOpenChange={value => { if (!restoring) setOpen(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Histórico de exclusões</DialogTitle><DialogDescription>Produtos ficam aqui por dois meses. A restauração devolve o cadastro como rascunho; revise antes de publicar.</DialogDescription></DialogHeader>
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">Prazos no horário de São Paulo.</p><Button disabled={loading || Boolean(restoring)} size="sm" onClick={() => void load(page)} variant="secondary" type="button"><RefreshCw className="h-4 w-4" />Atualizar</Button></div>
      {error && <p role="alert" className="rounded-lg bg-brand-soft p-3 text-sm text-brand">{error}</p>}
      <div aria-busy={loading} className="grid gap-3">
        {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Carregando lixeira…</p> : items.length ? items.map(product => <article className="grid min-w-0 gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto]" key={product.id}>
          <div className="min-w-0"><h3 className="break-words text-sm font-bold">{product.name}</h3><p className="mt-2 text-xs text-muted">Excluído em {date(product.deletedAt)}</p><p className="mt-1 text-xs font-semibold text-brand">Restaurar até {date(product.purgeAt)}</p></div>
          <Button disabled={Boolean(restoring)} onClick={() => void restore(product)} variant="secondary" type="button">{restoring === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}Restaurar</Button>
        </article>) : <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Nenhum produto na lixeira.</p>}
      </div>
      {(page > 1 || hasMore) && <nav aria-label="Páginas da lixeira" className="flex items-center justify-between gap-2"><Button disabled={loading || Boolean(restoring) || page === 1} onClick={() => void load(page - 1)} variant="secondary" type="button">Anterior</Button><span className="text-xs text-muted">Página {page}</span><Button disabled={loading || Boolean(restoring) || !hasMore} onClick={() => void load(page + 1)} variant="secondary" type="button">Próxima</Button></nav>}
    </DialogContent></Dialog></>;
}
