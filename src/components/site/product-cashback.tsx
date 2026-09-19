import { Wallet } from "lucide-react";
import Link from "next/link";
import { productCashbackCents, type CashbackProduct } from "@/features/cashback/rules";
import { formatCurrency } from "@/lib/utils";

export function ProductCashback({ product, unitPriceCents, details = false }: {
  product: CashbackProduct; unitPriceCents: number; details?: boolean;
}) {
  const amount = productCashbackCents(product, unitPriceCents);
  if (!amount) return null;
  if (details) return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"><Wallet aria-hidden="true" className="h-4 w-4" /></span>
      <div>
        <p className="text-sm font-semibold">{formatCurrency(amount / 100)} de cashback <span className="text-xs font-normal">estimado por unidade</span></p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">Para clientes conectados, após a conclusão e o pagamento do pedido. Use na próxima compra. <Link className="font-bold underline underline-offset-2 focus-visible:outline-brand" href="/cashback">Ver regras</Link></p>
      </div>
    </div>
  );
  return (
    <div className="mt-3 min-w-0 text-emerald-800">
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-semibold leading-4" title="Cashback estimado por unidade, antes de usar saldo como desconto."><Wallet aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span><strong className="font-bold">{formatCurrency(amount / 100)}</strong> de cashback</span></span>
    </div>
  );
}
