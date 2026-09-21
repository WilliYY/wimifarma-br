"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { changePercentage } from "@/features/cashback/percentage";

export function CashbackPercentageInput({ name, label, defaultValue, disabled = false }: { name: string; label: string; defaultValue: number; disabled?: boolean }) {
  const id = useId();
  const [value, setValue] = useState(String(defaultValue));
  return <div className="min-w-0 space-y-2">
    <label className="block text-xs font-semibold text-ink" htmlFor={id}>{label}</label>
    <div className="flex min-w-0 items-center gap-1">
      <button aria-label="Diminuir cashback em 1 ponto percentual" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line disabled:opacity-40" disabled={disabled || Number(value) <= 0.01} onClick={() => setValue(changePercentage(value, -1))} type="button"><Minus className="h-4 w-4" /></button>
      <Input aria-describedby={`${id}-hint`} className="min-w-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" disabled={disabled} id={id} max="100" min="0.01" name={name} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setValue(changePercentage(value, event.key === "ArrowUp" ? 1 : -1)); } }} required step="0.01" type="number" value={value} />
      <button aria-label="Aumentar cashback em 1 ponto percentual" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line disabled:opacity-40" disabled={disabled || Number(value) >= 100} onClick={() => setValue(changePercentage(value, 1))} type="button"><Plus className="h-4 w-4" /></button>
    </div>
    <p className="text-[11px] font-normal leading-4 text-muted" id={`${id}-hint`}>Botões: 1 em 1%. Você também pode digitar decimais, como 2,35%.</p>
  </div>;
}
