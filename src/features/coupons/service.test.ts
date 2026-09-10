import assert from "node:assert/strict";
import test from "node:test";
import { couponCreateSchema, couponUpdateSchema } from "./schema";
import { createCoupon, deleteCoupon, updateCoupon } from "./service";

const base = { code: "TESTE10", type: "PERCENTAGE", value: 10, startsAt: "2026-09-10", endsAt: "2026-09-17", maxUses: 10 };
const revision = "2026-09-10T10:00:00.000Z";
function record() {
  return { id: "coupon-test", code: "TESTE10", description: null as string | null, type: "PERCENTAGE", value: 10,
    startsAt: new Date("2026-09-10T03:00:00Z"), endsAt: new Date("2026-09-18T02:59:59.999Z"), minOrderValue: null as number | null,
    isActive: true, maxUses: 10, usesCount: 0, createdAt: new Date(revision), updatedAt: new Date(revision), _count: { prizes: 0 } };
}

function database(initial: ReturnType<typeof record> | null = record(), failAudit = false, conflict = false) {
  let state = { coupon: initial, audits: [] as unknown[] };
  const client = { async $transaction(work: (transaction: unknown) => Promise<unknown>) {
    const draft = structuredClone(state);
    const result = await work({
      coupon: {
        findUnique: async () => draft.coupon,
        findUniqueOrThrow: async () => { if (!draft.coupon) throw new Error("not found"); return draft.coupon; },
        create: async ({ data }: { data: Partial<ReturnType<typeof record>> }) => { draft.coupon = { ...record(), ...data }; return draft.coupon; },
        updateMany: async ({ data }: { data: Partial<ReturnType<typeof record>> }) => {
          if (conflict || !draft.coupon) return { count: 0 };
          draft.coupon = { ...draft.coupon, ...data }; return { count: 1 };
        },
        deleteMany: async () => { if (conflict) return { count: 0 }; draft.coupon = null; return { count: 1 }; },
      },
      auditLog: { create: async ({ data }: { data: unknown }) => { if (failAudit) throw new Error("audit unavailable"); draft.audits.push(data); } },
    });
    state = draft;
    return result;
  } } as unknown as Parameters<typeof createCoupon>[0];
  return { client, state: () => state };
}

test("criacao e edicao persistem datas, valores e auditoria juntas", async () => {
  const db = database(null);
  const created = await createCoupon(db.client, couponCreateSchema.parse(base));
  assert.equal(created.endsAt, "2026-09-18T02:59:59.999Z");
  assert.equal(db.state().audits.length, 1);
  const saved = await updateCoupon(db.client, created.id, couponUpdateSchema.parse({ ...base, description: "Campanha editada", endsAt: null, maxUses: null, expectedUpdatedAt: created.updatedAt }));
  assert.equal(saved.description, "Campanha editada");
  assert.equal(saved.endsAt, null);
  assert.equal(saved.maxUses, null);
  assert.equal(db.state().audits.length, 2);
});

test("erro na auditoria desfaz criacao, edicao e exclusao", async () => {
  const creation = database(null, true);
  await assert.rejects(createCoupon(creation.client, couponCreateSchema.parse(base)), /audit unavailable/);
  assert.equal(creation.state().coupon, null);
  const edition = database(record(), true);
  await assert.rejects(updateCoupon(edition.client, "coupon-test", couponUpdateSchema.parse({ ...base, description: "Nao salvar", expectedUpdatedAt: revision })), /audit unavailable/);
  assert.equal(edition.state().coupon?.description, null);
  await assert.rejects(deleteCoupon(edition.client, "coupon-test", revision), /audit unavailable/);
  assert.notEqual(edition.state().coupon, null);
});

test("revisao antiga, corrida de escrita e cupom removido sao rejeitados", async () => {
  const db = database();
  await assert.rejects(deleteCoupon(db.client, "coupon-test", "2026-09-09T10:00:00Z"), /alterado/);
  const gone = database(null);
  await assert.rejects(deleteCoupon(gone.client, "coupon-test", revision), /nao existe/);
  const race = database(record(), false, true);
  await assert.rejects(updateCoupon(race.client, "coupon-test", couponUpdateSchema.parse({ ...base, expectedUpdatedAt: revision })), /mudou/);
  await assert.rejects(deleteCoupon(race.client, "coupon-test", revision), /mudou/);
  assert.equal(race.state().audits.length, 0);
});

test("usos nao sao zerados e codigo ou desconto usado nao e reescrito", async () => {
  const db = database({ ...record(), usesCount: 3 });
  await assert.rejects(updateCoupon(db.client, "coupon-test", couponUpdateSchema.parse({ ...base, maxUses: 2, expectedUpdatedAt: revision })), /limite/);
  await assert.rejects(updateCoupon(db.client, "coupon-test", couponUpdateSchema.parse({ ...base, value: 20, expectedUpdatedAt: revision })), /preservam/);
  const saved = await updateCoupon(db.client, "coupon-test", couponUpdateSchema.parse({ ...base, isActive: false, expectedUpdatedAt: revision }));
  assert.equal(saved.usesCount, 3);
  assert.equal(saved.isActive, false);
});

test("exclusao permite cupom livre e bloqueia cupom usado ou vinculado", async () => {
  for (const coupon of [{ ...record(), usesCount: 1 }, { ...record(), _count: { prizes: 1 } }]) {
    const db = database(coupon);
    await assert.rejects(deleteCoupon(db.client, "coupon-test", revision), /Pause o cupom/);
    assert.notEqual(db.state().coupon, null);
  }
  const db = database();
  await deleteCoupon(db.client, "coupon-test", revision);
  assert.equal(db.state().coupon, null);
  assert.equal(db.state().audits.length, 1);
});
