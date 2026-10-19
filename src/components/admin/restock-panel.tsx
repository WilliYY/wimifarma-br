"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, Mail, MessageCircle, PackageCheck, RefreshCw } from "lucide-react";
import { productDisplayName } from "@/features/products/display-name";

type Interest = {
  id: string; product: { id: string; name: string; slug: string }; customer: { name: string };
  phone: string | null; email: string | null; whatsapp: boolean; emailEnabled: boolean;
  whatsappNotifiedAt: string | null; emailNotifiedAt: string | null;
  createdAt: string; expiresAt: string; updatedAt: string; available: boolean;
};
type Result = { data: Interest[]; counts: { waiting: number; available: number }; page: number; pages: number; total: number };

export function RestockPanel() {
  const [result, setResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<"all" | "available">("available");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setResult(null); setError(null); setOpened(null);
    async function load() {
      try {
        const response = await fetch(`/api/admin/avisos-estoque?${new URLSearchParams({ page: String(page), filter })}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.message || "Não foi possível consultar os avisos.");
        if (!controller.signal.aborted) setResult(payload);
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Tente atualizar a lista."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [page, filter, revision]);

  async function openDraft(interest: Interest, channel: "WHATSAPP" | "EMAIL") {
    if (busy) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) { setError("O navegador bloqueou a abertura. Permita a janela de contato e tente novamente."); return; }
    popup.opener = null;
    popup.document.title = "Preparando aviso — Wimifarma";
    const controller = new AbortController(); mutation.current = controller;
    setBusy(interest.id); setError(null); setOpened(null);
    try {
      const response = await fetch("/api/admin/avisos-estoque", { method: "POST", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: interest.id, channel, updatedAt: interest.updatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "O aviso mudou. Atualize a lista antes de entrar em contato.");
      const url = new URL(payload.draft?.url);
      if (!(channel === "WHATSAPP" ? url.protocol === "https:" && url.hostname === "wa.me" : url.protocol === "mailto:")) throw new Error("Não foi possível preparar este canal.");
      if (controller.signal.aborted) { popup.close(); return; }
      popup.location.replace(url.href);
      setOpened(`${interest.id}:${channel}`);
    } catch (reason) {
      popup.close();
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível preparar o contato. Atualize a lista.");
    } finally { if (!controller.signal.aborted) setBusy(null); }
  }

  async function markContact(interest: Interest, channel: "WHATSAPP" | "EMAIL") {
    if (busy) return;
    const controller = new AbortController(); mutation.current = controller;
    setBusy(interest.id); setError(null);
    try {
      const response = await fetch("/api/admin/avisos-estoque", { method: "PATCH", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: interest.id, channel, updatedAt: interest.updatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível registrar o contato. Atualize a lista.");
      if (!controller.signal.aborted) setRevision(value => value + 1);
    } catch (reason) { if (!controller.signal.aborted) { setOpened(null); setError(reason instanceof Error ? reason.message : "Confira o estado do aviso antes de tentar novamente."); } }
    finally { if (!controller.signal.aborted) setBusy(null); }
  }

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6"><div><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand"><Bell aria-hidden="true" className="h-4 w-4" />Interesse dos clientes</span><h1 className="mt-2 text-2xl font-black">Avise-me quando chegar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Quando o produto voltar a ficar disponível, abra o canal escolhido, confira o destinatário e envie o aviso. Depois, registre o contato feito.</p></div><button className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold disabled:opacity-40" disabled={loading || !!busy} onClick={() => setRevision(value => value + 1)} type="button"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button></div>
    <div className="grid gap-3 sm:grid-cols-2">{[{ icon: Bell, label: "Aguardando aviso", value: result?.counts.waiting }, { icon: PackageCheck, label: "Já disponíveis para avisar", value: result?.counts.available }].map(item => <div className="rounded-xl border border-line bg-white p-5" key={item.label}><p className="flex items-center gap-2 text-xs font-bold text-muted"><item.icon aria-hidden="true" className="h-4 w-4 text-brand" />{item.label}</p><p className="mt-2 text-3xl font-black tabular-nums">{item.value ?? "—"}</p></div>)}</div>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar avisos">{[{ id: "available" as const, label: "Prontos para avisar" }, { id: "all" as const, label: "Todos os pendentes" }].map(item => <button aria-pressed={filter === item.id} className={`min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40 ${filter === item.id ? "bg-brand text-white" : "border border-line bg-white text-muted"}`} disabled={!!busy} key={item.id} onClick={() => { setFilter(item.id); setPage(1); }} type="button">{item.label}</button>)}</div>
    <p className="text-xs leading-5 text-muted">Envio pela equipe. Abrir WhatsApp ou e-mail prepara uma mensagem; não comprova entrega. Não há disparo automático conectado.</p>
    {loading && <p className="text-sm text-muted" role="status">Consultando os avisos…</p>}
    {error && <p className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700" role="alert">{error}</p>}
    {result && <><div className="space-y-3">{result.data.length ? result.data.map(interest => {
      return <article className="min-w-0 rounded-2xl border border-line bg-white p-5" key={interest.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><Link className="break-words font-bold hover:text-brand" href={`/produto/${interest.product.slug}`} target="_blank" rel="noreferrer">{productDisplayName(interest.product.name)}</Link><p className="mt-1 break-words text-sm text-muted">{interest.customer.name}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${interest.available ? "bg-emerald-50 text-pharma-green" : "bg-surface-subtle text-muted"}`}>{interest.available ? "Disponível para avisar" : "Aguardando estoque"}</span></div>
        <p className="mt-3 text-xs text-muted">Solicitado em {new Date(interest.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · válido até {new Date(interest.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">{[{ channel: "WHATSAPP" as const, label: "WhatsApp", enabled: interest.whatsapp, contact: interest.phone, at: interest.whatsappNotifiedAt, icon: MessageCircle }, { channel: "EMAIL" as const, label: "E-mail", enabled: interest.emailEnabled, contact: interest.email, at: interest.emailNotifiedAt, icon: Mail }].filter(channel => channel.enabled).map(channel => {
          const key = `${interest.id}:${channel.channel}`;
          return <div className="min-w-0 rounded-xl border border-line p-4" key={key}><p className="flex items-center gap-2 text-sm font-bold"><channel.icon aria-hidden="true" className="h-4 w-4 text-muted" />{channel.label}</p><p className="mt-1 break-all text-xs text-muted">{channel.contact || "Contato indisponível"}</p>{channel.at ? <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-pharma-green"><Check aria-hidden="true" className="h-4 w-4" />Contato registrado</p> : interest.available && channel.contact ? <div className="mt-3 flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center rounded-lg bg-brand px-3 text-xs font-bold text-white disabled:opacity-40" disabled={!!busy} onClick={() => void openDraft(interest, channel.channel)} type="button">Abrir {channel.label}</button><button className="min-h-11 rounded-lg border border-line px-3 text-xs font-bold disabled:opacity-40" disabled={!!busy || opened !== key} onClick={() => void markContact(interest, channel.channel)} type="button">{busy === interest.id ? "Aguarde…" : "Marcar contato feito"}</button></div> : <p className="mt-3 text-xs text-muted">O contato será liberado com disponibilidade válida.</p>}</div>;
        })}</div>
      </article>;
    }) : <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-10 text-center"><Bell aria-hidden="true" className="mx-auto h-8 w-8 text-muted/40" /><p className="mt-3 font-bold">{filter === "available" ? "Nenhum produto pronto para avisar" : "Nenhum aviso pendente"}</p><p className="mt-2 text-sm text-muted">Os novos pedidos de aviso aparecerão aqui.</p></div>}</div><div className="flex items-center justify-between gap-3"><button className="min-h-11 rounded-lg border border-line bg-white px-4 text-xs font-bold disabled:opacity-40" disabled={page <= 1 || !!busy} onClick={() => setPage(value => value - 1)} type="button">Anterior</button><span className="text-xs text-muted">{result.total} aviso(s) · página {result.page} de {Math.max(1, result.pages)}</span><button className="min-h-11 rounded-lg border border-line bg-white px-4 text-xs font-bold disabled:opacity-40" disabled={page >= result.pages || !!busy} onClick={() => setPage(value => value + 1)} type="button">Próxima</button></div></>}
  </div>;
}
