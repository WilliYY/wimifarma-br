import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const secret = "synthetic-recipe-key-isolated-tests";
const submission = "123e4567-e89b-42d3-a456-426614174000";
const pdf = Buffer.from("%PDF-1.7\nSynthetic original\n%%EOF");
const bundles = new Map<string, ReturnType<typeof build>>();
function bundled(entry: string) {
  if (!bundles.has(entry)) bundles.set(entry, build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-prescription", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>globalThis.fixture.session;" : "export const getPrisma=()=>globalThis.fixture.db;" }));
  } }] }));
  return bundles.get(entry)!;
}

async function harness(options: { role?: string; signedOut?: boolean; active?: boolean; adminActive?: boolean; type?: string; quota?: number; pending?: number } = {}) {
  const files: Record<string, unknown>[] = [], audits: unknown[] = [], deleted: unknown[] = [];
  let quota = options.quota ?? 0;
  const tx = {
    $queryRaw: async () => [{ id: "synthetic" }],
    customer: { findFirst: async () => options.active === false ? null : { id: "customer-a" } },
    user: { findFirst: async () => options.adminActive === false ? null : { id: "admin-a" } },
    product: { findMany: async () => [{ id: "product-a", ean: "7890000000015", status: "ACTIVE", prescriptionType: options.type ?? "ANTIMICROBIAL", requiresPrescription: true, isPopularPharmacy: false }] },
    prescriptionUploadQuota: { findUnique: async () => ({ count: quota, windowStartedAt: new Date() }), upsert: async () => { quota++; } },
    prescriptionUpload: {
      count: async () => options.pending ?? files.length,
      deleteMany: async (args: unknown) => { deleted.push(args); return { count: 0 }; },
      create: async ({ data }: { data: Record<string, unknown> }) => { files.push(data); return data; },
      findFirst: async ({ where }: { where: { id: string } }) => files.find(file => file.id === where.id && file.orderId) ?? null,
    },
    auditLog: { create: async (args: unknown) => { audits.push(args); } },
  };
  const fixture = { session: options.signedOut ? null : { user: { id: options.role === "ADMIN" ? "admin-a" : "customer-a", role: options.role ?? "CUSTOMER" } }, db: { $transaction: async (fn: (tx: unknown) => unknown) => fn(tx) } };
  async function load(entry: string) {
    const loaded = { exports: {} as { POST: (request: Request) => Promise<Response>; GET: (request: Request, context: unknown) => Promise<Response> } };
    vm.runInNewContext((await bundled(entry)).outputFiles![0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, Buffer, Uint8Array, Request, Response, URL, TextDecoder, setTimeout, clearTimeout, process: { env: { AUTH_URL: "https://example.com", SECRET_VAULT_KEY: secret } } });
    return loaded.exports;
  }
  const upload = await load("src/app/api/minha-conta/receitas/route.ts");
  return { files, audits, deleted, quota: () => quota,
    upload: (overrides: { headers?: Record<string, string>; body?: BodyInit } = {}) => upload.POST(new Request("https://example.com/api/minha-conta/receitas", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/pdf", "X-Checkout-Request-Id": submission, "X-Prescription-Cart": JSON.stringify([{ productId: "product-a", quantity: 1 }]), ...overrides.headers }, body: overrides.body ?? pdf })),
    download: async (id: string) => (await load("src/app/api/admin/receitas/[id]/route.ts")).GET(new Request("https://example.com/api/admin/receitas/" + id), { params: Promise.resolve({ id }) }),
  };
}

test("upload requires same origin, authenticated active customer, supported cart and persisted quotas", async () => {
  for (const [options, status] of [[{ signedOut: true }, 401], [{ active: false }, 401], [{ role: "STAFF" }, 401], [{ type: "CONTROLLED" }, 409], [{ type: "ORDINARY" }, 409], [{ quota: 10 }, 429], [{ pending: 3 }, 429]] as const) {
    const f = await harness(options); assert.equal((await f.upload()).status, status); assert.equal(f.files.length, 0);
  }
  const f = await harness();
  assert.equal((await f.upload({ headers: { Origin: "https://attacker.invalid" } })).status, 403);
  assert.equal((await f.upload({ headers: { Origin: "" } })).status, 403);
  assert.equal((await f.upload({ headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal(f.quota(), 0);
});

test("route caps bytes while reading, rejects MIME spoof and consumes failed persisted attempts", async () => {
  const f = await harness();
  assert.equal((await f.upload({ body: Buffer.alloc(3 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await f.upload({ headers: { "Content-Type": "image/png" } })).status, 415);
  assert.equal((await f.upload({ headers: { "Content-Encoding": "gzip" } })).status, 415);
  assert.equal(f.quota(), 3); assert.equal(f.files.length, 0);
  assert.equal((await f.upload({ headers: { "X-Prescription-Cart": JSON.stringify([{ productId: "product-a", quantity: 1 }, { productId: "product-a", quantity: 1 }]) } })).status, 422);
});

test("upload response and audit contain no bytes, filename, EXIF, certificates or clinical data", async () => {
  const f = await harness(); const response = await f.upload();
  assert.equal(response.status, 201); const payload = await response.json();
  assert.deepEqual(Object.keys(payload.data).sort(), ["expiresAt", "id"]);
  assert.equal(f.files.length, 1); assert.equal(f.files[0].customerId, "customer-a");
  assert.notDeepEqual(f.files[0].ciphertext, pdf);
  assert.equal(JSON.stringify(f.audits).includes("Synthetic original"), false);
  assert.equal(JSON.stringify(f.audits).includes("customer-a"), false);
  assert.equal((await f.download(payload.data.id)).status, 403);
});

test("download is ADMIN active only, linked attachment only, audited and forced private attachment", async () => {
  for (const role of ["MANAGER", "STAFF", "CUSTOMER"]) assert.equal((await (await harness({ role })).download(randomUUID())).status, 403);
  assert.equal((await (await harness({ signedOut: true })).download(randomUUID())).status, 401);
  const f = await harness({ role: "ADMIN" });
  const id = randomUUID(); f.files.push({ id, orderId: "synthetic-order", ciphertext: Buffer.from("invalid"), iv: Buffer.alloc(12), tag: Buffer.alloc(16), mimeType: "application/pdf" });
  assert.equal((await f.download(id)).status, 503);
  assert.equal(f.audits.length, 0);
  const g = await harness({ role: "ADMIN", adminActive: false });
  assert.equal((await g.download(id)).status, 404);
});

test("ADMIN downloads original PDF bytes only after order association with security headers", async () => {
  const f = await harness(); const result = await (await f.upload()).json();
  const g = await harness({ role: "ADMIN" });
  g.files.push({ ...f.files[0], orderId: "synthetic-order" });
  const response = await g.download(result.data.id);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.match(response.headers.get("Content-Disposition")!, /^attachment;/);
  assert.match(response.headers.get("Content-Security-Policy")!, /sandbox/);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(g.audits.length, 1);
  g.files[0].orderId = null;
  assert.equal((await g.download(result.data.id)).status, 404);
});

test("photos are decoded and stripped of EXIF before private encrypted storage", async () => {
  const original = await sharp({ create: { width: 30, height: 30, channels: 3, background: "white" } }).withMetadata().jpeg().toBuffer();
  assert.ok((await sharp(original).metadata()).exif);
  const f = await harness(); const payload = await (await f.upload({ headers: { "Content-Type": "image/jpeg" }, body: original })).json();
  assert.ok(payload.data?.id);
  const g = await harness({ role: "ADMIN" }); g.files.push({ ...f.files[0], orderId: "synthetic-order" });
  const response = await g.download(payload.data.id); assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(metadata.xmp, undefined);
});
