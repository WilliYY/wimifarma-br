import "dotenv/config";
import { medicineCashbackDefaults } from "../src/features/cashback/rules";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getPrisma } from "../src/lib/prisma";
import { SupplierCatalogOfferSchema } from "../src/features/supplier-catalog/schema";
import { gtinVariants, normalizeGtin, resolveSupplierOffer } from "../src/features/supplier-catalog/commerce";
import { planPilotRefresh } from "../src/features/supplier-catalog/pilot-refresh";
import { recordSupplierQuote } from "../src/features/supplier-catalog/quote-monitor";
import { preparePrivateSupplierImage, storePrivateSupplierImage } from "../src/features/product-images/private-supplier-storage";
import { lockProductCatalog } from "../src/features/products/mutations";
import { buildProductSearchText } from "../src/features/products/public-search";
import { importedProductStatus } from "../src/features/products/photo-publication-policy";
import { validateShippingPublication } from "../src/features/products/shipping-publication-policy";
import { supplierImportManifestSchema, assertImportTarget, persistedPrescriptionType } from "../src/features/supplier-catalog/import-manifest";

async function main() {
  const args = process.argv.slice(2);
  const value = (key: string) => args[args.indexOf(key) + 1];
  if (!args.includes("--file") || !args.includes("--actor-id") || !value("--file") || !value("--actor-id") ||
    args.some((arg, index) => !["--file", "--actor-id", "--apply"].includes(arg) && !["--file", "--actor-id"].includes(args[index - 1])) ||
    args.filter(arg => arg === "--file").length !== 1 || args.filter(arg => arg === "--actor-id").length !== 1 ||
    value("--file").startsWith("--") || value("--actor-id").startsWith("--")) throw new Error("Use --file <private.json> --actor-id <ADMIN> [--apply]. Dry-run is the default.");
  const input = supplierImportManifestSchema.parse(JSON.parse(await readFile(value("--file"), "utf8")));
  const images = new Map<string, { buffer: Buffer; fileName: string; mimeType: string; sourceUrl: string }>();
  for (const row of input.products) {
    if (!row.internalImage) continue;
    if (normalizeGtin(row.internalImage.ean) !== normalizeGtin(row.ean)) throw new Error("Image presentation must match the product GTIN.");
    const image = { buffer: await readFile(row.internalImage.filePath), fileName: path.basename(row.internalImage.filePath),
      mimeType: row.internalImage.mimeType, sourceUrl: row.internalImage.sourceUrl };
    await preparePrivateSupplierImage(image);
    images.set(normalizeGtin(row.ean)!, image);
  }
  const db = getPrisma();
  const apply = args.includes("--apply");
  try {
    const plans = await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${value("--actor-id")} FOR SHARE`;
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
        const matches = await tx.product.findMany({ where: { OR: [{ eanNormalized }, { ean: { in: gtinVariants(row.ean) } }] }, select: { id: true } });
        if (matches.length > 1) throw new Error(`Ambiguous existing GTIN ${row.ean}; manual review required.`);
        if (matches[0]) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${matches[0].id} FOR UPDATE`;
        const current = matches[0] ? await tx.product.findUniqueOrThrow({ where: { id: matches[0].id } }) : null;
        if (current) assertImportTarget(row, current);
        const previous = current ? await tx.supplierCatalogOffer.findMany({ where: { productId: current.id } }) : [];
        const markup = current?.supplierMarkupBps ?? row.supplierMarkupBps;
        const { best, updates } = planPilotRefresh(eanNormalized, parsedOffers, previous, Date.now(), markup, current?.requiresPrescription ?? row.requiresPrescription, current ? current.catalogClassification : row.catalogClassification);
        if (!current && !best) throw new Error(`No current, permitted offer for ${row.ean}.`);
        const currentTerms = current ? resolveSupplierOffer({ ...current, supplierOffers: previous, supplierDemandAllowed: true }) : best;
        const observations: { supplier: string; status: string }[] = [];
        const summary = { ean: row.ean, name: row.name, slug: current?.slug ?? row.slug, priceCents: currentTerms?.unitPriceCents ?? null,
          available: Boolean(currentTerms), action: current ? "UPDATE_OFFERS" : "CREATE", supplierMarkupBps: markup, observations,
          status: current?.status ?? importedProductStatus(row),
          publicPhoto: false, internalPhoto: !current && images.has(eanNormalized), shippingDraft: !current && Boolean(row.shippingProfile) };
        plans.push(summary);
        if (current) {
          for (const offer of updates) {
            const decision = await recordSupplierQuote(tx, { ...offer, productId: current.id }, { apply });
            observations.push({ supplier: offer.supplier, status: decision.status });
          }
          if (apply) {
            const refreshed = await tx.product.findUniqueOrThrow({ where: { id: current.id }, include: { supplierOffers: true } });
            const terms = resolveSupplierOffer({ ...refreshed, supplierDemandAllowed: true });
            summary.priceCents = terms?.unitPriceCents ?? null;
            summary.available = Boolean(terms);
          }
        }
        if (!apply) continue;
        const { offers: _offers, internalImage: _image, evidence: _evidence, ...identity } = row;
        void [_offers, _image, _evidence];
        if (!current) validateShippingPublication(null, { ...identity, prescriptionType: persistedPrescriptionType(row), status: importedProductStatus(row) });
        const product = current ?? await tx.product.create({ data: { ...identity, prescriptionType: persistedPrescriptionType(row), eanNormalized, inventorySource: "DISTRIBUTOR", status: importedProductStatus(row), stock: 0,
          price: (best!.unitPriceCents / 100).toFixed(2), cashbackEnabled: false,
          ...medicineCashbackDefaults({ ...row, prescriptionType: persistedPrescriptionType(row) }),
          wimicoinsEnabled: false, searchText: buildProductSearchText({ ...identity, searchTerms: [] }) } });
        for (const offer of current ? [] : updates) {
          const { replenishAllocation: _replenish, ...fields } = offer;
          void _replenish;
          const data = { ...fields, productId: product.id, eanNormalized, observedAt: new Date(offer.observedAt), validUntil: new Date(offer.validUntil) };
          await tx.supplierCatalogOffer.create({ data });
        }
        // Existing products change offers only, including when their photo fields are empty.
        const image = !current ? images.get(eanNormalized) : undefined;
        if (image) {
          const saved = await storePrivateSupplierImage(image);
          await tx.product.update({ where: { id: product.id }, data: { imageUrl: saved.url, imageAssetId: null } });
          await tx.auditLog.create({ data: { action: "SUPPLIER_IMAGE_VERIFIED", entity: "Product", entityId: product.id, userId: actor.id,
            metadata: { ean: row.ean, sourceUrl: image.sourceUrl, sourceSha256: createHash("sha256").update(image.buffer).digest("hex"),
              imageUrl: saved.url, width: saved.width, height: saved.height, sizeBytes: saved.sizeBytes, publicPhoto: false } } });
        }
        await tx.auditLog.create({ data: { action: "SUPPLIER_PILOT_IMPORTED", entity: "Product", entityId: product.id, userId: actor.id,
          metadata: { ean: row.ean, suppliers: parsedOffers.map(offer => offer.supplier), supplierTaxes: parsedOffers.map(offer => ({ supplier: offer.supplier, substitutionTaxCents: offer.substitutionTaxCents })), created: !current, observations,
            manifestVersion: input.manifestVersion ?? 0, supplierMarkupBps: markup, status: product.status,
            ...(row.evidence ? { evidence: row.evidence } : {}),
            ...(!current && row.catalogClassification ? { catalogClassification: row.catalogClassification } : {}),
            shippingDraftCreated: !current && Boolean(row.shippingProfile), publicPhoto: false } } });
      }
      return plans;
    }, { timeout: 20000 });
    console.log(JSON.stringify({ applied: args.includes("--apply"), products: plans }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; });
