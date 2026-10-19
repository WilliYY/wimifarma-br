"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Mail, MessageCircle, RefreshCw, X } from "lucide-react";
import { productDisplayName } from "@/features/products/display-name";

type Interest = {
  id: string; status: string; whatsapp: boolean; emailEnabled: boolean;
  expiresAt: string; available: boolean;
  product: { id: string; name: string; slug: string };
};

function statusLabel(interest: Interest) {
  if (interest.status === "CANCELED") return "Aviso cancelado";
  if (interest.status === "EXPIRED") return "Aviso encerrado · solicite novamente no produto";
  if (interest.status === "NOTIFIED") return "Contato concluído pela equipe";
  return interest.available ? "Disponível para conferir" : "Aguardando disponibilidade";
}

export function CustomerRestockPanel() {
  const [interests, setInterests] = useState<Interest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [canceling, setCanceling] = useState<string | null>(null);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setInterests(null);
    async function load() {
      try {
        const response = await fetch("/api/minha-conta/avisos-estoque", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.interests)) throw new Error(payload.message || "Não foi possível consultar seus avisos.");
        if (!controller.signal.aborted) setInterests(payload.interests);
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Tente novamente em instantes."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  async function cancel(id: string) {
    if (canceling) return;
    const controller = new AbortController(); mutation.current = controller;
    setCanceling(id); setError(null);
    try {
      const response = await fetch("/api/minha-conta/avisos-estoque", { method: "DELETE", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível cancelar o aviso.");
      if (!controller.signal.aborted) { setRevision(value => value + 1); window.dispatchEvent(new Event("wimifarma:restock-updated")); }
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Confira a lista antes de tentar novamente."); }
    finally { if (!controller.signal.aborted) setCanceling(null); }
  }

  return <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black"><Bell aria-hidden="true" className="h-5 w-5 text-brand" />Meus avisos</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted">Os produtos que você quer acompanhar. Cada aviso vale por 30 dias, sem reservar estoque.</p></div><button aria-label="Atualizar meus avisos" className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-xs font-bold disabled:opacity-40" disabled={loading || !!canceling} onClick={() => setRevision(value => value + 1)} type="button"><RefreshCw aria-hidden="true" className="h-4 w-4" />Atualizar</button></div>
    {loading && <p className="mt-5 text-sm text-muted" role="status">Carregando seus avisos…</p>}
    {error && <p className="mt-5 text-sm text-red-700" role="alert">{error}</p>}
    {interests && <div className="mt-6 space-y-3">{interests.length ? interests.map(interest => <article className="flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-xl border border-line p-4" key={interest.id}><div className="min-w-0 flex-1"><p className={`mb-2 text-xs font-bold ${interest.available && interest.status === "WAITING" ? "text-pharma-green" : "text-muted"}`}>{statusLabel(interest)}</p><Link className="break-words text-sm font-bold text-ink hover:text-brand" href={`/produto/${interest.product.slug}`}>{productDisplayName(interest.product.name)}</Link><p className="mt-2 flex flex-wrap gap-3 text-xs text-muted">{interest.whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />WhatsApp</span>}{interest.emailEnabled && <span className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="h-3.5 w-3.5" />E-mail</span>}</p><p className="mt-2 text-xs text-muted">{interest.status === "WAITING" ? "Válido até " : "Validade original: "}{new Date(interest.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div>{interest.status === "WAITING" && <button aria-label={`Cancelar aviso de ${interest.product.name}`} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-muted hover:bg-brand-soft hover:text-brand disabled:opacity-40" disabled={!!canceling} onClick={() => void cancel(interest.id)} type="button"><X aria-hidden="true" className="h-4 w-4" />{canceling === interest.id ? "Cancelando…" : "Cancelar"}</button>}</article>) : <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center"><Bell aria-hidden="true" className="mx-auto h-7 w-7 text-muted/50" /><p className="mt-3 text-sm font-bold">Você ainda não tem avisos ativos</p><p className="mt-2 text-xs leading-5 text-muted">Quando um produto estiver indisponível, escolha “Avise-me quando chegar”.</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-brand underline" href="/catalogo">Explorar produtos</Link></div>}</div>}
  </section>;
}
