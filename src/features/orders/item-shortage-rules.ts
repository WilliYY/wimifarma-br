import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";

export class ItemShortageError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}

type UnitSnapshot = { quantity: number; totalCents: number; cashbackDiscountCents: number; wimicoinsDiscountPoints: number; storeCreditDiscountCents: number; pixDiscountCents: number; cashbackEarnedCents: number; wimicoinsEarnedPoints: number };

export function allocateShortageUnits(item: UnitSnapshot) {
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000 || [item.totalCents, item.cashbackDiscountCents, item.wimicoinsDiscountPoints, item.storeCreditDiscountCents, item.pixDiscountCents, item.cashbackEarnedCents, item.wimicoinsEarnedPoints].some(value => !Number.isSafeInteger(value) || value < 0)) throw new ItemShortageError("Snapshot do item inválido.");
  const shares = (amount: number) => Array.from({ length: item.quantity }, (_, index) => Math.floor(amount / item.quantity) + (index < amount % item.quantity ? 1 : 0));
  const gross = shares(item.totalCents);
  let capacity = [...gross];
  const allocate = (amount: number) => {
    const parts = allocateCashbackDiscount(capacity, amount);
    capacity = capacity.map((value, index) => value - parts[index]);
    return parts;
  };
  const cashback = allocate(item.cashbackDiscountCents);
  const coins = allocate(item.wimicoinsDiscountPoints);
  const credit = allocate(item.storeCreditDiscountCents);
  const pix = allocate(item.pixDiscountCents);
  // Earnings are immutable snapshots; ordinal shares preserve their original total.
  const earnedCashback = shares(item.cashbackEarnedCents);
  const earnedCoins = shares(item.wimicoinsEarnedPoints);
  return gross.map((_, index) => ({ cashPaidCents: capacity[index], cashbackReturnCents: cashback[index], wimicoinsReturnPoints: coins[index], storeCreditReturnCents: credit[index], pixDiscountCents: pix[index], cashbackEarnedVoidedCents: earnedCashback[index], wimicoinsEarnedVoidedPoints: earnedCoins[index] }));
}

export function shortageInterval(total: number, quantity: number, existing: { startUnit: number; quantity: number }[]) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > total) throw new ItemShortageError("Quantidade indisponível inválida.", 422);
  const intervals = [...existing].sort((a, b) => a.startUnit - b.startUnit);
  let start = 0;
  for (const row of intervals) {
    if (row.startUnit < start || row.quantity < 1 || row.startUnit + row.quantity > total) throw new ItemShortageError("As faltas deste item precisam de revisão.");
    if (row.startUnit - start >= quantity) return start;
    start = row.startUnit + row.quantity;
  }
  if (start + quantity > total) throw new ItemShortageError("A quantidade excede as unidades disponíveis.");
  return start;
}
