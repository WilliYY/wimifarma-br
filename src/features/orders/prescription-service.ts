import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requiresPurchaseAssistance } from "@/features/products/purchase-policy";
import { encryptPrescription, prescriptionCartFingerprint, prescriptionMime, PrescriptionError, PRESCRIPTION_MAX_BYTES, PRESCRIPTION_TTL_MS } from "./prescription-upload";

export const prescriptionCartSchema = z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(30)
  .refine(items => new Set(items.map(item => item.productId)).size === items.length);

// A customer row serializes attempts, quota and cleanup across all app instances.
export async function reservePrescriptionUpload(tx: Prisma.TransactionClient, customerId: string, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
  if (!await tx.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } })) throw new PrescriptionError("Entre em uma conta de cliente ativa.", 401);
  // Only this customer's expired, never-associated uploads may be removed.
  await tx.prescriptionUpload.deleteMany({ where: { customerId, orderId: null, expiresAt: { lte: now } } });
  const quota = await tx.prescriptionUploadQuota.findUnique({ where: { customerId } });
  const fresh = !quota || now.getTime() - quota.windowStartedAt.getTime() >= PRESCRIPTION_TTL_MS;
  if (!fresh && quota.count >= 10) throw new PrescriptionError("Limite diário de envios atingido. Tente mais tarde.", 429);
  if (await tx.prescriptionUpload.count({ where: { customerId, orderId: null } }) >= 3) throw new PrescriptionError("Há receitas pendentes. Conclua o pedido ou aguarde o prazo de 24 horas.", 429);
  await tx.prescriptionUploadQuota.upsert({ where: { customerId }, create: { customerId, count: 1, windowStartedAt: now }, update: fresh ? { count: 1, windowStartedAt: now } : { count: { increment: 1 } } });
}

export async function preparePrescriptionBytes(bytes: Uint8Array, claimed: string) {
  const mimeType = prescriptionMime(bytes, claimed);
  // Do not recompress or strip signatures/certificates from an original PDF.
  if (mimeType === "application/pdf") return { bytes: Buffer.from(bytes), mimeType };
  try {
    const sanitized = await sharp(bytes, { limitInputPixels: 20_000_000, animated: false }).rotate().png().toBuffer();
    if (sanitized.length > PRESCRIPTION_MAX_BYTES) throw new PrescriptionError("A imagem processada ultrapassa 3 MB.", 413);
    return { bytes: sanitized, mimeType: "image/png" };
  } catch (error) {
    if (error instanceof PrescriptionError) throw error;
    throw new PrescriptionError("A imagem não pôde ser lida. Envie PNG, JPEG ou PDF válido.", 415);
  }
}

export async function savePrescriptionUpload(tx: Prisma.TransactionClient, input: { customerId: string; submissionId: string; items: z.infer<typeof prescriptionCartSchema>; bytes: Uint8Array; mimeType: string }, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${input.customerId} FOR UPDATE`;
  if (!await tx.customer.findFirst({ where: { id: input.customerId, status: "ACTIVE" }, select: { id: true } })) throw new PrescriptionError("Conta de cliente indisponível.", 401);
  if (await tx.prescriptionUpload.count({ where: { customerId: input.customerId, orderId: null } }) >= 3) throw new PrescriptionError("Limite de receitas pendentes atingido.", 429);
  const products = await tx.product.findMany({ where: { id: { in: input.items.map(item => item.productId) }, status: "ACTIVE", deletedAt: null }, select: { id: true, ean: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true } });
  if (products.length !== input.items.length || products.some(requiresPurchaseAssistance) || !products.some(product => product.prescriptionType === "ANTIMICROBIAL")) throw new PrescriptionError("Envie receita somente para um carrinho elegível com antimicrobiano.", 409);
  const id = randomUUID();
  const cartFingerprint = prescriptionCartFingerprint(products, input.items);
  const expiresAt = new Date(now.getTime() + PRESCRIPTION_TTL_MS);
  await tx.prescriptionUpload.create({ data: { id, customerId: input.customerId, submissionId: input.submissionId, cartFingerprint, mimeType: input.mimeType, sizeBytes: input.bytes.length, ...encryptPrescription(input.bytes, id), expiresAt } });
  await tx.auditLog.create({ data: { action: "PRESCRIPTION_UPLOADED", entity: "PrescriptionUpload", entityId: id } });
  return { id, expiresAt: expiresAt.toISOString() };
}
