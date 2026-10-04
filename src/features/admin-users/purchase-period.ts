import { z } from "zod";

export const purchaseMonthSchema = z.string().regex(/^(?:|20[2-9]\d-(?:0[1-9]|1[0-2]))$/).default("");

/** Calendar boundaries; PostgreSQL applies America/Sao_Paulo, not the browser timezone. */
export function purchasePeriod(month: string) {
  purchaseMonthSchema.parse(month);
  if (!month) return null;
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end: next };
}
