import { z } from "zod";

export const productTrashMutationSchema = z.object({ expectedUpdatedAt: z.string().datetime({ offset: true }) });

/** Calendar months, not 60 days; clamp December 31 to February's last day. */
export function productPurgeDate(deletedAt: Date) {
  const result = new Date(deletedAt);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 2);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
