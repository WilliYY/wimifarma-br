"use client";

import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, Check, LoaderCircle, Pencil, RefreshCw, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DirectoryPerson } from "@/features/admin-users/directory";
import { formatCurrency } from "@/lib/utils";

type Result = { data: DirectoryPerson[]; total: number; pageSize: number; stats: { total: number; admins: number; staff: number; customers: number; buyers: number } };
const roles = { ADMIN: "Administrador", MANAGER: "Gerente", STAFF: "Colaborador", CUSTOMER: "Cliente" };
const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Ainda nao entrou";
const field = "h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export function UserDirectory({ actorId }: { actorId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("hierarchy");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DirectoryPerson | null>(null);
  const [nextRole, setNextRole] = useState("CUSTOMER");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/pessoas?${new URLSearchParams({ q: query, role, status, sort, page: String(page) })}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.data) throw new Error(body?.error || "Nao foi possivel carregar. Atualize a lista.");
        setResult(body);
      } catch (e) {
        if (!controller.signal.aborted) { setResult(null); setError(e instanceof Error ? e.message : "Falha ao carregar."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, role, status, sort, page, revision]);

  async function save() {
    if (!editing || saving) return;
    setSaving(true); setSaveError("");
    try {
      const response = await fetch(`/api/admin/pessoas/${encodeURIComponent(editing.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: editing.kind, role: nextRole, isActive: active, version: editing.version }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Nao foi possivel salvar. Atualize a lista.");
      toast.success("Acesso atualizado."); setEditing(null); setRevision(v => v + 1);
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-line pb-6 lg:grid-cols-4">
      {[{ label: "Cadastros", value: result?.stats.total, icon: Users }, { label: "Administradores ativos", value: result?.stats.admins, icon: ShieldCheck }, { label: "Equipe ativa", value: result?.stats.staff, icon: Users }, { label: "Clientes com compras pagas", value: result?.stats.buyers, icon: Trophy }].map(({ label, value, icon: Icon }) => <div className="flex items-center gap-3" key={label}><Icon className="h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-xs leading-5 text-muted">{label}</p><p className="text-2xl font-bold text-ink">{value ?? "..."}</p></div></div>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Pessoas e acessos</h2><p className="mt-1 text-sm text-muted">Ranking considera apenas pedidos concluidos e pagos, sem cancelados ou reembolsados.</p></div><Button aria-label="Atualizar usuarios" disabled={loading} onClick={() => setRevision(v => v + 1)} size="icon" title="Atualizar usuarios" variant="secondary"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_11rem_10rem_13rem]">
      <label className="relative"><span className="sr-only">Buscar nome ou email</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted" /><input className={`${field} w-full pl-9`} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Nome ou email" maxLength={120} value={query} /></label>
      <select aria-label="Filtrar perfil" className={field} onChange={e => { setRole(e.target.value); setPage(1); }} value={role}><option value="ALL">Todos os perfis</option>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Filtrar status" className={field} onChange={e => { setStatus(e.target.value); setPage(1); }} value={status}><option value="ALL">Todos os status</option><option value="ACTIVE">Ativos</option><option value="BLOCKED">Bloqueados</option></select>
      <label className="relative"><ArrowDownWideNarrow className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><select aria-label="Ordenar usuarios" className={`${field} w-full pl-9`} onChange={e => { setSort(e.target.value); setPage(1); }} value={sort}><option value="hierarchy">Hierarquia</option><option value="spent">Maior valor gasto</option><option value="orders">Mais pedidos</option><option value="recent">Ultimo login</option></select></label>
    </div>
    {error && <div className="border-l-2 border-brand bg-brand-soft p-4 text-sm text-brand" role="alert">{error}</div>}
    <div aria-busy={loading} className="overflow-hidden rounded-md border border-line bg-white">
      <div className="hidden grid-cols-[minmax(12rem,2fr)_1fr_1fr_1fr_1fr_3rem] gap-3 border-b border-line bg-surface-subtle px-4 py-3 text-xs font-semibold text-muted xl:grid"><span>Usuario</span><span>Perfil</span><span>Ultimo login</span><span>Pedidos pagos</span><span>Total gasto</span><span className="sr-only">Acoes</span></div>
      <div className={`divide-y divide-line ${loading ? "pointer-events-none opacity-50" : ""}`}>{result?.data.map((person, index) => <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 xl:grid-cols-[minmax(12rem,2fr)_1fr_1fr_1fr_1fr_3rem] xl:gap-3" key={`${person.kind}:${person.id}`}>
        <div className="col-span-2 flex min-w-0 items-center gap-3 xl:col-span-1">{sort === "spent" || sort === "orders" ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-amber-50 text-sm font-bold text-amber-800">{(page - 1) * 20 + index + 1}</span> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-surface-subtle font-bold text-muted">{person.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><p className="break-words text-sm font-bold text-ink">{person.name}</p><p className="break-all text-xs leading-5 text-muted">{person.email || "Sem email"}</p><p className="text-xs text-muted">{person.google ? "Google conectado" : "Cadastro local"}{person.staffId === actorId ? " · Voce" : ""}</p></div></div>
        <div className="text-right xl:text-left"><span className={`inline-block rounded px-2 py-1 text-xs font-bold ${person.role === "ADMIN" ? "bg-brand-soft text-brand" : "bg-emerald-50 text-emerald-800"}`}>{roles[person.role as keyof typeof roles]}</span><p className="mt-1 text-xs text-muted">{person.isActive ? "Ativo" : "Bloqueado"}</p></div>
        <p className="text-xs text-muted"><span className="block xl:hidden">Ultimo login</span>{date(person.lastLoginAt)}</p>
        <p className="text-right text-sm font-semibold text-ink xl:text-left">{person.orderCount}<span className="ml-1 text-xs font-normal text-muted xl:hidden">pedidos pagos</span></p>
        <p className="text-sm font-bold text-emerald-800">{formatCurrency(person.spentCents / 100)}</p>
        <Button className="col-span-2 justify-self-end xl:col-span-1" aria-label={`Editar acesso de ${person.name}`} disabled={loading || person.staffId === actorId} onClick={() => { setEditing(person); setNextRole(person.role); setActive(person.isActive); setSaveError(""); }} size="icon" title={person.staffId === actorId ? "Seu proprio acesso esta protegido" : "Editar acesso"} variant="ghost"><Pencil className="h-4 w-4" /></Button>
      </div>)}</div>
      {!result?.data.length && <p className="px-4 py-14 text-center text-sm text-muted">{loading ? "Carregando usuarios..." : error ? "Lista indisponivel" : "Nenhum usuario encontrado."}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 text-xs text-muted"><span>{result?.total ?? 0} cadastros · Pagina {page} de {Math.max(1, Math.ceil((result?.total ?? 0) / 20))}</span><div className="flex gap-2"><Button aria-label="Pagina anterior" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)} size="icon" variant="secondary"><ArrowLeft className="h-4 w-4" /></Button><Button aria-label="Proxima pagina" disabled={loading || page * 20 >= (result?.total ?? 0)} onClick={() => setPage(p => p + 1)} size="icon" variant="secondary"><ArrowRight className="h-4 w-4" /></Button></div></div>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Permissoes de acesso</DialogTitle><DialogDescription className="break-all">{editing?.name} · {editing?.email}</DialogDescription></DialogHeader><label className="grid gap-2 text-sm font-semibold">Perfil<select className={field} disabled={saving} value={nextRole} onChange={e => setNextRole(e.target.value)}>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="flex min-h-11 items-center gap-3 text-sm"><input checked={active} className="h-4 w-4 accent-emerald-700" disabled={saving} onChange={e => setActive(e.target.checked)} type="checkbox" />Acesso ativo</label><p className="text-sm leading-6 text-muted">{nextRole === "ADMIN" ? "Administrador pode alterar usuarios, produtos, pedidos e configuracoes sensiveis." : nextRole === "CUSTOMER" ? "Cliente acessa a loja e a propria conta, sem permissoes administrativas." : "Acesso aos modulos permitidos para a equipe."}</p>{saveError && <p role="alert" className="text-sm text-brand">{saveError}</p>}<div className="flex justify-end gap-2"><Button disabled={saving} onClick={() => setEditing(null)} variant="secondary">Cancelar</Button><Button disabled={saving} onClick={save}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Salvar acesso</Button></div></DialogContent></Dialog>
  </div>;
}
