"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Loader2, Save, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { couponDateInput, couponDates, couponTypeLabels, type CouponListItem, type CouponType } from "@/features/coupons/coupon";
import { couponCreateSchema, couponUpdateSchema } from "@/features/coupons/schema";

const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-ink";
const selectClass = "h-11 w-full min-w-0 cursor-pointer rounded-md border border-line bg-white px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60";

export function CouponForm({ coupon, onSave, onCancel, onBusyChange }: {
  coupon?: CouponListItem;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENTAGE");
  const [start, setStart] = useState(coupon ? couponDateInput(coupon.startsAt) : couponDateInput());
  const [end, setEnd] = useState(coupon ? couponDateInput(coupon.endsAt) : couponDateInput(couponDates({ durationDays: 7 }).endsAt));
  const [noExpiration, setNoExpiration] = useState(coupon ? !coupon.endsAt : false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const locked = Boolean(coupon && coupon.usesCount > 0);

  const invalid = (name: string) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `coupon-${name}-error` : undefined });
  const fieldError = (name: string) => errors[name] ? <span className="text-xs font-normal text-brand" id={`coupon-${name}-error`}>{errors[name][0]}</span> : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      code: form.get("code"), description: form.get("description"), type,
      value: type === "FREE_DELIVERY" ? 0 : form.get("value"),
      minOrderValue: form.get("minOrderValue"), maxUses: form.get("maxUses"),
      startsAt: start || null, endsAt: noExpiration ? null : end,
      isActive: form.get("isActive") === "on",
      ...(coupon ? { expectedUpdatedAt: coupon.updatedAt } : {}),
    };
    const parsed = (coupon ? couponUpdateSchema : couponCreateSchema).safeParse(payload);
    setErrors({}); setError("");
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors(fields as Record<string, string[]>);
      setError("Confira os campos destacados.");
      const first = Object.keys(fields)[0];
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true); onBusyChange(true);
    try { await onSave(payload); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Nao foi possivel salvar o cupom."); }
    finally { setBusy(false); onBusyChange(false); }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-5">
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {locked && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Este cupom ja possui usos. Codigo e condicoes de desconto estao preservados; validade, limite e status podem ser alterados.</p>}
      <fieldset disabled={busy} className="grid min-w-0 gap-4 disabled:opacity-70">
        <legend className="mb-3 flex items-center gap-2 text-sm font-bold"><TicketPercent className="h-4 w-4 text-brand" />Dados do cupom</legend>
        <label className={labelClass}>Codigo do cupom
          <Input {...invalid("code")} autoFocus name="code" defaultValue={coupon?.code ?? ""} maxLength={40} minLength={3} placeholder="Ex.: BEMVINDO10" required readOnly={locked} className="min-w-0 uppercase" />
          {fieldError("code")}
        </label>
        <label className={labelClass}>Descricao da campanha
          <Textarea name="description" defaultValue={coupon?.description ?? ""} maxLength={500} placeholder="Ex.: Campanha de cuidados pessoais" className="min-h-20 min-w-0 resize-y font-normal" />
        </label>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className={labelClass}>Tipo de desconto
            <select name="type" value={type} onChange={(event) => setType(event.target.value as CouponType)} disabled={locked} className={selectClass}>
              {Object.entries(couponTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className={labelClass}>{type === "PERCENTAGE" ? "Desconto (%)" : "Desconto (R$)"}
            <Input {...invalid("value")} name="value" key={type} defaultValue={type === "FREE_DELIVERY" ? "0" : coupon?.value ?? "10"} disabled={type === "FREE_DELIVERY"} readOnly={locked} inputMode="decimal" required={type !== "FREE_DELIVERY"} />
            {fieldError("value")}
          </label>
          <label className={labelClass}>Pedido minimo (R$)
            <Input {...invalid("minOrderValue")} name="minOrderValue" defaultValue={coupon?.minOrderValue ?? ""} inputMode="decimal" placeholder="Sem minimo" readOnly={locked} />
            {fieldError("minOrderValue")}
          </label>
          <label className={labelClass}>Limite total de usos
            <Input {...invalid("maxUses")} name="maxUses" type="number" min={Math.max(1, coupon?.usesCount ?? 0)} max={2147483647} step={1} defaultValue={coupon?.maxUses ?? ""} placeholder="Sem limite" />
            {fieldError("maxUses")}
          </label>
        </div>
      </fieldset>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 border-t border-line pt-4">
        <legend className="flex items-center gap-2 pr-3 text-sm font-bold"><CalendarDays className="h-4 w-4 text-brand" />Validade</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className={labelClass}>Data inicial
            <Input {...invalid("startsAt")} name="startsAt" type="date" min="2000-01-01" max="2100-12-31" value={start} onChange={(event) => setStart(event.target.value)} className="min-w-0 max-w-full" />
            {fieldError("startsAt")}
          </label>
          <label className={labelClass}>Data final
            <Input {...invalid("endsAt")} name="endsAt" type="date" min={start || "2000-01-01"} max="2100-12-31" value={noExpiration ? "" : end} onChange={(event) => setEnd(event.target.value)} disabled={noExpiration} required={!noExpiration} className="min-w-0 max-w-full" />
            {fieldError("endsAt")}
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={noExpiration} onChange={(event) => setNoExpiration(event.target.checked)} className="h-4 w-4 accent-brand" />Sem data final</label>
          <span className="text-xs text-muted">Valido ate 23h59 da data final (Brasilia).</span>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input name="isActive" type="checkbox" defaultChecked={coupon?.isActive ?? true} disabled={busy} className="h-4 w-4 accent-brand" />Cupom habilitado</label>
        {coupon && <span className="text-xs text-muted">{coupon.usesCount} usos registrados</span>}
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy}><span className="flex h-4 w-4 items-center">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</span>{busy ? "Salvando..." : coupon ? "Salvar alteracoes" : "Criar cupom"}</Button>
      </div>
    </form>
  );
}
