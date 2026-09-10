export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";
export type CouponStatus = "active" | "scheduled" | "expired" | "paused" | "exhausted";
export const couponStatusLabels: Record<CouponStatus, string> = {
  active: "Ativo", scheduled: "Agendado", expired: "Expirado", paused: "Pausado", exhausted: "Limite atingido",
};
export const couponTypeLabels: Record<CouponType, string> = {
  PERCENTAGE: "Percentual", FIXED_AMOUNT: "Valor fixo", FREE_DELIVERY: "Frete gratis",
};

export interface CouponListItem {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: string;
  minOrderValue: string | null;
  maxUses: number | null;
  usesCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedPrizes: number;
}

export function couponDateInput(value: string | Date | null = new Date()): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function isValidCouponDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function couponDates(input: { startsAt?: string | null; endsAt?: string | null; durationDays?: number }) {
  const startsAt = input.startsAt === null ? null : new Date(`${input.startsAt ?? couponDateInput()}T00:00:00.000-03:00`);
  // Keep legacy duration-based creation; explicit null means no expiration.
  const endsAt = input.endsAt === null ? null : input.endsAt !== undefined
    ? new Date(`${input.endsAt}T23:59:59.999-03:00`)
    : new Date((startsAt ?? new Date(`${couponDateInput()}T00:00:00.000-03:00`)).getTime() + (input.durationDays ?? 7) * 86400000 - 1);
  return { startsAt, endsAt };
}

export function getCouponStatus(coupon: Pick<CouponListItem, "startsAt" | "endsAt" | "isActive" | "usesCount" | "maxUses">, now = Date.now()): CouponStatus {
  if (!coupon.isActive) return "paused";
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return "expired";
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return "exhausted";
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return "scheduled";
  return "active";
}

export function couponDeleteBlock(coupon: Pick<CouponListItem, "usesCount" | "linkedPrizes">) {
  if (coupon.usesCount > 0) return "Este cupom possui usos registrados. Pause o cupom para preservar o historico.";
  if (coupon.linkedPrizes > 0) return "Este cupom esta vinculado a premios da roleta. Pause o cupom para preservar os vinculos.";
  return null;
}
