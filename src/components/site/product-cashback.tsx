import { Wallet } from "lucide-react";
import Link from "next/link";
import { productCashbackCents, type CashbackProduct } from "@/features/cashback/rules";
import { formatCurrency } from "@/lib/utils";

export function ProductCashback({ product, unitPriceCents, details = false }: {
  product: CashbackProduct; unitPriceCents: number; details?: boolean;
}) {
  const amount = productCashbackCents(product, unitPriceCents);
  if (!amount) return null;
  return (
    <div className="mt-3 min-w-0 text-emerald-800">
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-semibold leading-4" title="Cashback estimado por unidade, antes de usar saldo como desconto."><Wallet aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span><strong className="font-bold">{formatCurrency(amount / 100)}</strong> de cashback</span></span>
      {details ? <p className="mt-2 text-xs leading-5 text-muted">Para clientes conectados. Liberado apos conclusao e pagamento do pedido, para usar na proxima compra. <Link className="font-semibold text-emerald-800 underline" href="/cashback">Ver regras</Link></p> : null}
    </div>
  );
}
