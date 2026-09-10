"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CashbackProductFields({ enabled = false, rateBps = 200 }: { enabled?: boolean; rateBps?: number }) {
  const [checked, setChecked] = useState(enabled);
  return (
    <fieldset className="min-w-0 space-y-4 border-y border-line py-4">
      <legend className="flex items-center gap-2 text-sm font-bold text-ink"><Wallet className="h-4 w-4 text-emerald-700" /> Cashback do produto</legend>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
        <input checked={checked} className="h-5 w-5 accent-emerald-700" name="cashbackEnabled" onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
        Oferecer cashback neste produto
      </label>
      <label className="grid max-w-48 gap-2 text-sm font-semibold text-ink">
        Percentual (%)
        <Input defaultValue={rateBps / 100} min="0.01" max="100" step="0.01" name="cashbackPercent" required type="number" />
      </label>
      <p className="text-xs leading-5 text-muted">Saldo liberado apos pedido concluido e pagamento confirmado. Nao se aplica a itens com receita ou Farmacia Popular.</p>
    </fieldset>
  );
}
