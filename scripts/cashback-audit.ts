import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium, expect, type BrowserContext } from "@playwright/test";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { settleOrderCashback } from "../src/features/cashback/service";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const base = process.env.CASHBACK_AUDIT_URL ?? "http://127.0.0.1:3010";
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55439");
  assert.equal(url.pathname, "/cashback_test");
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const pool = new Pool({ connectionString: url.toString() });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const browser = await chromium.launch({ headless: true });
  const prefix = `cashback-qa-${Date.now()}`;
  const password = randomBytes(24).toString("base64url");
  const checks: string[] = [];
  const orderIds: string[] = [];
  const entityIds: string[] = [];
  const contexts: BrowserContext[] = [];

  async function login(role: "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER", suffix = "") {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    contexts.push(context);
    const email = `${prefix}-${role.toLowerCase()}${suffix}@example.test`;
    const data = { email, name: `Teste ${role}`, passwordHash: await hash(password, 10) };
    const user = role === "CUSTOMER" ? await db.customer.create({ data }) : await db.user.create({ data: { ...data, role } });
    const csrf = await (await context.request.get(`${base}/api/auth/csrf`)).json();
    await context.request.post(`${base}/api/auth/callback/credentials`, {
      form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${base}/minha-conta` },
      headers: { "X-Auth-Return-Redirect": "1" },
    });
    assert.equal((await (await context.request.get(`${base}/api/auth/session`)).json()).user?.role, role);
    return { context, user };
  }

  try {
    await mkdir("artifacts/cashback-audit", { recursive: true });
    const anonymous = await browser.newContext();
    contexts.push(anonymous);
    assert.equal((await anonymous.request.get(`${base}/api/cashback`)).status(), 401);
    assert.equal((await anonymous.request.get(`${base}/api/minha-conta/cashback`)).status(), 401);
    assert.equal((await anonymous.request.patch(`${base}/api/cashback/produtos/missing`, { data: {} })).status(), 401);
    const { context: admin } = await login("ADMIN");
    const { context: manager } = await login("MANAGER");
    const { context: staff } = await login("STAFF");
    const { context: customer, user } = await login("CUSTOMER");
    const { context: stranger } = await login("CUSTOMER", "-other");
    for (const context of [manager, staff, customer]) {
      assert.equal((await context.request.get(`${base}/api/cashback`)).status(), 401);
      assert.equal((await context.request.patch(`${base}/api/cashback/produtos/missing`, { data: {} })).status(), 401);
    }
    assert.equal((await admin.request.post(`${base}/api/cashback`, { data: { customerId: user.id, amount: 9999, type: "CREDIT", description: "forged" } })).status(), 405);
    checks.push("Auth: anonymous/STAFF/MANAGER/customer denied admin cashback; manual credits disabled");

    const created = await admin.request.post(`${base}/api/produtos`, { data: {
      name: `${prefix} Produto de cuidados`, category: "Medicamentos", price: 20, stock: 50, status: "ACTIVE",
      imageUrl: "/brand/logo-wimifarma.svg", cashbackEnabled: true, cashbackRateBps: 200,
    } });
    assert.equal(created.status(), 201, await created.text());
    let product = (await created.json()).data;
    entityIds.push(product.id);
    await db.product.update({ where: { id: product.id }, data: { featuredPosition: 1 } });
    product = (await (await admin.request.get(`${base}/api/produtos`)).json()).data.find((p: { id: string }) => p.id === product.id);
    const edit = { cashbackEnabled: true, cashbackRateBps: 500, expectedUpdatedAt: product.updatedAt };
    for (const cashbackRateBps of [0, 10001, 2.5]) {
      assert.equal((await admin.request.patch(`${base}/api/cashback/produtos/${product.id}`, { data: { ...edit, cashbackRateBps } })).status(), 422);
    }
    const race = await Promise.all([200, 500].map((rate) => admin.request.patch(`${base}/api/cashback/produtos/${product.id}`, { data: { ...edit, cashbackRateBps: rate } })));
    assert.deepEqual(race.map((r) => r.status()).sort(), [200, 409]);
    await db.product.update({ where: { id: product.id }, data: { cashbackRateBps: 200 } });
    const restricted = await db.product.create({ data: { name: `${prefix} restrito`, slug: `${prefix}-restrito`, price: 20, requiresPrescription: true } });
    entityIds.push(restricted.id);
    assert.equal((await admin.request.patch(`${base}/api/cashback/produtos/${restricted.id}`, { data: { ...edit, expectedUpdatedAt: restricted.updatedAt.toISOString() } })).status(), 409);
    checks.push("Products: create with 2%, bounds, concurrent update 200/409, prescription exclusion");

    const checkout = { customer: { name: "Cliente sintetico", phone: "44999990000", email: "synthetic@example.test" },
      fulfillmentMethod: "PICKUP", paymentMethod: "PIX", privacyConsent: true,
      items: [{ productId: product.id, quantity: 2, expectedUnitPriceCents: 2000 }] };
    async function place(context: BrowserContext) {
      const response = await context.request.post(`${base}/api/pedidos`, { data: { ...checkout, cashbackEarnedCents: 999999, customerId: user.id } });
      assert.equal(response.status(), 201, await response.text());
      const data = (await response.json()).data;
      const order = await db.order.findUniqueOrThrow({ where: { number: data.number }, include: { items: true } });
      orderIds.push(order.id);
      return order;
    }
    const guest = await place(anonymous);
    assert.equal(guest.customerId, null);
    assert.equal(guest.cashbackEarnedCents, 0);
    const order = await place(customer);
    assert.equal(order.customerId, user.id);
    assert.equal(order.cashbackEarnedCents, 80);
    assert.equal(order.items[0].cashbackEarnedCents, 80);
    assert.equal(order.items[0].cashbackRateBps, 200);
    assert.equal(order.cashbackState, "PENDING");
    await db.product.update({ where: { id: product.id }, data: { cashbackRateBps: 500 } });
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).cashbackEarnedCents, 80);
    const wallet = async (context: BrowserContext) => (await (await context.request.get(`${base}/api/minha-conta/cashback?customerId=${user.id}`)).json()).data;
    assert.equal((await wallet(customer)).pendingCents, 80);
    assert.equal((await wallet(stranger)).pendingCents, 0);
    assert.equal((await wallet(stranger)).balance, "0");
    checks.push("Checkout: server-only snapshots, immutable rate, guest=0, customer isolation");

    await db.order.update({ where: { id: order.id }, data: { status: "READY" } });
    assert.equal((await admin.request.patch(`${base}/api/pedidos/${order.id}`, { data: { status: "COMPLETED" } })).status(), 200);
    assert.equal((await wallet(customer)).pendingCents, 80);
    const paidRace = await Promise.all([1, 2].map(() => admin.request.patch(`${base}/api/pedidos/${order.id}`, { data: { paymentStatus: "PAID" } })));
    assert.ok(paidRace.some((r) => r.status() === 200));
    assert.ok(paidRace.every((r) => [200, 409].includes(r.status())));
    for (let i = 0; i < 2; i++) assert.equal((await admin.request.patch(`${base}/api/pedidos/${order.id}`, { data: { status: "COMPLETED", paymentStatus: "PAID" } })).status(), 200);
    assert.equal(Number((await wallet(customer)).balance), 0.8);
    assert.equal((await wallet(customer)).pendingCents, 0);
    assert.equal(await db.cashbackTransaction.count({ where: { eventKey: `order:${order.id}:CREDITED` } }), 1);
    await admin.request.patch(`${base}/api/pedidos/${order.id}`, { data: { paymentStatus: "REFUNDED" } });
    await admin.request.patch(`${base}/api/pedidos/${order.id}`, { data: { paymentStatus: "REFUNDED" } });
    assert.equal(Number((await wallet(customer)).balance), 0);
    assert.equal(await db.cashbackTransaction.count({ where: { eventKey: `order:${order.id}:REVERSED` } }), 1);
    checks.push("Settlement: completed unpaid stays pending; concurrent/repeated paid credits once; refund reverses once");

    const rollback = await place(customer);
    await db.order.update({ where: { id: rollback.id }, data: { status: "COMPLETED", paymentStatus: "PAID" } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: rollback.id }, data: { status: "COMPLETED" } });
      await settleOrderCashback(tx, rollback.id);
      throw new Error("intentional rollback");
    }));
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: rollback.id } })).cashbackState, "PENDING");
    assert.equal(Number((await wallet(customer)).balance), 0);
    assert.equal(await db.cashbackTransaction.count({ where: { eventKey: `order:${rollback.id}:CREDITED` } }), 0);
    await db.$transaction(async (tx) => { await tx.order.update({ where: { id: rollback.id }, data: { status: "COMPLETED" } }); await settleOrderCashback(tx, rollback.id); });
    assert.equal(Number((await wallet(customer)).balance), 2);
    const canceled = await place(customer);
    await admin.request.patch(`${base}/api/pedidos/${canceled.id}`, { data: { status: "CANCELED" } });
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: canceled.id } })).cashbackState, "VOIDED");
    await db.$transaction(async (tx) => { await tx.order.update({ where: { id: guest.id }, data: { status: "COMPLETED", paymentStatus: "PAID" } }); await settleOrderCashback(tx, guest.id); });
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: guest.id } })).cashbackState, "NONE");
    checks.push("PostgreSQL: rollback leaves no balance/ledger changes; cancellation voids; legacy NONE never credits");

    const page = await admin.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/admin/cashback`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: new RegExp(product.name) })).toBeVisible({ timeout: 60000 });
    await page.getByRole("button", { name: new RegExp(product.name) }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Percentual (%)", { exact: true }).fill("2.5");
    await dialog.getByRole("button", { name: "Salvar cashback" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(product.name) })).toBeVisible();
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).cashbackRateBps, 250);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({ path: `artifacts/cashback-audit/admin-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `admin overflow ${width}`);
    }
    await page.goto(`${base}/admin/catalogos`);
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    await expect(page.getByRole("dialog").getByLabel("Oferecer cashback neste produto")).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Percentual (%)", { exact: true })).toHaveValue("2");
    checks.push("Browser admin: row edit persisted 2.5%, product form default 2%, no overflow 1440/768/390/320");

    const publicPage = await customer.newPage();
    await publicPage.bringToFront();
    publicPage.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 390, 320]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      await publicPage.goto(`${base}/produto/${product.slug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByText(/R\$\s*0,50 de cashback por unidade/)).toBeVisible({ timeout: 60000 });
      await expect(publicPage.getByText(/Cashback R\$\s*2,00/).filter({ visible: true })).toBeVisible({ timeout: 30000 });
      assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `product overflow ${width}`);
      await publicPage.screenshot({ path: `artifacts/cashback-audit/product-${width}.png`, fullPage: true });
    }
    await publicPage.goto(base);
    await expect(publicPage.getByText(/R\$\s*0,50 de cashback por unidade/).first()).toBeVisible({ timeout: 60000 });
    await publicPage.goto(`${base}/minha-conta`);
    await publicPage.getByRole("button", { name: "Cashback", exact: true }).click();
    await expect(publicPage.getByText("Cashback liberado", { exact: true })).toBeVisible();
    await expect(publicPage.getByText("Estorno / debito", { exact: false }).first()).toBeVisible();
    await publicPage.screenshot({ path: "artifacts/cashback-audit/account.png", fullPage: true });
    assert.deepEqual(errors, []);
    checks.push("Browser store: home/detail 50 cents, header balance, mobile layouts, customer ledger, no JS errors");
    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally {
    await browser.close();
    await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [...orderIds, ...entityIds] } }, { user: { email: { startsWith: prefix } } }] } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.product.deleteMany({ where: { id: { in: entityIds } } });
    await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.loginAttempt.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
