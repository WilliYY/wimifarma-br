export function readSupplierPricingBasis(value: unknown, ean: string): number | null {
  if (!value || typeof value !== "object" || !("ean" in value) || value.ean !== ean || !("unitCostCents" in value)) return null;
  const cents = value.unitCostCents;
  return typeof cents === "number" && Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

export function isUnusualSupplierIncrease(before: number, after: number): boolean {
  const difference = after - before;
  return difference >= 1500 || (difference >= 50 && difference * 100 >= before * 30);
}
