import { z } from "zod";
import { cashbackRateSchema } from "@/features/cashback/rules";
import { supplierMarkupSchema } from "./catalog-operations";

export const BULK_PRODUCT_LIMIT = 50;
export const bulkProductChangesSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  category: z.string().trim().min(1).max(120).nullable().optional(),
  supplierMarkupBps: supplierMarkupSchema.optional(),
  cashbackEnabled: z.boolean().optional(),
  cashbackRateBps: cashbackRateSchema.optional(),
  wimicoinsEnabled: z.boolean().optional(),
  wimicoinsRateBps: cashbackRateSchema.optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Selecione pelo menos uma alteração.");
export const bulkProductUpdateSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(80), expectedUpdatedAt: z.iso.datetime() }).strict()).min(1).max(BULK_PRODUCT_LIMIT).refine(items => new Set(items.map(item => item.id)).size === items.length, "Produtos duplicados."),
  changes: bulkProductChangesSchema,
}).strict();
export type BulkProductChanges = z.infer<typeof bulkProductChangesSchema>;
export type BulkProductUpdate = z.infer<typeof bulkProductUpdateSchema>;
export function bulkRequiresAdmin(changes: BulkProductChanges) {
  return Object.keys(changes).some(key => key !== "status" && key !== "category");
}

/** Selection never follows an item hidden by origin, search, or another filter. */
export function visibleBulkSelection(selected: readonly string[], visible: readonly { id: string }[]) {
  const ids = new Set(visible.map(item => item.id));
  return selected.filter(id => ids.has(id)).slice(0, BULK_PRODUCT_LIMIT);
}
