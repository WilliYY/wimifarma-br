import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium, expect, type BrowserContext } from "@playwright/test";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { saveRewardedReview } from "../src/features/cashback/review-service";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const base = "http://127.0.0.1:3010";
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/cashback_test");
  const pool = new Pool({ connectionString: url.toString() });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const browser = await chromium.launch({ headless: true });
  const prefix = `review-qa-${Date.now()}`;
  const password = randomBytes(24).toString("base64url");
  const productIds: string[] = [];
  const orderIds: string[] = [];
  const reviews: string[] = [];
  const checks: string[] = [];
  const errors: string[] = [];
  async function login(role: "CUSTOMER" | "ADMIN", suffix = "") {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", extraHTTPHeaders: { "x-real-ip": `2001:db8::${randomBytes(2).toString("hex")}` } });
    const data = { email: `${prefix}-${role.toLowerCase()}${suffix}@example.test`, name: `Teste ${role}`, passwordHash: await hash(password, 10) };
    const user = role === "ADMIN" ? await db.user.create({ data: { ...data, role } }) : await db.customer.create({ data });
    const csrf = await (await context.request.get(`${base}/api/auth/csrf`)).json();
    await context.request.post(`${base}/api/auth/callback/credentials`, { form: { csrfToken: csrf.csrfToken, email: data.email, password }, headers: { "X-Auth-Return-Redirect": "1" } });
    assert.equal((await (await context.request.get(`${base}/api/auth/session`)).json()).user?.role, role);
    return { context, user };
  }
  try {
    await mkdir("artifacts/review-cashback-audit", { recursive: true });
    const { context: customer, user } = await login("CUSTOMER");
    const { context: other } = await login("CUSTOMER", "-other");
    const { context: admin } = await login("ADMIN");
    const guest = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": `2001:db8::${randomBytes(2).toString("hex")}` } });
    async function product(suffix: string) {
      const p = await db.product.create({ data: { name: `${prefix} ${suffix}`, slug: `${prefix}-${suffix}`, price: 20, stock: 100, status: "ACTIVE", imageUrl: "/brand/logo-wimifarma.svg" } });
      productIds.push(p.id); return p;
    }
    const p = await product("principal");
    const body = (id = p.id, quantity = 1, redeem = 0, key = randomUUID()) => ({ customer: { name: "Cliente sintetico", phone: "44999990000" }, fulfillmentMethod: "PICKUP", paymentMethod: "PIX", privacyConsent: true, items: [{ productId: id, quantity, expectedUnitPriceCents: 2000 }], cashbackRedeemCents: redeem, checkoutRequestId: key });
    async function order(id = p.id, quantity = 1) {
      const response = await customer.request.post(`${base}/api/pedidos`, { data: body(id, quantity) });
      assert.equal(response.status(), 201, await response.text());
      const o = await db.order.findUniqueOrThrow({ where: { number: (await response.json()).data.number } });
      orderIds.push(o.id); return o;
    }
    async function complete(id: string) {
      await db.order.update({ where: { id }, data: { status: "READY" } });
      const response = await admin.request.patch(`${base}/api/pedidos/${id}`, { data: { status: "COMPLETED", paymentStatus: "PAID" } });
      assert.equal(response.status(), 200, await response.text());
    }
    const wallet = async () => (await (await customer.request.get(`${base}/api/minha-conta/cashback`)).json()).data;
    const review = (context: BrowserContext, id = p.id, rating = 1) => context.request.post(`${base}/api/produtos/${id}/avaliacoes`, { data: { rating, comment: "Minha experiencia sincera de teste com o produto." } });
    assert.equal((await review(guest)).status(), 401);
    assert.equal((await review(other)).status(), 403);
    const original = await order(p.id, 3);
    assert.equal((await review(customer)).status(), 403);
    await complete(original.id);
    const first = await review(customer);
    assert.equal(first.status(), 201, await first.text());
    assert.equal((await first.json()).data.awardedCents, 20);
    const savedReview = await db.productReview.findUniqueOrThrow({ where: { productId_customerId: { customerId: user.id, productId: p.id } } });
    reviews.push(savedReview.id);
    assert.equal(savedReview.rating, 1); assert.equal(savedReview.isPublished, true);
    for (const response of await Promise.all([review(customer, p.id, 2), review(customer, p.id, 5)])) {
      assert.equal(response.status(), 201); assert.equal((await response.json()).data.awardedCents, 0);
    }
    assert.equal(Number((await wallet()).balance), 0.2);
    checks.push("Bonus: verified paid purchase, one unit only, 1-star accepted, repeat/edit/concurrency no duplicate; guests/other accounts denied");

    assert.equal((await guest.request.post(`${base}/api/pedidos`, { data: body(p.id, 1, 20) })).status(), 401);
    assert.equal((await customer.request.post(`${base}/api/pedidos`, { data: body(p.id, 1, 21) })).status(), 409);
    assert.equal((await customer.request.post(`${base}/api/pedidos`, { data: body(p.id, 1, -1) })).status(), 422);
    const spend = body(p.id, 1, 20);
    const same = await Promise.all([1, 2].map(() => customer.request.post(`${base}/api/pedidos`, { data: spend })));
    for (const response of same) assert.equal(response.status(), 201, await response.text());
    const numbers = await Promise.all(same.map(async (r) => (await r.json()).data.number));
    assert.equal(numbers[0], numbers[1]);
    const reserved = await db.order.findUniqueOrThrow({ where: { number: numbers[0] }, include: { items: true } });
    orderIds.push(reserved.id);
    assert.equal(reserved.totalCents, 1980); assert.equal(reserved.items[0].cashbackDiscountCents, 20);
    assert.equal(reserved.cashbackRedemptionState, "RESERVED");
    assert.equal((await wallet()).reservedCents, 20); assert.equal(Number((await wallet()).balance), 0);
    assert.equal((await other.request.post(`${base}/api/pedidos`, { data: spend })).status(), 409);
    await db.product.update({ where: { id: p.id }, data: { price: 21 } });
    assert.equal((await customer.request.post(`${base}/api/pedidos`, { data: spend })).status(), 201);
    await db.product.update({ where: { id: p.id }, data: { price: 20 } });
    await admin.request.patch(`${base}/api/pedidos/${reserved.id}`, { data: { status: "CANCELED" } });
    await admin.request.patch(`${base}/api/pedidos/${reserved.id}`, { data: { status: "CANCELED" } });
    assert.equal(Number((await wallet()).balance), 0.2); assert.equal((await wallet()).reservedCents, 0);
    const race = await Promise.all([1, 2].map(() => customer.request.post(`${base}/api/pedidos`, { data: body(p.id, 1, 20) })));
    assert.deepEqual(race.map((r) => r.status()).sort(), [201, 409]);
    const winner = await db.order.findUniqueOrThrow({ where: { number: (await race.find((r) => r.status() === 201)!.json()).data.number } });
    orderIds.push(winner.id); await complete(winner.id);
    assert.equal(Number((await wallet()).lifetimeRedeemed), 0.2);
    for (let i = 0; i < 2; i++) await admin.request.patch(`${base}/api/pedidos/${original.id}`, { data: { paymentStatus: "REFUNDED" } });
    assert.equal(Number((await wallet()).balance), -0.2);
    for (let i = 0; i < 2; i++) await admin.request.patch(`${base}/api/pedidos/${winner.id}`, { data: { paymentStatus: "REFUNDED" } });
    assert.equal(Number((await wallet()).balance), 0); assert.equal(Number((await wallet()).lifetimeRedeemed), 0);
    checks.push("Redemption: exact totals, atomic reservation, idempotent replay after price change, no overspend, cancellation/refund once, negative balance tracked");

    const rollbackProduct = await product("rollback");
    const rollbackOrder = await order(rollbackProduct.id); await complete(rollbackOrder.id);
    await assert.rejects(db.$transaction(async (tx) => { await saveRewardedReview(tx, user.id, rollbackProduct.id, { rating: 1, comment: "Teste transacional completo." }); throw new Error("ROLLBACK_EXPECTED"); }), /ROLLBACK_EXPECTED/);
    assert.equal(await db.productReview.count({ where: { productId: rollbackProduct.id } }), 0);
    assert.equal(Number((await wallet()).balance), 0);
    await db.product.update({ where: { id: rollbackProduct.id }, data: { requiresPrescription: true } });
    const restricted = await review(customer, rollbackProduct.id);
    assert.equal(restricted.status(), 201); assert.equal((await restricted.json()).data.awardedCents, 0);
    checks.push("Rollback restores review and ledger; prescription product never grants reward");

    await customer.setExtraHTTPHeaders({ "x-real-ip": `2001:db8::${randomBytes(2).toString("hex")}` });
    const neverBought = await product("not-purchased");
    assert.equal((await review(customer, neverBought.id)).status(), 403);
    const unpaidProduct = await product("unpaid");
    const unpaidOrder = await order(unpaidProduct.id);
    await db.order.update({ where: { id: unpaidOrder.id }, data: { status: "COMPLETED" } });
    assert.equal((await review(customer, unpaidProduct.id)).status(), 403);
    checks.push("Purchases of other products grant no review permission; completed but unpaid order is denied");
    const ledgerProduct = await product("ledger");
    const ledgerOrder = await order(ledgerProduct.id); await complete(ledgerOrder.id);
    const credited = await db.$transaction((tx) => saveRewardedReview(tx, user.id, ledgerProduct.id, { rating: 1, comment: "Opiniao sintetica para testar o lancamento." }));
    reviews.push(credited.review.id);
    assert.equal(credited.awardedCents, 20);
    await db.productReview.delete({ where: { id: credited.review.id } });
    const recreated = await db.$transaction((tx) => saveRewardedReview(tx, user.id, ledgerProduct.id, { rating: 5, comment: "A mesma compra nao gera um segundo credito." }));
    assert.equal(recreated.awardedCents, 0);
    assert.equal((await admin.request.patch(`${base}/api/pedidos/${ledgerOrder.id}`, { data: { paymentStatus: "REFUNDED" } })).status(), 200);
    assert.equal(Number((await wallet()).balance), 0);
    const raceProduct = await product("refund-race");
    const raceOrder = await order(raceProduct.id); await complete(raceOrder.id);
    const [raceReview, raceRefund] = await Promise.all([
      review(customer, raceProduct.id),
      admin.request.patch(`${base}/api/pedidos/${raceOrder.id}`, { data: { paymentStatus: "REFUNDED" } }),
    ]);
    assert.ok([201, 403, 409].includes(raceReview.status()), `review/refund race ${raceReview.status()}`);
    assert.equal(raceRefund.status(), 200);
    assert.equal(Number((await wallet()).balance), 0);
    checks.push("Immutable ledger prevents bonus replay after deleting review; concurrent review/refund leaves no credit");

    // Cenario de navegador independente; limites de producao continuam intactos.
    await customer.setExtraHTTPHeaders({ "x-real-ip": `2001:db8::${randomBytes(2).toString("hex")}` });
    const visual = await product("visual");
    const visualOrder = await order(visual.id); await complete(visualOrder.id);
    const storefront = await product("card");
    const cardName = "Produto sintetico para verificar o card";
    await db.product.update({ where: { id: storefront.id }, data: { name: cardName, category: "Medicamento", featuredPosition: 1, cashbackEnabled: true, cashbackRateBps: 200, promotionalPrice: 9.99 } });
    const page = await customer.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/produto/${visual.slug}#avaliacoes`);
    await expect(page.getByText("Ganhe 1% de cashback", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "1 estrela", exact: true }).click();
    await page.getByLabel("Conte como foi sua experiencia").fill("Minha opiniao sincera e de uma estrela neste teste.");
    const postedReview = page.waitForResponse((r) => r.url().endsWith(`/api/produtos/${visual.id}/avaliacoes`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Publicar avaliacao", exact: true }).click();
    const reviewResponse = await postedReview;
    assert.equal(reviewResponse.status(), 201, await reviewResponse.text());
    await expect(page.getByText("Avaliacao com incentivo de cashback, independente da nota.")).toBeVisible({ timeout: 30000 });
    assert.equal(Number((await wallet()).balance), 0.2);
    await page.goto(`${base}/produto/${visual.slug}`);
    await page.getByRole("button", { name: "Comprar agora", exact: true }).first().click();
    await page.waitForURL("**/checkout");
    await page.getByLabel("WhatsApp / telefone", { exact: true }).fill("44999990000");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("checkbox", { name: "Usar saldo de cashback" }).check();
    await expect(page.getByText("Desconto de cashback", { exact: true })).toBeVisible();
    await expect(page.getByText(/R\$\s*19,80/, { exact: true })).toBeVisible();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `checkout overflow ${width}`);
      await page.screenshot({ path: `artifacts/review-cashback-audit/checkout-${width}.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("checkbox").check();
    const submitted = page.waitForResponse((r) => r.url().endsWith("/api/pedidos") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
    const response = await submitted; assert.equal(response.status(), 201, await response.text());
    const result = (await response.json()).data;
    assert.equal(result.totalCents, 1980); assert.equal(result.cashbackRedeemedCents, 20);
    orderIds.push((await db.order.findUniqueOrThrow({ where: { number: result.number } })).id);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base);
      await expect(page.getByRole("heading", { name: "1% de cashback por avaliacao" })).toBeVisible();
      const hero = page.getByRole("region", { name: "Campanhas da Wimifarma" });
      await expect(hero.getByRole("link", { name: "Avaliar minhas compras" })).toBeVisible();
      const pause = hero.getByRole("button", { name: "Pausar campanhas" });
      if (await pause.isEnabled()) await pause.click();
      await expect.poll(() => hero.getByRole("heading").evaluate((node) => getComputedStyle(node.parentElement!).opacity)).toBe("1");
      await expect.poll(() => hero.locator("img").first().evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      const frame = await hero.boundingBox();
      const cta = await hero.getByRole("link", { name: "Avaliar minhas compras" }).boundingBox();
      const heading = await hero.getByRole("heading").boundingBox();
      assert.ok(frame && cta && heading && cta.y + cta.height <= frame.y + frame.height - 12 && heading.y >= frame.y, `hero content clipped ${width}`);
      const header = await page.getByRole("banner").boundingBox();
      assert.ok(!header || frame.y >= header.y + header.height, `hero under header ${width}`);
      for (const button of await hero.getByRole("button").all()) {
        const box = await button.boundingBox();
        assert.ok(!box || cta.x + cta.width <= box.x || box.x + box.width <= cta.x || cta.y + cta.height <= box.y || box.y + box.height <= cta.y, `hero CTA overlaps controls ${width}`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `home overflow ${width}`);
      await page.screenshot({ path: `artifacts/review-cashback-audit/banner-${width}.png` });
      const card = page.locator("[data-offer-card]").filter({ has: page.getByRole("link", { name: `Ver ${cardName}`, exact: true }) });
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByText(/R\$\s*0,20 de cashback/, { exact: true })).toBeVisible();
      await expect(card.getByText(/% cashback/)).toHaveCount(0);
      await expect(card.getByText("Frete gratis", { exact: true })).toBeVisible();
      await expect(card.getByText("Em compras a partir de R$ 99,90, sujeito ao CEP atendido.", { exact: true })).toHaveClass("sr-only");
      await card.screenshot({ path: `artifacts/review-cashback-audit/card-${width}.png` });
    }
    await page.goto(`${base}/minha-conta/avaliacoes`);
    await expect(page.getByRole("heading", { name: "Avaliar minhas compras", exact: true })).toBeVisible();
    await expect(page.getByText(neverBought.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText(unpaidProduct.name, { exact: true })).toHaveCount(0);
    await page.goto(`${base}/minha-conta`);
    await page.getByRole("button", { name: "Cashback", exact: true }).click();
    await expect(page.getByText(/Reservado em pedidos: R\$\s*0,20/)).toBeVisible();
    await page.screenshot({ path: "artifacts/review-cashback-audit/account.png", fullPage: true });
    assert.deepEqual(errors, []);
    checks.push("Browser: 1-star reward + disclosure, live wallet, cashback discount through checkout, responsive banner/checkout 320-1440, review list/account, no JS errors");
    console.log(JSON.stringify({ ok: true, checks }));
  } finally {
    await browser.close();
    const storedReviews = await db.productReview.findMany({ where: { productId: { in: productIds } }, select: { id: true } });
    await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [...orderIds, ...productIds, ...reviews, ...storedReviews.map((r) => r.id)] } }, { user: { email: { startsWith: prefix } } }] } });
    await db.order.deleteMany({ where: { customer: { email: { startsWith: prefix } } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.loginAttempt.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.$disconnect(); await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
