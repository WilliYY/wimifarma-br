"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Coins, Crown } from "lucide-react";
import type { useClubSummary } from "@/hooks/use-club-summary";
import { formatCurrency } from "@/lib/utils";

export function ClubBenefits({ compact = false, club, onShowDetails }: {
  compact?: boolean;
  club: ReturnType<typeof useClubSummary>;
  onShowDetails?: () => void;
}) {
  const { summary, guest, loading, joining, error, join, refresh } = club;
  return <section aria-label="Club Wimifarma e WimiCoins" className="flex h-full min-w-0 flex-col rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-black text-amber-950"><Crown aria-hidden="true" className="h-5 w-5 text-amber-700" />Club Wimifarma</h2>
      {summary?.member ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />Participando do Club</span> : (summary || guest) && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-900">Adesão grátis</span>}
    </div>
    {summary?.member ? <>
      <div className="my-5 flex min-w-0 items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700"><Coins aria-hidden="true" className="h-6 w-6" /></span>
        <div className="min-w-0"><p className="break-all text-4xl font-black leading-none tracking-tight text-ink sm:text-5xl">{summary.balancePoints.toLocaleString("pt-BR")}</p><p className="mt-2 text-sm font-bold text-amber-950">WimiCoins disponíveis</p></div>
      </div>
      <p className="text-sm leading-6 text-amber-950">Use seus WimiCoins junto com o cashback na próxima compra.</p>
      {!compact && <>
        <p className="mt-2 text-sm font-bold text-amber-900">{formatCurrency(Math.max(0, summary.balancePoints) / 100)} disponíveis em desconto</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-amber-200 pt-5 sm:grid-cols-3">
          <div><dt className="text-xs text-amber-900">A liberar</dt><dd className="mt-1 break-all text-lg font-black">{summary.pendingPoints.toLocaleString("pt-BR")} <span className="text-xs font-medium">WimiCoins</span></dd></div>
          <div><dt className="text-xs text-amber-900">Acumulados</dt><dd className="mt-1 break-all text-lg font-black">{summary.lifetimeEarnedPoints.toLocaleString("pt-BR")}</dd></div>
          <div><dt className="text-xs text-amber-900">Já utilizados</dt><dd className="mt-1 break-all text-lg font-black">{summary.lifetimeRedeemedPoints.toLocaleString("pt-BR")}</dd></div>
        </dl>
      </>}
    </> : (summary || guest) && <div className="my-5"><p className="text-2xl font-black tracking-tight text-ink">Mais benefícios. Zero mensalidade.</p><p className="mt-2 text-sm leading-6 text-amber-950">Participe grátis e acumule WimiCoins extras em produtos participantes, além do cashback.</p></div>}
    {loading && <p role="status" className="mt-4 text-sm text-amber-900">{summary ? "Atualizando Club…" : "Consultando o Club…"}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-auto pt-4">
      {guest ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/login?callbackUrl=%2Fminha-conta">Entrar para assinar grátis<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : !loading && !summary?.member && !error ? <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60" disabled={joining} onClick={() => void join()} type="button">{joining ? "Confirmando adesão…" : "Participar grátis"}</button> : null}
      {compact && summary?.member && onShowDetails && <button className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-amber-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700" onClick={onShowDetails} type="button">Ver meus WimiCoins<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
      {error && <button className="min-h-11 text-sm font-bold text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => void refresh()} type="button">Atualizar Club</button>}
      {!compact && <p className="mt-3 text-xs leading-5 text-amber-900">100 WimiCoins = R$ 1. Crédito após a compra concluída e paga. Use no checkout junto com seu cashback.</p>}
    </div>
    {!compact && summary?.member && <div className="mt-6 border-t border-amber-200 pt-5"><h3 className="text-base font-black text-ink">Extrato de WimiCoins</h3>{summary.transactions.length ? <ul className="mt-4 divide-y divide-amber-200">{summary.transactions.map(transaction => <li className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-4 text-sm" key={transaction.id}><div className="min-w-0 flex-1"><p className="break-words font-medium">{transaction.description}</p><p className="mt-1 text-xs text-amber-900">{new Date(transaction.createdAt).toLocaleDateString("pt-BR")}</p></div><span className="max-w-full break-words font-bold">{transaction.type === "ADJUSTMENT" ? "Uso confirmado: " : transaction.type === "DEBIT" ? "− " : "+ "}{transaction.amountPoints.toLocaleString("pt-BR")} WimiCoins</span></li>)}</ul> : <p className="mt-3 text-sm text-amber-900">Seus ganhos e usos de WimiCoins aparecerão aqui.</p>}</div>}
  </section>;
}
