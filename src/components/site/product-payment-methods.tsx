import Image from "next/image";
import { Banknote, CreditCard, ShieldCheck } from "lucide-react";
import { PIX_DISCOUNT_PERCENT } from "@/features/payments/pix-discount";

export function ProductPaymentMethods() {
  return (
    <div className="mt-4 space-y-3">
      <ul aria-label="Opções de pagamento" className="grid min-w-0 grid-cols-2 gap-2.5">
        <li className="col-span-2 flex min-w-0 items-center gap-3 rounded-2xl border border-pharma-green/20 bg-pharma-green/5 p-3.5 sm:p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white">
            <Image alt="" aria-hidden="true" height={44} src="/payments/pix-symbol.svg" unoptimized width={44} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong className="text-sm font-bold text-ink">Pix</strong>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-pharma-green">{PIX_DISCOUNT_PERCENT}% de desconto</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">Escolha Pix no checkout para aplicar o desconto nos produtos.</p>
          </div>
        </li>
        <li className="min-w-0 rounded-2xl border border-line bg-surface-subtle/50 p-3.5 sm:p-4">
          <CreditCard aria-hidden="true" className="mb-2 h-5 w-5 text-brand" />
          <strong className="block text-sm font-bold text-ink">Cartão</strong>
          <p className="mt-1 text-xs leading-5 text-muted">Confira as parcelas e condições no checkout.</p>
        </li>
        <li className="min-w-0 rounded-2xl border border-line bg-surface-subtle/50 p-3.5 sm:p-4">
          <Banknote aria-hidden="true" className="mb-2 h-5 w-5 text-brand" />
          <strong className="block text-sm font-bold text-ink">Dinheiro</strong>
          <p className="mt-1 text-xs leading-5 text-muted">Disponível na retirada ou entrega local.</p>
        </li>
      </ul>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-pharma-green" />
        <span>As opções e o total são confirmados na finalização. No cartão online, os dados são preenchidos no ambiente do provedor de pagamento.</span>
      </p>
    </div>
  );
}
