import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getPrisma } from "../src/lib/prisma";
import { SupplierCatalogOfferSchema } from "../src/features/supplier-catalog/schema";
import { gtinVariants, normalizeGtin, resolveSupplierOffer } from "../src/features/supplier-catalog/commerce";
import { lockProductCatalog } from "../src/features/products/mutations";
import { buildProductSearchText } from "../src/features/products/public-search";

const rowSchema = z.object({
  ean: z.string().refine(value => normalizeGtin(value) !== null),
  name: z.string().trim().min(5).max(191), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  brand: z.string().trim().min(1).max(150), description: z.string().trim().min(80).max(6000),
  category: z.string().trim().min(1).max(100), activeIngredients: z.array(z.string().max(100)).min(1).max(10),
  prescriptionType: z.literal("ORDINARY"), requiresPrescription: z.literal(true),
  offers: z.array(z.record(z.string(), z.unknown())).min(1).max(3),
});
const fileSchema = z.object({ products: z.array(rowSchema).min(1).max(20) });

async function main() {
  const args = process.argv.slice(2);
  const value = (key: string) => args[args.indexOf(key) + 1];
  if (!args.includes("--file") || !args.includes("--actor-id")) throw new Error("Use --file <private.json> --actor-id <ADMIN> [--apply]. Dry-run is the default.");
  const input = fileSchema.parse(JSON.parse(await readFile(value("--file"), "utf8")));
  const db = getPrisma();
  try {
    const plans = await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      const actor = await tx.user.findFirst({ where: { id: value("--actor-id"), role: "ADMIN", isActive: true }, select: { id: true } });
      if (!actor) throw new Error("Active ADMIN actor required.");
      const plans = [];
      const seen = new Set<string>();
      for (const row of input.products) {
        const eanNormalized = normalizeGtin(row.ean)!;
        if (seen.has(eanNormalized)) throw new Error("Duplicate GTIN in import file.");
        seen.add(eanNormalized);
        const parsedOffers = row.offers.map(offer => SupplierCatalogOfferSchema.parse({ ...offer, productId: "pilot-validation", eanNormalized: row.ean }));
        if (new Set(parsedOffers.map(offer => offer.supplier)).size !== parsedOffers.length) throw new Error("Duplicate supplier offer.");
        if (parsedOffers.some(offer => offer.retailCeilingCents === null)) throw new Error("Verified retail ceiling required for every prescription offer.");
        const commerceOffers = parsedOffers.map(offer => ({ ...offer, id: offer.supplier, eanNormalized, reservedQuantity: 0, committedQuantity: 0 }));
        const best = resolveSupplierOffer({ eanNormalized, requiresPrescription: true, supplierOffers: commerceOffers });
        if (!best) throw new Error(`No current, permitted offer for ${row.ean}.`);
        const current = await tx.product.findFirst({ where: { OR: [{ eanNormalized }, { ean: { in: gtinVariants(row.ean) } }] } });
        if (current) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${current.id} FOR UPDATE`;
        if (current && (current.deletedAt || current.inventorySource !== "DISTRIBUTOR")) throw new Error(`EAN ${row.ean} exists outside the supplier pilot; preserve the physical product and review manually.`);
        if (current && (current.name !== row.name || current.brand !== row.brand || current.prescriptionType !== "ORDINARY")) throw new Error(`Identity mismatch for ${row.ean}; manual review required.`);
        for (const offer of parsedOffers) {
          const previous = current ? await tx.supplierCatalogOffer.findUnique({ where: { productId_supplier: { productId: current.id, supplier: offer.supplier } } }) : null;
          if (previous && previous.observedAt > new Date(offer.observedAt)) throw new Error("A newer offer is already stored; refusing stale import.");
          if (previous && previous.externalCode !== offer.externalCode) throw new Error("Supplier identity changed; review manually.");
        }
        const summary = { ean: row.ean, name: row.name, slug: current?.slug ?? row.slug, priceCents: best.unitPriceCents, action: current ? "UPDATE_OFFERS" : "CREATE", publicPhoto: false };
        plans.push(summary);
        if (!args.includes("--apply")) continue;
        const { offers: _offers, ...identity } = row;
        void _offers;
        const product = current ?? await tx.product.create({ data: { ...identity, eanNormalized, inventorySource: "DISTRIBUTOR", status: "ACTIVE", stock: 0,
          price: (best.unitPriceCents / 100).toFixed(2), cashbackEnabled: false, wimicoinsEnabled: false, searchText: buildProductSearchText({ ...identity, searchTerms: [] }) } });
        for (const offer of parsedOffers) {
          const { replenishAllocation: _replenish, ...fields } = offer;
          void _replenish;
          const data = { ...fields, productId: product.id, eanNormalized, observedAt: new Date(offer.observedAt), validUntil: new Date(offer.validUntil) };
          await tx.supplierCatalogOffer.upsert({ where: { productId_supplier: { productId: product.id, supplier: offer.supplier } }, create: data, update: { ...data, revision: { increment: 1 } } });
        }
        await tx.auditLog.create({ data: { action: "SUPPLIER_PILOT_IMPORTED", entity: "Product", entityId: product.id, userId: actor.id, metadata: { ean: row.ean, suppliers: parsedOffers.map(offer => offer.supplier), created: !current } } });
      }
      return plans;
    }, { timeout: 20000 });
    console.log(JSON.stringify({ applied: args.includes("--apply"), products: plans }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; });
