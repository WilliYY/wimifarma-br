import assert from "node:assert/strict";
import test from "node:test";
import { prescriptionCartFingerprint, prescriptionMime, encryptPrescription, decryptPrescription, validatePrescriptionAttachment } from "./prescription-upload";
import { requiresPrescriptionReview, requiresPurchaseAssistance } from "../products/purchase-policy";

test("antimicrobial permits checkout but always requires human review; controlled remains assisted", () => {
  const antimicrobial = { requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" as const, isPopularPharmacy: false };
  assert.equal(requiresPurchaseAssistance(antimicrobial), false);
  assert.equal(requiresPrescriptionReview(antimicrobial), true);
  assert.equal(requiresPurchaseAssistance({ ...antimicrobial, prescriptionType: "CONTROLLED" }), true);
});

test("fingerprint binds exact product identity, EAN, quantity and classification independently of order", () => {
  const a = { id: "a", ean: "7890000000015", prescriptionType: "ANTIMICROBIAL" };
  const b = { id: "b", ean: null, prescriptionType: "UNREVIEWED" };
  const items = [{ productId: "a", quantity: 1 }, { productId: "b", quantity: 2 }];
  const hash = prescriptionCartFingerprint([a, b], items);
  assert.equal(hash, prescriptionCartFingerprint([b, a], [...items].reverse()));
  for (const patch of [{ ean: "7890000000022" }, { prescriptionType: "CONTROLLED" }]) assert.notEqual(hash, prescriptionCartFingerprint([{ ...a, ...patch }, b], items));
  assert.notEqual(hash, prescriptionCartFingerprint([a, b], [{ ...items[0], quantity: 2 }, items[1]]));
  assert.throws(() => prescriptionCartFingerprint([a], items));
});

test("only matching binary PNG/JPEG/PDF headers and size are accepted", () => {
  assert.equal(prescriptionMime(Buffer.from("%PDF-1.7\nsynthetic\n%%EOF"), "application/pdf"), "application/pdf");
  for (const [bytes, mime] of [[Buffer.from("<svg>"), "image/png"], [Buffer.from("%PDF-1.7"), "image/png"], [Buffer.alloc(3 * 1024 * 1024 + 1), "application/pdf"], [Buffer.alloc(0), "application/pdf"]] as const) assert.throws(() => prescriptionMime(bytes, mime));
});

test("encryption authenticates identity and preserves original PDF bytes without AUTH_SECRET fallback", () => {
  const previous = process.env.SECRET_VAULT_KEY;
  try {
    process.env.SECRET_VAULT_KEY = "synthetic-key-for-isolated-unit-test";
    const original = Buffer.from("%PDF-1.7\noriginal signed synthetic content\n%%EOF");
    const encrypted = encryptPrescription(original, "upload-a");
    assert.deepEqual(decryptPrescription(encrypted, "upload-a"), original);
    assert.notDeepEqual(Buffer.from(encrypted.ciphertext), original);
    assert.throws(() => decryptPrescription(encrypted, "upload-b"));
    const tampered = { ...encrypted, ciphertext: Buffer.from(encrypted.ciphertext) }; tampered.ciphertext[0] ^= 1;
    assert.throws(() => decryptPrescription(tampered, "upload-a"));
    delete process.env.SECRET_VAULT_KEY;
    assert.throws(() => encryptPrescription(original, "upload-a"));
  } finally { if (previous === undefined) delete process.env.SECRET_VAULT_KEY; else process.env.SECRET_VAULT_KEY = previous; }
});

test("attachment rejects foreign, expired, reused and altered cart/submission", () => {
  const now = new Date();
  const attachment = { customerId: "customer-a", orderId: null, expiresAt: new Date(now.getTime() + 1000), cartFingerprint: "cart", submissionId: "submission" };
  assert.doesNotThrow(() => validatePrescriptionAttachment(attachment, "customer-a", "cart", "submission", now));
  for (const patch of [{ customerId: "other" }, { orderId: "order" }, { expiresAt: now }, { cartFingerprint: "changed" }, { submissionId: "other" }]) assert.throws(() => validatePrescriptionAttachment({ ...attachment, ...patch }, "customer-a", "cart", "submission", now));
  assert.throws(() => validatePrescriptionAttachment(null, "customer-a", "cart", "submission", now));
});
