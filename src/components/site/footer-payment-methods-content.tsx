import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CreditCard, Truck } from "lucide-react";
import type { PublicPaymentBrand } from "@/features/payments/payment-brands";
import { PIX_DISCOUNT_PERCENT } from "@/features/payments/pix-discount";
import { FooterPaymentBrand } from "./footer-payment-brand";

export function FooterPaymentMethodsContent({ brands = [], fromMercadoPago = false }: { brands?: PublicPaymentBrand[]; fromMercadoPago?: boolean }) {
  return (
    <div className="min-h-72">
      <h2 className="text-sm font-bold">Formas de pagamento</h2>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-pharma-green/20 bg-pharma-green/5 px-3"><Image alt="" aria-hidden="true" className="h-11 w-11 shrink-0" height={44} src="/payments/pix-symbol.svg" unoptimized width={44} /><span><strong className="block text-sm font-bold text-ink">{PIX_DISCOUNT_PERCENT}% de desconto</strong><span className="block text-[11px] font-semibold text-pharma-green">Escolhendo Pix no checkout</span></span></span>
        {!brands.length && <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold"><CreditCard aria-hidden="true" className="h-5 w-5 text-ink/65" />Cartão</span>}
      </div>
      {brands.length > 0 && <ul className="mt-3 flex flex-wrap gap-2" aria-label="Bandeiras disponibilizadas pelo Mercado Pago">{brands.map(brand => <li key={`${brand.id}:${brand.image ?? "name"}`}><FooterPaymentBrand brand={brand} /></li>)}</ul>}
      <p className="mt-3 max-w-sm text-xs leading-5 text-ink/75">{fromMercadoPago && brands.length ? "Bandeiras disponibilizadas pelo Mercado Pago. A opção final e as condições são confirmadas no checkout." : "Confira as opções e as condições disponíveis ao finalizar sua compra."}</p>
      <Link className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-ink/75 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4" href="/delivery"><Truck aria-hidden="true" className="h-4 w-4 text-brand" />Consulte entrega e retirada<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
  );
}
