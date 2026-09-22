import type { PrismaClient } from "@/generated/prisma/client";
import { merchantFeedItems, MERCHANT_FEED_OPEN, MERCHANT_FEED_CLOSE } from "./marketing";

const PAGE_SIZE = 500;
const select = { id: true, slug: true, name: true, brand: true, category: true, description: true, ean: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, status: true, activeIngredients: true, requiresPrescription: true, isPopularPharmacy: true, imageAsset: { select: { width: true, height: true, originalName: true } } } as const;

// Only publicly displayed information. Keyset pagination keeps memory bounded as the catalog grows.
export async function createMerchantFeedStream(db: Pick<PrismaClient, "product">) {
  const read = (after?: string) => db.product.findMany({ where: { status: "ACTIVE", deletedAt: null, ...(after ? { id: { gt: after } } : {}) }, select, orderBy: { id: "asc" }, take: PAGE_SIZE });
  let rows = await read(); // Fail before sending a 200 when the database is unavailable.
  let canceled = false;
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(encoder.encode(MERCHANT_FEED_OPEN)); },
    async pull(controller) {
      try {
        // A whole page may be ineligible. Continue until there is output or EOF,
        // otherwise a reader can wait forever for a pull that enqueued nothing.
        while (!canceled) {
          const chunk = merchantFeedItems(rows.map(row => ({ ...row, price: row.price.toString(), promotionalPrice: row.promotionalPrice?.toString() ?? null })));
          const lastPage = rows.length < PAGE_SIZE;
          if (chunk.items) controller.enqueue(encoder.encode(chunk.items));
          if (lastPage) { controller.enqueue(encoder.encode(MERCHANT_FEED_CLOSE)); controller.close(); return; }
          rows = await read(rows[rows.length - 1].id);
          if (chunk.items) return;
        }
      } catch { if (!canceled) controller.error(new Error("Catálogo temporariamente indisponível.")); }
    },
    cancel() { canceled = true; },
  });
}
