import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { chromium, expect, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { defaultShippingSettings } from "../src/features/shipping/schema";
import { shippingFingerprint, signShippingQuote } from "../src/features/shipping/rules";
import { encryptValue } from "../src/lib/secret-vault";

// Execute only against the disposable app/database described in docs/65.
// Auth, checkout, persistence and role permissions are real. Only carrier/CEP
// responses are fixtures. No payment integration or messaging worker is allowed.
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.hostname, "127.0.0.1", "QA_DATABASE_HOST_REQUIRED");
  assert.equal(url.port, "55440", "QA_DATABASE_PORT_REQUIRED");
  assert.equal(url.pathname, "/wimifarma_orders_qa", "QA_DATABASE_NAME_REQUIRED");
  assert.equal(url.search, "", "QA_DATABASE_OVERRIDES_FORBIDDEN");
  assert.ok(process.env.AUTH_SECRET?.startsWith("isolated-orders-qa-"), "QA_AUTH_SECRET_REQUIRED");
  const base = "http://127.0.0.1:3019";
  const pool = new Pool({ connectionString: url.toString(), max: 5 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const output = "outputs/postagem-pedidos-2026-10-14";
  const contexts: BrowserContext[] = [];
  const browser = await chromium.launch();
  const checks: string[] = [];
  const check = (text: string) => { checks.push(text); console.log(`PASS ${text}`); };
  const password = `QA-${randomUUID()}`;
  try {
    assert.equal(await db.customer.count() + await db.user.count() + await db.order.count() + await db.product.count(), 0, "QA_DATABASE_MUST_BE_PRISTINE");
    assert.equal(await db.paymentIntegration.count(), 0, "QA_PAYMENT_INTEGRATION_FORBIDDEN");
    assert.equal(await db.miaubyConfig.count({ where: { enabled: true } }), 0, "QA_MESSAGING_FORBIDDEN");
    await mkdir(output, { recursive: true });
    const credentials = { passwordHash: await hash(password, 10) };
    const customer = await db.customer.create({ data: { ...credentials, name: "Cliente QA sintético", email: "customer@orders-qa.invalid", phone: "44999990000" } });
    await db.user.createMany({ data: [
      { ...credentials, name: "ADMIN QA sintético", email: "admin@orders-qa.invalid", role: "ADMIN" },
      { ...credentials, name: "Colaborador QA sintético", email: "staff@orders-qa.invalid", role: "STAFF" },
    ] });
    await db.clubMembership.create({ data: { customerId: customer.id } });
    await db.cashbackAccount.create({ data: { customerId: customer.id, balance: "2.00", lifetimeEarned: "2.00" } });
    await db.wimicoinAccount.create({ data: { customerId: customer.id, balancePoints: 300, lifetimeEarnedPoints: 300 } });
    const product = await db.product.create({ data: { name: "Produto QA de postagem", slug: "produto-qa-postagem", category: "Higiene", price: "20.00", status: "ACTIVE", stock: 100,
      cashbackEnabled: true, cashbackRateBps: 200, wimicoinsEnabled: true, wimicoinsRateBps: 200,
      shippingProfile: { enabled: true, transportReviewed: true, weightGrams: 500, widthCm: 20, heightCm: 20, lengthCm: 20, approvedServiceIds: [1, 4, 12] } } });
    const settings = { ...defaultShippingSettings, enabled: true, contactEmail: "shipping@orders-qa.invalid", serviceIds: [1, 4, 12], postingLocations: [
      { serviceId: 1, city: "Ivaté", state: "PR" as const, pointName: "AC Ivaté" },
      { serviceId: 4, city: "Umuarama", state: "PR" as const, pointName: "Ponto QA Umuarama" },
      { serviceId: 12, city: "Maringá", state: "PR" as const, pointName: "Ponto QA outra cidade" },
    ] };
    await db.shippingIntegration.create({ data: { id: "melhor-envio", revision: 1, settings, ...encryptValue(JSON.stringify({ clientId: "qa", clientSecret: "qa-no-real-secret", accessToken: "qa-not-a-real-token", refreshToken: "qa-not-a-real-refresh", expiresAt: Date.now() + 3600000 })) } });
    check("guarded pristine QA database; synthetic accounts and balances; no gateway or messaging");

    async function login(role: "CUSTOMER" | "ADMIN" | "STAFF") {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      contexts.push(context);
      await context.route("**/*", async route => {
        const request = route.request();
        const target = new URL(request.url());
        if (target.origin !== base) return route.abort();
        if (target.pathname.startsWith("/api/cep/")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { postalCode: target.pathname.split("/").at(-1), street: "Rua sintética", neighborhood: "Bairro QA", city: "São Paulo", state: "SP" } }) });
        if (target.pathname === "/api/fretes/cotacao") {
          const input = request.postDataJSON();
          const data = [
            { serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1000 },
            { serviceId: 4, carrier: "Jadlog", service: ".Com", priceCents: 1200 },
            { serviceId: 12, carrier: "LATAM", service: "Cargo QA", priceCents: 1500 },
          ].map(service => {
            const option = { ...service, provider: "melhor-envio" as const, deliveryDays: 4 };
            return { ...option, token: signShippingQuote({ ...option, postalCode: input.postalCode, fingerprint: shippingFingerprint(input.items, [product]), revision: 1, expiresAt: Date.now() + 900000 }, process.env.AUTH_SECRET!) };
          });
          return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
        }
        return route.continue();
      });
      const csrf = await (await context.request.get(`${base}/api/auth/csrf`)).json();
      const email = role === "CUSTOMER" ? customer.email : `${role.toLowerCase()}@orders-qa.invalid`;
      await context.request.post(`${base}/api/auth/callback/credentials`, { form: { csrfToken: csrf.csrfToken, email: email!, password }, headers: { "X-Auth-Return-Redirect": "1" } });
      assert.equal((await (await context.request.get(`${base}/api/auth/session`)).json()).user?.role, role);
      return context;
    }
    const customerContext = await login("CUSTOMER");
    const admin = await login("ADMIN");
    const staff = await login("STAFF");
    assert.equal((await staff.request.get(`${base}/api/admin/fretes`)).status(), 401);
    assert.equal((await customerContext.request.get(`${base}/api/admin/fretes`)).status(), 401);
    check("real credentials login for CUSTOMER, ADMIN and STAFF; shipping settings remain ADMIN-only");

    const created: { id: string; number: string; postingCity?: string }[] = [];
    for (const route of ["pickup", "local", "Correios", "Jadlog", "LATAM"]) {
      const page = await customerContext.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/produto/${product.slug}`);
      await page.getByRole("button", { name: "Comprar agora", exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Finalize sua compra", exact: true })).toBeVisible();
      await page.getByLabel("Nome completo", { exact: true }).fill(customer.name);
      await page.getByLabel("WhatsApp / telefone", { exact: true }).fill("44999990000");
      if (route === "pickup") {
        await page.getByText("Retirar na farmacia", { exact: true }).click();
        await page.getByRole("checkbox", { name: "Usar saldo de WimiCoins", exact: true }).check();
        await page.getByRole("checkbox", { name: "Usar saldo de cashback", exact: true }).check();
      } else {
        await page.getByText("Receber em casa", { exact: true }).click();
        await page.getByLabel("CEP", { exact: true }).fill(route === "local" ? "87525000" : "01001000");
        await page.getByLabel("Numero", { exact: true }).fill("123");
        await page.getByLabel("Endereco", { exact: true }).fill("Rua sintética");
        await page.getByLabel("Bairro", { exact: true }).fill("Bairro QA");
        await page.getByLabel("Cidade", { exact: true }).fill(route === "local" ? "Ivaté" : "São Paulo");
        await page.getByLabel("UF", { exact: true }).fill(route === "local" ? "PR" : "SP");
        if (route !== "local") await page.getByRole("radio", { name: new RegExp(route) }).check();
      }
      await page.getByRole("checkbox", { name: /Finalizar com os dados informados/ }).check();
      const pending = page.waitForResponse(response => response.url() === `${base}/api/pedidos` && response.request().method() === "POST");
      await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
      const response = await pending;
      assert.equal(response.status(), 201, await response.text());
      const result = (await response.json()).data;
      const order = await db.order.findUniqueOrThrow({ where: { id: result.id }, include: { items: true } });
      assert.equal(order.customerId, customer.id);
      assert.equal(order.items[0].productId, product.id);
      assert.equal(order.items[0].unitPriceCents, 2000);
      assert.equal(order.subtotalCents, 2000);
      const expectedShipping = route === "Correios" ? 1000 : route === "Jadlog" ? 1200 : route === "LATAM" ? 1500 : 0;
      assert.equal(order.deliveryFeeCents, expectedShipping);
      assert.equal(order.totalCents, 2000 + expectedShipping - (route === "pickup" ? 500 : 0));
      assert.equal(order.paymentStatus, "PENDING");
      const quote = order.shippingQuote as { postingLocation?: { city: string; requiresTravel: boolean } } | null;
      const postingCity = route === "Correios" ? "Ivaté" : route === "Jadlog" ? "Umuarama" : route === "LATAM" ? "Maringá" : undefined;
      assert.equal(quote?.postingLocation?.city, postingCity);
      if (postingCity) assert.equal(quote?.postingLocation?.requiresTravel, postingCity !== "Ivaté");
      if (route === "pickup") {
        assert.equal(order.cashbackRedeemedCents, 200);
        assert.equal(order.wimicoinsRedeemedPoints, 300);
        assert.equal(order.totalCents, 1500);
        assert.equal(order.cashbackRedemptionState, "RESERVED");
        assert.equal(order.wimicoinsRedemptionState, "RESERVED");
        const replay = await customerContext.request.post(`${base}/api/pedidos`, { data: response.request().postDataJSON(), headers: { Origin: base } });
        assert.equal(replay.status(), 201);
        assert.equal((await replay.json()).data.id, order.id);
        assert.equal(await db.order.count(), 1, "checkout replay does not duplicate the order or reserve benefits again");
      }
      assert.deepEqual(errors, []);
      created.push({ id: result.id, number: result.number, postingCity });
      check(`browser checkout ${route}: real POST 201, persisted customer/items/prices and posting snapshot`);
      await page.close();
    }

    // Changing present settings cannot rewrite the previous order's operational plan.
    await db.shippingIntegration.update({ where: { id: "melhor-envio" }, data: { revision: { increment: 1 }, settings: { ...settings, postingLocations: [] } } });
    for (const [role, context] of [["ADMIN", admin], ["STAFF", staff]] as const) {
      const page = await context.newPage();
      await page.goto(`${base}/admin/pedidos`, { waitUntil: "networkidle" });
      for (const order of created) {
        const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: order.number, exact: true }) });
        await expect(card).toBeVisible();
        if (order.postingCity) await expect(card).toContainText(`${order.postingCity}/PR`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role} mobile overflow`);
      await page.screenshot({ path: `${output}/${role.toLowerCase()}-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      const outside = page.getByRole("article").filter({ has: page.getByRole("heading", { name: created.find(order => order.postingCity === "Umuarama")!.number, exact: true }) });
      await outside.scrollIntoViewIfNeeded();
      await outside.screenshot({ path: `${output}/${role.toLowerCase()}-umuarama.png` });
      check(`${role} sees all real orders and immutable posting cities; desktop/mobile fit`);
      await page.close();
    }
    const pickup = created[0];
    const patch = (context: BrowserContext, body: unknown) => context.request.patch(`${base}/api/pedidos/${pickup.id}`, { data: body, headers: { Origin: base } });
    assert.equal((await patch(customerContext, { status: "CONFIRMED" })).status(), 401);
    const operationPage = await staff.newPage();
    await operationPage.goto(`${base}/admin/pedidos`, { waitUntil: "networkidle" });
    await operationPage.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill(pickup.number);
    await expect(operationPage.getByRole("article")).toHaveCount(1);
    const operationCard = operationPage.getByRole("article").filter({ has: operationPage.getByRole("heading", { name: pickup.number, exact: true }) });
    for (const [label, value] of [["Andamento", "CONFIRMED"], ["Andamento", "PREPARING"], ["Andamento", "READY"], ["Pagamento", "PAID"], ["Andamento", "COMPLETED"]]) {
      console.log(`STEP STAFF ${label} ${value}`);
      const [response] = await Promise.all([
        operationPage.waitForResponse(response => response.url() === `${base}/api/pedidos/${pickup.id}` && response.request().method() === "PATCH"),
        operationCard.getByLabel(label).selectOption(value, { timeout: 5000 }),
      ]);
      assert.equal(response.status(), 200, await response.text());
      await expect(operationCard.getByLabel(label)).toHaveValue(value);
      await expect(operationCard.getByText("Salvando...", { exact: true })).toHaveCount(0);
    }
    const complete = await db.order.findUniqueOrThrow({ where: { id: pickup.id } });
    assert.equal(complete.cashbackRedemptionState, "REDEEMED");
    assert.equal(complete.wimicoinsRedemptionState, "REDEEMED");
    assert.equal(complete.cashbackState, "CREDITED");
    assert.equal(complete.wimicoinsState, "CREDITED");
    assert.equal(await db.paymentIntegration.count(), 0);
    assert.equal(await db.miaubyEvent.count(), 0, "disabled messaging must not enqueue an external send");
    check("STAFF completes and settles synthetic order; CUSTOMER cannot operate it; combined benefits settle once");
    await writeFile(`${output}/qa-results.json`, JSON.stringify({ checks, orders: created, fixtures: ["carrier quotes", "CEP"], real: ["Next.js", "PostgreSQL", "Auth.js", "checkout", "ADMIN/STAFF pages", "status updates", "benefits"], charges: 0, messages: 0 }, null, 2));
    console.log(`QA_ORDERS_OK ${checks.length} checks; ${created.length} real isolated orders; zero charges/messages`);
  } catch (error) {
    const page = contexts.flatMap(context => context.pages()).find(page => !page.isClosed());
    if (page) {
      await page.screenshot({ path: `${output}/qa-failure.png`, fullPage: true }).catch(() => undefined);
      await writeFile(`${output}/qa-failure.txt`, await page.locator("body").innerText()).catch(() => undefined);
    }
    throw error;
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    await browser.close();
    await db.$disconnect();
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
