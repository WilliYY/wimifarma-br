"use client";

import Image from "next/image";
import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";
import { useClubSummary } from "@/hooks/use-club-summary";

export function ClubBanner() {
  const { summary, guest, loading, joining, error, join, refresh } = useClubSummary();
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";
  return <section aria-labelledby="club-banner-title" className="bg-white px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl items-center gap-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 md:grid-cols-[1fr_2fr] md:p-10">
    <div className="flex min-w-0 flex-col items-center gap-3"><Crown aria-hidden="true" className="h-10 w-10 text-amber-500" /><Image alt="Wimifarma" className="h-auto w-full max-w-60" height={100} src="/brand/logo-wimifarma.svg" width={280} /></div>
    <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand"><Sparkles aria-hidden="true" className="h-4 w-4" /> Mais benefícios para você</p><h2 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl" id="club-banner-title">Club Wimifarma. <span className="text-brand">Assinatura grátis.</span></h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Ganhe WimiCoins extras em produtos participantes e acompanhe seus benefícios. Seu cashback continua separado e você pode usar os dois na compra.</p><p className="mt-2 text-xs font-bold text-amber-900">100 WimiCoins = R$ 1 em desconto</p><div className="mt-5 flex flex-wrap gap-3">{summary?.member ? <Link className={buttonClass} href="/minha-conta?tab=beneficios">Ver meus WimiCoins</Link> : guest ? <Link className={buttonClass} href="/login?callbackUrl=%2Fminha-conta">Entrar e assinar grátis</Link> : <button className={buttonClass} disabled={loading || joining || Boolean(error)} onClick={() => void join()} type="button">{loading ? "Consultando Club…" : joining ? "Confirmando adesão…" : "Assinar grátis"}</button>}</div>{error && <div className="mt-3 text-sm"><p role="alert" className="text-red-700">{error}</p><button className="min-h-11 font-bold text-brand underline" onClick={() => void refresh()} type="button">Tentar consulta novamente</button></div>}</div>
  </div></section>;
}
