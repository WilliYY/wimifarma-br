/** Canonical GTIN-14: leading zeroes are equivalent; nonzero packaging indicators are not. */
export function normalizeGtin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return null;
  let sum = 0;
  for (let i = value.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(value[i]) * weight;
  if ((10 - sum % 10) % 10 !== Number(value.at(-1))) return null;
  return value.padStart(14, "0");
}

export function gtinVariants(raw: unknown): string[] {
  const canonical = normalizeGtin(raw);
  if (!canonical) return [];
  return [8, 12, 13, 14].filter(size => /^0*$/.test(canonical.slice(0, 14 - size))).map(size => canonical.slice(-size));
}
