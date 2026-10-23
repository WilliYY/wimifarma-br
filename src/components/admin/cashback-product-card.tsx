"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Check, ImageIcon, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashbackPercentageInput } from "./cashback-percentage-input";
import type { CashbackListProduct } from "@/features/cashback/client";
import { productCashbackCents } from "@/features/cashback/rules";
import { cashbackProductEligible } from "@/features/cashback/client";
import { formatCurrency } from "@/lib/utils";

const rates = [200, 300, 500, 1000];

export function CashbackProductCard({ product, disabled, saving, onSave, selected = false, selectionFull = false, onSelect }: {
  product: CashbackListProduct;
  disabled: boolean;
  saving: boolean;
  onSave: (enabled: boolean, rateBps: number) => Promise<boolean>;
  selected?: boolean;
  selectionFull?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const [custom, setCustom] = useState(false);
  const restricted = !cashbackProductEligible(product);
  const price = Number(product.promotionalPrice ?? product.price);
  const priceAvailable = product.priceAvailable !== false && product.price !== null;
  const amount = priceAvailable ? productCashbackCents(product, Math.round(price * 100)) : null;
  const selectId = `cashback-rate-${product.id}`;

  async function saveCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("percent"));
    if (await onSave(true, Math.round(value * 100))) setCustom(false);
  }

  return (
    <article aria-label={product.name} aria-busy={saving} className={`grid min-w-0 gap-2 rounded-md border bg-white p-3 transition-colors lg:grid-cols-[minmax(0,1fr)_10rem_17rem] lg:items-center lg:gap-x-4 ${selected ? "border-brand bg-emerald-50/30" : product.cashbackEnabled && !restricted ? "border-emerald-200" : "border-line"}`}>
      <div className="flex min-w-0 items-start gap-3">
        {onSelect ? <label className="flex min-h-11 w-6 shrink-0 items-center justify-center"><input type="checkbox" aria-label={`Selecionar ${product.name}`} checked={selected} disabled={disabled || restricted || (selectionFull && !selected)} onChange={event => onSelect(event.target.checked)} className="h-5 w-5 accent-emerald-700 disabled:opacity-40" /></label> : null}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white p-1">
          {product.imageUrl ? <Image alt="" className="h-full w-full object-contain" height={44} width={44} src={product.imageUrl} /> : <ImageIcon className="h-5 w-5 text-muted" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold leading-5 text-ink">{product.name}</h3>
          <p className="break-words text-xs text-muted">{product.brand || "Sem marca"} · {product.status === "ACTIVE" ? "Publicado" : "Nao publicado"} · {priceAvailable ? formatCurrency(price) : "Preço indisponível"}</p>
        </div>
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 lg:justify-start">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold has-disabled:cursor-not-allowed">
          <input aria-label={`Ativar cashback em ${product.name}`} type="checkbox" checked={product.cashbackEnabled}
            className="h-5 w-5 shrink-0 cursor-pointer accent-emerald-700 disabled:cursor-not-allowed"
            disabled={disabled || (restricted && !product.cashbackEnabled)} onChange={(event) => { void onSave(event.target.checked, product.cashbackRateBps); }} />
          Cashback
        </label>
        {saving ? <span role="status" className="flex items-center gap-2 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span> :
          <span className={`text-xs font-semibold ${product.cashbackEnabled && !restricted ? "text-emerald-700" : "text-muted"}`}>
            {restricted ? "Nao elegivel" : product.cashbackEnabled ? `${product.cashbackRateBps / 100}% ativo` : "Desativado"}
          </span>}
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
        <label htmlFor={selectId} className="grid min-w-0 gap-1 text-xs font-semibold text-muted">Percentual
          <select id={selectId} aria-label={`Percentual de ${product.name}`} className="h-11 w-full min-w-0 cursor-pointer rounded-md border border-line bg-white px-2 text-sm text-ink outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || restricted || !product.cashbackEnabled}
            value={custom ? "custom" : String(product.cashbackRateBps)}
            onChange={(event) => { if (event.target.value === "custom") setCustom(true); else { setCustom(false); void onSave(true, Number(event.target.value)); } }}>
            {rates.map((rate) => <option key={rate} value={rate}>{rate / 100}%{rate === 200 ? " (padrao)" : ""}</option>)}
            {!rates.includes(product.cashbackRateBps) ? <option value={product.cashbackRateBps}>{product.cashbackRateBps / 100}%</option> : null}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <div className="min-w-0 pb-1 text-right text-emerald-700">
          <span className="flex items-center justify-end gap-1 text-base font-bold"><Wallet className="h-4 w-4 shrink-0" />{amount === null ? "—" : formatCurrency(amount / 100)}</span>
          <span className="block text-xs">{priceAvailable ? "por unidade" : "Sem preço atual"}</span>
        </div>
      </div>
      {custom && product.cashbackEnabled && !restricted ? <form className="flex min-w-0 items-end gap-2 lg:col-span-3" onSubmit={saveCustom}>
        <div className="min-w-0 flex-1"><CashbackPercentageInput defaultValue={product.cashbackRateBps / 100} disabled={disabled} label={`Percentual personalizado de ${product.name}`} name="percent" /></div>
        <Button className="h-11 w-11 shrink-0 cursor-pointer" aria-label={`Aplicar percentual em ${product.name}`} title="Aplicar percentual" disabled={disabled} size="icon" variant="success" type="submit"><Check className="h-4 w-4" /></Button>
      </form> : null}
      {restricted ? <p className="text-xs text-muted lg:col-span-3">Indisponivel para receita ou Farmacia Popular.</p> : null}
    </article>
  );
}
