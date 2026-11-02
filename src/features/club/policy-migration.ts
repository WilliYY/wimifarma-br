import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { lockProductCatalog } from "@/features/products/mutations";
import { ensureClubMembership } from "./membership";

export const MAX_POLICY_TARGETS = 10_000;
export const POLICY_PLAN_TTL_MS = 30 * 60_000;
const POLICY_VERSION = "loyalty-2026-11-02-v1";
const APPLIED_ACTION = "LOYALTY_POLICY_APPLIED";
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const timestampSchema = z.string().datetime().refine(value => new Date(value).toISOString() === value);
const sourceSchema = z.string().regex(/^[a-f0-9]{40}$/);
const common = {
  version: z.literal(POLICY_VERSION),
  actorId: idSchema,
  sourceSha: sourceSchema,
  createdAt: timestampSchema,
  expiresAt: timestampSchema,
};
const customerTargetSchema = z.object({
  id: idSchema,
  updatedAt: timestampSchema,
  status: z.literal("ACTIVE"),
  membershipAbsent: z.literal(true),
}).strict();
const productTargetSchema = z.object({
  id: idSchema,
  ean: z.string().max(128).nullable(),
  updatedAt: timestampSchema,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  deletedAt: z.null(),
  cashbackEnabled: z.literal(true),
  cashbackRateBps: z.number().int().min(0).max(10_000).refine(rate => rate !== 100),
  requiresPrescription: z.boolean(),
  isPopularPharmacy: z.boolean(),
  wimicoinsEnabled: z.boolean(),
}).strict();
const planSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("customers"), targets: z.array(customerTargetSchema).max(MAX_POLICY_TARGETS) }).strict(),
  z.object({ ...common, kind: z.literal("cashback"), targets: z.array(productTargetSchema).max(MAX_POLICY_TARGETS) }).strict(),
]);
export type LoyaltyPolicyPlan = z.infer<typeof planSchema>;
export type LoyaltyPolicyKind = LoyaltyPolicyPlan["kind"];
type PlanContext = { actorId: string; sourceSha: string; now?: Date };
type Database = Pick<PrismaClient, "$transaction">;

export class LoyaltyPolicyError extends Error {}

export function parseLoyaltyPolicyPlan(input: unknown): LoyaltyPolicyPlan {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) throw new LoyaltyPolicyError("Plano inválido ou fora dos limites permitidos.");
  const plan = parsed.data;
  if (Date.parse(plan.expiresAt) - Date.parse(plan.createdAt) !== POLICY_PLAN_TTL_MS) throw new LoyaltyPolicyError("Validade do plano alterada.");
  if (plan.targets.some((item, index) => index > 0 && item.id <= plan.targets[index - 1].id)) throw new LoyaltyPolicyError("Alvos duplicados ou fora de ordem.");
  return plan;
}

/** The reviewed file is canonical, including its trailing newline. */
export function serializeLoyaltyPolicyPlan(plan: LoyaltyPolicyPlan): string {
  return JSON.stringify(parseLoyaltyPolicyPlan(plan), null, 2) + "\n";
}

export function loyaltyPolicyPlanSha(plan: LoyaltyPolicyPlan): string {
  return createHash("sha256").update(serializeLoyaltyPolicyPlan(plan)).digest("hex");
}

function validateContext(context: PlanContext): Date {
  if (!idSchema.safeParse(context.actorId).success || !sourceSchema.safeParse(context.sourceSha).success) throw new LoyaltyPolicyError("ADMIN e revisão SHA40 devem ser declarados explicitamente.");
  const now = context.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new LoyaltyPolicyError("Horário inválido.");
  return now;
}

function validatePlanTime(plan: LoyaltyPolicyPlan, now: Date) {
  if (now.getTime() < Date.parse(plan.createdAt) || now.getTime() >= Date.parse(plan.expiresAt)) throw new LoyaltyPolicyError("Plano futuro ou expirado; gere e revise outro plano.");
}

async function lockActor(tx: Prisma.TransactionClient, actorId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
  if (!actor) throw new LoyaltyPolicyError("ADMIN ativo obrigatório; acesso alterado.");
}

const productSelect = {
  id: true, ean: true, updatedAt: true, status: true, deletedAt: true, cashbackEnabled: true,
  cashbackRateBps: true, requiresPrescription: true, isPopularPharmacy: true, wimicoinsEnabled: true,
} as const;

export async function createLoyaltyPolicyPlan(db: Database, input: PlanContext & { kind: LoyaltyPolicyKind }): Promise<LoyaltyPolicyPlan> {
  const now = validateContext(input);
  if (input.kind !== "customers" && input.kind !== "cashback") throw new LoyaltyPolicyError("Escolha um plano customers ou cashback.");
  return db.$transaction(async tx => {
    // Catalog mutations use this same lock order. Customers never acquire the catalog lock.
    if (input.kind === "cashback") await lockProductCatalog(tx);
    await lockActor(tx, input.actorId);
    const base = { version: POLICY_VERSION, actorId: input.actorId, sourceSha: input.sourceSha, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + POLICY_PLAN_TTL_MS).toISOString() };
    if (input.kind === "customers") {
      const customers = await tx.customer.findMany({
        where: { status: "ACTIVE", clubMembership: { is: null } },
        select: { id: true, status: true, updatedAt: true }, orderBy: { id: "asc" }, take: MAX_POLICY_TARGETS + 1,
      });
      return parseLoyaltyPolicyPlan({ ...base, kind: input.kind, targets: customers.map(customer => ({ id: customer.id, updatedAt: customer.updatedAt.toISOString(), status: customer.status, membershipAbsent: true })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) });
    }
    const products = await tx.product.findMany({
      where: { deletedAt: null, cashbackEnabled: true, cashbackRateBps: { not: 100 } },
      select: productSelect, orderBy: { id: "asc" }, take: MAX_POLICY_TARGETS + 1,
    });
    // This preserves the existing manual selection. It does not assess product margins.
    return parseLoyaltyPolicyPlan({ ...base, kind: input.kind, targets: products.map(product => ({ ...product, updatedAt: product.updatedAt.toISOString() })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) });
  }, { maxWait: 10_000, timeout: 60_000 });
}

export async function applyLoyaltyPolicyPlan(db: Database, input: unknown, context: PlanContext & { expectedSha: string }): Promise<{ applied: number; alreadyApplied: boolean }> {
  const plan = parseLoyaltyPolicyPlan(input);
  const now = validateContext(context);
  const planSha = loyaltyPolicyPlanSha(plan);
  if (!/^[a-f0-9]{64}$/.test(context.expectedSha) || context.expectedSha !== planSha) throw new LoyaltyPolicyError("Hash de revisão não corresponde ao plano original.");
  if (context.sourceSha !== plan.sourceSha || context.actorId !== plan.actorId) throw new LoyaltyPolicyError("Revisão de código ou ADMIN diverge do plano revisado.");
  validatePlanTime(plan, now);
  return db.$transaction(async tx => {
    if (plan.kind === "cashback") await lockProductCatalog(tx);
    await lockActor(tx, context.actorId);
    // Serialize identical applications, including the customer-only path, without taking a catalog lock.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${planSha}, 0))::text`;
    validatePlanTime(plan, context.now ?? new Date());
    const prior = await tx.auditLog.findFirst({ where: { action: APPLIED_ACTION, entity: "LoyaltyPolicy", entityId: planSha }, select: { id: true } });
    if (prior) return { applied: 0, alreadyApplied: true };
    if (!plan.targets.length) return { applied: 0, alreadyApplied: false };
    // Every target is locked and compared before the first mutation; audit errors roll back everything.
    if (plan.kind === "customers") {
      for (const expected of plan.targets) {
        await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${expected.id} FOR UPDATE`;
        const customer = await tx.customer.findUnique({ where: { id: expected.id }, select: { id: true, status: true, updatedAt: true } });
        const membership = await tx.clubMembership.findUnique({ where: { customerId: expected.id }, select: { active: true } });
        if (!customer || customer.status !== "ACTIVE" || customer.updatedAt.toISOString() !== expected.updatedAt || membership) throw new LoyaltyPolicyError("Cliente ou adesão mudou; revise todo o plano.");
      }
      validatePlanTime(plan, context.now ?? new Date());
      for (const expected of plan.targets) await ensureClubMembership(tx, expected.id);
    } else {
      for (const expected of plan.targets) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${expected.id} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: expected.id }, select: productSelect });
        if (!product || product.updatedAt.toISOString() !== expected.updatedAt ||
          product.ean !== expected.ean || product.status !== expected.status || product.deletedAt !== null ||
          product.cashbackEnabled !== true || product.cashbackRateBps !== expected.cashbackRateBps ||
          product.requiresPrescription !== expected.requiresPrescription || product.isPopularPharmacy !== expected.isPopularPharmacy ||
          product.wimicoinsEnabled !== expected.wimicoinsEnabled) throw new LoyaltyPolicyError("Produto mudou; revise todo o plano.");
      }
      validatePlanTime(plan, context.now ?? new Date());
      for (const expected of plan.targets) {
        await tx.product.update({ where: { id: expected.id }, data: { cashbackRateBps: 100 }, select: { id: true } });
        await tx.auditLog.create({ data: { action: "CASHBACK_POLICY_RATE_NORMALIZED", entity: "Product", entityId: expected.id, userId: context.actorId,
          metadata: { policy: POLICY_VERSION, planSha, sourceSha: plan.sourceSha, previousRateBps: expected.cashbackRateBps, cashbackRateBps: 100, selectionPreserved: true, marginReviewed: false } } });
      }
    }
    await tx.auditLog.create({ data: { action: APPLIED_ACTION, entity: "LoyaltyPolicy", entityId: planSha, userId: context.actorId,
      metadata: { policy: POLICY_VERSION, kind: plan.kind, sourceSha: plan.sourceSha, planSha, count: plan.targets.length } } });
    return { applied: plan.targets.length, alreadyApplied: false };
  }, { maxWait: 10_000, timeout: 120_000 });
}
