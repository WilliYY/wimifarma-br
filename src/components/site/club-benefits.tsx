"use client";

import Link from "next/link";
import { Coins, Crown } from "lucide-react";
import { useClubSummary } from "@/hooks/use-club-summary";
import { formatCurrency } from "@/lib/utils";

export function ClubBenefits({ compact = false }: { compact?: boolean }) {
  const { summary, guest, loading, joining, error, join, refresh } = useClubSummary();
  return <section aria-label="Club Wimifarma e WimiCoins" className="mb-5 min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p className="flex items-center gap-2 text-sm font-bold text-amber-900"><Crown aria-hidden="true" className="h-5 w-5" /> Club Wimifarma · grátis</p>
    {summary?.member ? <>
      <p className="mt-3 flex flex-wrap items-baseline gap-2 text-3xl font-black text-ink"><Coins aria-hidden="true" className="h-6 w-6" /> {summary.balancePoints.toLocaleString("pt-BR")} <span className="text-sm">WimiCoins</span></p>
      <p className="mt-1 text-sm font-bold text-amber-900">{formatCurrency(Math.max(0, summary.balancePoints) / 100)} disponíveis em desconto</p>
      {!compact && <><p className="mt-3 text-sm text-muted">Pendente: {summary.pendingPoints.toLocaleString("pt-BR")} WimiCoins · {formatCurrency(summary.pendingPoints / 100)}</p><p className="mt-1 text-xs text-muted">Ganhos: {summary.lifetimeEarnedPoints.toLocaleString("pt-BR")} · Usados: {summary.lifetimeRedeemedPoints.toLocaleString("pt-BR")}</p></>}
    </> : <p className="mt-3 text-sm leading-6 text-muted">Assine gratuitamente e acumule WimiCoins extras em produtos participantes, além do cashback.</p>}
    <p className="mt-3 text-xs leading-5 text-muted">100 WimiCoins = R$ 1. Crédito após a compra concluída e paga. Use no checkout junto com seu cashback.</p>
    {loading && <p role="status" className="mt-3 text-sm text-muted">Consultando o Club…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {guest ? <Link className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/login?callbackUrl=%2Fminha-conta">Entrar para assinar grátis</Link> : !loading && !summary?.member && !error ? <button className="mt-3 min-h-11 rounded-lg bg-brand px-4 text-sm font-bold text-white disabled:opacity-60" disabled={joining} onClick={() => void join()} type="button">{joining ? "Confirmando adesão…" : "Assinar grátis"}</button> : null}
    {error && <button className="mt-3 min-h-11 text-sm font-bold text-brand underline" onClick={() => void refresh()} type="button">Atualizar Club</button>}
    {!compact && summary?.member && <div className="mt-5 border-t border-amber-200 pt-4"><h3 className="text-sm font-bold">Movimentações de WimiCoins</h3>{summary.transactions.length ? <ul className="mt-3 space-y-3">{summary.transactions.map(transaction => <li className="flex min-w-0 flex-wrap items-start justify-between gap-2 text-sm" key={transaction.id}><div className="min-w-0 flex-1"><p className="break-words">{transaction.description}</p><p className="text-xs text-muted">{new Date(transaction.createdAt).toLocaleDateString("pt-BR")}</p></div><span className="font-bold">{transaction.type === "ADJUSTMENT" ? "Uso confirmado: " : transaction.type === "DEBIT" ? "− " : "+ "}{transaction.amountPoints.toLocaleString("pt-BR")} WimiCoins</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Sem movimentações de WimiCoins por enquanto.</p>}</div>}
  </section>;
}
