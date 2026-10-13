"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import { useClubSummary } from "@/hooks/use-club-summary";

export function ClubBanner() {
  const { summary, guest, loading, joining, error, join, refresh } = useClubSummary();
  const buttonClass = "group inline-flex min-h-12 items-center justify-between gap-5 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-wait disabled:opacity-70";
  const arrow = <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />;

  return (
    <section aria-labelledby="club-banner-title" className="bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-2xl bg-brand md:grid-cols-[1.15fr_0.85fr]">
        <div className="relative z-10 min-w-0 px-6 pt-7 sm:px-9 sm:pt-9 md:pb-9 lg:px-12 lg:py-11">
          <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white">
            <Crown aria-hidden="true" className="h-4 w-4" /> Club Wimifarma
          </p>
          <h2 className="mt-5 max-w-xl text-[2rem] font-black leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]" id="club-banner-title">
            Cuidar de você<br />rende mais.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white sm:text-base">
            Acumule WimiCoins em produtos participantes e use junto com seu cashback nas próximas compras.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            {summary?.member ? (
              <Link className={buttonClass} href="/minha-conta?tab=beneficios">Ver meus benefícios {arrow}</Link>
            ) : guest ? (
              <Link className={buttonClass} href="/login?callbackUrl=%2Fminha-conta">Entrar para o Club {arrow}</Link>
            ) : (
              <button className={buttonClass} disabled={loading || joining || Boolean(error)} onClick={() => void join()} type="button">
                {loading ? "Consultando Club…" : joining ? "Confirmando adesão…" : "Fazer parte grátis"} {arrow}
              </button>
            )}
            <p className="text-xs font-medium text-white">Grátis, sem mensalidade.</p>
          </div>
          {error && (
            <div className="mt-4 max-w-md text-sm text-white">
              <p role="alert">{error}</p>
              <button className="min-h-11 font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => void refresh()} type="button">Tentar novamente</button>
            </div>
          )}
        </div>

        <div aria-label="Cartão do Club Wimifarma" className="relative flex min-w-0 items-center justify-center px-8 pb-9 pt-10 sm:px-12 md:px-8 md:py-10 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 bottom-0 text-[8rem] font-black leading-none tracking-tighter text-white/10 select-none sm:text-[10rem] lg:text-[13rem]">CLUB</div>
          <div className="relative w-full max-w-[22rem]">
            <div className="relative z-10 aspect-[1.6] -rotate-[5deg] rounded-2xl border border-white/15 bg-ink p-4 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)] sm:p-6 motion-reduce:rotate-0">
              <Image alt="Wimifarma" className="h-auto w-[58%] brightness-0 invert" height={100} src="/brand/logo-wimifarma.svg" width={280} />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs">WimiCoins + cashback</p>
              <p className="mt-4 text-3xl font-black leading-none tracking-tight text-white sm:mt-6 sm:text-5xl">Club.</p>
            </div>
            <div aria-hidden="true" className="absolute -bottom-4 -right-6 z-20 flex h-24 w-24 rotate-[8deg] flex-col items-center justify-center gap-1.5 rounded-full border-[5px] border-amber-100 bg-amber-200 text-amber-950 shadow-[0_8px_16px_rgba(0,0,0,0.18),inset_0_0_0_2px_var(--color-amber-300)] sm:-bottom-6 sm:-right-4 sm:h-28 sm:w-28 motion-reduce:rotate-0">
              <Crown className="h-8 w-8 stroke-[1.5] sm:h-9 sm:w-9" />
              <span className="text-[9px] font-black tracking-wider sm:text-[10px]">WIMICOINS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
