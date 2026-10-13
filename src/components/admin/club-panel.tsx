"use client";

import { useEffect, useState } from "react";
import { Coins, Crown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type Member = { id: string; customerId: string; customerName: string; email: string; phone: string | null; joinedAt: string; active: boolean; balancePoints: number };
type ClubMembers = { data: Member[]; page: number; pages: number; total: number; summary: { members: number; availablePoints: number; pendingPoints: number } };

export function ClubPanel() {
  const [result, setResult] = useState<ClubMembers | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null); setResult(null);
      try {
        const response = await fetch(`/api/admin/club?${new URLSearchParams({ page: String(page), q: query })}`, { cache: "no-store", signal: controller.signal });
        if (response.status === 401 || response.status === 403) {
          if (!controller.signal.aborted) setError("Seu acesso ao Club expirou ou não está autorizado.");
          return;
        }
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.data) || !Number.isSafeInteger(payload.summary?.members) || !Number.isSafeInteger(payload.pages)) throw new Error("Não foi possível consultar os participantes. Tente novamente.");
        if (!controller.signal.aborted) setResult(payload);
      } catch { if (!controller.signal.aborted) setError("Não foi possível consultar os participantes. Tente novamente."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [page, query, revision]);
  return <div className="min-w-0 space-y-5"><p className="text-sm leading-6 text-muted">Adesões gratuitas confirmadas pelos clientes e seus saldos de WimiCoins.</p>
    <div className="grid gap-3 sm:grid-cols-3">{[{ icon: Users, label: "Participantes", value: result?.summary.members.toLocaleString("pt-BR") }, { icon: Coins, label: "WimiCoins disponíveis", value: result ? `${result.summary.availablePoints.toLocaleString("pt-BR")} · ${formatCurrency(result.summary.availablePoints / 100)}` : null }, { icon: Crown, label: "WimiCoins pendentes", value: result ? `${result.summary.pendingPoints.toLocaleString("pt-BR")} · ${formatCurrency(result.summary.pendingPoints / 100)}` : null }].map(item => <div className="min-w-0 rounded-xl border border-line bg-white p-4" key={item.label}><p className="flex items-center gap-2 text-xs font-bold text-muted"><item.icon aria-hidden="true" className="h-4 w-4" />{item.label}</p><p className="mt-2 break-words text-xl font-black">{item.value ?? "—"}</p></div>)}</div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); setRevision(value => value + 1); }}><div className="min-w-0 flex-1"><label className="mb-2 block text-xs font-bold" htmlFor="club-search">Buscar participante</label><Input id="club-search" onChange={event => setSearch(event.target.value)} placeholder="Nome, e-mail ou telefone" value={search} /></div><button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-bold text-white" type="submit">Buscar</button></form>
    {loading && <p role="status" className="text-sm text-muted">Consultando participantes…</p>}
    {error && <div className="rounded-xl border border-red-200 p-4"><p role="alert" className="text-sm text-red-700">{error}</p><button className="mt-2 min-h-11 text-sm font-bold text-brand underline" onClick={() => setRevision(value => value + 1)} type="button">Atualizar lista</button></div>}
    {result && <><p className="text-xs text-muted">{result.total} participante(s) encontrado(s)</p><div className="space-y-3">{result.data.length ? result.data.map(member => <article className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-white p-4" key={member.id}><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{member.customerName}</h2><p className="break-all text-xs text-muted">{member.email}</p>{member.phone && <p className="text-xs text-muted">{member.phone}</p>}<p className="mt-2 text-xs text-muted">Desde {new Date(member.joinedAt).toLocaleDateString("pt-BR")} · {member.active ? "Ativo" : "Inativo"}</p></div><p className="break-words text-sm font-bold text-brand">{member.balancePoints.toLocaleString("pt-BR")} WimiCoins<span className="block text-xs text-muted">{formatCurrency(member.balancePoints / 100)}</span></p></article>) : <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">Nenhum participante encontrado.</p>}</div><div className="flex flex-wrap items-center justify-between gap-3"><button className="min-h-11 rounded-lg border border-line px-4 text-sm font-bold disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)} type="button">Anterior</button><span className="text-xs">Página {result.page} de {Math.max(1, result.pages)}</span><button className="min-h-11 rounded-lg border border-line px-4 text-sm font-bold disabled:opacity-40" disabled={page >= result.pages || loading} onClick={() => setPage(value => value + 1)} type="button">Próxima</button></div></>}
  </div>;
}
