import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { couponDates, couponDeleteBlock, type CouponListItem } from "./coupon";
import type { CouponCreateInput, CouponUpdateInput } from "./schema";

export const couponSelect = {
  id: true, code: true, description: true, type: true, value: true,
  minOrderValue: true, maxUses: true, usesCount: true, startsAt: true,
  endsAt: true, isActive: true, createdAt: true, updatedAt: true,
  _count: { select: { prizes: true } },
} as const satisfies Prisma.CouponSelect;
type CouponRecord = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;
type Database = Pick<PrismaClient, "$transaction">;

export class CouponMutationError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export function serializeCoupon(coupon: CouponRecord): CouponListItem {
  const { _count, ...record } = coupon;
  return {
    ...record, value: coupon.value.toString(), minOrderValue: coupon.minOrderValue?.toString() ?? null,
    startsAt: coupon.startsAt?.toISOString() ?? null, endsAt: coupon.endsAt?.toISOString() ?? null,
    createdAt: coupon.createdAt.toISOString(), updatedAt: coupon.updatedAt.toISOString(), linkedPrizes: _count.prizes,
  };
}

function couponData(input: CouponCreateInput | CouponUpdateInput) {
  return {
    code: input.code, description: input.description || null, type: input.type,
    value: input.value, minOrderValue: input.minOrderValue ?? null, maxUses: input.maxUses ?? null,
    isActive: input.isActive, ...couponDates(input),
  };
}

function auditData(action: string, coupon: CouponRecord, userId?: string, before?: CouponRecord) {
  return {
    action, entity: "Coupon", entityId: coupon.id, userId,
    metadata: { coupon: { ...serializeCoupon(coupon) }, ...(before ? { before: { ...serializeCoupon(before) } } : {}) },
  };
}

function checkRevision(coupon: CouponRecord | null, expectedUpdatedAt: string): asserts coupon is CouponRecord {
  if (!coupon) throw new CouponMutationError("Este cupom nao existe mais. Atualize a lista.", 404);
  if (coupon.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
    throw new CouponMutationError("Este cupom foi alterado. Reabra a edicao para carregar os dados atuais.");
  }
}

export function createCoupon(database: Database, input: CouponCreateInput, userId?: string) {
  return database.$transaction(async (transaction) => {
    const coupon = await transaction.coupon.create({ data: { ...couponData(input), usesCount: input.usesCount }, select: couponSelect });
    await transaction.auditLog.create({ data: auditData("COUPON_CREATED", coupon, userId) });
    return serializeCoupon(coupon);
  });
}

export function updateCoupon(database: Database, id: string, input: CouponUpdateInput, userId?: string) {
  return database.$transaction(async (transaction) => {
    const before = await transaction.coupon.findUnique({ where: { id }, select: couponSelect });
    checkRevision(before, input.expectedUpdatedAt);
    if (input.maxUses !== undefined && input.maxUses < before.usesCount) {
      throw new CouponMutationError("O limite nao pode ser menor que os usos registrados.", 422);
    }
    if (before.usesCount > 0 && (input.code !== before.code || input.type !== before.type || input.value !== Number(before.value)
      || (input.minOrderValue ?? 0) !== Number(before.minOrderValue ?? 0))) {
      throw new CouponMutationError("Cupons ja usados preservam codigo e desconto. Crie outro cupom para novas condicoes.");
    }
    const updated = await transaction.coupon.updateMany({
      where: { id, updatedAt: before.updatedAt, usesCount: before.usesCount },
      data: { ...couponData(input), updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) },
    });
    if (updated.count !== 1) throw new CouponMutationError("O cupom mudou durante a edicao. Atualize a lista e tente novamente.");
    const coupon = await transaction.coupon.findUniqueOrThrow({ where: { id }, select: couponSelect });
    await transaction.auditLog.create({ data: auditData("COUPON_UPDATED", coupon, userId, before) });
    return serializeCoupon(coupon);
  }, { isolationLevel: "Serializable" });
}

export function deleteCoupon(database: Database, id: string, expectedUpdatedAt: string, userId?: string) {
  return database.$transaction(async (transaction) => {
    const coupon = await transaction.coupon.findUnique({ where: { id }, select: couponSelect });
    checkRevision(coupon, expectedUpdatedAt);
    const blocked = couponDeleteBlock(serializeCoupon(coupon));
    if (blocked) throw new CouponMutationError(blocked);
    const deleted = await transaction.coupon.deleteMany({
      where: { id, updatedAt: coupon.updatedAt, usesCount: 0, prizes: { none: {} } },
    });
    if (deleted.count !== 1) throw new CouponMutationError("O cupom mudou ou recebeu um vinculo. Atualize a lista antes de excluir.");
    await transaction.auditLog.create({ data: auditData("COUPON_DELETED", coupon, userId) });
  }, { isolationLevel: "Serializable" });
}
