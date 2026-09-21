// One click changes one percentage point; storage remains in basis points.
export function changePercentage(value: string, direction: -1 | 1) {
  const parsed = Number(value.replace(",", "."));
  const current = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  return String(Math.min(10_000, Math.max(1, current + direction * 100)) / 100);
}
