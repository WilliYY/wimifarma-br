import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type BrowserContext } from "@playwright/test";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createCoupon } from "../src/features/coupons/service";
import { couponCreateSchema } from "../src/features/coupons/schema";

async function main() {
// Run only against the disposable coupon QA database and a local app using it.
const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
const base = process.env.COUPONS_AUDIT_URL ?? "http://127.0.0.1:3010";
assert.equal(databaseUrl.hostname, "127.0.0.1");
assert.equal(databaseUrl.port, "55439");
assert.equal(databaseUrl.pathname, "/coupon_test");
assert.equal(new URL(base).hostname, "127.0.0.1");
const pool = new Pool({ connectionString: databaseUrl.toString() });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const prefix = `QA${Date.now()}`;
const password = randomBytes(24).toString("base64url");
const output = path.resolve("artifacts/coupons-audit");
const browser = await chromium.launch({ headless: true });
let campaignId: string | undefined;
const checks: string[] = [];
const apiCoupon = { code: `${prefix}-API`, type: "PERCENTAGE", value: 10, startsAt: "2026-09-10", endsAt: "2026-09-17" };

async function login(context: BrowserContext, role: "ADMIN" | "MANAGER" | "STAFF") {
  const email = `${prefix.toLowerCase()}-${role.toLowerCase()}@example.test`;
  await db.user.create({ data: { email, name: `QA ${role}`, role, passwordHash: await hash(password, 10) } });
  const csrf = await (await context.request.get(`${base}/api/auth/csrf`)).json();
  const response = await context.request.post(`${base}/api/auth/callback/credentials`, {
    form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: `${base}/admin/cupons` },
    headers: { "X-Auth-Return-Redirect": "1" },
  });
  assert.equal(response.ok(), true);
  const session = await (await context.request.get(`${base}/api/auth/session`)).json();
  assert.equal(session.user?.role, role);
}

try {
  await mkdir(output, { recursive: true });
  const anonymous = await browser.newContext();
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    const url = `${base}/api/cupons${method === "PATCH" || method === "DELETE" ? "/missing" : ""}`;
    assert.equal((await anonymous.request.fetch(url, { method, ...(method !== "GET" ? { data: {} } : {}) })).status(), 401);
  }
  await anonymous.close();
  const staff = await browser.newContext();
  await login(staff, "STAFF");
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.equal((await staff.request.fetch(`${base}/api/cupons${method === "PATCH" || method === "DELETE" ? "/missing" : ""}`, { method, ...(method !== "GET" ? { data: {} } : {}) })).status(), 401);
  }
  await staff.close();
  checks.push("API: anonymous and STAFF denied on all operations");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await login(context, "ADMIN");
  const request = context.request;
  const createdResponse = await request.post(`${base}/api/cupons`, { data: apiCoupon });
  assert.equal(createdResponse.status(), 201, await createdResponse.text());
  const created = (await createdResponse.json()).data;
  assert.equal(created.endsAt, "2026-09-18T02:59:59.999Z");
  assert.equal((await request.post(`${base}/api/cupons`, { data: apiCoupon })).status(), 409);
  for (const change of [{ startsAt: "2026-02-30" }, { endsAt: "2026-09-09" }, { value: 101 }]) {
    assert.equal((await request.post(`${base}/api/cupons`, { data: { ...apiCoupon, code: `${prefix}-INVALID`, ...change } })).status(), 422);
  }
  assert.equal((await request.post(`${base}/api/cupons`, { form: apiCoupon })).status(), 415);
  const revision = { ...apiCoupon, expectedUpdatedAt: created.updatedAt };
  assert.equal((await request.patch(`${base}/api/cupons/missing`, { data: revision })).status(), 404);
  assert.equal((await request.patch(`${base}/api/cupons/${created.id}`, { data: { ...revision, usesCount: 0 } })).status(), 422);
  const concurrent = await Promise.all([
    request.patch(`${base}/api/cupons/${created.id}`, { data: { ...revision, description: "First edit" } }),
    request.patch(`${base}/api/cupons/${created.id}`, { data: { ...revision, description: "Second edit" } }),
  ]);
  assert.deepEqual(concurrent.map((response) => response.status()).sort(), [200, 409]);
  assert.equal(await db.auditLog.count({ where: { entityId: created.id, action: "COUPON_UPDATED" } }), 1);
  assert.equal((await request.delete(`${base}/api/cupons/${created.id}`, { data: { expectedUpdatedAt: created.updatedAt } })).status(), 409);
  checks.push("API: create, duplicate, invalid data, JSON, revision and concurrent edit");

  await assert.rejects(createCoupon(db, couponCreateSchema.parse({ ...apiCoupon, code: `${prefix}-ROLLBACK` }), "missing-audit-user"));
  assert.equal(await db.coupon.count({ where: { code: `${prefix}-ROLLBACK` } }), 0);
  checks.push("PostgreSQL: audit failure rolls back coupon creation");
  const used = await db.coupon.create({ data: { code: `${prefix}-USED`, type: "PERCENTAGE", value: 10, usesCount: 3 } });
  const linked = await db.coupon.create({ data: { code: `${prefix}-LINKED`, type: "PERCENTAGE", value: 10 } });
  const campaign = await db.spinWheelCampaign.create({ data: { name: prefix, slug: prefix.toLowerCase(), prizes: { create: { couponId: linked.id, label: "QA prize", probability: 100 } } } });
  campaignId = campaign.id;
  for (const coupon of [used, linked]) {
    assert.equal((await request.delete(`${base}/api/cupons/${coupon.id}`, { data: { expectedUpdatedAt: coupon.updatedAt.toISOString() } })).status(), 409);
  }
  const usedPayload = { code: used.code, type: used.type, value: 10, startsAt: null, endsAt: null, expectedUpdatedAt: used.updatedAt.toISOString() };
  assert.equal((await request.patch(`${base}/api/cupons/${used.id}`, { data: { ...usedPayload, maxUses: 2 } })).status(), 422);
  assert.equal((await request.patch(`${base}/api/cupons/${used.id}`, { data: { ...usedPayload, value: 20 } })).status(), 409);
  const manager = await browser.newContext();
  await login(manager, "MANAGER");
  assert.equal((await manager.request.patch(`${base}/api/cupons/${used.id}`, { data: { ...usedPayload, isActive: false } })).status(), 200);
  assert.equal((await db.coupon.findUniqueOrThrow({ where: { id: used.id } })).usesCount, 3);
  await manager.close();
  checks.push("API: MANAGER edit; used and linked coupons protected");

  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin/cupons`);
  await expect(page.locator('[data-coupons-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Novo cupom", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Codigo do cupom").fill(`${prefix}-UI`);
  await dialog.getByLabel("Descricao da campanha").fill("Campanha de teste de cuidados pessoais");
  await dialog.getByLabel("Tipo de desconto").selectOption("FIXED_AMOUNT");
  await dialog.getByLabel("Desconto (R$)").fill("12,50");
  await dialog.getByLabel("Data inicial").fill("2026-09-10");
  await dialog.getByLabel("Data final", { exact: true }).fill("2026-10-10");
  await dialog.getByLabel("Limite total de usos").fill("20");
  await dialog.getByRole("button", { name: "Criar cupom", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const ui = await db.coupon.findUniqueOrThrow({ where: { code: `${prefix}-UI` } });
  assert.equal(Number(ui.value), 12.5);
  await page.getByRole("button", { name: `Editar ${ui.code}`, exact: true }).click();
  await expect(dialog.getByLabel("Data final", { exact: true })).toHaveValue("2026-10-10");
  await dialog.getByLabel("Descricao da campanha").fill("Campanha atualizada");
  await dialog.getByLabel("Sem data final").check();
  await dialog.getByRole("button", { name: "Salvar alteracoes" }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal((await db.coupon.findUniqueOrThrow({ where: { id: ui.id } })).endsAt, null);
  await page.getByRole("button", { name: `Pausar ${ui.code}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Habilitar ${ui.code}`, exact: true })).toBeEnabled();
  await page.getByLabel("Status", { exact: true }).selectOption("paused");
  await expect(page.locator(`[data-coupon-id="${ui.id}"]`)).toBeVisible();
  await page.getByLabel("Buscar cupom").fill("nao-existe-cupom");
  await expect(page.getByText("Nenhum cupom corresponde aos filtros.")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  checks.push("UI: create, currency, dates, edit, pause, search and filter");

  await page.getByRole("button", { name: `Editar ${ui.code}`, exact: true }).click();
  await dialog.getByLabel("Desconto (R$)").fill("1,234");
  await dialog.getByRole("button", { name: "Salvar alteracoes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Confira os campos");
  await dialog.getByLabel("Desconto (R$)").fill("12,50");
  await db.coupon.update({ where: { id: ui.id }, data: { description: "Edicao concorrente" } });
  await dialog.getByRole("button", { name: "Salvar alteracoes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("foi alterado");
  await expect(dialog.getByLabel("Desconto (R$)")).toHaveValue("12,50");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Atualizar cupons" }).click();
  await expect(page.locator('[data-coupons-ready="true"]')).toBeVisible();
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 15000 });
  checks.push("UI: invalid field and concurrent edit retain unsaved input");

  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: path.join(output, `list-${width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `list overflow ${width}`);
    await page.getByRole("button", { name: `Editar ${ui.code}`, exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: path.join(output, `form-${width}.png`) });
    assert.equal(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth + 1), false, `dialog overflow ${width}`);
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  }
  checks.push("UI: list and form at 375, 768, 1280, 1920 pixels without overflow");
  await page.getByRole("button", { name: `Excluir ${linked.code}`, exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Cupom protegido" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Excluir cupom", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: `Excluir ${ui.code}`, exact: true }).click();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  assert.notEqual(await db.coupon.findUnique({ where: { id: ui.id } }), null);
  await page.getByRole("button", { name: `Excluir ${ui.code}`, exact: true }).click();
  await dialog.getByRole("button", { name: "Excluir cupom", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(await db.coupon.findUnique({ where: { id: ui.id } }), null);
  assert.equal(await db.auditLog.count({ where: { entityId: ui.id, action: "COUPON_DELETED" } }), 1);
  await page.route("**/api/cupons", (route) => route.fulfill({ status: 500, json: { error: "Falha de teste controlada" } }));
  await page.getByRole("button", { name: "Atualizar cupons" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Falha de teste controlada" })).toBeVisible();
  await page.unroute("**/api/cupons");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("Falha de teste controlada")).toHaveCount(0);
  assert.deepEqual(errors, []);
  checks.push("UI: delete cancellation/confirmation, protection and retry; no page errors");
  await db.coupon.createMany({ data: Array.from({ length: 102 }, (_, index) => ({ code: `${prefix}-PAGE-${index}`, type: "PERCENTAGE", value: 5 })) });
  const firstPage = await (await request.get(`${base}/api/cupons`)).json();
  assert.equal(firstPage.data.length, 100);
  assert.equal(typeof firstPage.nextCursor, "string");
  const secondPage = await (await request.get(`${base}/api/cupons?cursor=${firstPage.nextCursor}`)).json();
  assert.ok(secondPage.data.length > 0);
  assert.equal(secondPage.nextCursor, null);
  assert.equal(secondPage.data.some((item: { id: string }) => firstPage.data.some((first: { id: string }) => first.id === item.id)), false);
  checks.push("API: pagination over 100 coupons without duplicates");
  await context.close();
  console.log(JSON.stringify({ success: true, checks, screenshots: output }, null, 2));
} finally {
  await browser.close();
  if (campaignId) await db.spinWheelCampaign.deleteMany({ where: { id: campaignId } });
  const coupons = await db.coupon.findMany({ where: { code: { startsWith: prefix } }, select: { id: true } });
  await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: coupons.map((coupon) => coupon.id) } }, { user: { email: { startsWith: prefix.toLowerCase() } } }] } });
  await db.coupon.deleteMany({ where: { code: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix.toLowerCase() } } });
  await db.$disconnect();
  await pool.end();
}
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
