import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertOutputPath, buildManifest, collectSources, sanitizeCatalog, PRODUCT_SELECT } from "./prepare-ai-review";

const at = "2026-11-21T12:00:00.000Z";
const product = (id = "synthetic-1") => ({ id, name: "Sabonete sintético", slug: id, category: "Higiene", price: "10.00", promotionalPrice: "9.00", stock: 5, status: "ACTIVE", inventorySource: "PHARMACY", requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false }, supplierOffers: [] });

test("offline projection strips unknown fields and personal shipping metadata", () => {
  const [safe] = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), customer: { email: "private@example.invalid" }, shippingProfile: { enabled: true, transportReviewed: true, weightGrams: 100, widthCm: 10, heightCm: 5, lengthCm: 10, notes: "Pessoa privada", reviewedBy: "private-id", reference: { person: "private" } } }] }).products;
  const encoded = JSON.stringify(safe);
  assert.doesNotMatch(encoded, /private|Pessoa|customer|notes|reviewedBy|reference/);
  assert.equal(safe.shippingProfile?.weightGrams, 100);
  assert.equal(safe.commerce.price, "10.00");
  assert.equal(safe.costEvidence, "missing");
  assert.equal(safe.marketingEligible, true);
  assert.equal("orderItems" in PRODUCT_SELECT, false);
});

test("invalid image URLs are removed while canonical prices and string-only images remain", () => {
  const safe = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), imageUrls: ["/products/synthetic.webp", "javascript:invalid", "https://example.invalid/image?token=private", "https://example.invalid/public.webp"] }] }).products[0];
  assert.deepEqual(safe.imageUrls, ["/products/synthetic.webp", "https://example.invalid/public.webp"]);
  const images: string[] = safe.imageUrls;
  assert.ok(images.every(url => typeof url === "string"));
  assert.equal(safe.commerce.price, "10.00");
  assert.equal(safe.commerce.promotionalPrice, "9.00");
});

test("manifest is deterministic, deduplicated and covers each catalog family", () => {
  const input = { capturedAt: at, preparedAt: "ignored", products: Array.from({ length: 35 }, (_, i) => product(`p-${i}`)) };
  const first = buildManifest(input, []);
  const second = buildManifest({ ...input, preparedAt: "different", products: [...input.products].reverse() }, []);
  assert.deepEqual(first, second);
  assert.equal(first.deadline, "2026-11-23T14:30:00.000Z");
  assert.equal(first.model, "gpt-6.2-astra");
  assert.equal(new Set(first.jobs.map(j => j.sourceHash)).size, first.jobs.length);
  for (const kind of ["catalog-integrity", "economics", "shipping", "marketing", "b2b"]) assert.ok(first.jobs.some(j => j.kind === kind));
  for (const job of first.jobs) {
    assert.ok(Buffer.byteLength(job.prompt) <= 180_000);
    assert.match(job.prompt, /untrusted data/);
    assert.match(job.prompt, /bug confirmado/);
    assert.match(job.prompt, /sem execução/);
  }
});

test("public-site audit is prioritized and excludes raw visitor and browser data", () => {
  const snapshot = { capturedAt: at, products: [product()] };
  const audit = {
    capturedAt: at,
    landingPath: "/",
    checks: [{ check: "landing", path: "/", viewport: "mobile", result: "pass", httpStatus: 200, elapsedMs: 841, rawHtml: "private-html" }],
    observations: ["first-purchase-button-below-mobile-fold"],
    shippingSamples: [{ uf: "SP", destination: "capital", httpStatus: 200, options: [{ service: "PAC", priceCents: 1500, maxBusinessDays: 11, signedToken: "private-token" }], cep: "private-cep" }],
    measurement: { windowStart: "2026-11-21T11:00:00.000Z", windowEnd: at, newBrowserIds: 8, socialReferrerBrowserIds: 2, ordersCreated: 1, campaignAttributionAvailable: false, rawUsers: ["private-user"] },
    campaignUrl: "https://wimifarma.com.br/?fbclid=private-id",
  };
  const withAudit = buildManifest(snapshot, [], audit);
  const [siteJob, ...remaining] = withAudit.jobs;
  assert.equal(siteJob.kind, "site-audit");
  assert.match(siteJob.prompt, /"elapsedMs":841/);
  assert.match(siteJob.prompt, /"socialReferrerBrowserIds":2/);
  assert.match(siteJob.prompt, /first-purchase-button-below-mobile-fold/);
  assert.match(siteJob.prompt, /"priceCents":1500/);
  assert.doesNotMatch(siteJob.prompt, /private-|fbclid|rawHtml|rawUsers/);
  assert.deepEqual(remaining, buildManifest(snapshot, []).jobs);
  assert.throws(() => buildManifest(snapshot, [], { ...audit, landingPath: "/?fbclid=private-id" }));
  assert.throws(() => buildManifest(snapshot, [], { ...audit, checks: [{ ...audit.checks[0], path: "/admin" }] }));
  assert.throws(() => buildManifest(snapshot, [], { ...audit, observations: ["private raw browser log"] }));
});

test("jobs round-robin business priorities without omissions or changing hashes", () => {
  const snapshot = { capturedAt: at, products: Array.from({ length: 35 }, (_, i) => product(`priority-${i}`)) };
  const source = { path: "src/features/products/search-catalog.ts", sha256: "a".repeat(64), startLine: 1, endLine: 1, text: "1:// synthetic source\n" };
  const manifest = buildManifest(snapshot, [source]);
  assert.deepEqual(manifest.jobs.slice(0, 6).map(job => job.kind), ["shipping", "economics", "marketing", "b2b", "catalog-integrity", "audit"]);
  assert.deepEqual(manifest.jobs.slice(6).map(job => job.kind), ["shipping", "economics", "marketing", "catalog-integrity"]);
  assert.equal(manifest.jobs.length, 10);
  assert.equal(new Set(manifest.jobs.map(job => job.id)).size, 10);
  for (const job of manifest.jobs) {
    assert.equal(job.sourceHash, createHash("sha256").update(job.prompt).digest("hex"));
    assert.equal(job.id, `${job.kind}-${job.sourceHash.slice(0, 20)}`);
  }
  const withoutSource = buildManifest(snapshot, []).jobs;
  assert.deepEqual(manifest.jobs.filter(job => job.kind !== "audit"), withoutSource);
  for (const kind of ["shipping", "economics", "marketing", "catalog-integrity"]) {
    const batches = manifest.jobs.filter(job => job.kind === kind);
    assert.match(batches[0].title, /lote 1$/);
    assert.match(batches[1].title, /lote 2$/);
  }
});

test("regulated products are excluded from marketing, supplier observations remain historical", () => {
  const safe = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), requiresPrescription: true, supplierOffers: [{ id: "offer", supplier: "SYNTHETIC", eanNormalized: "7890000000000", unitCostCents: 200, substitutionTaxCents: 20, available: false, stockQuantity: 0, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: "2026-11-20T00:00:00Z", validUntil: "2026-11-20T01:00:00Z", sourceUrl: "https://private.invalid", commercialCondition: "private" }] }] }).products[0];
  assert.equal(safe.marketingEligible, false);
  assert.equal(safe.costEvidence, "historical-observation-not-realized-profit");
  assert.equal(safe.supplierOffers[0].substitutionTaxCents, 20);
  assert.doesNotMatch(JSON.stringify(safe), /private/);
});

test("notify-only holds survive sanitized profiles and enforce canonical unavailable terms", () => {
  const safe = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), shippingProfile: { notifyOnlyPendingLogistics: "malformed-hold", notes: "discard" } }] }).products[0];
  assert.equal(safe.commerce.availableForPurchase, false);
  assert.equal(safe.commerce.purchaseLimit, 0);
  assert.deepEqual(safe.shippingProfile, { notifyOnlyPendingLogistics: true, validationStatus: "incomplete" });
});

test("pending shipping retains valid measurements without implying shipping approval", () => {
  const profile = { enabled: false, transportReviewed: false, weightGrams: 100, widthCm: 10, heightCm: 5, lengthCm: 10, measurementBasis: "estimated", notes: "private-person", reviewedBy: "private-id" };
  const safe = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), shippingProfile: profile }] }).products[0].shippingProfile;
  assert.deepEqual(safe, { enabled: false, transportReviewed: false, weightGrams: 100, widthCm: 10, heightCm: 5, lengthCm: 10, measurementBasis: "estimated", validationStatus: "incomplete" });
});

test("partial and malformed shipping keeps only independently valid evidence", () => {
  const profiles = [
    { weightGrams: 100, enabled: false },
    { weightGrams: 0, widthCm: "10", heightCm: -2, lengthCm: 8, measurementBasis: "estimated", transportReviewed: false },
    { weightGrams: "bad", widthCm: 0, enabled: "false", transportReviewed: "true", notes: "private" },
    { enabled: true, transportReviewed: true, weightGrams: 100, widthCm: 10, heightCm: 5, lengthCm: 10 },
  ];
  const safe = profiles.map(shippingProfile => sanitizeCatalog({ capturedAt: at, products: [{ ...product(), shippingProfile }] }).products[0].shippingProfile);
  assert.deepEqual(safe[0], { weightGrams: 100, enabled: false, validationStatus: "incomplete" });
  assert.deepEqual(safe[1], { lengthCm: 8, measurementBasis: "estimated", transportReviewed: false, validationStatus: "incomplete" });
  assert.deepEqual(safe[2], { validationStatus: "incomplete" });
  assert.equal(safe[3]?.validationStatus, "valid");
  assert.equal(safe[3]?.transportReviewed, true);
});

test("distributor sale price uses current canonical markup and retains expired evidence", () => {
  const offer = { id: "offer", supplier: "SYNTHETIC", eanNormalized: "7891234567895", unitCostCents: 1000, substitutionTaxCents: 0, available: true, stockQuantity: 20, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: "2026-11-21T11:00:00Z", validUntil: "2026-11-21T13:00:00Z" };
  const safe = sanitizeCatalog({ capturedAt: at, products: [{ ...product(), eanNormalized: offer.eanNormalized, inventorySource: "DISTRIBUTOR", stock: 0, supplierMarkupBps: 6000, supplierOffers: [offer] }] }).products[0];
  assert.equal(safe.commerce.price, "16.00");
  assert.equal(safe.commerce.promotionalPrice, null);
  assert.equal(safe.commerce.availableForPurchase, true);
  assert.equal(safe.costEvidence, "historical-observation-not-realized-profit");
});

test("large descriptions split batches without omitting products", () => {
  const manifest = buildManifest({ capturedAt: at, products: Array.from({ length: 31 }, (_, i) => ({ ...product(`large-${i}`), description: "x".repeat(12000) })) }, []);
  const jobs = manifest.jobs.filter(job => job.kind === "catalog-integrity");
  assert.ok(jobs.length > 2);
  for (let i = 0; i < 31; i++) assert.equal(jobs.filter(job => job.prompt.includes(`\"id\":\"large-${i}\"`)).length, 1);
});

test("secrets, invalid dates, duplicate product IDs and oversized prompts fail closed", () => {
  assert.throws(() => sanitizeCatalog({ capturedAt: "invalid", products: [] }));
  assert.throws(() => buildManifest({ capturedAt: at, products: [{ ...product(), name: "sk-proj-" + "a".repeat(40) }] }, []), /SECRET/);
  assert.throws(() => sanitizeCatalog({ capturedAt: at, products: [product(), product()] }), /DUPLICATE/);
  assert.throws(() => buildManifest({ capturedAt: at, products: [] }, [{ path: "src/features/products/search-catalog.ts", sha256: "a".repeat(64), startLine: 1, endLine: 1, text: "x".repeat(180_001) }]), /LIMIT/);
});

test("sources have line provenance, explicit allowlist and no external transport or DB writes", async () => {
  const sources = await collectSources(process.cwd());
  assert.ok(sources.length > 10);
  for (const source of sources) {
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Buffer.byteLength(source.text) <= 60_000);
    assert.match(source.text, /^\d+:/);
    assert.doesNotMatch(source.path, /auth|env|logs|customer|vault/);
  }
  const code = readFileSync(new URL("./prepare-ai-review.ts", import.meta.url), "utf8");
  assert.doesNotMatch(code, /\bfetch\s*\(|\.product\.(?:create|update|delete|upsert)\s*\(/);
  assert.match(code, /SET TRANSACTION READ ONLY/);
  assert.throws(() => assertOutputPath("relative.json", process.cwd()), /ABSOLUTE/);
  assert.throws(() => assertOutputPath(`${process.cwd()}/review.json`, process.cwd()), /OUTSIDE/);
  assert.throws(() => assertOutputPath("D:/Codex-temp/task-temp/review.json", process.cwd()), /TEMP/);
});
