import { orderQuantityLimit } from "./quantity";
import { z } from "zod";
import type { CartItem, CartProduct } from "@/components/site/cart-provider";
import { requiresPurchaseAssistance } from "./purchase-policy";
import { publicProductImageUrl } from "@/features/product-images/private-supplier-policy";

export const cartReviewRequestSchema = z.object({ productIds: z.array(z.string().trim().min(1).max(64)).min(1).max(30) }).strict().refine(input => new Set(input.productIds).size === input.productIds.length);
const productSchema = z.object({
  supplierDemandAllowed: z.boolean().optional(),
  catalogClassification: z.unknown().optional(),
  inventorySource: z.enum(["PHARMACY", "DISTRIBUTOR"]).optional(),
  id: z.string().min(1).max(64), slug: z.string(), name: z.string(),
  imageUrl: z.string().nullable(), category: z.string().nullable(),
  unitPriceCents: z.number().int().positive().max(1_000_000), originalPriceCents: z.number().int().nonnegative().nullable(),
  stock: z.number().int().nonnegative(), requiresPrescription: z.boolean(),
  prescriptionType: z.enum(["UNREVIEWED", "ORDINARY", "CONTROLLED", "ANTIMICROBIAL"]), isPopularPharmacy: z.boolean(),
});
const responseSchema = z.object({ data: z.object({ products: z.array(productSchema).max(30) }) });

export type CartReviewProposal = {
  source: CartItem[];
  entries: Array<{ before: CartItem; after: CartItem | null; reason: "UNAVAILABLE" | "ASSISTED" | "OUT_OF_STOCK" | null; changes: Array<keyof CartItem> }>;
  items: CartItem[];
  hasChanges: boolean;
};

// Classification is JSON from the catalog; object key order is not a change.
function comparableValue(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, nested) => nested && typeof nested === "object" && !Array.isArray(nested)
    ? Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)))
    : nested);
}

function comparableItem(item: CartItem): CartItem {
  return { ...item, imageUrl: publicProductImageUrl(item), inventorySource: item.inventorySource ?? "PHARMACY", supplierDemandAllowed: item.supplierDemandAllowed ?? false, prescriptionType: item.prescriptionType ?? "UNREVIEWED", catalogClassification: item.catalogClassification ?? null };
}

export function createCartReviewProposal(source: CartItem[], products: CartProduct[]): CartReviewProposal {
  const entries: CartReviewProposal["entries"] = source.map(before => {
    const product = products.find(current => current.id === before.id);
    if (!product) return { before, after: null, reason: "UNAVAILABLE", changes: [] };
    if (requiresPurchaseAssistance(product)) return { before, after: null, reason: "ASSISTED", changes: [] };
    if (product.stock < 1) return { before, after: null, reason: "OUT_OF_STOCK", changes: [] };
    const after = { ...product, imageUrl: publicProductImageUrl(product), quantity: Math.min(before.quantity, orderQuantityLimit(product)) };
    const previous = comparableItem(before);
    const current = comparableItem(after);
    const fields = Object.keys(current) as Array<keyof CartItem>;
    const changes = fields.filter(field => comparableValue(previous[field]) !== comparableValue(current[field]));
    return { before, after, reason: null, changes };
  });
  const hasChanges = entries.some(entry => entry.reason !== null || entry.changes.length > 0);
  return { source, entries, hasChanges, items: hasChanges ? entries.flatMap(entry => entry.after ? [entry.after] : []) : source };
}

export function reviewedCartItems(current: CartItem[], proposal: CartReviewProposal): CartItem[] | null {
  if (current !== proposal.source) return null;
  return proposal.items;
}

export async function requestCartReview(source: CartItem[], fetcher: (input: string, init?: RequestInit) => Promise<Response> = fetch): Promise<CartReviewProposal> {
  const errorMessage = "Não foi possível revisar o carrinho. Tente novamente.";
  let response: Response;
  try { response = await fetcher("/api/carrinho/revisao", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ productIds: source.map(item => item.id) }) }); }
  catch { throw new Error(errorMessage); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(errorMessage); }
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : errorMessage);
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || new Set(parsed.data.data.products.map(product => product.id)).size !== parsed.data.data.products.length || parsed.data.data.products.some(product => !source.some(item => item.id === product.id))) throw new Error(errorMessage);
  return createCartReviewProposal(source, parsed.data.data.products);
}
