"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronDown, Coins, Crown } from "lucide-react";
import type { useClubSummary } from "@/hooks/use-club-summary";
import { formatCurrency } from "@/lib/utils";

export function ClubBenefits({ compact = false, club, onShowDetails }: {
  compact?: boolean;
  club: ReturnType<typeof useClubSummary>;
  onShowDetails?: () => void;
}) {
  const { summary, guest, loading, joining, error, join, refresh } = club;
  return <section aria-label="Club Wimifarma e WimiCoins" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-base font-black text-ink"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50"><Crown aria-hidden="true" className="h-4 w-4 text-amber-700" /></span>Club Wimifarma</h2>
      {summary?.member ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />Participando do Club</span> : (summary || guest) && <span className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-bold text-muted">Adesão grátis</span>}
    </div>
    {summary?.member ? <>
      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0"><p className="text-sm font-medium text-muted">WimiCoins disponíveis</p><p className="mt-2 break-all text-4xl font-black leading-none tracking-tight tabular-nums text-ink sm:text-5xl">{summary.balancePoints.toLocaleString("pt-BR")}</p></div>
        {!compact && <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3"><p className="text-xs font-medium text-amber-900">Em desconto nas próximas compras</p><p className="mt-1 break-all text-xl font-black tabular-nums text-amber-950">{formatCurrency(Math.max(0, summary.balancePoints) / 100)}</p></div>}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">Use seus WimiCoins junto com o cashback na próxima compra.</p>
      {!compact && <>
        <dl aria-label="Resumo de WimiCoins" className="mt-5 grid gap-3 rounded-xl bg-surface-subtle p-4 min-[480px]:grid-cols-3">
          <div className="flex min-w-0 items-baseline justify-between gap-3 min-[480px]:block"><dt className="shrink-0 text-xs leading-5 text-muted">A liberar</dt><dd className="min-w-0 break-all text-right text-lg font-black tabular-nums text-ink min-[480px]:mt-1 min-[480px]:text-left">{summary.pendingPoints.toLocaleString("pt-BR")}<span className="sr-only"> WimiCoins</span></dd></div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 min-[480px]:block"><dt className="shrink-0 text-xs leading-5 text-muted">Acumulados</dt><dd className="min-w-0 break-all text-right text-lg font-black tabular-nums text-ink min-[480px]:mt-1 min-[480px]:text-left">{summary.lifetimeEarnedPoints.toLocaleString("pt-BR")}</dd></div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 min-[480px]:block"><dt className="shrink-0 text-xs leading-5 text-muted">Já utilizados</dt><dd className="min-w-0 break-all text-right text-lg font-black tabular-nums text-ink min-[480px]:mt-1 min-[480px]:text-left">{summary.lifetimeRedeemedPoints.toLocaleString("pt-BR")}</dd></div>
        </dl>
      </>}
    </> : (summary || guest) && <div className="my-5"><p className="text-2xl font-black tracking-tight text-ink">Mais benefícios. Zero mensalidade.</p><p className="mt-2 text-sm leading-6 text-muted">Participe grátis e acumule WimiCoins extras em produtos participantes, além do cashback.</p></div>}
    {loading && <p role="status" className="mt-4 text-sm text-muted">{summary ? "Atualizando Club…" : "Consultando o Club…"}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-auto pt-4">
      {guest ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/login?callbackUrl=%2Fminha-conta">Entrar para assinar grátis<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : !loading && !summary?.member && !error ? <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60" disabled={joining} onClick={() => void join()} type="button">{joining ? "Confirmando adesão…" : "Participar grátis"}</button> : null}
      {compact && summary?.member && onShowDetails && <button className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={onShowDetails} type="button">Ver meus WimiCoins<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
      {error && <button className="min-h-11 text-sm font-bold text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => void refresh()} type="button">Atualizar Club</button>}
      {!compact && <details className="group rounded-xl border border-line bg-white"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-bold text-muted focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">Como usar seus WimiCoins<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180" /></summary><p className="border-t border-line px-3 py-3 text-sm leading-6 text-muted">100 WimiCoins = R$ 1. Crédito após a compra concluída e paga. Use no checkout junto com seu cashback.</p></details>}
    </div>
    {!compact && summary?.member && <div className="mt-6 border-t border-line pt-5"><h3 className="flex items-center gap-2 text-sm font-black text-ink"><Coins aria-hidden="true" className="h-4 w-4 text-amber-700" />Extrato de WimiCoins</h3>{summary.transactions.length ? <ul className="mt-2 divide-y divide-line">{summary.transactions.map(transaction => <li className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4 text-sm" key={transaction.id}><div className="min-w-0 flex-1 basis-40"><p className="break-words font-medium text-ink">{transaction.description}</p><p className="mt-1 text-xs text-muted">{new Date(transaction.createdAt).toLocaleDateString("pt-BR")}</p></div><span className="max-w-full break-words rounded-lg bg-surface-subtle px-2.5 py-1 text-xs font-bold tabular-nums text-ink">{transaction.type === "ADJUSTMENT" ? "Uso confirmado: " : transaction.type === "DEBIT" ? "− " : "+ "}{transaction.amountPoints.toLocaleString("pt-BR")} WimiCoins</span></li>)}</ul> : <p className="mt-3 rounded-xl bg-surface-subtle p-4 text-sm leading-6 text-muted">Seus ganhos e usos de WimiCoins aparecerão aqui.</p>}</div>}
  </section>;
}
