"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Copy, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, TicketPercent, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { CouponForm } from "@/components/admin/coupon-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { couponDateInput, couponDeleteBlock, couponStatusLabels, couponTypeLabels, getCouponStatus, type CouponListItem, type CouponStatus } from "@/features/coupons/coupon";
import { cn, formatCurrency } from "@/lib/utils";

const statusColors: Record<CouponStatus, string> = {
  active: "bg-emerald-50 text-emerald-700", scheduled: "bg-sky-50 text-sky-700",
  expired: "bg-red-50 text-red-700", paused: "bg-surface-subtle text-muted", exhausted: "bg-amber-50 text-amber-800",
};
function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(new Date(value)) : "Sem data";
}
function discountLabel(coupon: CouponListItem) {
  return coupon.type === "FREE_DELIVERY" ? "Frete gratis" : coupon.type === "PERCENTAGE" ? `${Number(coupon.value).toLocaleString("pt-BR")}% OFF` : `${formatCurrency(Number(coupon.value))} OFF`;
}
async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error
      : Object.values(payload?.error?.fieldErrors ?? {}).flat().join(" ") || "Nao foi possivel concluir a operacao.";
    throw new Error(message);
  }
  if (!payload) throw new Error("Resposta invalida. Atualize a lista e tente novamente.");
  return payload;
}

export function CouponsPanel() {
  const [coupons, setCoupons] = useState<CouponListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [editor, setEditor] = useState<CouponListItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<CouponListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const loadVersion = useRef(0);

  const loadCoupons = useCallback(async (next?: string, signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    setLoading(true); setLoadError("");
    try {
      const payload = await readResponse(await fetch(`/api/cupons${next ? `?cursor=${encodeURIComponent(next)}` : ""}`, { cache: "no-store", signal }));
      if (signal?.aborted || version !== loadVersion.current) return;
      setCoupons((current) => next ? [...current, ...payload.data.filter((item: CouponListItem) => !current.some((existing) => existing.id === item.id))] : payload.data);
      setCursor(payload.nextCursor ?? null); setNow(Date.now());
    } catch (error) {
      if (!signal?.aborted && version === loadVersion.current) setLoadError(error instanceof Error ? error.message : "Erro ao carregar os cupons.");
    } finally { if (!signal?.aborted && version === loadVersion.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCoupons(undefined, controller.signal);
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadCoupons]);

  function replaceCoupon(coupon: CouponListItem) {
    setCoupons((current) => current.some((item) => item.id === coupon.id) ? current.map((item) => item.id === coupon.id ? coupon : item) : [coupon, ...current]);
    setNow(Date.now());
  }
  async function saveCoupon(payload: Record<string, unknown>) {
    const editing = editor && editor !== "new" ? editor : null;
    const result = await readResponse(await fetch(editing ? `/api/cupons/${editing.id}` : "/api/cupons", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }));
    replaceCoupon(result.data); setEditor(null);
    toast.success(editing ? "Cupom atualizado." : "Cupom criado.");
  }
  async function toggleCoupon(coupon: CouponListItem) {
    setBusy(true);
    try {
      const payload = { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value,
        minOrderValue: coupon.minOrderValue, maxUses: coupon.maxUses, startsAt: couponDateInput(coupon.startsAt) || null,
        endsAt: couponDateInput(coupon.endsAt) || null, isActive: !coupon.isActive, expectedUpdatedAt: coupon.updatedAt };
      const result = await readResponse(await fetch(`/api/cupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      replaceCoupon(result.data); toast.success(coupon.isActive ? "Cupom pausado." : "Cupom habilitado. A validade e o limite continuam valendo.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao alterar cupom."); }
    finally { setBusy(false); }
  }
  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true); setMutationError("");
    try {
      await readResponse(await fetch(`/api/cupons/${deleting.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: deleting.updatedAt }) }));
      setCoupons((current) => current.filter((coupon) => coupon.id !== deleting.id)); setDeleting(null); toast.success("Cupom excluido.");
    } catch (error) { setMutationError(error instanceof Error ? error.message : "Nao foi possivel excluir."); }
    finally { setBusy(false); }
  }
  async function copyCode(code: string) {
    try { await navigator.clipboard.writeText(code); toast.success("Codigo copiado."); }
    catch { toast.error("Nao foi possivel copiar o codigo."); }
  }

  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = coupons.filter((coupon) => (status === "all" || getCouponStatus(coupon, now) === status) && `${coupon.code} ${coupon.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(query));
  const stats = [
    { label: "Cupons cadastrados", value: coupons.length, icon: TicketPercent, color: "text-brand" },
    { label: "Ativos agora", value: coupons.filter((coupon) => getCouponStatus(coupon, now) === "active").length, icon: CheckCircle2, color: "text-emerald-700" },
    { label: "Agendados", value: coupons.filter((coupon) => getCouponStatus(coupon, now) === "scheduled").length, icon: CalendarDays, color: "text-sky-700" },
    { label: "Usos registrados", value: coupons.reduce((total, coupon) => total + coupon.usesCount, 0), icon: Users, color: "text-muted" },
  ];

  return (
    <div className="min-w-0 space-y-6" data-coupons-ready={!loading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-xl font-bold"><TicketPercent className="h-6 w-6 text-brand" />Cupons e campanhas</h1>
        <Button disabled={busy || loading} onClick={() => setEditor("new")}><Plus className="h-4 w-4" />Novo cupom</Button>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-line border-y border-line bg-white md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => <div key={label} className="min-w-0 px-4 py-4 sm:px-5">
          <dt className="flex items-center gap-2 text-xs text-muted"><Icon className={cn("h-4 w-4 shrink-0", color)} />{label}</dt>
          <dd className="mt-2 text-2xl font-bold tabular-nums">{loading && !coupons.length ? "--" : value}</dd>
        </div>)}
      </dl>
      <section aria-label="Cupons cadastrados" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 flex-1 basis-56 gap-2 text-xs font-semibold text-muted">Buscar cupom
            <span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><Input className="min-w-0 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Codigo ou campanha" type="search" /></span>
          </label>
          <label className="grid min-w-0 flex-1 basis-40 gap-2 text-xs font-semibold text-muted sm:max-w-52">Status
            <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full cursor-pointer rounded-md border border-line bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
              <option value="all">Todos os status</option>{Object.entries(couponStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <Button variant="secondary" size="icon" className="h-11 w-11" disabled={loading || busy} onClick={() => void loadCoupons()} title="Atualizar cupons" aria-label="Atualizar cupons"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
        </div>
        {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<Button variant="secondary" size="sm" disabled={loading} onClick={() => void loadCoupons(cursor ?? undefined)}>Tentar novamente</Button></div>}
        <p className="text-xs text-muted" aria-live="polite">{loading ? "Carregando cupons..." : `${filtered.length} de ${coupons.length} cupons${cursor ? " carregados" : ""}`}</p>
        <ul className="space-y-3">
          {filtered.map((coupon) => {
            const currentStatus = getCouponStatus(coupon, now);
            return <li key={coupon.id} data-coupon-id={coupon.id} className="grid min-w-0 gap-4 rounded-md border border-line bg-white p-4 transition-colors hover:border-brand/30 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] lg:items-center lg:gap-6 lg:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><button className="min-w-0 cursor-pointer break-all text-left text-base font-bold hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setEditor(coupon)} disabled={busy || loading} title={`Editar ${coupon.code}`}>{coupon.code}</button><Badge className={statusColors[currentStatus]}>{couponStatusLabels[currentStatus]}</Badge></div>
                <p className="mt-1 break-words text-xs leading-relaxed text-muted">{coupon.description || couponTypeLabels[coupon.type]}</p>
                <p className="mt-3 text-lg font-bold text-brand">{discountLabel(coupon)}</p>
                <p className="mt-1 text-xs text-muted">{Number(coupon.minOrderValue) > 0 ? `Pedido minimo ${formatCurrency(Number(coupon.minOrderValue))}` : "Sem pedido minimo"}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs lg:grid-cols-[auto_1fr]">
                <dt className="text-muted">Inicio</dt><dd className="font-semibold">{coupon.startsAt ? dateLabel(coupon.startsAt) : "Imediato"}</dd>
                <dt className="text-muted">Termino</dt><dd className="font-semibold">{coupon.endsAt ? dateLabel(coupon.endsAt) : "Sem data final"}</dd>
                {coupon.linkedPrizes > 0 && <dd className="col-span-2 mt-2 text-muted">Vinculado a roleta</dd>}
              </dl>
              <div className="min-w-0 text-xs"><p><strong className="text-sm tabular-nums">{coupon.usesCount}</strong> <span className="text-muted">{coupon.maxUses === null ? "usos / sem limite" : `de ${coupon.maxUses} usos`}</span></p>
                {coupon.maxUses !== null && <progress aria-label={`Usos de ${coupon.code}`} value={coupon.usesCount} max={coupon.maxUses} className="mt-2 h-1.5 w-full max-w-52 overflow-hidden rounded bg-surface-subtle accent-brand [&::-webkit-progress-bar]:bg-surface-subtle [&::-webkit-progress-value]:bg-brand [&::-moz-progress-bar]:bg-brand" />}
              </div>
              <div className="flex items-center gap-1 border-t border-line pt-3 lg:border-0 lg:pt-0">
                <Button variant="secondary" size="icon" disabled={busy || loading} onClick={() => setEditor(coupon)} title={`Editar ${coupon.code}`} aria-label={`Editar ${coupon.code}`}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => void copyCode(coupon.code)} title={`Copiar ${coupon.code}`} aria-label={`Copiar ${coupon.code}`}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" disabled={busy || loading} onClick={() => void toggleCoupon(coupon)} title={`${coupon.isActive ? "Pausar" : "Habilitar"} ${coupon.code}`} aria-label={`${coupon.isActive ? "Pausar" : "Habilitar"} ${coupon.code}`}>{coupon.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="icon" className="text-brand" disabled={busy || loading} onClick={() => { setMutationError(""); setDeleting(coupon); }} title={`Excluir ${coupon.code}`} aria-label={`Excluir ${coupon.code}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>;
          })}
        </ul>
        {!loading && !loadError && !filtered.length && <div className="grid justify-items-center gap-3 border-y border-dashed border-line py-12 text-center"><TicketPercent className="h-7 w-7 text-muted" /><p className="text-sm text-muted">{coupons.length ? "Nenhum cupom corresponde aos filtros." : "Nenhum cupom cadastrado."}</p>{coupons.length > 0 && <Button size="sm" variant="secondary" onClick={() => { setSearch(""); setStatus("all"); }}>Limpar filtros</Button>}</div>}
        {cursor && <div className="text-center"><Button variant="secondary" disabled={loading || busy} onClick={() => void loadCoupons(cursor)}>Carregar mais cupons</Button></div>}
      </section>

      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}>
        <DialogContent className="max-w-2xl" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader><DialogTitle>{editor === "new" ? "Novo cupom" : "Editar cupom"}</DialogTitle><DialogDescription>{editor && editor !== "new" ? editor.code : "Campanha, desconto e periodo de validade"}</DialogDescription></DialogHeader>
          {editor && <CouponForm key={editor === "new" ? "new" : editor.id} coupon={editor === "new" ? undefined : editor} onSave={saveCoupon} onCancel={() => setEditor(null)} onBusyChange={setBusy} />}
        </DialogContent>
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
        <DialogContent className="max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader><DialogTitle>{deleting && couponDeleteBlock(deleting) ? "Cupom protegido" : "Excluir cupom?"}</DialogTitle><DialogDescription className="break-all">{deleting?.code}</DialogDescription></DialogHeader>
          <p className="text-sm leading-relaxed text-muted">{deleting && couponDeleteBlock(deleting) || "O cupom sera removido do cadastro. Esta acao nao pode ser desfeita."}</p>
          {mutationError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{mutationError}</p>}
          <div className="flex justify-end gap-3"><Button variant="secondary" disabled={busy} onClick={() => setDeleting(null)} autoFocus>Cancelar</Button>
            {deleting && !couponDeleteBlock(deleting) && <Button disabled={busy} onClick={() => void confirmDelete()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Excluir cupom</Button>}
            {deleting && couponDeleteBlock(deleting) && <Button disabled={busy} onClick={() => { setEditor(deleting); setDeleting(null); }}><Pencil className="h-4 w-4" />Editar cupom</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
