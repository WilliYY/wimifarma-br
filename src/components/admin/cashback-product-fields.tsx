"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { CashbackPercentageInput } from "./cashback-percentage-input";

export function CashbackProductFields({ enabled = false, rateBps = 200 }: { enabled?: boolean; rateBps?: number }) {
  const [checked, setChecked] = useState(enabled);
  return (
    <fieldset className="min-w-0 space-y-4 border-y border-line py-4">
      <legend className="flex items-center gap-2 text-sm font-bold text-ink"><Wallet className="h-4 w-4 text-emerald-700" /> Cashback do produto</legend>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
        <input checked={checked} className="h-5 w-5 accent-emerald-700" name="cashbackEnabled" onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
        Oferecer cashback neste produto
      </label>
      <div className="max-w-72"><CashbackPercentageInput defaultValue={rateBps / 100} label="Percentual (%)" name="cashbackPercent" /></div>
      <p className="text-xs leading-5 text-muted">Saldo liberado apos pedido concluido e pagamento confirmado. Nao se aplica a itens com receita ou Farmacia Popular.</p>
    </fieldset>
  );
}
