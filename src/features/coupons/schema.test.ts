import assert from "node:assert/strict";
import test from "node:test";
import { couponCreateSchema, couponRevisionSchema, couponUpdateSchema } from "./schema";
import { couponDateInput, couponDates, couponDeleteBlock, getCouponStatus } from "./coupon";

const base = { code: "VERAO10", type: "PERCENTAGE", value: 10, startsAt: "2026-09-10", endsAt: "2026-09-17" };

test("rejeita datas inexistentes e termino anterior ao inicio", () => {
  for (const dates of [
    { startsAt: "2026-02-30" },
    { endsAt: "2026-02-30" },
    { endsAt: "2026-09-09" },
  ]) assert.equal(couponCreateSchema.safeParse({ ...base, ...dates }).success, false);
  assert.equal(couponCreateSchema.safeParse({ ...base, startsAt: undefined, endsAt: "2000-01-01" }).success, false);
});

test("aceita ano bissexto, validade no mesmo dia e validade aberta", () => {
  assert.equal(couponCreateSchema.safeParse({ ...base, startsAt: "2028-02-29", endsAt: "2028-02-29" }).success, true);
  const coupon = couponCreateSchema.parse({ ...base, startsAt: null, endsAt: null });
  assert.equal(coupon.endsAt, null);
});

test("normaliza codigo e valores monetarios brasileiros", () => {
  const coupon = couponCreateSchema.parse({ ...base, code: "  boas vindas ", type: "FIXED_AMOUNT", value: "12,50" });
  assert.equal(coupon.code, "BOAS-VINDAS");
  assert.equal(coupon.value, 12.5);
});

test("limita descontos, precisao e valores aceitos pelo banco", () => {
  for (const value of [0, 101, -10, true, null, "", Infinity]) {
    assert.equal(couponCreateSchema.safeParse({ ...base, value }).success, false, String(value));
  }
  for (const value of [1.234, 100000000, "1e4", true]) {
    assert.equal(couponCreateSchema.safeParse({ ...base, type: "FIXED_AMOUNT", value }).success, false, String(value));
  }
});

test("frete gratis persiste valor zero e nao aceita limites menores que usos", () => {
  assert.equal(couponCreateSchema.parse({ ...base, type: "FREE_DELIVERY", value: 10 }).value, 0);
  assert.equal(couponCreateSchema.safeParse({ ...base, maxUses: 2, usesCount: 3 }).success, false);
  assert.equal(couponCreateSchema.safeParse({ ...base, maxUses: 2147483648 }).success, false);
});

test("edicao exige revisao e rejeita alteracao manual do contador", () => {
  assert.equal(couponUpdateSchema.safeParse(base).success, false);
  assert.equal(couponUpdateSchema.safeParse({ ...base, expectedUpdatedAt: "2026-09-10T10:00:00.000Z", usesCount: 0 }).success, false);
  assert.equal(couponRevisionSchema.safeParse({ expectedUpdatedAt: "ontem" }).success, false);
});

test("validade inclusiva e exibicao sao consistentes no fuso de Brasilia", () => {
  const dates = couponDates(base);
  assert.equal(dates.startsAt?.toISOString(), "2026-09-10T03:00:00.000Z");
  assert.equal(dates.endsAt?.toISOString(), "2026-09-18T02:59:59.999Z");
  assert.equal(couponDateInput(dates.endsAt), "2026-09-17");
  assert.equal(couponDates({ startsAt: "2026-09-10", durationDays: 7 }).endsAt?.toISOString(), "2026-09-17T02:59:59.999Z");
  assert.deepEqual(couponDates({ startsAt: null, endsAt: null }), { startsAt: null, endsAt: null });
  assert.equal(couponCreateSchema.safeParse({ ...base, durationDays: 7 }).success, false);
});

test("status considera agendamento, pausa, expiracao e limite de usos", () => {
  const coupon = { isActive: true, startsAt: "2026-09-10T03:00:00.000Z", endsAt: "2026-09-11T02:59:59.999Z", usesCount: 0, maxUses: 1 };
  assert.equal(getCouponStatus(coupon, Date.parse("2026-09-10T02:00:00Z")), "scheduled");
  assert.equal(getCouponStatus(coupon, Date.parse(coupon.startsAt)), "active");
  assert.equal(getCouponStatus(coupon, Date.parse(coupon.endsAt)), "active");
  assert.equal(getCouponStatus(coupon, Date.parse(coupon.endsAt) + 1), "expired");
  assert.equal(getCouponStatus({ ...coupon, usesCount: 1 }, Date.parse(coupon.startsAt)), "exhausted");
  assert.equal(getCouponStatus({ ...coupon, isActive: false }, Date.parse(coupon.startsAt)), "paused");
});

test("exclusao preserva usos e premios associados", () => {
  assert.equal(couponDeleteBlock({ usesCount: 0, linkedPrizes: 0 }), null);
  assert.match(couponDeleteBlock({ usesCount: 1, linkedPrizes: 0 })!, /historico/);
  assert.match(couponDeleteBlock({ usesCount: 0, linkedPrizes: 1 })!, /roleta/);
});
