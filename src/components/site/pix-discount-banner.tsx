import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, QrCode } from "lucide-react";
import { PIX_DISCOUNT_PERCENT } from "@/features/payments/pix-discount";

export function PixDiscountBanner() {
  return (
    <section aria-labelledby="pix-discount-title" className="bg-white px-4 pb-8 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-emerald-200 bg-[#edf8f5]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rotate-45 rounded-[4rem] border-[22px] border-emerald-900/[0.04]" />
        <div className="relative grid items-center gap-5 px-5 py-6 sm:grid-cols-[1fr_auto] sm:gap-x-8 sm:px-8 lg:grid-cols-[auto_1fr_auto] lg:gap-9 lg:py-7">
          <div className="sm:col-span-2 lg:col-span-1 lg:border-r lg:border-emerald-900/15 lg:pr-9">
            <Image alt="Wimifarma" src="/brand/logo-wimifarma.svg" width={180} height={64} className="h-auto w-32 lg:w-40" />
          </div>
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-800 sm:h-16 sm:w-16"><QrCode className="h-8 w-8 stroke-[1.5]" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800 sm:text-xs">Seu cuidado com mais economia</p>
              <h2 id="pix-discount-title" className="mt-1.5 text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl">Pague com Pix e ganhe <span className="text-brand">{PIX_DISCOUNT_PERCENT}% de desconto.</span></h2>
              <p className="mt-2 text-xs leading-5 text-emerald-950/75 sm:text-sm">Escolha Pix no checkout para aplicar o desconto nos produtos. Frete à parte.</p>
            </div>
          </div>
          <Link href="/catalogo?ordem=preco-asc" className="group inline-flex min-h-12 items-center justify-center gap-4 self-center rounded-full bg-emerald-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-900">Aproveitar no Pix <ArrowUpRight aria-hidden="true" className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" /></Link>
        </div>
      </div>
    </section>
  );
}
