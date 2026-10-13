"use client";

import { useId, useState } from "react";
import { Coins } from "lucide-react";
import { Input } from "@/components/ui/input";

export function WimiCoinsProductFields({ enabled = false, rateBps = 200 }: { enabled?: boolean; rateBps?: number }) {
  const id = useId();
  const [checked, setChecked] = useState(enabled);
  return <fieldset className="min-w-0 space-y-3 border-b border-line py-4"><legend className="flex items-center gap-2 text-sm font-bold text-ink"><Coins aria-hidden="true" className="h-4 w-4 text-amber-700" /> WimiCoins para membros do Club</legend><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input checked={checked} className="h-5 w-5 accent-brand" name="wimicoinsEnabled" onChange={event => setChecked(event.target.checked)} type="checkbox" /> Oferecer WimiCoins extras neste produto</label><div className="max-w-72"><label className="mb-2 block text-xs font-semibold" htmlFor={id}>Percentual extra (%)</label><Input defaultValue={rateBps / 100} id={id} max="100" min="0.01" name="wimicoinsPercent" required step="0.01" type="number" /></div><p className="text-xs leading-5 text-muted">Começa em 2%, editável. Um produto de R$ 20 a 2% gera 40 WimiCoins (R$ 0,40), antes de descontos. Crédito calculado sobre o valor pago, após conclusão. Itens com receita ou Farmácia Popular não participam.</p></fieldset>;
}
