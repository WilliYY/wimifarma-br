import { Wallet } from "lucide-react";
import { productCashbackCents, type CashbackProduct } from "@/features/cashback/rules";
import { formatCurrency } from "@/lib/utils";

export function ProductCashback({ product, unitPriceCents, details = false }: {
  product: CashbackProduct; unitPriceCents: number; details?: boolean;
}) {
  const amount = productCashbackCents(product, unitPriceCents);
  if (!amount) return null;
  return (
    <div className="mt-3 min-w-0 text-emerald-800">
      <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-2 py-1 text-[11px] font-bold"><Wallet aria-hidden="true" className="h-3 w-3 shrink-0" />{(product.cashbackRateBps ?? 200) / 100}% cashback</span>
      <p className="mt-1 text-xs font-semibold leading-5">{formatCurrency(amount / 100)} de cashback por unidade</p>
      {details ? <p className="mt-1 text-xs leading-5 text-muted">Para clientes conectados. Liberado apos conclusao e pagamento do pedido. Resgate online ainda indisponivel.</p> : null}
    </div>
  );
}
