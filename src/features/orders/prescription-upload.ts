import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

export const PRESCRIPTION_MAX_BYTES = 3 * 1024 * 1024;
export const PRESCRIPTION_TTL_MS = 24 * 60 * 60 * 1000;
export class PrescriptionError extends Error {
  constructor(message: string, public readonly status = 422) { super(message); }
}

export function prescriptionMime(bytes: Uint8Array, claimed: string) {
  if (!bytes.length || bytes.length > PRESCRIPTION_MAX_BYTES) throw new PrescriptionError("Envie um arquivo de até 3 MB.", 413);
  const data = Buffer.from(bytes);
  const mime = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
    : data[0] === 255 && data[1] === 216 && data[2] === 255 ? "image/jpeg"
    : /^%PDF-1\.[0-9]/.test(data.subarray(0, 8).toString("ascii")) || data.subarray(0, 8).toString("ascii") === "%PDF-2.0" ? "application/pdf" : null;
  if (!mime || claimed !== mime) throw new PrescriptionError("Envie somente PNG, JPEG ou PDF válido.", 415);
  return mime;
}

function encryptionKey() {
  const secret = process.env.SECRET_VAULT_KEY;
  if (!secret || secret.length < 16) throw new PrescriptionError("O envio de receita está indisponível. Contate a farmácia.", 503);
  return Buffer.from(hkdfSync("sha256", secret, "wimifarma-br", "prescription-upload:v1", 32));
}

export function encryptPrescription(bytes: Uint8Array, id: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`prescription-upload:v1:${id}`));
  return { ciphertext: Buffer.concat([cipher.update(bytes), cipher.final()]), iv, tag: cipher.getAuthTag() };
}

export function decryptPrescription(value: { ciphertext: Uint8Array; iv: Uint8Array; tag: Uint8Array }, id: string) {
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), value.iv);
  cipher.setAAD(Buffer.from(`prescription-upload:v1:${id}`));
  cipher.setAuthTag(Buffer.from(value.tag));
  return Buffer.concat([cipher.update(value.ciphertext), cipher.final()]);
}

export function prescriptionCartFingerprint(products: { id: string; ean?: string | null; prescriptionType?: string }[], items: { productId: string; quantity: number }[]) {
  const rows = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new PrescriptionError("O carrinho mudou. Revise os produtos.", 409);
    return { id: product.id, ean: product.ean ?? null, quantity: item.quantity, prescriptionType: product.prescriptionType ?? "UNREVIEWED" };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function validatePrescriptionAttachment(value: { customerId: string; orderId: string | null; expiresAt: Date; cartFingerprint: string; submissionId: string } | null, customerId: string, fingerprint: string, submissionId: string, now = new Date()) {
  if (!value || value.customerId !== customerId || value.orderId || value.expiresAt <= now || value.cartFingerprint !== fingerprint || value.submissionId !== submissionId) {
    throw new PrescriptionError("A receita não corresponde a este envio ou expirou. Envie novamente.", 409);
  }
}
