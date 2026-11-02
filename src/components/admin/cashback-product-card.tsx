"use client";

import Image from "next/image";
import { ImageIcon, Loader2, Wallet } from "lucide-react";
import type { CashbackListProduct } from "@/features/cashback/client";
import { calculateCashbackCents } from "@/features/cashback/rules";
import { cashbackProductEligible } from "@/features/cashback/client";
import { formatCurrency } from "@/lib/utils";


export function CashbackProductCard({ product, disabled, saving, onSave, selected = false, selectionFull = false, onSelect }: {
  product: CashbackListProduct;
  disabled: boolean;
  saving: boolean;
  onSave: (enabled: boolean, rateBps: number) => Promise<boolean>;
  selected?: boolean;
  selectionFull?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const restricted = !cashbackProductEligible(product);
  const price = Number(product.promotionalPrice ?? product.price);
  const priceAvailable = product.priceAvailable !== false && product.price !== null;
  const amount = priceAvailable ? product.cashbackEnabled && !restricted ? calculateCashbackCents(Math.round(price * 100), product.cashbackRateBps) : 0 : null;
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
            disabled={disabled || (restricted && !product.cashbackEnabled)} onChange={(event) => { void onSave(event.target.checked, 100); }} />
          Cashback
        </label>
        {saving ? <span role="status" className="flex items-center gap-2 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span> :
          <span className={`text-xs font-semibold ${product.cashbackEnabled && !restricted ? "text-emerald-700" : "text-muted"}`}>
            {restricted ? "Nao elegivel" : product.cashbackEnabled ? `${product.cashbackRateBps / 100}% ativo` : "Desativado"}
          </span>}
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
        <span className="text-xs font-semibold text-muted">Cashback selecionado: 1%</span>
        <div className="min-w-0 pb-1 text-right text-emerald-700">
          <span className="flex items-center justify-end gap-1 text-base font-bold"><Wallet className="h-4 w-4 shrink-0" />{amount === null ? "—" : formatCurrency(amount / 100)}</span>
          <span className="block text-xs">{priceAvailable ? "por unidade" : "Sem preço atual"}</span>
        </div>
      </div>
      {restricted ? <p className="text-xs text-muted lg:col-span-3">Indisponivel para receita ou Farmacia Popular.</p> : null}
    </article>
  );
}
