"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";

export function CashbackProductFields({ enabled = false }: { enabled?: boolean; rateBps?: number }) {
  const [edited, setEdited] = useState<boolean | null>(null);
  return (
    <fieldset className="min-w-0 space-y-4 border-y border-line py-4">
      <legend className="flex items-center gap-2 text-sm font-bold text-ink"><Wallet className="h-4 w-4 text-emerald-700" /> Cashback do produto</legend>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
        <input checked={edited ?? enabled} className="h-5 w-5 accent-emerald-700" name="cashbackEnabled" onChange={(event) => setEdited(event.target.checked)} type="checkbox" />
        Oferecer 1% de cashback neste produto
      </label>
      <input name="cashbackPercent" type="hidden" value="1" />
      <p className="text-xs leading-5 text-muted">Selecione manualmente produtos com boa margem. Saldo após pedido concluído e pago. Controlados e Farmácia Popular permanecem excluídos.</p>
    </fieldset>
  );
}
