import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { chromium, expect, type BrowserContext } from "@playwright/test";
import { hash } from "bcryptjs";
import { encode } from "next-auth/jwt";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { changeAccess } from "../src/features/admin-users/directory";

async function main() {
  assert.ok(process.env.AUTH_SECRET, "Set the same isolated AUTH_SECRET on the QA server and audit process");
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/cashback_test");
  const base = "http://127.0.0.1:3010";
  const pool = new Pool({ connectionString: url.toString() });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const browser = await chromium.launch();
  const prefix = `users-qa-${Date.now()}`;
  const password = randomBytes(24).toString("hex");
  const contexts: BrowserContext[] = [];
  const checks: string[] = [];
  const orderIds: string[] = [];
  async function login(role: "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER", suffix: string) {
    const email = `${prefix}-${suffix}@example.test`;
    const data = { name: `Teste ${suffix}`, email, passwordHash: await hash(password, 10) };
    const user = role === "CUSTOMER" ? await db.customer.create({ data }) : await db.user.create({ data: { ...data, role } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
    const csrf = await (await context.request.get(`${base}/api/auth/csrf`)).json();
    await context.request.post(`${base}/api/auth/callback/credentials`, { form: { csrfToken: csrf.csrfToken, email, password }, headers: { "X-Auth-Return-Redirect": "1" } });
    assert.equal((await (await context.request.get(`${base}/api/auth/session`)).json()).user?.role, role);
    return { user, context };
  }
  try {
    await mkdir("artifacts/users-access-audit", { recursive: true });
    const admin = await login("ADMIN", "admin");
    const manager = await login("MANAGER", "manager");
    const staff = await login("STAFF", "staff");
    const client = await login("CUSTOMER", "customer");
    const anonymous = await browser.newContext(); contexts.push(anonymous);
    for (const c of [manager.context, staff.context, client.context, anonymous]) {
      assert.equal((await c.request.get(`${base}/api/admin/pessoas`)).status(), 401);
      assert.equal((await c.request.patch(`${base}/api/admin/pessoas/missing`, { data: {} })).status(), 401);
    }
    const customer = await db.customer.update({ where: { id: client.user.id }, data: { googleSubject: `${prefix}-google` } });
    async function row(id: string) {
      const response = await admin.context.request.get(`${base}/api/admin/pessoas?q=${prefix}`);
      assert.equal(response.status(), 200, await response.text());
      return (await response.json()).data.find((p: { id: string }) => p.id === id);
    }
    const before = await row(customer.id);
    assert.ok(before); assert.equal(before.role, "CUSTOMER");
    const change = { kind: "customer", role: "ADMIN", isActive: true, version: before.version };
    const promoted = await admin.context.request.patch(`${base}/api/admin/pessoas/${customer.id}`, { data: change });
    assert.equal(promoted.status(), 200, await promoted.text());
    assert.equal((await admin.context.request.patch(`${base}/api/admin/pessoas/${customer.id}`, { data: change })).status(), 409);
    assert.equal((await (await client.context.request.get(`${base}/api/auth/session`)).json()).user.role, "CUSTOMER", "old customer JWT must not silently elevate");
    const linked = await db.user.findUniqueOrThrow({ where: { customerId: customer.id } });
    assert.equal(linked.passwordHash, "!GOOGLE_ONLY");
    const google = await browser.newContext(); contexts.push(google);
    const cookieName = "authjs.session-token";
    const cookie = await encode({ token: { id: customer.id, customerId: customer.id, googleSubject: customer.googleSubject, role: "CUSTOMER" }, secret: process.env.AUTH_SECRET ?? "wimifarma-local-dev-secret", salt: cookieName, maxAge: 3600 });
    await google.addCookies([{ name: cookieName, value: cookie, url: base, httpOnly: true, sameSite: "Lax" }]);
    let session = (await (await google.request.get(`${base}/api/auth/session`)).json()).user;
    assert.equal(session.role, "ADMIN"); assert.equal(session.id, linked.id); assert.equal(session.customerId, customer.id);
    assert.equal((await google.request.get(`${base}/api/admin/pessoas`)).status(), 200);
    assert.equal((await google.request.get(`${base}/api/minha-conta/cashback`)).status(), 200);
    const promotedRow = await row(customer.id);
    const selfChange = await google.request.patch(`${base}/api/admin/pessoas/${customer.id}`, { data: { ...change, role: "CUSTOMER", version: promotedRow.version } });
    assert.equal(selfChange.status(), 409);
    assert.equal((await admin.context.request.patch(`${base}/api/admin/pessoas/${customer.id}`, { data: { ...change, role: "CUSTOMER", version: promotedRow.version } })).status(), 200);
    session = (await (await google.request.get(`${base}/api/auth/session`)).json()).user;
    assert.equal(session.role, "CUSTOMER"); assert.equal(session.id, customer.id);
    assert.equal((await google.request.get(`${base}/api/admin/pessoas`)).status(), 401);
    const demoted = await row(customer.id);
    await admin.context.request.patch(`${base}/api/admin/pessoas/${customer.id}`, { data: { ...change, role: "CUSTOMER", isActive: false, version: demoted.version } });
    assert.equal((await google.request.get(`${base}/api/minha-conta/cashback`)).status(), 401);
    checks.push("ADMIN-only directory; stale version rejected; Google link promotion, demotion and blocking refresh immediately; own access protected; customer wallet preserved");

    const local = await row(staff.user.id);
    assert.equal((await admin.context.request.patch(`${base}/api/admin/pessoas/${staff.user.id}`, { data: { kind: "staff", role: "CUSTOMER", isActive: true, version: local.version } })).status(), 200);
    assert.equal((await staff.context.request.get(`${base}/api/admin/pessoas`)).status(), 401);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: staff.user.id } })).customerId);
    const second = await login("ADMIN", "second");
    const race = await Promise.allSettled([
      db.$transaction(tx => changeAccess(tx, admin.user.id, second.user.id, { kind: "staff", role: "STAFF", isActive: true, version: second.user.updatedAt.toISOString() })),
      db.$transaction(tx => changeAccess(tx, second.user.id, admin.user.id, { kind: "staff", role: "STAFF", isActive: true, version: (admin.user.updatedAt).toISOString() })),
    ]);
    // Login updated the versions: both stale writes must remain harmless.
    assert.ok(race.some(r => r.status === "rejected"));
    const a = await db.user.findUniqueOrThrow({ where: { id: admin.user.id } });
    const b = await db.user.findUniqueOrThrow({ where: { id: second.user.id } });
    const freshRace = await Promise.allSettled([
      db.$transaction(tx => changeAccess(tx, a.id, b.id, { kind: "staff", role: "STAFF", isActive: true, version: b.updatedAt.toISOString() })),
      db.$transaction(tx => changeAccess(tx, b.id, a.id, { kind: "staff", role: "STAFF", isActive: true, version: a.updatedAt.toISOString() })),
    ]);
    assert.equal(freshRace.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(await db.user.count({ where: { email: { startsWith: prefix }, role: "ADMIN", isActive: true } }), 1);
    await db.user.update({ where: { id: admin.user.id }, data: { role: "ADMIN" } });
    checks.push("Concurrent cross-demotion retains an administrator; local staff can return to customer without deletion");

    for (const [status, paymentStatus, totalCents] of [["COMPLETED", "PAID", 2000], ["COMPLETED", "PAID", 5000], ["COMPLETED", "PENDING", 9000], ["CANCELED", "PAID", 8000], ["COMPLETED", "REFUNDED", 10000]] as const) {
      const order = await db.order.create({ data: { number: `${prefix}-${orderIds.length}`, privacyConsentAt: new Date(), customerId: customer.id, status, paymentStatus, customerName: "Cliente sintetico", customerPhone: "44999990000", fulfillmentMethod: "PICKUP", paymentMethod: "PIX", subtotalCents: totalCents, totalCents } });
      orderIds.push(order.id);
    }
    const ranked = await admin.context.request.get(`${base}/api/admin/pessoas?q=${prefix}&sort=spent`);
    const body = await ranked.json(); assert.equal(ranked.status(), 200, JSON.stringify(body));
    assert.equal(body.data[0].id, customer.id); assert.equal(body.data[0].spentCents, 7000); assert.equal(body.data[0].orderCount, 2);
    assert.equal(JSON.stringify(body).includes("passwordHash"), false); assert.equal(JSON.stringify(body).includes("googleSubject"), false);
    checks.push("Ranking counts completed paid orders only; refunds, cancellations and unpaid excluded; sensitive fields absent");

    const page = await admin.context.newPage(); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/admin/usuarios`); await page.getByLabel("Buscar nome ou email").fill(prefix);
    await expect(page.getByText(customer.email!, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Editar acesso de ${customer.name}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("combobox").selectOption("STAFF");
    await page.getByLabel("Acesso ativo", { exact: true }).check();
    await page.getByRole("button", { name: "Salvar acesso", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByLabel("Ordenar usuarios").selectOption("spent");
    await expect(page.locator("[aria-busy]")).toHaveAttribute("aria-busy", "false");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
      await page.screenshot({ path: `artifacts/users-access-audit/users-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base);
    const trigger = page.getByRole("button", { name: /Abrir cesta/ }).filter({ visible: true });
    await trigger.click(); await expect(page.getByRole("dialog", { name: "Minha cesta" })).toBeVisible();
    const drawer = page.getByRole("dialog", { name: "Minha cesta" });
    assert.ok(await drawer.evaluate(el => Number.parseFloat(getComputedStyle(el).animationDuration) > 0), "drawer animation configured");
    await page.mouse.click(10, 300);
    await expect(drawer).toHaveAttribute("data-state", "closed");
    await expect(drawer).toBeHidden();
    await trigger.click();
    await page.mouse.wheel(0, 400); await page.waitForTimeout(350);
    assert.ok(await page.evaluate(() => scrollY > 0));
    await page.getByRole("navigation").getByRole("link", { name: "Sobre", exact: true }).click();
    await expect(page).toHaveURL(/\/sobre/); await expect(page.getByRole("dialog", { name: "Minha cesta" })).toBeHidden();
    await trigger.click(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog", { name: "Minha cesta" })).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger.click(); await expect(drawer).toBeVisible();
    assert.ok(await drawer.evaluate(el => getComputedStyle(el).animationName === "none" || Number.parseFloat(getComputedStyle(el).animationDuration) <= 0.001), "reduced motion is immediate");
    await page.mouse.click(2, 230); await expect(drawer).toBeHidden();
    assert.deepEqual(errors, []);
    checks.push("Browser role edit and responsive layout 320/390/768/1440; drawer allows scroll, outside link closes and navigates, Escape closes; no JS errors");
    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } catch (error) {
    for (const context of contexts) for (const page of context.pages()) {
      console.error("Audit page:", page.url());
      await page.screenshot({ path: "artifacts/users-access-audit/failure.png", fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
    await db.auditLog.deleteMany({ where: { OR: [{ user: { email: { startsWith: prefix } } }, { entityId: { startsWith: prefix } }] } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.cashbackAccount.deleteMany({ where: { customer: { email: { startsWith: prefix } } } });
    await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.loginAttempt.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.$disconnect(); await pool.end();
  }
}
main().catch(e => { console.error((e instanceof Error ? e.stack : String(e))?.split("Call log:")[0]); process.exitCode = 1; });
