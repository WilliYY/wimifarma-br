import type { Prisma } from "@/generated/prisma/client";
import { classificationIsConsistent, readClassification } from "@/features/products/catalog-operations";

export const cartReminderProductSelect = {
  id: true, status: true, deletedAt: true, inventorySource: true, stock: true, catalogClassification: true,
  activeIngredients: true, cmedReference: true, requiresPrescription: true, prescriptionType: true,
  isPopularPharmacy: true,
} satisfies Prisma.ProductSelect;

export function isCartReminderProductAllowed(product: Prisma.ProductGetPayload<{ select: typeof cartReminderProductSelect }>) {
  const classification = readClassification(product.catalogClassification);
  return product.status === "ACTIVE" && !product.deletedAt && product.inventorySource === "PHARMACY" && product.stock > 0 &&
    (classification.kind === "HYGIENE" || classification.kind === "PERFUMERY") &&
    classificationIsConsistent(classification, product) && !product.activeIngredients.length && product.cmedReference === null;
}
